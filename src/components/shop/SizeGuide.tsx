import { Ruler } from "lucide-react";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { POLICIES } from "@/lib/policies";
import type { ProductSize } from "@/types/store";

/**
 * Size guide dialog (full screen on phones). The measurements come from the store's size-guide policy, so the
 * product page and the policy page can never disagree. The chart is chest/waist for all pieces: category-specific
 * charts need real measurements from the brand (see the delivery report).
 */
export function SizeGuide({
  selected,
  onSelect,
  className = "",
}: {
  selected: ProductSize | null;
  /** When omitted, the guide is read-only (no Select buttons). */
  onSelect?: ((size: ProductSize) => void) | undefined;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const policy = POLICIES["size-guide"];
  if (!policy?.table) return null;
  const { head, rows } = policy.table;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.18em] underline underline-offset-4 ${className}`}
      >
        <Ruler className="size-4" aria-hidden="true" />
        Size guide
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-[100dvh] max-w-none content-start overflow-y-auto rounded-none sm:h-auto sm:max-h-[90vh] sm:max-w-xl sm:rounded-none">
          <DialogHeader>
            <DialogTitle className="display-heading text-4xl">Size guide</DialogTitle>
            <DialogDescription>
              {selected
                ? `You have selected size ${selected}.`
                : "Find your size, then pick it below."}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border border-border text-sm">
              <caption className="sr-only">Body measurements by size</caption>
              <thead className="bg-secondary text-left text-xs uppercase tracking-[0.14em]">
                <tr>
                  {head.map((h) => (
                    <th key={h} scope="col" className="p-3 font-medium">
                      {h}
                    </th>
                  ))}
                  {onSelect && (
                    <th scope="col" className="p-3">
                      <span className="sr-only">Choose size</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const size = row[0] as ProductSize;
                  const on = size === selected;
                  return (
                    <tr key={size} className={`border-t border-border ${on ? "bg-secondary" : ""}`}>
                      {row.map((cell, i) =>
                        i === 0 ? (
                          <th key={i} scope="row" className="p-3 font-medium">
                            {cell}
                          </th>
                        ) : (
                          <td key={i} className="p-3 tabular-nums">
                            {cell}
                          </td>
                        ),
                      )}
                      {onSelect && (
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              onSelect(size);
                              setOpen(false);
                            }}
                            aria-label={`Select size ${size}`}
                            className="min-h-11 border border-border px-3 text-xs uppercase tracking-[0.14em] hover:bg-primary hover:text-primary-foreground"
                          >
                            {on ? "Selected" : "Select"}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {policy.sections.map((s) => (
            <section key={s.heading}>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.24em]">{s.heading}</h3>
              {s.body.map((p) => (
                <p key={p} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
