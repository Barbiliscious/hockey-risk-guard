import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "list_risk_matrix",
  title: "List risk matrix ratings",
  description:
    "Return the current Hockey Risk Guard risk matrix: the combinations of likelihood and consequence scores and the rating (Low / Medium / High / Very High) they map to.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      return {
        content: [{ type: "text", text: "Server is missing Supabase configuration." }],
        isError: true,
      };
    }
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase
      .from("rg_risk_matrix")
      .select("likelihood_score, consequence_score, rating")
      .order("likelihood_score")
      .order("consequence_score");

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { matrix: data ?? [] },
    };
  },
});
