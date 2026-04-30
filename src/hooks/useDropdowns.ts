import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DropdownValue = {
  id: string;
  list_type: string;
  value: string;
  description: string | null;
  active: boolean;
  sort_order: number | null;
};

export function useDropdowns() {
  return useQuery({
    queryKey: ["rg_dropdown_values"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_dropdown_values")
        .select("*")
        .eq("active", true)
        .order("list_type")
        .order("sort_order");
      if (error) throw error;
      const grouped: Record<string, DropdownValue[]> = {};
      for (const row of (data ?? []) as DropdownValue[]) {
        (grouped[row.list_type] ||= []).push(row);
      }
      return grouped;
    },
    staleTime: 5 * 60 * 1000,
  });
}
