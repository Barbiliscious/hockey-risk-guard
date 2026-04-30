import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDropdowns } from "@/hooks/useDropdowns";
import { useCreateReview } from "@/hooks/useCreateReview";
import { useToast } from "@/hooks/use-toast";

export function RiskReviewDialog({
  open,
  onOpenChange,
  riskId,
  riskExternalId,
  onAfterSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  riskId: string;
  riskExternalId?: string;
  onAfterSave?: (outcome: string) => void;
}) {
  const { data: dropdowns = {} } = useDropdowns();
  const outcomes = (dropdowns.review_outcome ?? []).map((o: any) => o.value);
  const [outcome, setOutcome] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const create = useCreateReview();
  const { toast } = useToast();

  const submit = async () => {
    if (!outcome) {
      toast({ title: "Outcome is required", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({ riskId, outcome, notes });
      toast({ title: "Review recorded" });
      onOpenChange(false);
      const o = outcome;
      setOutcome("");
      setNotes("");
      onAfterSave?.(o);
    } catch (e: any) {
      toast({ title: "Could not record review", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Risk {riskExternalId ? `· ${riskExternalId}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Review Outcome <span className="text-destructive">*</span></Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
              <SelectContent>
                {outcomes.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Review Notes</Label>
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            A snapshot of the current ratings, target and status will be saved with this review.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Save Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
