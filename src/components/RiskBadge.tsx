import { ratingClass } from "@/lib/risk";
import { cn } from "@/lib/utils";

export function RiskBadge({ rating, className }: { rating?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        ratingClass(rating),
        className,
      )}
    >
      {rating ?? "—"}
    </span>
  );
}
