import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useRiskAccess() {
  const { user, loading } = useAuth();
  const q = useQuery({
    queryKey: ["has_risk_access", user?.id],
    enabled: !!user?.id && !loading,
    queryFn: async () => {
      const [risk, edit] = await Promise.all([
        supabase.rpc("has_risk_access", { _user_id: user!.id }),
        supabase.rpc("can_edit_risk_matrix", { _user_id: user!.id }),
      ]);
      return {
        hasRiskAccess: !!risk.data,
        canEditMatrix: !!edit.data,
      };
    },
  });
  return {
    loading: loading || q.isLoading,
    hasRiskAccess: q.data?.hasRiskAccess ?? false,
    canEditMatrix: q.data?.canEditMatrix ?? false,
  };
}
