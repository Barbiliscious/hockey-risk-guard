import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRiskAccess } from "@/hooks/useRiskAccess";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Plus, Save, Trash2 } from "lucide-react";

const ROLES = ["super_admin", "president", "committee", "admin", "umpire"] as const;
type RoleName = (typeof ROLES)[number];

const SENSITIVE_ROLES: RoleName[] = ["super_admin", "president", "committee"];

const LIST_TYPES = [
  "risk_category", "risk_type", "level", "risk_status", "review_frequency",
  "risk_owner", "action_status", "review_outcome", "qi_type", "qi_status",
  "qi_priority", "related_project_review", "qi_source",
];

export default function SettingsPage() {
  const { canEditMatrix } = useRiskAccess();
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Risk Guard Settings</h1>
        <p className="text-sm text-muted-foreground">Manage users, lists, clubs/teams/venues and data tools.</p>
      </div>
      {!canEditMatrix && (
        <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
          You have read-only access to settings. Most edits require Super Admin or President.
        </div>
      )}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users &amp; Roles</TabsTrigger>
          <TabsTrigger value="lists">Lists / Dropdowns</TabsTrigger>
          <TabsTrigger value="clubs">Clubs / Teams / Venues</TabsTrigger>
          <TabsTrigger value="tools">Data Tools</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersRolesTab /></TabsContent>
        <TabsContent value="lists"><ListsTab /></TabsContent>
        <TabsContent value="clubs"><ClubsTeamsVenuesTab /></TabsContent>
        <TabsContent value="tools"><DataToolsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================================
// USERS & ROLES
// =====================================================================
type Profile = { user_id: string; email: string | null; full_name: string | null };
type UserRole = { user_id: string; role: string };

function UsersRolesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ["profiles_for_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id,email,full_name").order("email");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
  const { data: roles = [] } = useQuery({
    queryKey: ["user_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id,role");
      if (error) throw error;
      return (data ?? []) as UserRole[];
    },
  });

  const rolesByUser = useMemo(() => {
    const m = new Map<string, Set<string>>();
    roles.forEach((r) => {
      if (!m.has(r.user_id)) m.set(r.user_id, new Set());
      m.get(r.user_id)!.add(r.role);
    });
    return m;
  }, [roles]);

  const filtered = profiles.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (p.email ?? "").toLowerCase().includes(s) || (p.full_name ?? "").toLowerCase().includes(s);
  });

  const [pending, setPending] = useState<{ user: Profile; role: RoleName; grant: boolean } | null>(null);
  const [reason, setReason] = useState("");

  const setRole = useMutation({
    mutationFn: async (args: { user_id: string; role: RoleName; grant: boolean; reason: string }) => {
      const { error } = await supabase.rpc("rg_set_user_role", {
        p_user_id: args.user_id,
        p_role: args.role,
        p_grant: args.grant,
        p_reason_for_change: args.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_roles"] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
      toast({ title: "Role updated" });
      setPending(null);
      setReason("");
    },
    onError: (e: any) => toast({ title: "Could not update role", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Users &amp; Roles</CardTitle>
      </CardHeader>
      <CardContent>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="max-w-sm mb-3" />
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                {ROLES.map((r) => <TableHead key={r} className="text-center text-xs">{r}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingProfiles ? (
                <TableRow><TableCell colSpan={ROLES.length + 1} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={ROLES.length + 1} className="text-center py-6 text-muted-foreground">No users.</TableCell></TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.user_id}>
                  <TableCell>
                    <div className="text-sm font-medium">{p.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.email ?? p.user_id.slice(0, 8)}</div>
                  </TableCell>
                  {ROLES.map((r) => {
                    const has = rolesByUser.get(p.user_id)?.has(r) ?? false;
                    return (
                      <TableCell key={r} className="text-center">
                        <Switch
                          checked={has}
                          onCheckedChange={() => setPending({ user: p, role: r, grant: !has })}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{pending?.grant ? "Grant" : "Revoke"} role: {pending?.role}</DialogTitle>
              <DialogDescription>
                User: {pending?.user.full_name ?? pending?.user.email}
                {pending && SENSITIVE_ROLES.includes(pending.role) && (
                  <span className="block mt-2 text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> This is a sensitive role change and will be audited.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label className="text-xs">Reason for change <span className="text-destructive">*</span></Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
              <Button
                disabled={!reason.trim() || setRole.isPending}
                onClick={() => pending && setRole.mutate({ user_id: pending.user.user_id, role: pending.role, grant: pending.grant, reason: reason.trim() })}
              >
                {setRole.isPending ? "Saving…" : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// =====================================================================
// LISTS / DROPDOWNS
// =====================================================================
type DropdownRow = {
  id: string; list_type: string; value: string; description: string | null;
  active: boolean; sort_order: number | null;
};

function ListsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [listType, setListType] = useState(LIST_TYPES[0]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["rg_dropdown_values_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rg_dropdown_values").select("*").order("list_type").order("sort_order");
      if (error) throw error;
      return (data ?? []) as DropdownRow[];
    },
  });

  const filtered = rows.filter((r) => r.list_type === listType);

  const [draft, setDraft] = useState({ value: "", description: "", sort_order: 0 });

  const addValue = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rg_dropdown_values").insert({
        list_type: listType,
        value: draft.value.trim(),
        description: draft.description.trim() || null,
        sort_order: draft.sort_order,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_dropdown_values_admin"] });
      qc.invalidateQueries({ queryKey: ["rg_dropdown_values"] });
      setDraft({ value: "", description: "", sort_order: 0 });
      toast({ title: "Value added" });
    },
    onError: (e: any) => toast({ title: "Could not add", description: e.message, variant: "destructive" }),
  });

  const updateRow = useMutation({
    mutationFn: async (r: DropdownRow) => {
      const { error } = await supabase.from("rg_dropdown_values").update({
        value: r.value, description: r.description, active: r.active, sort_order: r.sort_order,
      }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_dropdown_values_admin"] });
      qc.invalidateQueries({ queryKey: ["rg_dropdown_values"] });
      toast({ title: "Saved" });
    },
    onError: (e: any) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lists / Dropdowns</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div>
            <Label className="text-xs">List type</Label>
            <Select value={listType} onValueChange={setListType}>
              <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIST_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">{filtered.length} value(s)</div>
        </div>

        <div className="rounded border p-3 bg-muted/20">
          <div className="text-sm font-medium mb-2">Add value</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input placeholder="Value" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
            <Input placeholder="Description (optional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <Input type="number" placeholder="Sort order" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })} />
            <Button onClick={() => addValue.mutate()} disabled={!draft.value.trim() || addValue.isPending}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Inactive values remain valid for old records but won't appear in new dropdowns.</p>
        </div>

        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Value</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Sort</TableHead>
                <TableHead className="w-24">Active</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
                : filtered.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No values.</TableCell></TableRow>
                : filtered.map((r) => <DropdownEditableRow key={r.id} row={r} onSave={(x) => updateRow.mutate(x)} />)}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function DropdownEditableRow({ row, onSave }: { row: DropdownRow; onSave: (r: DropdownRow) => void }) {
  const [draft, setDraft] = useState(row);
  const dirty = draft.value !== row.value || draft.description !== row.description || draft.active !== row.active || draft.sort_order !== row.sort_order;
  return (
    <TableRow>
      <TableCell><Input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} /></TableCell>
      <TableCell><Input value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></TableCell>
      <TableCell><Input type="number" value={draft.sort_order ?? 0} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })} /></TableCell>
      <TableCell><Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} /></TableCell>
      <TableCell>
        <Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty} onClick={() => onSave(draft)}>
          <Save className="h-3 w-3" /> Save
        </Button>
      </TableCell>
    </TableRow>
  );
}

// =====================================================================
// CLUBS / TEAMS / VENUES
// =====================================================================
type ClubRow = { id: string; name: string; short_name: string | null; active: boolean };
type TeamRow = { id: string; name: string };
type LinkRow = { id: string; club_id: string; team_id: string; active: boolean };
type VenueRow = { id: string; name: string; active: boolean; notes: string | null };

function ClubsTeamsVenuesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: clubs = [] } = useQuery({
    queryKey: ["clubs_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rg_clubs").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as ClubRow[];
    },
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["teams_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("id,name").order("name");
      if (error) return [] as TeamRow[];
      return (data ?? []) as TeamRow[];
    },
  });
  const { data: links = [] } = useQuery({
    queryKey: ["team_club_links_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rg_team_club_links").select("*");
      if (error) throw error;
      return (data ?? []) as LinkRow[];
    },
  });
  const { data: venues = [] } = useQuery({
    queryKey: ["venues_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rg_venues").select("*").order("name");
      if (error) return [] as VenueRow[];
      return (data ?? []) as VenueRow[];
    },
  });

  const [newClub, setNewClub] = useState({ name: "", short_name: "" });
  const addClub = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rg_clubs").insert({ name: newClub.name.trim(), short_name: newClub.short_name.trim() || null, active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clubs_admin"] });
      qc.invalidateQueries({ queryKey: ["rg_clubs"] });
      setNewClub({ name: "", short_name: "" });
      toast({ title: "Club added" });
    },
    onError: (e: any) => toast({ title: "Could not add club", description: e.message, variant: "destructive" }),
  });

  const updateClub = useMutation({
    mutationFn: async (c: ClubRow) => {
      const { error } = await supabase.from("rg_clubs").update({ name: c.name, short_name: c.short_name, active: c.active }).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clubs_admin"] });
      qc.invalidateQueries({ queryKey: ["rg_clubs"] });
      toast({ title: "Saved" });
    },
  });

  const [linkClub, setLinkClub] = useState<string>("");
  const [linkTeam, setLinkTeam] = useState<string>("");
  const addLink = useMutation({
    mutationFn: async () => {
      // avoid duplicate
      const exists = links.find((l) => l.club_id === linkClub && l.team_id === linkTeam && l.active);
      if (exists) return;
      const { error } = await supabase.from("rg_team_club_links").insert({ club_id: linkClub, team_id: linkTeam, active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_club_links_admin"] });
      qc.invalidateQueries({ queryKey: ["rg_team_club_links"] });
      toast({ title: "Linked" });
    },
    onError: (e: any) => toast({ title: "Could not link", description: e.message, variant: "destructive" }),
  });
  const toggleLink = useMutation({
    mutationFn: async (l: LinkRow) => {
      const { error } = await supabase.from("rg_team_club_links").update({ active: !l.active }).eq("id", l.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team_club_links_admin"] }),
  });

  const [newVenue, setNewVenue] = useState({ name: "", notes: "" });
  const addVenue = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rg_venues").insert({ name: newVenue.name.trim(), notes: newVenue.notes.trim() || null, active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues_admin"] });
      setNewVenue({ name: "", notes: "" });
      toast({ title: "Venue added" });
    },
    onError: (e: any) => toast({ title: "Could not add venue", description: e.message, variant: "destructive" }),
  });
  const updateVenue = useMutation({
    mutationFn: async (v: VenueRow) => {
      const { error } = await supabase.from("rg_venues").update({ name: v.name, active: v.active, notes: v.notes }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["venues_admin"] }),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Clubs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Name" value={newClub.name} onChange={(e) => setNewClub({ ...newClub, name: e.target.value })} />
            <Input placeholder="Short name" value={newClub.short_name} onChange={(e) => setNewClub({ ...newClub, short_name: e.target.value })} />
            <Button onClick={() => addClub.mutate()} disabled={!newClub.name.trim() || addClub.isPending}><Plus className="h-4 w-4" /> Add</Button>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Short</TableHead><TableHead className="w-24">Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {clubs.map((c) => <ClubEditRow key={c.id} club={c} onSave={(x) => updateClub.mutate(x)} />)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Team ↔ Club links</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Select value={linkClub} onValueChange={setLinkClub}>
              <SelectTrigger><SelectValue placeholder="Club" /></SelectTrigger>
              <SelectContent>{clubs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={linkTeam} onValueChange={setLinkTeam}>
              <SelectTrigger><SelectValue placeholder="Team" /></SelectTrigger>
              <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={() => addLink.mutate()} disabled={!linkClub || !linkTeam || addLink.isPending}><Plus className="h-4 w-4" /> Link</Button>
          </div>
          {teams.length === 0 && <p className="text-xs text-muted-foreground">Teams table not readable for this user.</p>}
          <Table>
            <TableHeader><TableRow><TableHead>Club</TableHead><TableHead>Team</TableHead><TableHead className="w-24">Active</TableHead></TableRow></TableHeader>
            <TableBody>
              {links.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm">{clubs.find((c) => c.id === l.club_id)?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{teams.find((t) => t.id === l.team_id)?.name ?? l.team_id.slice(0, 8)}</TableCell>
                  <TableCell><Switch checked={l.active} onCheckedChange={() => toggleLink.mutate(l)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Venues</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Venue name" value={newVenue.name} onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })} />
            <Input placeholder="Notes (optional)" value={newVenue.notes} onChange={(e) => setNewVenue({ ...newVenue, notes: e.target.value })} />
            <Button onClick={() => addVenue.mutate()} disabled={!newVenue.name.trim() || addVenue.isPending}><Plus className="h-4 w-4" /> Add</Button>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Notes</TableHead><TableHead className="w-24">Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {venues.map((v) => <VenueEditRow key={v.id} venue={v} onSave={(x) => updateVenue.mutate(x)} />)}
              {venues.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-xs">No venues yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ClubEditRow({ club, onSave }: { club: ClubRow; onSave: (c: ClubRow) => void }) {
  const [d, setD] = useState(club);
  const dirty = d.name !== club.name || d.short_name !== club.short_name || d.active !== club.active;
  return (
    <TableRow>
      <TableCell><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></TableCell>
      <TableCell><Input value={d.short_name ?? ""} onChange={(e) => setD({ ...d, short_name: e.target.value })} /></TableCell>
      <TableCell><Switch checked={d.active} onCheckedChange={(v) => setD({ ...d, active: v })} /></TableCell>
      <TableCell><Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty} onClick={() => onSave(d)}><Save className="h-3 w-3" /></Button></TableCell>
    </TableRow>
  );
}
function VenueEditRow({ venue, onSave }: { venue: VenueRow; onSave: (v: VenueRow) => void }) {
  const [d, setD] = useState(venue);
  const dirty = d.name !== venue.name || d.notes !== venue.notes || d.active !== venue.active;
  return (
    <TableRow>
      <TableCell><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></TableCell>
      <TableCell><Input value={d.notes ?? ""} onChange={(e) => setD({ ...d, notes: e.target.value })} /></TableCell>
      <TableCell><Switch checked={d.active} onCheckedChange={(v) => setD({ ...d, active: v })} /></TableCell>
      <TableCell><Button size="sm" variant={dirty ? "default" : "outline"} disabled={!dirty} onClick={() => onSave(d)}><Save className="h-3 w-3" /></Button></TableCell>
    </TableRow>
  );
}

// =====================================================================
// DATA TOOLS — CLEAR SAMPLE DATA
// =====================================================================
function DataToolsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");

  const clear = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("rg_clear_sample_data", {
        p_confirmation: confirm,
        p_reason: reason,
      });
      if (error) throw error;
      return data as Record<string, number>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries();
      toast({
        title: "Sample data cleared",
        description: `Risks: ${data.risks ?? 0} · Actions: ${data.actions ?? 0} · QI: ${data.qi ?? 0} · Reviews: ${data.reviews ?? 0} · Comments: ${data.comments ?? 0}`,
      });
      setOpen(false);
      setConfirm("");
      setReason("");
    },
    onError: (e: any) => toast({ title: "Could not clear", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Data Tools</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">Clear sample data</div>
              <p className="text-sm text-muted-foreground mt-1">
                Removes seeded sample risks (R-001 to R-010), test BE SMART actions, test QI items,
                and any comments/reviews attached to those records. Does <strong>not</strong> delete users,
                roles, the matrix, guidance, dropdowns, clubs, venues, or any Umpire Portal data.
              </p>
              <Button variant="destructive" className="mt-3" onClick={() => setOpen(true)}>
                <Trash2 className="h-4 w-4" /> Clear sample data…
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" /> Confirm clear sample data</DialogTitle>
              <DialogDescription>This action is sensitive and audited. Type <code className="font-mono">CLEAR SAMPLE DATA</code> to confirm.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Confirmation phrase</Label>
                <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="CLEAR SAMPLE DATA" />
              </div>
              <div>
                <Label className="text-xs">Reason for change <span className="text-destructive">*</span></Label>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={confirm !== "CLEAR SAMPLE DATA" || !reason.trim() || clear.isPending}
                onClick={() => clear.mutate()}
              >
                {clear.isPending ? "Clearing…" : "Clear sample data"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
