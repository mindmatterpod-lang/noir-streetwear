import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";

interface Row {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
  products: { name: string } | null;
}

/** Moderation: admins can remove a review (allowed by the reviews table's row-level security). */
export function ReviewsPanel() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await db
        .from("reviews")
        .select("id, author_name, rating, title, body, created_at, products(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });
  if (isLoading) return <p role="status">Loading…</p>;
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  return (
    <ul className="divide-y divide-border border border-border text-sm">
      {data.map((r) => (
        <li key={r.id} className="flex items-start justify-between gap-4 p-4">
          <div>
            <p className="font-medium">
              {r.products?.name ?? "Product"} · {r.rating}/5
              {r.title ? ` · ${r.title}` : ""}
            </p>
            <p className="mt-1 text-muted-foreground">{r.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.author_name} · {new Date(r.created_at).toLocaleDateString()}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!window.confirm("Remove this review?")) return;
              const { error } = await db.from("reviews").delete().eq("id", r.id);
              if (error) toast.error(error.message);
              else void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
            }}
          >
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}
