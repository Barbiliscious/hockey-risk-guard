import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BeSmartAction = {
  id: string;
  action_external_id: string;
  linked_risk_id: string | null;
  action_title: string;
  baseline: string | null;
  evaluate: string | null;
  specific: string | null;
  measurable: string | null;
  achievable: string | null;
  relevant: string | null;
  time_based: string | null;
  responsible_person_role: string | null;
  resources_needed: string | null;
  due_date: string | null;
  status: string;
  progress_notes: string | null;
  date_completed: string | null;
  club_id: string | null;
  team_id: string | null;
  evidence_notes: string | null;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useBeSmartActions(opts: { riskId?: string; includeArchived?: boolean } = {}) {
  const { riskId, includeArchived } = opts;
  return useQuery({
    queryKey: ["rg_be_smart_actions", { riskId: riskId ?? null, includeArchived: !!includeArchived }],
    queryFn: async () => {
      let q = supabase.from("rg_be_smart_actions").select("*").order("action_external_id");
      if (riskId) q = q.eq("linked_risk_id", riskId);
      if (!includeArchived) q = q.eq("is_archived", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BeSmartAction[];
    },
  });
}
