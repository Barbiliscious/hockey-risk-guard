import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DashboardSummary = {
  total_risks: number;
  very_high_risks: number;
  high_risks: number;
  medium_risks: number;
  low_risks: number;
  overdue_actions: number;
  open_actions: number;
  qi_under_review: number;
  bylaw_2027_items: number;
  alert_review_overdue: number;
  alert_high_no_action: number;
  alert_residual_above_target: number;
  alert_no_controls: number;
  alert_no_owner: number;
  alert_qi_awaiting_decision: number;
};

export type LiveRiskRow = {
  id: string;
  risk_external_id: string;
  risk_event: string;
  risk_category: string | null;
  risk_type: string | null;
  level: string | null;
  risk_owner: string | null;
  status: string | null;
  club_id: string | null;
  team_id: string | null;
  controls_in_place: string | null;
  next_review_date: string | null;
  is_archived: boolean;
  inherent_likelihood_score: number | null;
  inherent_consequence_score: number | null;
  residual_likelihood_score: number | null;
  residual_consequence_score: number | null;
  risk_target_rating: string | null;
  live_inherent_rating: "Low" | "Medium" | "High" | "Very High" | null;
  live_residual_rating: "Low" | "Medium" | "High" | "Very High" | null;
  target_rating_score: number | null;
  residual_rating_score: number | null;
};

export type DueItem = {
  item_type: "Risk Review" | "BE SMART Action" | "QI Item";
  item_id: string;
  external_id: string;
  linked_risk_id: string | null;
  linked_risk_external_id: string | null;
  title: string;
  owner: string | null;
  due_date: string | null;
  status: string | null;
  days_overdue: number | null;
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["rg_v_dashboard_summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_v_dashboard_summary")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as DashboardSummary | null;
    },
  });
}

export function useLiveRisks() {
  return useQuery({
    queryKey: ["rg_v_risks_with_live_ratings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_v_risks_with_live_ratings")
        .select("*")
        .order("risk_external_id");
      if (error) throw error;
      return (data ?? []) as LiveRiskRow[];
    },
  });
}

export function useDueItems() {
  return useQuery({
    queryKey: ["rg_v_due_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rg_v_due_items").select("*");
      if (error) throw error;
      const rows = (data ?? []) as DueItem[];
      // Sort: most overdue first (largest positive days_overdue), then due soonest
      return rows.slice().sort((a, b) => {
        const ao = a.days_overdue ?? 0;
        const bo = b.days_overdue ?? 0;
        // Higher days_overdue first (positive = overdue)
        return bo - ao;
      });
    },
  });
}
