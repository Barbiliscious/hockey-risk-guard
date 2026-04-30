import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { riskId: string; outcome: string; notes?: string | null }) => {
      const { data, error } = await supabase.rpc("rg_record_risk_review", {
        p_risk_id: input.riskId,
        p_outcome: input.outcome,
        p_notes: input.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ["rg_risk_register"] });
      qc.invalidateQueries({ queryKey: ["rg_risk_reviews", vars.riskId] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
    },
  });
}
