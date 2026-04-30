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
import type { QiItem } from "@/hooks/useQiItems";

const NONE = "__none__";

const schema = z.object({
  description: z.string().min(1, "Required"),
  source: z.string().optional(),
  qi_type: z.string().optional(),
  area: z.string().optional(),
  reason_background: z.string().optional(),
  linked_risk_id: z.string().optional(),
  linked_action_id: z.string().optional(),
  related_project_review: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  recommended_action: z.string().optional(),
  owner_reviewer: z.string().optional(),
  review_trigger: z.string().optional(),
  review_date: z.string().optional(),
  outcome_decision: z.string().optional(),
  date_closed: z.string().optional(),
  club_id: z.string().optional(),
  team_id: z.string().optional(),
  evidence_notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function QiItemFormDialog({
  open,
  onOpenChange,
  item,
  defaultRiskId,
  defaultActionId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: QiItem | null;
  defaultRiskId?: string | null;
  defaultActionId?: string | null;
}) {
  const { data: dropdowns = {} } = useDropdowns();
  const { data: teams = [] } = useTeams();
  const { data: clubs = [] } = useClubs();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!item;

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

  const { data: actions = [] } = useQuery({
    queryKey: ["rg_be_smart_actions_lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_be_smart_actions")
        .select("id,action_external_id,action_title")
        .eq("is_archived", false)
        .order("action_external_id");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      description: item?.description ?? "",
      source: item?.source ?? "",
      qi_type: item?.qi_type ?? "",
      area: item?.area ?? "",
      reason_background: item?.reason_background ?? "",
      linked_risk_id: item?.linked_risk_id ?? defaultRiskId ?? "",
      linked_action_id: item?.linked_action_id ?? defaultActionId ?? "",
      related_project_review: item?.related_project_review ?? "",
      priority: item?.priority ?? "",
      status: item?.status ?? "Logged",
      recommended_action: item?.recommended_action ?? "",
      owner_reviewer: item?.owner_reviewer ?? "",
      review_trigger: item?.review_trigger ?? "",
      review_date: item?.review_date ?? "",
      outcome_decision: item?.outcome_decision ?? "",
      date_closed: item?.date_closed ?? "",
      club_id: item?.club_id ?? "",
      team_id: item?.team_id ?? "",
      evidence_notes: item?.evidence_notes ?? "",
    },
  });

  const selectedClub = form.watch("club_id") || "";
  const teamDisabled = !selectedClub;

  const sources = dropdowns.qi_source ?? [];
  const types = dropdowns.qi_type ?? [];
  const statuses = dropdowns.qi_status ?? [];
  const priorities = dropdowns.qi_priority ?? [];
  const projects = dropdowns.related_project_review ?? [];

  const riskOptions = useMemo(
    () => risks.map((r: any) => ({ label: `${r.risk_external_id} — ${r.risk_event}`, value: r.id })),
    [risks],
  );
  const actionOptions = useMemo(
    () => actions.map((a: any) => ({ label: `${a.action_external_id} — ${a.action_title}`, value: a.id })),
    [actions],
  );

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: any = { ...values };
      for (const k of Object.keys(payload)) {
        if (payload[k] === "" || payload[k] === NONE) payload[k] = null;
      }
      if (isEdit && item) {
        const { error } = await supabase.from("rg_quality_improvement_items").update(payload).eq("id", item.id);
        if (error) throw error;
      } else {
        if (!payload.status) delete payload.status;
        const { error } = await supabase.from("rg_quality_improvement_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_qi_items"] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
      toast({ title: isEdit ? "QI item updated" : "QI item created" });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "Could not save", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Quality Improvement Item" : "Add Quality Improvement Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="QI ID">
              {isEdit ? (
                <Input value={item!.qi_external_id} disabled readOnly />
              ) : (
                <>
                  <Input value="(auto)" disabled readOnly />
                  <p className="text-xs text-muted-foreground mt-1">
                    QI ID is generated automatically when saved.
                  </p>
                </>
              )}
            </Field>
            <Field label="Status">
              <SelectField name="status" form={form} options={statuses.map((o: any) => o.value)} />
            </Field>
            <Field label="Source">
              <SelectField name="source" form={form} options={sources.map((o: any) => o.value)} allowClear />
            </Field>
            <Field label="Type">
              <SelectField name="qi_type" form={form} options={types.map((o: any) => o.value)} allowClear />
            </Field>
            <Field label="Area">
              <Input {...form.register("area")} />
            </Field>
            <Field label="Priority">
              <SelectField name="priority" form={form} options={priorities.map((o: any) => o.value)} allowClear />
            </Field>
          </div>

          <Field label="Description" required>
            <Textarea rows={2} {...form.register("description")} />
          </Field>
          <Field label="Reason / Background">
            <Textarea rows={2} {...form.register("reason_background")} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Linked Risk">
              <SelectField name="linked_risk_id" form={form} options={riskOptions} allowClear />
            </Field>
            <Field label="Linked BE SMART Action">
              <SelectField name="linked_action_id" form={form} options={actionOptions} allowClear />
            </Field>
            <Field label="Related Project / Review">
              <SelectField name="related_project_review" form={form} options={projects.map((o: any) => o.value)} allowClear />
            </Field>
            <Field label="Owner / Reviewer">
              <Input {...form.register("owner_reviewer")} />
            </Field>
            <Field label="Review Trigger">
              <Input {...form.register("review_trigger")} />
            </Field>
            <Field label="Review Date">
              <Input type="date" {...form.register("review_date")} />
            </Field>
          </div>

          <Field label="Recommended Action">
            <Textarea rows={2} {...form.register("recommended_action")} />
          </Field>
          <Field label="Outcome / Decision">
            <Textarea rows={2} {...form.register("outcome_decision")} />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Date Closed">
              <Input type="date" {...form.register("date_closed")} />
            </Field>
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
