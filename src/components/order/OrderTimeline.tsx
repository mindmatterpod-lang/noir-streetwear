import { buildTimeline } from "@/lib/order-status";

/** Progress built only from the order's real status value. */
export function OrderTimeline({ status }: { status: string }) {
  const { steps, cancelled } = buildTimeline(status);
  if (cancelled)
    return (
      <p role="status" className="border border-destructive p-4 text-sm text-destructive">
        This order was cancelled.
      </p>
    );
  return (
    <ol aria-label="Order progress" className="grid gap-5 sm:grid-cols-4 sm:gap-0">
      {steps.map((step, i) => (
        <li
          key={step.key}
          aria-current={step.state === "current" ? "step" : undefined}
          className="relative flex items-center gap-4 sm:flex-col sm:items-start sm:gap-3"
        >
          {i < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={`absolute left-[7px] top-5 h-[calc(100%+1.25rem-0.5rem)] w-px sm:left-5 sm:top-[7px] sm:h-px sm:w-[calc(100%-1.25rem)] ${steps[i + 1]!.state === "upcoming" ? "bg-border" : "bg-foreground"}`}
            />
          )}
          <span
            aria-hidden="true"
            className={`relative z-10 size-4 shrink-0 rounded-full border ${step.state === "done" ? "border-foreground bg-foreground" : step.state === "current" ? "border-foreground bg-background ring-4 ring-foreground/20" : "border-border bg-background"}`}
          />
          <span
            className={`text-xs uppercase tracking-[0.16em] ${step.state === "upcoming" ? "text-muted-foreground" : ""}`}
          >
            {step.label}
            <span className="sr-only">
              {step.state === "done" ? " (complete)" : step.state === "current" ? " (current)" : ""}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
