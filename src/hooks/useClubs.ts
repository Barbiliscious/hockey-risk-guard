import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Club = {
  id: string;
  name: string;
  short_name: string | null;
  active: boolean;
};

export function useClubs() {
  return useQuery({
    queryKey: ["rg_clubs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_clubs")
        .select("id,name,short_name,active")
        .eq("active", true)
        .order("name");
      if (error) {
        console.warn("Could not load clubs:", error.message);
        return [] as Club[];
      }
      return (data ?? []) as Club[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
