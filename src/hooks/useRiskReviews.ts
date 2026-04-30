import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RiskReview = {
  id: string;
  risk_id: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  outcome: string | null;
  notes: string | null;
  inherent_likelihood_score: number | null;
  inherent_consequence_score: number | null;
  inherent_rating_snapshot: string | null;
  residual_likelihood_score: number | null;
  residual_consequence_score: number | null;
  residual_rating_snapshot: string | null;
  risk_target_rating_snapshot: string | null;
  risk_status_snapshot: string | null;
  created_at: string;
};

export function useRiskReviews(riskId?: string) {
  return useQuery({
    queryKey: ["rg_risk_reviews", riskId ?? null],
    enabled: !!riskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_risk_reviews")
        .select("*")
        .eq("risk_id", riskId!)
        .order("reviewed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RiskReview[];
    },
  });
}
