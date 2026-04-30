import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  CommentEntityType,
  useAddComment,
  useComments,
  useEditComment,
  useSoftDeleteComment,
} from "@/hooks/useComments";
import { Pencil, Trash2 } from "lucide-react";

export function CommentThread({
  entityType,
  entityId,
}: {
  entityType: CommentEntityType;
  entityId: string;
}) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useComments(entityType, entityId);
  const add = useAddComment();
  const edit = useEditComment();
  const del = useSoftDeleteComment();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  const authorIds = Array.from(new Set(comments.map((c) => c.author_id).filter(Boolean))) as string[];
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_for_comments", authorIds.join(",")],
    enabled: authorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", authorIds);
      if (error) {
        console.warn("Could not load profiles:", error.message);
        return [];
      }
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const nameFor = (id: string | null) => {
    if (!id) return "Unknown";
    const p = (profiles as any[]).find((x) => x.user_id === id);
    return p?.full_name || p?.email || id.slice(0, 8);
  };

  const submit = async () => {
    const body = draft.trim();
    if (!body) return;
    await add.mutateAsync({ entityType, entityId, body });
    setDraft("");
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : comments.length === 0 ? (
        <div className="text-sm text-muted-foreground">No comments yet.</div>
      ) : (
        comments.map((c) => {
          const isAuthor = user?.id && c.author_id === user.id;
          const isEditing = editingId === c.id;
          return (
            <div key={c.id} className="border rounded-md p-3 text-sm">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="font-medium">{nameFor(c.author_id)}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleString()}
                  {c.edited_at && <span className="ml-2 italic">(edited)</span>}
                </div>
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea rows={3} value={editingBody} onChange={(e) => setEditingBody(e.target.value)} />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!editingBody.trim()) return;
                        await edit.mutateAsync({ id: c.id, body: editingBody.trim() });
                        setEditingId(null);
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{c.body}</div>
              )}
              {isAuthor && !isEditing && (
                <div className="mt-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditingId(c.id); setEditingBody(c.body); }}
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(c.id)}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              )}
            </div>
          );
        })
      )}

      <div className="space-y-2 pt-2 border-t">
        <Textarea
          rows={3}
          placeholder="Add a comment…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={!draft.trim() || add.isPending}>
            {add.isPending ? "Posting…" : "Post comment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
