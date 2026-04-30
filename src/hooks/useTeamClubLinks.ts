import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TeamClubLink = {
  id: string;
  club_id: string;
  team_id: string;
  active: boolean;
};

export function useTeamClubLinks() {
  const query = useQuery({
    queryKey: ["rg_team_club_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_team_club_links")
        .select("id,club_id,team_id,active")
        .eq("active", true);
      if (error) {
        console.warn("Could not load team-club links:", error.message);
        return [] as TeamClubLink[];
      }
      return (data ?? []) as TeamClubLink[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const teamIdsForClub = (clubId: string | null | undefined): string[] => {
    if (!clubId) return [];
    return (query.data ?? []).filter((l) => l.club_id === clubId).map((l) => l.team_id);
  };

  return { ...query, teamIdsForClub };
}
