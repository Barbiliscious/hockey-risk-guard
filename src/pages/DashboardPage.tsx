import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Calendar, FileWarning, ListChecks, Target as TargetIcon,
  Lightbulb, ShieldOff, UserX, ClipboardList, ArrowUpRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useDashboardSummary, useLiveRisks, useDueItems } from "@/hooks/useDashboard";
import { useBeSmartActions } from "@/hooks/useBeSmartActions";
import { useQiItems } from "@/hooks/useQiItems";
import { useDropdowns } from "@/hooks/useDropdowns";
import { useClubs } from "@/hooks/useClubs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RiskBadge } from "@/components/RiskBadge";

const RATING_COLORS: Record<string, string> = {
  Low: "hsl(210 90% 60%)",
  Medium: "hsl(38 92% 60%)",
  High: "hsl(24 94% 60%)",
  "Very High": "hsl(355 73% 60%)",
};

const STATUS_ORDER = ["Open", "In Progress", "Controlled", "Closed", "Deferred"];
const QI_STATUSES = [
  "Logged", "Under Review", "Accepted", "Deferred", "Actioned", "Rejected", "Closed", "Awaiting Decision",
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: summary } = useDashboardSummary();
  const { data: liveRisks = [], isLoading } = useLiveRisks();
  const { data: dueItems = [] } = useDueItems();
  const { data: actions = [] } = useBeSmartActions({ includeArchived: false });
  const { data: qiItems = [] } = useQiItems({ includeArchived: false });
  const { data: dropdowns = {} } = useDropdowns();
  const { data: clubs = [] } = useClubs();

  const [filters, setFilters] = useState({
    category: "all", owner: "all", status: "all", club: "all", project: "all",
  });

  const filteredRisks = useMemo(() => {
    return liveRisks.filter((r) => {
      if (r.is_archived) return false;
      if (filters.category !== "all" && r.risk_category !== filters.category) return false;
      if (filters.owner !== "all" && r.risk_owner !== filters.owner) return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.club !== "all" && r.club_id !== filters.club) return false;
      return true;
    });
  }, [liveRisks, filters]);

  const filteredQi = useMemo(() => {
    return qiItems.filter((q) => {
      if (filters.project !== "all" && q.related_project_review !== filters.project) return false;
      if (filters.club !== "all" && q.club_id !== filters.club) return false;
      return true;
    });
  }, [qiItems, filters]);

  const counts = useMemo(() => {
    const c = { total: 0, "Very High": 0, High: 0, Medium: 0, Low: 0 };
    filteredRisks.forEach((r) => {
      c.total += 1;
      if (r.live_residual_rating) (c as any)[r.live_residual_rating] += 1;
    });
    return c;
  }, [filteredRisks]);

  const statusData = useMemo(() => {
    const m = new Map<string, number>();
    filteredRisks.forEach((r) => {
      const k = r.status ?? "Unknown";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return STATUS_ORDER
      .map((s) => ({ name: s, value: m.get(s) ?? 0 }))
      .concat(
        Array.from(m.entries())
          .filter(([k]) => !STATUS_ORDER.includes(k))
          .map(([k, v]) => ({ name: k, value: v })),
      )
      .filter((d) => d.value > 0);
  }, [filteredRisks]);

  const categoryData = useMemo(() => {
    const m = new Map<string, number>();
    filteredRisks.forEach((r) => m.set(r.risk_category ?? "—", (m.get(r.risk_category ?? "—") ?? 0) + 1));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredRisks]);

  const ownerData = useMemo(() => {
    const m = new Map<string, number>();
    filteredRisks
      .filter((r) => r.status !== "Closed")
      .forEach((r) => {
        const k = (r.risk_owner ?? "Unassigned").trim() || "Unassigned";
        m.set(k, (m.get(k) ?? 0) + 1);
      });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredRisks]);

  const qiData = useMemo(() => {
    const m = new Map<string, number>();
    filteredQi.forEach((q) => m.set(q.status ?? "Unknown", (m.get(q.status ?? "Unknown") ?? 0) + 1));
    return QI_STATUSES.map((s) => ({ name: s, value: m.get(s) ?? 0 })).filter((d) => d.value > 0);
  }, [filteredQi]);

  const opt = (key: string) => (dropdowns[key] ?? []).map((d: any) => d.value);
  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    qiItems.forEach((q) => q.related_project_review && set.add(q.related_project_review));
    return Array.from(set);
  }, [qiItems]);

  const goRegister = (params: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    navigate(`/risk/register?${sp.toString()}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Risk Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live overview of risks, actions and quality improvement.</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          <FilterBox label="Risk Category" value={filters.category} onChange={(v) => setFilters({ ...filters, category: v })} options={opt("risk_category")} />
          <FilterBox label="Owner" value={filters.owner} onChange={(v) => setFilters({ ...filters, owner: v })} options={opt("risk_owner")} />
          <FilterBox label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} options={opt("risk_status")} />
          <FilterBox label="Club" value={filters.club} onChange={(v) => setFilters({ ...filters, club: v })} options={clubs.map((c) => ({ label: c.name, value: c.id }))} />
          <FilterBox label="Related Project / Review" value={filters.project} onChange={(v) => setFilters({ ...filters, project: v })} options={projectOptions} />
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard icon={<ListChecks className="h-4 w-4" />} label="Total Risks" value={counts.total} />
        <SummaryCard icon={<FileWarning className="h-4 w-4" />} label="Very High" value={counts["Very High"]} accent="veryhigh" />
        <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="High" value={counts.High} accent="high" />
        <SummaryCard icon={<TargetIcon className="h-4 w-4" />} label="Medium" value={counts.Medium} accent="medium" />
        <SummaryCard icon={<TargetIcon className="h-4 w-4" />} label="Low" value={counts.Low} accent="low" />
        <SummaryCard icon={<Calendar className="h-4 w-4" />} label="Overdue Actions" value={summary?.overdue_actions ?? 0} />
        <SummaryCard icon={<ClipboardList className="h-4 w-4" />} label="Open BE SMART Actions" value={summary?.open_actions ?? 0} />
        <SummaryCard icon={<Lightbulb className="h-4 w-4" />} label="QI Under Review" value={summary?.qi_under_review ?? 0} />
        <SummaryCard icon={<Lightbulb className="h-4 w-4" />} label="2027 By-Law Review" value={summary?.bylaw_2027_items ?? 0} />
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader><CardTitle className="text-base">Alerts</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <AlertChip label="Review Overdue" count={summary?.alert_review_overdue ?? 0} icon={<Calendar className="h-3.5 w-3.5" />} onClick={() => goRegister({ alert: "overdue" })} />
          <AlertChip label="High/Very High • No Action" count={summary?.alert_high_no_action ?? 0} icon={<AlertTriangle className="h-3.5 w-3.5" />} onClick={() => goRegister({ alert: "high_no_action" })} />
          <AlertChip label="Residual Above Target" count={summary?.alert_residual_above_target ?? 0} icon={<ArrowUpRight className="h-3.5 w-3.5" />} onClick={() => goRegister({ alert: "above_target" })} />
          <AlertChip label="No Controls" count={summary?.alert_no_controls ?? 0} icon={<ShieldOff className="h-3.5 w-3.5" />} onClick={() => goRegister({ alert: "no_controls" })} />
          <AlertChip label="No Owner" count={summary?.alert_no_owner ?? 0} icon={<UserX className="h-3.5 w-3.5" />} onClick={() => goRegister({ alert: "no_owner" })} />
          <AlertChip label="QI Awaiting Decision" count={summary?.alert_qi_awaiting_decision ?? 0} icon={<Lightbulb className="h-3.5 w-3.5" />} onClick={() => navigate("/risk/qi?alert=awaiting_decision")} />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Risk Status">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="value" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risks by Category">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="value" fill="hsl(var(--brand))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Open Risks by Owner">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ownerData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="value" fill="hsl(var(--brand))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Quality Improvement Summary">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={qiData} dataKey="value" nameKey="name" outerRadius={80} label>
                {qiData.map((_, i) => (
                  <Cell key={i} fill={`hsl(${(i * 47) % 360} 70% 55%)`} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Due Items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Due Items</CardTitle></CardHeader>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Linked Risk</TableHead>
                <TableHead className="min-w-[280px]">Title / Description</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due / Review</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Days</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dueItems.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Nothing due.</TableCell></TableRow>
              ) : dueItems.slice(0, 50).map((d) => {
                const overdue = (d.days_overdue ?? 0) > 0;
                return (
                  <TableRow key={`${d.item_type}-${d.item_id}`}>
                    <TableCell><Badge variant="secondary">{d.item_type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{d.external_id}</TableCell>
                    <TableCell className="font-mono text-xs">{d.linked_risk_external_id ?? "—"}</TableCell>
                    <TableCell className="text-sm">{d.title}</TableCell>
                    <TableCell className="text-sm">{d.owner ?? "—"}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{d.due_date ?? "—"}</TableCell>
                    <TableCell className="text-sm">{d.status ?? "—"}</TableCell>
                    <TableCell className={`text-right text-sm ${overdue ? "text-risk-veryhigh font-semibold" : "text-muted-foreground"}`}>
                      {d.days_overdue == null ? "—" : overdue ? `${d.days_overdue} overdue` : `${Math.abs(d.days_overdue)} left`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
    </div>
  );
}

function SummaryCard({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: number; accent?: "veryhigh" | "high" | "medium" | "low" }) {
  const accentClass =
    accent === "veryhigh" ? "text-risk-veryhigh" :
    accent === "high"     ? "text-risk-high" :
    accent === "medium"   ? "text-risk-medium" :
    accent === "low"      ? "text-risk-low" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">{icon}{label}</span>
        </div>
        <div className={`mt-2 text-2xl font-semibold ${accentClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function AlertChip({
  label, count, icon, onClick,
}: { label: string; count: number; icon: React.ReactNode; onClick: () => void }) {
  const empty = count === 0;
  return (
    <Button
      variant={empty ? "outline" : "default"}
      size="sm"
      onClick={onClick}
      className={empty ? "" : "bg-risk-veryhigh-bg text-risk-veryhigh hover:bg-risk-veryhigh-bg/80 border border-risk-veryhigh/30"}
    >
      {icon}
      <span>{label}</span>
      <span className="ml-1 inline-flex items-center justify-center rounded-md bg-background/40 px-1.5 text-xs font-semibold">
        {count}
      </span>
    </Button>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FilterBox({
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

// avoid unused import warning when RiskBadge isn't referenced (kept for future use)
void RiskBadge;
