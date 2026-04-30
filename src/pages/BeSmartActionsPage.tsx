import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Archive, MessageSquare, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBeSmartActions, type BeSmartAction } from "@/hooks/useBeSmartActions";
import { useDropdowns } from "@/hooks/useDropdowns";
import { useTeams } from "@/hooks/useTeams";
import { useClubs } from "@/hooks/useClubs";
import { BeSmartActionFormDialog } from "@/components/BeSmartActionFormDialog";
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

export default function BeSmartActionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: dropdowns = {} } = useDropdowns();
  const { data: teams = [] } = useTeams();
  const { data: clubs = [] } = useClubs();

  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "all", risk: "all", club: "all", team: "all" });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BeSmartAction | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<BeSmartAction | null>(null);
  const [commentsFor, setCommentsFor] = useState<BeSmartAction | null>(null);

  const { data: rows = [], isLoading } = useBeSmartActions({ includeArchived: showArchived });

  const { data: risks = [] } = useQuery({
    queryKey: ["rg_risk_register_lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_risk_register")
        .select("id,risk_external_id,risk_event")
        .order("risk_external_id");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const riskLabel = (id: string | null) => {
    const r = (risks as any[]).find((x) => x.id === id);
    return r ? `${r.risk_external_id}` : "—";
  };
  const teamName = (id?: string | null) => teams.find((t) => t.id === id)?.name ?? "";
  const clubName = (id?: string | null) => clubs.find((c) => c.id === id)?.name ?? "";

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.risk !== "all" && r.linked_risk_id !== filters.risk) return false;
      if (filters.club !== "all" && r.club_id !== filters.club) return false;
      if (filters.team !== "all" && r.team_id !== filters.team) return false;
      if (s) {
        const hay = `${r.action_external_id} ${r.action_title} ${r.responsible_person_role ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, filters, search]);

  const archive = useMutation({
    mutationFn: async (a: BeSmartAction) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("rg_be_smart_actions")
        .update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: u.user?.id })
        .eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_be_smart_actions"] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
      toast({ title: "Action archived" });
    },
    onError: (e: any) => toast({ title: "Could not archive", description: e.message, variant: "destructive" }),
  });

  const statusOptions = (dropdowns.action_status ?? []).map((d: any) => d.value);

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">BE SMART Actions</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} action{filtered.length === 1 ? "" : "s"} shown{showArchived ? " (including archived)" : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Switch id="archived" checked={showArchived} onCheckedChange={setShowArchived} />
            <Label htmlFor="archived">Show archived</Label>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add Action
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="md:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search ID, title, owner…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <FilterSelect label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={statusOptions} />
          <FilterSelect
            label="Linked Risk"
            value={filters.risk}
            onChange={(v) => setFilters({ ...filters, risk: v })}
            options={(risks as any[]).map((r) => ({ label: r.risk_external_id, value: r.id }))}
          />
          <FilterSelect label="Club" value={filters.club} onChange={(v) => setFilters({ ...filters, club: v })} options={clubs.map((c) => ({ label: c.name, value: c.id }))} />
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Linked Risk</TableHead>
                <TableHead>Owner / Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No actions match.</TableCell></TableRow>
              ) : filtered.map((a) => (
                <TableRow key={a.id} className={a.is_archived ? "opacity-60" : ""}>
                  <TableCell className="font-mono whitespace-nowrap">
                    {a.action_external_id}{a.is_archived && <span className="ml-1 text-xs text-muted-foreground">(archived)</span>}
                  </TableCell>
                  <TableCell>{a.action_title}</TableCell>
                  <TableCell className="font-mono text-xs">{riskLabel(a.linked_risk_id)}</TableCell>
                  <TableCell>{a.responsible_person_role ?? "—"}</TableCell>
                  <TableCell>{a.status}</TableCell>
                  <TableCell>{a.due_date ?? "—"}</TableCell>
                  <TableCell>{clubName(a.club_id)}</TableCell>
                  <TableCell>{teamName(a.team_id)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(a)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setCommentsFor(a)} title="Comments"><MessageSquare className="h-4 w-4" /></Button>
                    {!a.is_archived && (
                      <Button size="icon" variant="ghost" onClick={() => setArchiveTarget(a)} title="Archive"><Archive className="h-4 w-4" /></Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {(creating || editing) && (
        <BeSmartActionFormDialog
          open
          onOpenChange={(v) => { if (!v) { setCreating(false); setEditing(null); } }}
          action={editing}
        />
      )}

      <AlertDialog open={!!archiveTarget} onOpenChange={(v) => !v && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this action?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived actions are hidden from the default list but kept for audit.
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
              Comments — <span className="font-mono text-sm">{commentsFor?.action_external_id}</span>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {commentsFor && <CommentThread entityType="be_smart_action" entityId={commentsFor.id} />}
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
