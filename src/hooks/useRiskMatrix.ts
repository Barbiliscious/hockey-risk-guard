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

export type ScoreOption = { score: number; label: string; display: string };

const FALLBACK_LIKELIHOOD: Record<number, string> = {
  1: "Rare", 2: "Unlikely", 3: "Possible", 4: "Likely", 5: "Almost Certain",
};
const FALLBACK_CONSEQUENCE: Record<number, string> = {
  1: "Insignificant", 2: "Minor", 3: "Moderate", 4: "Major", 5: "Severe",
};

export function likelihoodOptions(rows: MatrixRow[] | undefined): ScoreOption[] {
  const map = new Map<number, string>();
  (rows ?? []).forEach((r) => map.set(r.likelihood_score, r.likelihood_label));
  return [1, 2, 3, 4, 5].map((s) => {
    const label = map.get(s) ?? FALLBACK_LIKELIHOOD[s];
    return { score: s, label, display: `${s} — ${label}` };
  });
}

export function consequenceOptions(rows: MatrixRow[] | undefined): ScoreOption[] {
  const map = new Map<number, string>();
  (rows ?? []).forEach((r) => map.set(r.consequence_score, r.consequence_label));
  return [1, 2, 3, 4, 5].map((s) => {
    const label = map.get(s) ?? FALLBACK_CONSEQUENCE[s];
    return { score: s, label, display: `${s} — ${label}` };
  });
}
