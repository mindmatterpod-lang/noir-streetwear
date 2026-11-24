import { Link } from "@tanstack/react-router";

/** Empty-bag state shared by the drawer and the cart page. */
export function EmptyBag({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col items-start py-16 sm:py-24">
      <h2 className="display-heading text-5xl">Your bag is empty.</h2>
      <p className="mt-4 text-sm text-muted-foreground">Your next favourite piece is waiting.</p>
      <Link
        to="/shop"
        search={{ category: "All pieces" }}
        {...(onNavigate ? { onClick: onNavigate } : {})}
        className="mt-8 inline-flex min-h-12 items-center bg-primary px-8 text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90"
      >
        Explore collection
      </Link>
    </div>
  );
}
