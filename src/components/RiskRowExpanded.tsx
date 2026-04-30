import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useBeSmartActions, type BeSmartAction } from "@/hooks/useBeSmartActions";
import { useQiItems, type QiItem } from "@/hooks/useQiItems";
import { useRiskReviews } from "@/hooks/useRiskReviews";
import { BeSmartActionFormDialog } from "@/components/BeSmartActionFormDialog";
import { QiItemFormDialog } from "@/components/QiItemFormDialog";
import { CommentThread } from "@/components/CommentThread";
import { RiskBadge } from "@/components/RiskBadge";

export function RiskRowExpanded({ riskId }: { riskId: string }) {
  const { data: actions = [], isLoading: aLoading } = useBeSmartActions({ riskId });
  const { data: qis = [], isLoading: qLoading } = useQiItems({ riskId });
  const { data: reviews = [], isLoading: rLoading } = useRiskReviews(riskId);

  const [addAction, setAddAction] = useState(false);
  const [editAction, setEditAction] = useState<BeSmartAction | null>(null);
  const [addQi, setAddQi] = useState(false);
  const [editQi, setEditQi] = useState<QiItem | null>(null);

  const reviewerIds = Array.from(new Set(reviews.map((r) => r.reviewed_by).filter(Boolean))) as string[];
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_for_reviewers", reviewerIds.join(",")],
    enabled: reviewerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", reviewerIds);
      if (error) {
        console.warn("Could not load reviewer profiles:", error.message);
        return [];
      }
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const reviewerName = (id: string | null) => {
    if (!id) return "—";
    const p = (profiles as any[]).find((x) => x.user_id === id);
    return p?.full_name || p?.email || id.slice(0, 8);
  };

  return (
    <div className="bg-muted/30 p-4">
      <Tabs defaultValue="actions">
        <TabsList>
          <TabsTrigger value="actions">BE SMART Actions</TabsTrigger>
          <TabsTrigger value="qi">QI Items</TabsTrigger>
          <TabsTrigger value="reviews">Review History</TabsTrigger>
          <TabsTrigger value="comments">Comments / Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="mt-3">
          <div className="flex justify-end mb-2">
            <Button size="sm" onClick={() => setAddAction(true)}>
              <Plus className="h-4 w-4" /> Add Action
            </Button>
          </div>
          {aLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : actions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No BE SMART actions linked yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-1 pr-2">ID</th>
                    <th className="py-1 pr-2">Title</th>
                    <th className="py-1 pr-2">Owner / Role</th>
                    <th className="py-1 pr-2">Status</th>
                    <th className="py-1 pr-2">Due</th>
                    <th className="py-1 pr-2">Progress Notes</th>
                    <th className="py-1 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a) => (
                    <tr key={a.id} className="border-b last:border-b-0">
                      <td className="py-1 pr-2 font-mono">{a.action_external_id}</td>
                      <td className="py-1 pr-2">{a.action_title}</td>
                      <td className="py-1 pr-2">{a.responsible_person_role ?? "—"}</td>
                      <td className="py-1 pr-2">{a.status}</td>
                      <td className="py-1 pr-2">{a.due_date ?? "—"}</td>
                      <td className="py-1 pr-2">{a.progress_notes ?? "—"}</td>
                      <td className="py-1 pr-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditAction(a)}>Open</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="qi" className="mt-3">
          <div className="flex justify-end mb-2">
            <Button size="sm" onClick={() => setAddQi(true)}>
              <Plus className="h-4 w-4" /> Add QI Item
            </Button>
          </div>
          {qLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : qis.length === 0 ? (
            <div className="text-sm text-muted-foreground">No QI items linked yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-1 pr-2">QI ID</th>
                    <th className="py-1 pr-2">Type</th>
                    <th className="py-1 pr-2">Status</th>
                    <th className="py-1 pr-2">Priority</th>
                    <th className="py-1 pr-2">Related Project / Review</th>
                    <th className="py-1 pr-2">Review Date</th>
                    <th className="py-1 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {qis.map((q) => (
                    <tr key={q.id} className="border-b last:border-b-0">
                      <td className="py-1 pr-2 font-mono">{q.qi_external_id}</td>
                      <td className="py-1 pr-2">{q.qi_type ?? "—"}</td>
                      <td className="py-1 pr-2">{q.status}</td>
                      <td className="py-1 pr-2">{q.priority ?? "—"}</td>
                      <td className="py-1 pr-2">{q.related_project_review ?? "—"}</td>
                      <td className="py-1 pr-2">{q.review_date ?? "—"}</td>
                      <td className="py-1 pr-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditQi(q)}>Open</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-3">
          {rLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : reviews.length === 0 ? (
            <div className="text-sm text-muted-foreground">No reviews recorded yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-1 pr-2">Reviewed At</th>
                    <th className="py-1 pr-2">Reviewed By</th>
                    <th className="py-1 pr-2">Outcome</th>
                    <th className="py-1 pr-2">Notes</th>
                    <th className="py-1 pr-2">Inherent</th>
                    <th className="py-1 pr-2">Residual</th>
                    <th className="py-1 pr-2">Target</th>
                    <th className="py-1 pr-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0 align-top">
                      <td className="py-1 pr-2 whitespace-nowrap">
                        {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-1 pr-2">{reviewerName(r.reviewed_by)}</td>
                      <td className="py-1 pr-2">{r.outcome ?? "—"}</td>
                      <td className="py-1 pr-2">{r.notes ?? "—"}</td>
                      <td className="py-1 pr-2"><RiskBadge rating={r.inherent_rating_snapshot} /></td>
                      <td className="py-1 pr-2"><RiskBadge rating={r.residual_rating_snapshot} /></td>
                      <td className="py-1 pr-2"><RiskBadge rating={r.risk_target_rating_snapshot} /></td>
                      <td className="py-1 pr-2">{r.risk_status_snapshot ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-3">
          <CommentThread entityType="risk" entityId={riskId} />
        </TabsContent>
      </Tabs>

      {(addAction || editAction) && (
        <BeSmartActionFormDialog
          open
          onOpenChange={(v) => { if (!v) { setAddAction(false); setEditAction(null); } }}
          action={editAction}
          defaultRiskId={riskId}
        />
      )}
      {(addQi || editQi) && (
        <QiItemFormDialog
          open
          onOpenChange={(v) => { if (!v) { setAddQi(false); setEditQi(null); } }}
          item={editQi}
          defaultRiskId={riskId}
        />
      )}
    </div>
  );
}
