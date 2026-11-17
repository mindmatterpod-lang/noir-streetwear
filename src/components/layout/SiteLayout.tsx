import { Link } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import type { ReactNode } from "react";

import { CartDrawer } from "@/components/cart/CartDrawer";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { setCartOpen } from "@/hooks/use-cart-drawer";
import { useProducts } from "@/lib/products-api";
import { SITE_NAME } from "@/lib/site-config";
import { CORE_CATEGORIES } from "@/types/store";

const POLICY_LINKS: [string, string][] = [
  ["shipping-returns", "Shipping & returns"],
  ["size-guide", "Size guide"],
  ["contact", "Contact & FAQ"],
  ["privacy", "Privacy"],
  ["terms", "Terms"],
];

function NavLinks({ className }: { className?: string }) {
  return (
    <nav className={className} aria-label="Shop categories">
      <Link to="/shop" search={{ category: "All pieces" }} className="hover:opacity-60">
        All pieces
      </Link>
      {CORE_CATEGORIES.map((category) => (
        <Link key={category} to="/shop" search={{ category }} className="hover:opacity-60">
          {category}
        </Link>
      ))}
    </nav>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const { count } = useCart();
  const { user } = useAuth();
  useProducts();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <button aria-label="Open menu" className="md:hidden">
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left">
                <NavLinks className="mt-10 flex flex-col gap-5 px-6 text-lg uppercase tracking-widest" />
              </SheetContent>
            </Sheet>
            <Link to="/" className="text-xl font-black uppercase tracking-[0.3em]">
              Noir
            </Link>
          </div>
          <NavLinks className="hidden gap-8 text-xs uppercase tracking-widest md:flex" />
          <div className="flex items-center gap-4">
            <Link to="/shop" search={{ category: "All pieces" }} aria-label="Search">
              <Search className="size-5" />
            </Link>
            <Link to="/wishlist" aria-label="Wishlist">
              <Heart className="size-5" />
            </Link>
            <ThemeToggle />
            <Link to={user ? "/account" : "/login"} aria-label="Account">
              <User className="size-5" />
            </Link>
            <button
              aria-label={`Open bag, ${count} items`}
              onClick={() => setCartOpen(true)}
              className="relative"
            >
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-10 text-center text-xs uppercase tracking-widest text-muted-foreground">
        <p className="font-black tracking-[0.3em] text-foreground">Noir</p>
        <p className="mt-2">Hoodies · Tracksuits · Jackets · Trousers · Shirts</p>
        <nav aria-label="Policies" className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {POLICY_LINKS.map(([slug, label]) => (
            <Link
              key={slug}
              to="/policies/$slug"
              params={{ slug }}
              className="hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="mt-4">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </footer>
      <CartDrawer />
    </div>
  );
}
