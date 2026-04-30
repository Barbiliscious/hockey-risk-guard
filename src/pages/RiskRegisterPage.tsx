import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Archive, History, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDropdowns } from "@/hooks/useDropdowns";
import { useTeams } from "@/hooks/useTeams";
import { useClubs } from "@/hooks/useClubs";
import { likelihoodLabel, consequenceLabel } from "@/hooks/useRiskMatrix";
import { useRiskMatrix, lookupRating } from "@/hooks/useRiskMatrix";
import { RiskBadge } from "@/components/RiskBadge";
import { RiskFormDialog } from "@/components/RiskFormDialog";
import { RiskAuditDrawer } from "@/components/RiskAuditDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type Risk = {
  id: string;
  risk_external_id: string;
  risk_category: string | null;
  risk_type: string | null;
  level: string | null;
  risk_event: string;
  consequences: string | null;
  inherent_likelihood_score: number | null;
  inherent_consequence_score: number | null;
  current_risk_summary: string | null;
  controls_in_place: string | null;
  residual_likelihood_score: number | null;
  residual_consequence_score: number | null;
  risk_target_rating: string | null;
  risk_target_description: string | null;
  treatment_plan: string | null;
  risk_owner: string | null;
  status: string | null;
  review_frequency: string | null;
  last_reviewed_date: string | null;
  next_review_date: string | null;
  team_id: string | null;
  club_id: string | null;
  evidence_notes: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

const RATINGS = ["Low", "Medium", "High", "Very High"];

