export type RiskRating = "Low" | "Medium" | "High" | "Very High";

export const RATINGS: RiskRating[] = ["Low", "Medium", "High", "Very High"];

export function ratingClass(rating?: string | null): string {
  switch (rating) {
    case "Low":
      return "bg-risk-low-bg text-risk-low border border-risk-low/30";
    case "Medium":
      return "bg-risk-medium-bg text-risk-medium border border-risk-medium/30";
    case "High":
      return "bg-risk-high-bg text-risk-high border border-risk-high/30";
    case "Very High":
      return "bg-risk-veryhigh-bg text-risk-veryhigh border border-risk-veryhigh/30";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

export function ratingCellClass(rating?: string | null): string {
  switch (rating) {
    case "Low":
      return "bg-risk-low-bg text-risk-low";
    case "Medium":
      return "bg-risk-medium-bg text-risk-medium";
    case "High":
      return "bg-risk-high-bg text-risk-high";
    case "Very High":
      return "bg-risk-veryhigh-bg text-risk-veryhigh";
    default:
      return "bg-muted text-muted-foreground";
  }
}
