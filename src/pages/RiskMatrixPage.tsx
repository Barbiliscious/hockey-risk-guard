import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRiskMatrix, lookupRating } from "@/hooks/useRiskMatrix";
import { useRiskAccess } from "@/hooks/useRiskAccess";
import { ratingCellClass, RATINGS, type RiskRating } from "@/lib/risk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PrintHeader } from "@/components/PrintHeader";
import { Info, Pencil, Printer, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Guidance = { id: string; section_key: string; title: string; content: string; sort_order: number | null };

type RiskRow = {
  id: string;
  risk_external_id: string;
  risk_event: string;
  status: string | null;
  risk_owner: string | null;
  inherent_likelihood_score: number | null;
  inherent_consequence_score: number | null;
  residual_likelihood_score: number | null;
  residual_consequence_score: number | null;
  is_archived: boolean;
};

export default function RiskMatrixPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canEditMatrix } = useRiskAccess();
  const { data: matrix = [], isLoading } = useRiskMatrix();
  const [editMode, setEditMode] = useState(false);

  const { data: guidance = [] } = useQuery({
    queryKey: ["rg_guidance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rg_risk_guidance_sections").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Guidance[];
    },
  });

  const { data: risks = [] } = useQuery({
    queryKey: ["rg_risk_register_for_matrix_preview"],
    enabled: editMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_risk_register")
        .select("id,risk_external_id,risk_event,status,risk_owner,inherent_likelihood_score,inherent_consequence_score,residual_likelihood_score,residual_consequence_score,is_archived")
        .eq("is_archived", false);
      if (error) throw error;
      return (data ?? []) as RiskRow[];
    },
  });

  const likelihoods = Array.from(new Set(matrix.map((m) => m.likelihood_score))).sort();
  const consequences = Array.from(new Set(matrix.map((m) => m.consequence_score))).sort();

  const labelFor = (axis: "L" | "C", score: number) => {
    const m = matrix.find((r) => (axis === "L" ? r.likelihood_score === score : r.consequence_score === score));
    return axis === "L" ? m?.likelihood_label : m?.consequence_label;
  };

  const [cellEdit, setCellEdit] = useState<{ l: number; c: number; current: RiskRating } | null>(null);

  const saveCell = useMutation({
    mutationFn: async (args: { l: number; c: number; rating: RiskRating; reason: string }) => {
      const { data, error } = await supabase.rpc("rg_update_matrix_cell", {
        p_likelihood_score: args.l,
        p_consequence_score: args.c,
        p_new_rating: args.rating,
        p_reason_for_change: args.reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_risk_matrix"] });
      qc.invalidateQueries({ queryKey: ["rg_risk_register"] });
      qc.invalidateQueries({ queryKey: ["rg_dashboard"] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
      toast({ title: "Matrix cell updated" });
      setCellEdit(null);
    },
    onError: (e: any) => toast({ title: "Could not update cell", description: e.message, variant: "destructive" }),
  });

  const [editingGuidance, setEditingGuidance] = useState<Guidance | null>(null);
  const saveGuidance = useMutation({
    mutationFn: async (args: { key: string; title: string; content: string; reason: string }) => {
      const { data, error } = await supabase.rpc("rg_update_guidance_section", {
        p_section_key: args.key,
        p_title: args.title,
        p_content: args.content,
        p_reason_for_change: args.reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_guidance"] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
      toast({ title: "Guidance updated" });
      setEditingGuidance(null);
    },
    onError: (e: any) => toast({ title: "Could not update guidance", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <PrintHeader title="Risk Matrix & Guidance" />
      <div className="flex items-start justify-between gap-2 no-print flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Risk Matrix &amp; Guidance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The risk matrix is the source of truth for inherent and residual ratings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canEditMatrix && (
            <div className="flex items-center gap-2">
              <Switch id="edit-mode" checked={editMode} onCheckedChange={setEditMode} />
              <Label htmlFor="edit-mode">Edit mode</Label>
            </div>
          )}
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
        </div>
      </div>

      {!canEditMatrix && (
        <div className="flex items-start gap-2 rounded-md border border-accent bg-accent/50 text-accent-foreground px-3 py-2 text-sm no-print">
          <Info className="h-4 w-4 mt-0.5" />
          <span>You have read-only access to the matrix and guidance.</span>
        </div>
      )}
      {editMode && (
        <div className="flex items-start gap-2 rounded-md border border-warning bg-warning/10 text-foreground px-3 py-2 text-sm no-print">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <span>Edit mode is active. Click a cell to change its rating. Changes are sensitive and audited.</span>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>5 × 5 Risk Matrix</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading matrix…</div>
          ) : (
            <div className="overflow-auto">
              <table className="border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    <th className="p-2 text-left font-medium text-muted-foreground" colSpan={consequences.length}>
                      Consequence →
                    </th>
                  </tr>
                  <tr>
                    <th className="p-2 text-left font-medium text-muted-foreground">Likelihood ↓</th>
                    {consequences.map((c) => (
                      <th key={c} className="p-2 text-center font-medium border bg-muted/40 min-w-[110px]">
                        {c}. {labelFor("C", c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {likelihoods.map((l) => (
                    <tr key={l}>
                      <th className="p-2 text-left font-medium border bg-muted/40 whitespace-nowrap">
                        {l}. {labelFor("L", l)}
                      </th>
                      {consequences.map((c) => {
                        const cell = matrix.find((m) => m.likelihood_score === l && m.consequence_score === c);
                        const interactive = editMode && canEditMatrix;
                        return (
                          <td
                            key={c}
                            className={`border p-3 text-center font-semibold ${ratingCellClass(cell?.rating)} ${interactive ? "cursor-pointer hover:ring-2 hover:ring-primary" : ""}`}
                            onClick={() => interactive && cell && setCellEdit({ l, c, current: cell.rating as RiskRating })}
                            title={interactive ? "Click to edit rating" : undefined}
                          >
                            {cell?.rating ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {guidance.map((g) => (
          <Card key={g.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <CardTitle className="text-base">{g.title}</CardTitle>
              {editMode && canEditMatrix && (
                <Button size="sm" variant="outline" onClick={() => setEditingGuidance(g)}>
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans leading-relaxed">{g.content}</pre>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cell edit + impact preview */}
      <CellEditDialog
        open={!!cellEdit}
        cell={cellEdit}
        risks={risks}
        currentRating={cellEdit ? lookupRating(matrix, cellEdit.l, cellEdit.c) : null}
        likelihoodLabel={cellEdit ? labelFor("L", cellEdit.l) ?? "" : ""}
        consequenceLabel={cellEdit ? labelFor("C", cellEdit.c) ?? "" : ""}
        onClose={() => setCellEdit(null)}
        onSave={(rating, reason) => cellEdit && saveCell.mutate({ l: cellEdit.l, c: cellEdit.c, rating, reason })}
        saving={saveCell.isPending}
      />

      <GuidanceEditDialog
        section={editingGuidance}
        onClose={() => setEditingGuidance(null)}
        onSave={(title, content, reason) =>
          editingGuidance && saveGuidance.mutate({ key: editingGuidance.section_key, title, content, reason })
        }
        saving={saveGuidance.isPending}
      />
    </div>
  );
}

function CellEditDialog({
  open, cell, risks, currentRating, likelihoodLabel, consequenceLabel, onClose, onSave, saving,
}: {
  open: boolean;
  cell: { l: number; c: number; current: RiskRating } | null;
  risks: RiskRow[];
  currentRating: RiskRating | null;
  likelihoodLabel: string;
  consequenceLabel: string;
  onClose: () => void;
  onSave: (rating: RiskRating, reason: string) => void;
  saving: boolean;
}) {
  const [newRating, setNewRating] = useState<RiskRating>("Medium");
  const [reason, setReason] = useState("");

  // reset when cell changes
  useMemo(() => {
    if (cell) {
      setNewRating(cell.current);
      setReason("");
    }
  }, [cell]);

  const affected = useMemo(() => {
    if (!cell) return [] as { row: RiskRow; via: "inherent" | "residual" | "both" }[];
    const out: { row: RiskRow; via: "inherent" | "residual" | "both" }[] = [];
    risks.forEach((r) => {
      const i = r.inherent_likelihood_score === cell.l && r.inherent_consequence_score === cell.c;
      const s = r.residual_likelihood_score === cell.l && r.residual_consequence_score === cell.c;
      if (i && s) out.push({ row: r, via: "both" });
      else if (i) out.push({ row: r, via: "inherent" });
      else if (s) out.push({ row: r, via: "residual" });
    });
    return out;
  }, [cell, risks]);

  const inherentCount = affected.filter((a) => a.via !== "residual").length;
  const residualCount = affected.filter((a) => a.via !== "inherent").length;
  const openCount = affected.filter((a) => (a.row.status ?? "") !== "Closed").length;
  const escalation = (currentRating === "Low" || currentRating === "Medium") &&
    (newRating === "High" || newRating === "Very High");
  const deescalation = (currentRating === "High" || currentRating === "Very High") &&
    (newRating === "Low" || newRating === "Medium");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit matrix cell</DialogTitle>
          <DialogDescription>
            Likelihood {cell?.l}. {likelihoodLabel} × Consequence {cell?.c}. {consequenceLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Current rating</Label>
            <div className="mt-1"><Badge className={ratingCellClass(currentRating)}>{currentRating ?? "—"}</Badge></div>
          </div>
          <div>
            <Label className="text-xs">New rating</Label>
            <Select value={newRating} onValueChange={(v) => setNewRating(v as RiskRating)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RATINGS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border p-3 bg-muted/30">
          <div className="text-sm font-medium mb-2">Impact preview</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <Stat label="Affected (inherent)" value={inherentCount} />
            <Stat label="Affected (residual)" value={residualCount} />
            <Stat label="Open risks affected" value={openCount} />
            <Stat label={escalation ? "Escalating" : deescalation ? "De-escalating" : "Same band"} value={escalation || deescalation ? affected.length : 0} />
          </div>
          {affected.length > 0 ? (
            <div className="mt-3 max-h-60 overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk ID</TableHead>
                    <TableHead>Risk / Event</TableHead>
                    <TableHead>Via</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affected.map((a) => (
                    <TableRow key={a.row.id}>
                      <TableCell className="font-mono text-xs">{a.row.risk_external_id}</TableCell>
                      <TableCell className="text-xs max-w-[260px] truncate" title={a.row.risk_event}>{a.row.risk_event}</TableCell>
                      <TableCell><Badge variant="secondary">{a.via}</Badge></TableCell>
                      <TableCell className="text-xs">{a.row.status ?? "—"}</TableCell>
                      <TableCell className="text-xs">{a.row.risk_owner ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-2">No current risks land in this cell. Future risks placed here will use the new rating.</div>
          )}
        </div>

        <div>
          <Label className="text-xs">Reason for change <span className="text-destructive">*</span></Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this matrix cell being changed?" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={saving || !reason.trim() || newRating === currentRating}
            onClick={() => onSave(newRating, reason.trim())}
          >
            {saving ? "Saving…" : "Save change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-background p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function GuidanceEditDialog({
  section, onClose, onSave, saving,
}: {
  section: Guidance | null;
  onClose: () => void;
  onSave: (title: string, content: string, reason: string) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reason, setReason] = useState("");
  useMemo(() => {
    if (section) { setTitle(section.title); setContent(section.content); setReason(""); }
  }, [section]);
  return (
    <Dialog open={!!section} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit guidance section</DialogTitle>
          <DialogDescription>Changes are sensitive and audited.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} />
          </div>
          <div>
            <Label className="text-xs">Reason for change <span className="text-destructive">*</span></Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={saving || !reason.trim() || !title.trim()} onClick={() => onSave(title, content, reason.trim())}>
            {saving ? "Saving…" : "Save change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
