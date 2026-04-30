import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type AuditRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action_type: string | null;
  entity_type: string | null;
  entity_id: string | null;
  field_changed: string | null;
  previous_value: string | null;
  new_value: string | null;
  reason_for_change: string | null;
  is_sensitive: boolean;
};

export default function AuditLogPage() {
  const [user, setUser] = useState("");
  const [entityType, setEntityType] = useState("all");
  const [actionType, setActionType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sensitiveOnly, setSensitiveOnly] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["rg_audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const entityTypes = useMemo(() => Array.from(new Set(rows.map((r) => r.entity_type).filter(Boolean))) as string[], [rows]);
  const actionTypes = useMemo(() => Array.from(new Set(rows.map((r) => r.action_type).filter(Boolean))) as string[], [rows]);

  const filtered = rows.filter((r) => {
    if (sensitiveOnly && !r.is_sensitive) return false;
    if (entityType !== "all" && r.entity_type !== entityType) return false;
    if (actionType !== "all" && r.action_type !== actionType) return false;
    if (user && !(`${r.user_name ?? ""} ${r.user_id ?? ""}`.toLowerCase().includes(user.toLowerCase()))) return false;
    if (from && new Date(r.created_at) < new Date(from)) return false;
    if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Risk Audit Log</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} entries</p>
      </div>

      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-6 gap-2">
          <div>
            <Label className="text-xs">User</Label>
            <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="name or id" />
          </div>
          <div>
            <Label className="text-xs">Entity type</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {entityTypes.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Action</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {actionTypes.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Switch id="sensitive" checked={sensitiveOnly} onCheckedChange={setSensitiveOnly} />
            <Label htmlFor="sensitive">Sensitive only</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Previous</TableHead>
                <TableHead>New</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No entries match.</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id} className={r.is_sensitive ? "bg-destructive/5" : ""}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{r.user_name ?? r.user_id?.slice(0, 8) ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.user_role ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{r.action_type}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{r.entity_type}</TableCell>
                  <TableCell className="text-xs font-mono">{r.field_changed ?? "—"}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={r.previous_value ?? ""}>{r.previous_value ?? "—"}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate" title={r.new_value ?? ""}>{r.new_value ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.reason_for_change ?? "—"}</TableCell>
                  <TableCell>{r.is_sensitive && <Badge variant="destructive">sensitive</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