export default function RiskRegisterPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: matrix = [] } = useRiskMatrix();
  const { data: dropdowns = {} } = useDropdowns();
  const { data: teams = [] } = useTeams();
  const { data: clubs = [] } = useClubs();

  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    category: "all", type: "all", level: "all", owner: "all", status: "all", team: "all", club: "all",
    inherent: "all", residual: "all",
  });
  const [editing, setEditing] = useState<Risk | null>(null);
  const [creating, setCreating] = useState(false);
  const [auditFor, setAuditFor] = useState<Risk | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Risk | null>(null);

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ["rg_risk_register", showArchived],
    queryFn: async () => {
      const q = supabase.from("rg_risk_register").select("*").order("risk_external_id");
      const { data, error } = showArchived ? await q : await q.eq("is_archived", false);
      if (error) throw error;
      return (data ?? []) as Risk[];
    },
  });

  const teamName = (id?: string | null) => teams.find((t) => t.id === id)?.name ?? "";
  const clubName = (id?: string | null) => clubs.find((c) => c.id === id)?.name ?? "";

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return risks.filter((r) => {
      const inherent = lookupRating(matrix, r.inherent_likelihood_score, r.inherent_consequence_score);
      const residual = lookupRating(matrix, r.residual_likelihood_score, r.residual_consequence_score);
      if (filters.category !== "all" && r.risk_category !== filters.category) return false;
      if (filters.type !== "all" && r.risk_type !== filters.type) return false;
      if (filters.level !== "all" && r.level !== filters.level) return false;
      if (filters.owner !== "all" && r.risk_owner !== filters.owner) return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.team !== "all" && r.team_id !== filters.team) return false;
      if (filters.club !== "all" && r.club_id !== filters.club) return false;
      if (filters.inherent !== "all" && inherent !== filters.inherent) return false;
      if (filters.residual !== "all" && residual !== filters.residual) return false;
      if (s) {
        const hay = `${r.risk_external_id} ${r.risk_event} ${r.consequences ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [risks, filters, search, matrix]);

  const archive = useMutation({
    mutationFn: async (risk: Risk) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("rg_risk_register")
        .update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: u.user?.id })
        .eq("id", risk.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_risk_register"] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
      toast({ title: "Risk archived" });
    },
    onError: (e: any) => toast({ title: "Could not archive", description: e.message, variant: "destructive" }),
  });

  const opt = (key: string) => (dropdowns[key] ?? []).map((d) => d.value);

  return (
    <div className="p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Risk Register</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} risk{filtered.length === 1 ? "" : "s"} shown
            {showArchived ? " (including archived)" : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Switch id="archived" checked={showArchived} onCheckedChange={setShowArchived} />
            <Label htmlFor="archived">Show archived</Label>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add Risk
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2">
            <div className="lg:col-span-2 relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search ID, event, consequences…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Filter label="Category" value={filters.category} onChange={(v) => setFilters({ ...filters, category: v })} options={opt("risk_category")} />
            <Filter label="Type" value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} options={opt("risk_type")} />
            <Filter label="Level" value={filters.level} onChange={(v) => setFilters({ ...filters, level: v })} options={opt("level")} />
            <Filter label="Owner" value={filters.owner} onChange={(v) => setFilters({ ...filters, owner: v })} options={opt("risk_owner")} />
            <Filter label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={opt("risk_status")} />
            <Filter label="Team" value={filters.team} onChange={(v) => setFilters({ ...filters, team: v })} options={teams.map((t) => ({ label: t.name, value: t.id }))} />
            <Filter label="Inherent" value={filters.inherent} onChange={(v) => setFilters({ ...filters, inherent: v })} options={RATINGS} />
            <Filter label="Residual" value={filters.residual} onChange={(v) => setFilters({ ...filters, residual: v })} options={RATINGS} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risk ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="min-w-[260px]">Risk / Event</TableHead>
                <TableHead className="min-w-[220px]">Consequences</TableHead>
                <TableHead>Inh L</TableHead>
                <TableHead>Inh C</TableHead>
                <TableHead>Inherent</TableHead>
                <TableHead className="min-w-[200px]">Current Risk</TableHead>
                <TableHead className="min-w-[220px]">Controls</TableHead>
                <TableHead>Res L</TableHead>
                <TableHead>Res C</TableHead>
                <TableHead>Residual</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="min-w-[200px]">Target Description</TableHead>
                <TableHead className="min-w-[220px]">Treatment</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Next Review</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="min-w-[180px]">Evidence / Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={24} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={24} className="text-center text-muted-foreground py-8">No risks match.</TableCell></TableRow>
              ) : filtered.map((r) => {
                const inherent = lookupRating(matrix, r.inherent_likelihood_score, r.inherent_consequence_score);
                const residual = lookupRating(matrix, r.residual_likelihood_score, r.residual_consequence_score);
                return (
                  <TableRow key={r.id} className={r.is_archived ? "opacity-60" : ""}>
                    <TableCell className="font-medium whitespace-nowrap">{r.risk_external_id}{r.is_archived && <span className="ml-1 text-xs text-muted-foreground">(archived)</span>}</TableCell>
                    <TableCell>{r.risk_category}</TableCell>
                    <TableCell>{r.risk_type}</TableCell>
                    <TableCell>{r.level}</TableCell>
                    <TableCell>{r.risk_event}</TableCell>
                    <TableCell className="text-sm">{r.consequences}</TableCell>
                    <TableCell>{r.inherent_likelihood_score}</TableCell>
                    <TableCell>{r.inherent_consequence_score}</TableCell>
                    <TableCell><RiskBadge rating={inherent} /></TableCell>
                    <TableCell className="text-sm">{r.current_risk_summary}</TableCell>
                    <TableCell className="text-sm">{r.controls_in_place}</TableCell>
                    <TableCell>{r.residual_likelihood_score}</TableCell>
                    <TableCell>{r.residual_consequence_score}</TableCell>
                    <TableCell><RiskBadge rating={residual} /></TableCell>
                    <TableCell><RiskBadge rating={r.risk_target_rating} /></TableCell>
                    <TableCell className="text-sm">{r.risk_target_description}</TableCell>
                    <TableCell className="text-sm">{r.treatment_plan}</TableCell>
                    <TableCell>{r.risk_owner}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>{r.review_frequency}</TableCell>
                    <TableCell>{r.next_review_date}</TableCell>
                    <TableCell>{teamName(r.team_id)}</TableCell>
                    <TableCell className="text-sm">{r.evidence_notes}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(r)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setAuditFor(r)} title="Audit history"><History className="h-4 w-4" /></Button>
                      {!r.is_archived && (
                        <Button size="icon" variant="ghost" onClick={() => setArchiveTarget(r)} title="Archive"><Archive className="h-4 w-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {(creating || editing) && (
        <RiskFormDialog
          open
          onOpenChange={(v) => { if (!v) { setEditing(null); setCreating(false); } }}
          risk={editing}
        />
      )}

      <RiskAuditDrawer risk={auditFor} onClose={() => setAuditFor(null)} />

      <AlertDialog open={!!archiveTarget} onOpenChange={(v) => !v && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this risk?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived risks are hidden from the default list but kept in the database for audit and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (archiveTarget) archive.mutate(archiveTarget);
                setArchiveTarget(null);
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Filter({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
