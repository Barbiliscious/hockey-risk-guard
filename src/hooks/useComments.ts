import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CommentEntityType = "risk" | "be_smart_action" | "qi_item";

export type RgComment = {
  id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
};

export function useComments(entityType: CommentEntityType, entityId?: string) {
  return useQuery({
    queryKey: ["rg_comments", entityType, entityId ?? null],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_comments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RgComment[];
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { entityType: CommentEntityType; entityId: string; body: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("rg_comments").insert({
        entity_type: input.entityType,
        entity_id: input.entityId,
        body: input.body,
        author_id: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["rg_comments", vars.entityType, vars.entityId] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
    },
  });
}

export function useEditComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; body: string }) => {
      const { error } = await supabase
        .from("rg_comments")
        .update({ body: input.body, edited_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_comments"] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
    },
  });
}

export function useSoftDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rg_comments").update({ is_deleted: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_comments"] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
    },
  });
}
