import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDropdowns } from "@/hooks/useDropdowns";
import { useTeams } from "@/hooks/useTeams";
import { useClubs } from "@/hooks/useClubs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { BeSmartAction } from "@/hooks/useBeSmartActions";

const NONE = "__none__";

const schema = z.object({
  action_title: z.string().min(1, "Required"),
  linked_risk_id: z.string().optional(),
  baseline: z.string().optional(),
  evaluate: z.string().optional(),
  specific: z.string().optional(),
  measurable: z.string().optional(),
  achievable: z.string().optional(),
  relevant: z.string().optional(),
  time_based: z.string().optional(),
  responsible_person_role: z.string().optional(),
  resources_needed: z.string().optional(),
  due_date: z.string().optional(),
  status: z.string().optional(),
  progress_notes: z.string().optional(),
  date_completed: z.string().optional(),
  club_id: z.string().optional(),
  team_id: z.string().optional(),
  evidence_notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function BeSmartActionFormDialog({
  open,
  onOpenChange,
  action,
  defaultRiskId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  action: BeSmartAction | null;
  defaultRiskId?: string | null;
}) {
  const { data: dropdowns = {} } = useDropdowns();
  const { data: teams = [] } = useTeams();
  const { data: clubs = [] } = useClubs();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!action;

  const { data: risks = [] } = useQuery({
    queryKey: ["rg_risk_register_lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_risk_register")
        .select("id,risk_external_id,risk_event")
        .eq("is_archived", false)
        .order("risk_external_id");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      action_title: action?.action_title ?? "",
      linked_risk_id: action?.linked_risk_id ?? defaultRiskId ?? "",
      baseline: action?.baseline ?? "",
      evaluate: action?.evaluate ?? "",
      specific: action?.specific ?? "",
      measurable: action?.measurable ?? "",
      achievable: action?.achievable ?? "",
      relevant: action?.relevant ?? "",
      time_based: action?.time_based ?? "",
      responsible_person_role: action?.responsible_person_role ?? "",
      resources_needed: action?.resources_needed ?? "",
      due_date: action?.due_date ?? "",
      status: action?.status ?? "Not Started",
      progress_notes: action?.progress_notes ?? "",
      date_completed: action?.date_completed ?? "",
      club_id: action?.club_id ?? "",
      team_id: action?.team_id ?? "",
      evidence_notes: action?.evidence_notes ?? "",
    },
  });

  const selectedClub = form.watch("club_id") || "";
  const teamDisabled = !selectedClub;

  const statuses = dropdowns.action_status ?? [];

  const riskOptions = useMemo(
    () => risks.map((r: any) => ({ label: `${r.risk_external_id} — ${r.risk_event}`, value: r.id })),
    [risks],
  );

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: any = { ...values };
      for (const k of Object.keys(payload)) {
        if (payload[k] === "" || payload[k] === NONE) payload[k] = null;
      }
      if (isEdit && action) {
        const { error } = await supabase.from("rg_be_smart_actions").update(payload).eq("id", action.id);
        if (error) throw error;
      } else {
        if (!payload.status) delete payload.status;
        const { error } = await supabase.from("rg_be_smart_actions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_be_smart_actions"] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
      toast({ title: isEdit ? "Action updated" : "Action created" });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit BE SMART Action" : "Add BE SMART Action"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Action ID">
              {isEdit ? (
                <Input value={action!.action_external_id} disabled readOnly />
              ) : (
                <>
                  <Input value="(auto)" disabled readOnly />
                  <p className="text-xs text-muted-foreground mt-1">
                    Action ID is generated automatically when saved.
                  </p>
                </>
              )}
            </Field>
            <Field label="Status">
              <SelectField name="status" form={form} options={statuses.map((o: any) => o.value)} />
            </Field>
          </div>

          <Field label="Action / Goal Title" required>
            <Input {...form.register("action_title")} />
          </Field>

          <Field label="Linked Risk">
            <SelectField name="linked_risk_id" form={form} options={riskOptions} allowClear />
          </Field>

          <fieldset className="border rounded-md p-3 space-y-3">
            <legend className="px-1 text-sm font-medium">BE SMART</legend>
            <Field label="B — Base Line"><Textarea rows={2} {...form.register("baseline")} /></Field>
            <Field label="E — Evaluate"><Textarea rows={2} {...form.register("evaluate")} /></Field>
            <Field label="S — Specific"><Textarea rows={2} {...form.register("specific")} /></Field>
            <Field label="M — Measurable"><Textarea rows={2} {...form.register("measurable")} /></Field>
            <Field label="A — Achievable"><Textarea rows={2} {...form.register("achievable")} /></Field>
            <Field label="R — Relevant"><Textarea rows={2} {...form.register("relevant")} /></Field>
            <Field label="T — Time-based"><Textarea rows={2} {...form.register("time_based")} /></Field>
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Responsible Person / Role">
              <Input {...form.register("responsible_person_role")} />
            </Field>
            <Field label="Resources Needed">
              <Input {...form.register("resources_needed")} />
            </Field>
            <Field label="Due Date"><Input type="date" {...form.register("due_date")} /></Field>
            <Field label="Date Completed"><Input type="date" {...form.register("date_completed")} /></Field>
          </div>

          <Field label="Progress Notes">
            <Textarea rows={2} {...form.register("progress_notes")} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Club (optional)">
              <SelectField
                name="club_id"
                form={form}
                options={clubs.map((c) => ({ label: c.name, value: c.id }))}
                allowClear
                onChangeExtra={() => form.setValue("team_id", "", { shouldDirty: true })}
              />
            </Field>
            <Field label="Team (optional)">
              {teamDisabled ? (
                <Input value="" disabled readOnly placeholder="Select a Club first" />
              ) : (
                <SelectField
                  name="team_id"
                  form={form}
                  options={teams.map((t) => ({ label: t.name, value: t.id }))}
                  allowClear
                />
              )}
            </Field>
          </div>

          <Field label="Evidence / Notes">
            <Textarea rows={2} {...form.register("evidence_notes")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SelectField({
  name, form, options, allowClear, placeholder, onChangeExtra,
}: {
  name: any;
  form: any;
  options: Array<string | { label: string; value: string }>;
  allowClear?: boolean;
  placeholder?: string;
  onChangeExtra?: () => void;
}) {
  const raw = form.watch(name) ?? "";
  return (
    <Select
      value={raw || undefined}
      onValueChange={(v) => {
        const next = v === NONE ? "" : v;
        form.setValue(name, next, { shouldDirty: true });
        onChangeExtra?.();
      }}
    >
      <SelectTrigger><SelectValue placeholder={placeholder ?? "—"} /></SelectTrigger>
      <SelectContent>
        {allowClear && <SelectItem value={NONE}>—</SelectItem>}
        {options.map((o) => {
          const label = typeof o === "string" ? o : o.label;
          const val = typeof o === "string" ? o : o.value;
          return <SelectItem key={val} value={val}>{label}</SelectItem>;
        })}
      </SelectContent>
    </Select>
  );
}
