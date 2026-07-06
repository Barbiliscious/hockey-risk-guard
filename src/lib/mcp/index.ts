import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listRiskMatrixTool from "./tools/list-risk-matrix";

export default defineMcp({
  name: "hockey-risk-guard-mcp",
  title: "Hockey Risk Guard",
  version: "0.1.0",
  instructions:
    "Read-only tools for the Hockey Risk Guard app. Use `echo` to verify connectivity, and `list_risk_matrix` to fetch the likelihood x consequence rating matrix.",
  tools: [echoTool, listRiskMatrixTool],
});
