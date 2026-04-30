import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRiskMatrix } from "@/hooks/useRiskMatrix";
import { ratingCellClass } from "@/lib/risk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

type Guidance = { id: string; section_key: string; title: string; content: string; sort_order: number | null };

export default function RiskMatrixPage() {
  const { data: matrix = [], isLoading } = useRiskMatrix();
  const { data: guidance = [] } = useQuery({
    queryKey: ["rg_guidance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rg_risk_guidance_sections")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Guidance[];
    },
  });

  const likelihoods = Array.from(new Set(matrix.map((m) => m.likelihood_score))).sort();
  const consequences = Array.from(new Set(matrix.map((m) => m.consequence_score))).sort();

  const labelFor = (axis: "L" | "C", score: number) => {
    const m = matrix.find((r) => (axis === "L" ? r.likelihood_score === score : r.consequence_score === score));
    return axis === "L" ? m?.likelihood_label : m?.consequence_label;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Risk Matrix &amp; Guidance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read-only view of the 5×5 risk matrix used to calculate inherent and residual ratings.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-accent bg-accent/50 text-accent-foreground px-3 py-2 text-sm">
        <Info className="h-4 w-4 mt-0.5" />
        <span>Edit mode for the matrix and guidance becomes available in a later phase.</span>
      </div>

      <Card>
        <CardHeader><CardTitle>5 × 5 Risk Matrix</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground text-sm">Loading matrix…</div>
          ) : (
            <div className="overflow-auto">
              <table className="border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    <th className="p-2 text-left font-medium text-muted-foreground" colSpan={consequences.length}>
                      Consequence →
                    </th>
                  </tr>
                  <tr>
                    <th className="p-2 text-left font-medium text-muted-foreground">Likelihood ↓</th>
                    {consequences.map((c) => (
                      <th key={c} className="p-2 text-center font-medium border bg-muted/40 min-w-[110px]">
                        {c}. {labelFor("C", c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {likelihoods.map((l) => (
                    <tr key={l}>
                      <th className="p-2 text-left font-medium border bg-muted/40 whitespace-nowrap">
                        {l}. {labelFor("L", l)}
                      </th>
                      {consequences.map((c) => {
                        const cell = matrix.find((m) => m.likelihood_score === l && m.consequence_score === c);
                        return (
                          <td key={c} className={`border p-3 text-center font-semibold ${ratingCellClass(cell?.rating)}`}>
                            {cell?.rating ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {guidance.map((g) => (
          <Card key={g.id}>
            <CardHeader><CardTitle className="text-base">{g.title}</CardTitle></CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans leading-relaxed">{g.content}</pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
