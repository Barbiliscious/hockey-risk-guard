import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Team = { id: string; name: string; short_name: string | null };

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id,name,short_name,is_active")
        .order("name");
      if (error) {
        // Teams may not be readable for risk-only users; treat as empty rather than fatal.
        console.warn("Could not load teams:", error.message);
        return [] as Team[];
      }
      return (data ?? []) as Team[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
