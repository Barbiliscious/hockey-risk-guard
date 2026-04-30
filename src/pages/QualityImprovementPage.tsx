import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Archive, MessageSquare, Search, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQiItems, type QiItem } from "@/hooks/useQiItems";
import { useDropdowns } from "@/hooks/useDropdowns";
import { useTeams } from "@/hooks/useTeams";
import { useClubs } from "@/hooks/useClubs";
import { QiItemFormDialog } from "@/components/QiItemFormDialog";
import { CommentThread } from "@/components/CommentThread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PrintHeader } from "@/components/PrintHeader";
import { downloadCsv } from "@/lib/csv";

export default function QualityImprovementPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: dropdowns = {} } = useDropdowns();
  const { data: teams = [] } = useTeams();
  const { data: clubs = [] } = useClubs();

  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    qi_type: "all", status: "all", priority: "all", project: "all",
    risk: "all", action: "all", club: "all", team: "all",
    awaiting: false,
  });

  useEffect(() => {
    if (searchParams.get("alert") === "awaiting_decision") {
      setFilters((f) => ({ ...f, awaiting: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<QiItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<QiItem | null>(null);
  const [commentsFor, setCommentsFor] = useState<QiItem | null>(null);

  const { data: rows = [], isLoading } = useQiItems({ includeArchived: showArchived });

  const { data: risks = [] } = useQuery({
    queryKey: ["rg_risk_register_lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_risk_register")
        .select("id,risk_external_id")
        .order("risk_external_id");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const { data: actions = [] } = useQuery({
    queryKey: ["rg_be_smart_actions_lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_be_smart_actions")
        .select("id,action_external_id")
        .order("action_external_id");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const riskLabel = (id: string | null) => (risks as any[]).find((x) => x.id === id)?.risk_external_id ?? "—";
  const actionLabel = (id: string | null) => (actions as any[]).find((x) => x.id === id)?.action_external_id ?? "—";

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.qi_type !== "all" && r.qi_type !== filters.qi_type) return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.priority !== "all" && r.priority !== filters.priority) return false;
      if (filters.project !== "all" && r.related_project_review !== filters.project) return false;
      if (filters.risk !== "all" && r.linked_risk_id !== filters.risk) return false;
      if (filters.action !== "all" && r.linked_action_id !== filters.action) return false;
      if (filters.club !== "all" && r.club_id !== filters.club) return false;
      if (filters.team !== "all" && r.team_id !== filters.team) return false;
      if (filters.awaiting && !["Logged","Under Review","Awaiting Decision"].includes(r.status ?? "")) return false;
      if (s) {
        const hay = `${r.qi_external_id} ${r.description} ${r.area ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, filters, search]);

  const archive = useMutation({
    mutationFn: async (q: QiItem) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("rg_quality_improvement_items")
        .update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: u.user?.id })
        .eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_qi_items"] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
      toast({ title: "QI item archived" });
    },
    onError: (e: any) => toast({ title: "Could not archive", description: e.message, variant: "destructive" }),
  });

  const opt = (key: string) => (dropdowns[key] ?? []).map((d: any) => d.value);

  const exportCsv = () => {
    downloadCsv("quality_improvement", filtered, [
      { header: "QI ID", value: (r) => r.qi_external_id },
      { header: "Date Logged", value: (r) => r.date_logged },
      { header: "Logged By", value: (r) => r.logged_by ?? "" },
      { header: "Source", value: (r) => r.source ?? "" },
      { header: "QI Type", value: (r) => r.qi_type ?? "" },
      { header: "Area", value: (r) => r.area ?? "" },
      { header: "Description", value: (r) => r.description },
      { header: "Reason / Background", value: (r) => r.reason_background ?? "" },
      { header: "Linked Risk", value: (r) => riskLabel(r.linked_risk_id) },
      { header: "Linked Action", value: (r) => actionLabel(r.linked_action_id) },
      { header: "Related Project / Review", value: (r) => r.related_project_review ?? "" },
      { header: "Priority", value: (r) => r.priority ?? "" },
      { header: "Status", value: (r) => r.status },
      { header: "Recommended Action", value: (r) => r.recommended_action ?? "" },
      { header: "Owner / Reviewer", value: (r) => r.owner_reviewer ?? "" },
      { header: "Review Trigger", value: (r) => r.review_trigger ?? "" },
      { header: "Review Date", value: (r) => r.review_date ?? "" },
      { header: "Outcome / Decision", value: (r) => r.outcome_decision ?? "" },
      { header: "Date Closed", value: (r) => r.date_closed ?? "" },
      { header: "Evidence Notes", value: (r) => r.evidence_notes ?? "" },
      { header: "Archived", value: (r) => (r.is_archived ? "Yes" : "No") },
    ]);
  };

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <PrintHeader title="Quality Improvement Register" subtitle={`${filtered.length} items`} />
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quality Improvement Register</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} item{filtered.length === 1 ? "" : "s"} shown{showArchived ? " (including archived)" : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Switch id="archived" checked={showArchived} onCheckedChange={setShowArchived} />
            <Label htmlFor="archived">Show archived</Label>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Switch id="awaiting" checked={filters.awaiting} onCheckedChange={(v) => setFilters({ ...filters, awaiting: v })} />
            <Label htmlFor="awaiting">Awaiting decision</Label>
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add QI Item
          </Button>
        </div>
      </div>

      <Card className="no-print">
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="md:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search ID, description, area…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <FilterSelect label="Type" value={filters.qi_type} onChange={(v) => setFilters({ ...filters, qi_type: v })} options={opt("qi_type")} />
          <FilterSelect label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={opt("qi_status")} />
          <FilterSelect label="Priority" value={filters.priority} onChange={(v) => setFilters({ ...filters, priority: v })} options={opt("qi_priority")} />
          <FilterSelect label="Related Project / Review" value={filters.project} onChange={(v) => setFilters({ ...filters, project: v })} options={opt("related_project_review")} />
          <FilterSelect label="Linked Risk" value={filters.risk} onChange={(v) => setFilters({ ...filters, risk: v })} options={(risks as any[]).map((r) => ({ label: r.risk_external_id, value: r.id }))} />
          <FilterSelect label="Linked Action" value={filters.action} onChange={(v) => setFilters({ ...filters, action: v })} options={(actions as any[]).map((a) => ({ label: a.action_external_id, value: a.id }))} />
          <FilterSelect label="Club" value={filters.club} onChange={(v) => setFilters({ ...filters, club: v })} options={clubs.map((c) => ({ label: c.name, value: c.id }))} />
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>QI ID</TableHead>
                <TableHead>Logged</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Related Project / Review</TableHead>
                <TableHead>Linked Risk</TableHead>
                <TableHead>Linked Action</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No QI items match.</TableCell></TableRow>
              ) : filtered.map((q) => (
                <TableRow key={q.id} className={q.is_archived ? "opacity-60" : ""}>
                  <TableCell className="font-mono whitespace-nowrap">
                    {q.qi_external_id}{q.is_archived && <span className="ml-1 text-xs text-muted-foreground">(archived)</span>}
                  </TableCell>
                  <TableCell>{q.date_logged}</TableCell>
                  <TableCell>{q.qi_type ?? "—"}</TableCell>
                  <TableCell className="max-w-[260px] truncate" title={q.description}>{q.description}</TableCell>
                  <TableCell>{q.status}</TableCell>
                  <TableCell>{q.priority ?? "—"}</TableCell>
                  <TableCell>{q.related_project_review ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{riskLabel(q.linked_risk_id)}</TableCell>
                  <TableCell className="font-mono text-xs">{actionLabel(q.linked_action_id)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(q)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setCommentsFor(q)} title="Comments"><MessageSquare className="h-4 w-4" /></Button>
                    {!q.is_archived && (
                      <Button size="icon" variant="ghost" onClick={() => setArchiveTarget(q)} title="Archive"><Archive className="h-4 w-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {(creating || editing) && (
        <QiItemFormDialog
          open
          onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
          item={editing}
        />
      )}

      <AlertDialog open={!!archiveTarget} onOpenChange={(v) => !v && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this QI item?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived items are hidden from the default list but kept for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (archiveTarget) archive.mutate(archiveTarget); setArchiveTarget(null); }}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!commentsFor} onOpenChange={(v) => !v && setCommentsFor(null)}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Comments — <span className="font-mono text-sm">{commentsFor?.qi_external_id}</span>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {commentsFor && <CommentThread entityType="qi_item" entityId={commentsFor.id} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: Array<string | { label: string; value: string }>;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => {
            const l = typeof o === "string" ? o : o.label;
            const v = typeof o === "string" ? o : o.value;
            return <SelectItem key={v} value={v}>{l}</SelectItem>;
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
