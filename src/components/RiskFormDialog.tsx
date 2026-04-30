import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDropdowns } from "@/hooks/useDropdowns";
import { useTeams } from "@/hooks/useTeams";
import { useRiskMatrix, lookupRating } from "@/hooks/useRiskMatrix";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Risk } from "@/pages/RiskRegisterPage";

const schema = z.object({
  risk_external_id: z.string().min(1, "Risk ID required"),
  risk_event: z.string().min(1, "Required"),
  risk_category: z.string().optional(),
  risk_type: z.string().optional(),
  level: z.string().optional(),
  consequences: z.string().optional(),
  inherent_likelihood_score: z.coerce.number().min(1).max(5).optional().nullable(),
  inherent_consequence_score: z.coerce.number().min(1).max(5).optional().nullable(),
  current_risk_summary: z.string().optional(),
  controls_in_place: z.string().optional(),
  residual_likelihood_score: z.coerce.number().min(1).max(5).optional().nullable(),
  residual_consequence_score: z.coerce.number().min(1).max(5).optional().nullable(),
  risk_target_rating: z.string().optional(),
  risk_target_description: z.string().optional(),
  treatment_plan: z.string().optional(),
  risk_owner: z.string().optional(),
  status: z.string().optional(),
  review_frequency: z.string().optional(),
  next_review_date: z.string().optional(),
  team_id: z.string().optional(),
  evidence_notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function RiskFormDialog({
  open,
  onOpenChange,
  risk,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  risk: Risk | null;
}) {
  const { data: dropdowns = {} } = useDropdowns();
  const { data: teams = [] } = useTeams();
  const { data: matrix = [] } = useRiskMatrix();
  const qc = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      risk_external_id: risk?.risk_external_id ?? "",
      risk_event: risk?.risk_event ?? "",
      risk_category: risk?.risk_category ?? "",
      risk_type: risk?.risk_type ?? "",
      level: risk?.level ?? "",
      consequences: risk?.consequences ?? "",
      inherent_likelihood_score: risk?.inherent_likelihood_score ?? null,
      inherent_consequence_score: risk?.inherent_consequence_score ?? null,
      current_risk_summary: risk?.current_risk_summary ?? "",
      controls_in_place: risk?.controls_in_place ?? "",
      residual_likelihood_score: risk?.residual_likelihood_score ?? null,
      residual_consequence_score: risk?.residual_consequence_score ?? null,
      risk_target_rating: risk?.risk_target_rating ?? "",
      risk_target_description: risk?.risk_target_description ?? "",
      treatment_plan: risk?.treatment_plan ?? "",
      risk_owner: risk?.risk_owner ?? "",
      status: risk?.status ?? "Open",
      review_frequency: risk?.review_frequency ?? "",
      next_review_date: risk?.next_review_date ?? "",
      team_id: risk?.team_id ?? "",
      evidence_notes: risk?.evidence_notes ?? "",
    },
  });

  const watch = form.watch();
  const inherentRating = useMemo(
    () => lookupRating(matrix, watch.inherent_likelihood_score ?? undefined, watch.inherent_consequence_score ?? undefined),
    [matrix, watch.inherent_likelihood_score, watch.inherent_consequence_score],
  );
  const residualRating = useMemo(
    () => lookupRating(matrix, watch.residual_likelihood_score ?? undefined, watch.residual_consequence_score ?? undefined),
    [matrix, watch.residual_likelihood_score, watch.residual_consequence_score],
  );

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: any = { ...values };
      // Normalize empty strings to null
      for (const k of Object.keys(payload)) if (payload[k] === "") payload[k] = null;

      if (risk) {
        const { error } = await supabase.from("rg_risk_register").update(payload).eq("id", risk.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rg_risk_register").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rg_risk_register"] });
      qc.invalidateQueries({ queryKey: ["rg_audit_log"] });
      toast({ title: risk ? "Risk updated" : "Risk created" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    },
  });

  const cats = dropdowns.risk_category ?? [];
  const types = dropdowns.risk_type ?? [];
  const levels = dropdowns.level ?? [];
  const statuses = dropdowns.risk_status ?? [];
  const owners = dropdowns.risk_owner ?? [];
  const freqs = dropdowns.review_frequency ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{risk ? "Edit Risk" : "Add Risk"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Risk ID" required>
              <Input {...form.register("risk_external_id")} />
            </Field>
            <Field label="Status">
              <SelectField name="status" form={form} options={statuses.map((o) => o.value)} />
            </Field>
            <Field label="Risk Category">
              <SelectField name="risk_category" form={form} options={cats.map((o) => o.value)} />
            </Field>
            <Field label="Risk Type">
              <SelectField name="risk_type" form={form} options={types.map((o) => o.value)} />
            </Field>
            <Field label="Level">
              <SelectField name="level" form={form} options={levels.map((o) => o.value)} />
            </Field>
            <Field label="Risk Owner">
              <SelectField name="risk_owner" form={form} options={owners.map((o) => o.value)} />
            </Field>
          </div>

          <Field label="Risk or Event" required>
            <Textarea rows={2} {...form.register("risk_event")} />
          </Field>
          <Field label="Consequences">
            <Textarea rows={2} {...form.register("consequences")} />
          </Field>

          <fieldset className="border rounded-md p-3">
            <legend className="px-1 text-sm font-medium">Inherent Risk</legend>
            <div className="grid grid-cols-3 gap-3 items-end">
              <Field label="Likelihood (1–5)">
                <ScoreSelect name="inherent_likelihood_score" form={form} />
              </Field>
              <Field label="Consequence (1–5)">
                <ScoreSelect name="inherent_consequence_score" form={form} />
              </Field>
              <div>
                <Label className="text-xs">Calculated</Label>
                <div className="h-10 flex items-center"><RiskBadge rating={inherentRating} /></div>
              </div>
            </div>
          </fieldset>

          <Field label="Current Risk (plain summary)">
            <Textarea rows={2} {...form.register("current_risk_summary")} />
          </Field>
          <Field label="Controls in Place">
            <Textarea rows={2} {...form.register("controls_in_place")} />
          </Field>

          <fieldset className="border rounded-md p-3">
            <legend className="px-1 text-sm font-medium">Residual Risk</legend>
            <div className="grid grid-cols-3 gap-3 items-end">
              <Field label="Likelihood (1–5)">
                <ScoreSelect name="residual_likelihood_score" form={form} />
              </Field>
              <Field label="Consequence (1–5)">
                <ScoreSelect name="residual_consequence_score" form={form} />
              </Field>
              <div>
                <Label className="text-xs">Calculated</Label>
                <div className="h-10 flex items-center"><RiskBadge rating={residualRating} /></div>
              </div>
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Risk Target Rating">
              <SelectField name="risk_target_rating" form={form} options={["Low", "Medium", "High", "Very High"]} />
            </Field>
            <Field label="Review Frequency">
              <SelectField name="review_frequency" form={form} options={freqs.map((o) => o.value)} />
            </Field>
          </div>
          <Field label="Risk Target Description">
            <Textarea rows={2} {...form.register("risk_target_description")} />
          </Field>
          <Field label="Treatment Plan">
            <Textarea rows={2} {...form.register("treatment_plan")} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Next Review Date">
              <Input type="date" {...form.register("next_review_date")} />
            </Field>
            <Field label="Team (optional)">
              <SelectField name="team_id" form={form} options={teams.map((t) => ({ label: t.name, value: t.id }))} />
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

function ScoreSelect({ name, form }: { name: any; form: any }) {
  const value = form.watch(name);
  return (
    <Select
      value={value ? String(value) : ""}
      onValueChange={(v) => form.setValue(name, v ? Number(v) : null, { shouldDirty: true })}
    >
      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
      <SelectContent>
        {[1, 2, 3, 4, 5].map((n) => (
          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SelectField({
  name,
  form,
  options,
}: {
  name: any;
  form: any;
  options: Array<string | { label: string; value: string }>;
}) {
  const value = form.watch(name) ?? "";
  return (
    <Select value={value} onValueChange={(v) => form.setValue(name, v, { shouldDirty: true })}>
      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const label = typeof o === "string" ? o : o.label;
          const val = typeof o === "string" ? o : o.value;
          return <SelectItem key={val} value={val}>{label}</SelectItem>;
        })}
      </SelectContent>
    </Select>
  );
}
