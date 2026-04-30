import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import type { Risk } from "@/pages/RiskRegisterPage";
import type { AuditRow } from "@/pages/AuditLogPage";

export function RiskAuditDrawer({ risk, onClose }: { risk: Risk | null; onClose: () => void }) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["rg_audit_for_risk", risk?.id],
    enabled: !!risk?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_audit_log")
        .select("*")
        .eq("entity_type", "rg_risk_register")
        .eq("entity_id", risk!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  return (
    <Sheet open={!!risk} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Audit history</SheetTitle>
          <SheetDescription>
            {risk && <span className="font-mono">{risk.risk_external_id}</span>} — {risk?.risk_event}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground text-sm">No audit entries yet.</div>
          ) : rows.map((r) => (
            <div key={r.id} className="border rounded-md p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{r.action_type}</Badge>
                  {r.field_changed && <span className="font-mono text-xs">{r.field_changed}</span>}
                  {r.is_sensitive && <Badge variant="destructive">sensitive</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                by {r.user_name ?? r.user_id ?? "system"} {r.user_role ? `(${r.user_role})` : ""}
              </div>
              {(r.previous_value || r.new_value) && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/40 p-2 rounded">
                    <div className="font-medium text-muted-foreground mb-1">Previous</div>
                    <div className="break-words">{r.previous_value || "—"}</div>
                  </div>
                  <div className="bg-muted/40 p-2 rounded">
                    <div className="font-medium text-muted-foreground mb-1">New</div>
                    <div className="break-words">{r.new_value || "—"}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
