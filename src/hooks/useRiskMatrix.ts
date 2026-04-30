import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RiskRating } from "@/lib/risk";

export type MatrixRow = {
  id: string;
  likelihood_score: number;
  likelihood_label: string;
  consequence_score: number;
  consequence_label: string;
  rating: RiskRating;
};

export function useRiskMatrix() {
  return useQuery({
    queryKey: ["rg_risk_matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_risk_matrix")
        .select("*")
        .order("likelihood_score")
        .order("consequence_score");
      if (error) throw error;
      return (data ?? []) as MatrixRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function lookupRating(
  rows: MatrixRow[] | undefined,
  l?: number | null,
  c?: number | null,
): RiskRating | null {
  if (!rows || !l || !c) return null;
  const match = rows.find((r) => r.likelihood_score === l && r.consequence_score === c);
  return (match?.rating as RiskRating) ?? null;
}

export function likelihoodLabel(rows: MatrixRow[] | undefined, score?: number | null) {
  if (!rows || !score) return "";
  return rows.find((r) => r.likelihood_score === score)?.likelihood_label ?? "";
}

export function consequenceLabel(rows: MatrixRow[] | undefined, score?: number | null) {
  if (!rows || !score) return "";
  return rows.find((r) => r.consequence_score === score)?.consequence_label ?? "";
}
