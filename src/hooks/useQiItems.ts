import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type QiItem = {
  id: string;
  qi_external_id: string;
  date_logged: string;
  logged_by: string | null;
  source: string | null;
  qi_type: string | null;
  area: string | null;
  description: string;
  reason_background: string | null;
  linked_risk_id: string | null;
  linked_action_id: string | null;
  related_project_review: string | null;
  priority: string | null;
  status: string;
  recommended_action: string | null;
  owner_reviewer: string | null;
  review_trigger: string | null;
  review_date: string | null;
  outcome_decision: string | null;
  date_closed: string | null;
  club_id: string | null;
  team_id: string | null;
  evidence_notes: string | null;
  is_archived: boolean;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useQiItems(opts: { riskId?: string; actionId?: string; includeArchived?: boolean } = {}) {
  const { riskId, actionId, includeArchived } = opts;
  return useQuery({
    queryKey: ["rg_qi_items", { riskId: riskId ?? null, actionId: actionId ?? null, includeArchived: !!includeArchived }],
    queryFn: async () => {
      let q = supabase.from("rg_quality_improvement_items").select("*").order("qi_external_id");
      if (riskId) q = q.eq("linked_risk_id", riskId);
      if (actionId) q = q.eq("linked_action_id", actionId);
      if (!includeArchived) q = q.eq("is_archived", false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as QiItem[];
    },
  });
}
