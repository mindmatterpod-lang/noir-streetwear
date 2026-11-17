import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/db";

interface Review {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
}

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5 stars`} className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`size-4 ${n <= Math.round(value) ? "fill-current" : "text-muted-foreground"}`}
        />
      ))}
    </span>
  );
}

export function Reviews({
  productId,
  productName,
}: {
  productId: string | undefined;
  productName: string;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await db
        .from("reviews")
        .select("id, author_name, rating, title, body, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data as Review[];
    },
  });
  if (!productId) return null;
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await db.from("reviews").insert({
      product_id: productId,
      user_id: user.id,
      author_name: (user.email ?? "Customer").split("@")[0],
      rating,
      title: title.trim() || null,
      body: body.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(
        /row-level security/i.test(error.message)
          ? "Only customers who bought this item can review it."
          : /duplicate|unique/i.test(error.message)
            ? "You already reviewed this item."
            : error.message,
      );
      return;
    }
    toast.success("Thanks for your review!");
    setTitle("");
    setBody("");
    void qc.invalidateQueries({ queryKey: ["reviews", productId] });
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6" aria-labelledby="reviews-heading">
      <h2
        id="reviews-heading"
        className="border-t border-border pt-10 text-sm uppercase tracking-widest"
      >
        Reviews
      </h2>
      {reviews.length > 0 && (
        <p className="mt-2 flex items-center gap-2 text-sm">
          <Stars value={average} /> {average.toFixed(1)} · {reviews.length}{" "}
          {reviews.length === 1 ? "review" : "reviews"}
        </p>
      )}
      {reviews.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
      )}
      <ul className="mt-6 space-y-6">
        {reviews.map((r) => (
          <li key={r.id} className="text-sm">
            <Stars value={r.rating} />
            {r.title && <p className="mt-1 font-medium">{r.title}</p>}
            <p className="mt-1 text-muted-foreground">{r.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.author_name} · Verified buyer · {new Date(r.created_at).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>
      {user ? (
        <form onSubmit={submit} className="mt-8 max-w-lg space-y-3 border border-border p-4">
          <p className="text-sm font-medium">Review {productName}</p>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} stars`}
                onClick={() => setRating(n)}
              >
                <Star
                  className={`size-6 ${n <= rating ? "fill-current" : "text-muted-foreground"}`}
                />
              </button>
            ))}
          </div>
          <Input
            placeholder="Headline (optional)"
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            required
            minLength={5}
            maxLength={2000}
            placeholder="What did you think?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-24 w-full border border-input bg-background p-3 text-sm"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Posting…" : "Post review"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Only customers who bought this item can review it.
          </p>
        </form>
      ) : (
        <p className="mt-6 text-sm">
          <Link to="/login" search={{ redirect: "/shop" }} className="underline">
            Sign in
          </Link>{" "}
          to review items you've bought.
        </p>
      )}
    </section>
  );
}
