import { Link } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { CartDrawer } from "@/components/cart/CartDrawer";
import { Logo } from "@/components/brand/Logo";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { setCartOpen } from "@/hooks/use-cart-drawer";
import { useProducts } from "@/lib/products-api";
import { useStoreSettings } from "@/lib/store-settings";
import { SITE_NAME, SOCIAL_LINKS } from "@/lib/site-config";
import { CORE_CATEGORIES } from "@/types/store";

const HELP_LINKS: [string, string][] = [
  ["contact", "Contact & FAQ"],
  ["size-guide", "Size guide"],
  ["shipping-returns", "Delivery & returns"],
];
const LEGAL_LINKS: [string, string][] = [
  ["privacy", "Privacy"],
  ["terms", "Terms"],
];

const NAV_CLASS =
  "link-underline text-[11px] font-medium uppercase tracking-[0.22em] text-foreground/80 transition-colors hover:text-foreground";

/** The three primary links, shared by the desktop bar. "Collections" jumps to the category grid on the homepage. */
function PrimaryNav({ className }: { className?: string }) {
  return (
    <nav className={className} aria-label="Primary">
      <Link to="/shop" search={{ category: "All pieces" }} className={NAV_CLASS}>
        Shop
      </Link>
      <Link to="/shop" search={{ sort: "newest" }} className={NAV_CLASS}>
        New Arrivals
      </Link>
      <Link to="/" hash="collections" className={NAV_CLASS}>
        Collections
      </Link>
    </nav>
  );
}

function MobileMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const close = () => onOpenChange(false);
  const big = "block py-3 font-display text-4xl uppercase leading-none tracking-wide";
  const small = "block py-3 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground";
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="flex w-[85%] max-w-sm flex-col overflow-y-auto p-0 data-[state=closed]:duration-300 data-[state=open]:duration-300"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Browse the NOWHERE collection</SheetDescription>
        <div className="flex h-16 items-center border-b border-border px-5">
          <Logo className="h-[15px]" />
        </div>
        <nav aria-label="Mobile primary" className="flex-1 px-5 py-6">
          <Link to="/shop" search={{ category: "All pieces" }} onClick={close} className={big}>
            Shop
          </Link>
          <Link to="/shop" search={{ sort: "newest" }} onClick={close} className={big}>
            New Arrivals
          </Link>
          <Link to="/" hash="collections" onClick={close} className={big}>
            Collections
          </Link>
          <div className="mt-6 border-t border-border pt-4">
            {CORE_CATEGORIES.map((category) => (
              <Link
                key={category}
                to="/shop"
                search={{ category }}
                onClick={close}
                className={small}
              >
                {category}
              </Link>
            ))}
          </div>
        </nav>
        <div className="flex items-center justify-between border-t border-border px-5 py-4 text-xs font-medium uppercase tracking-[0.22em]">
          <Link to="/wishlist" onClick={close} className="py-2">
            Wishlist
          </Link>
          <Link to={user ? "/account" : "/login"} onClick={close} className="py-2">
            {user ? "Account" : "Sign in"}
          </Link>
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BagButton() {
  const { count } = useCart();
  return (
    <button
      aria-label={`Open bag, ${count} items`}
      onClick={() => setCartOpen(true)}
      className="relative flex size-11 items-center justify-center"
    >
      <ShoppingBag className="size-5" />
      {count > 0 && (
        <span
          key={count}
          className="animate-bump absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Footer() {
  const { data: settings } = useStoreSettings();
  const cod = settings?.cod_enabled !== false;
  const colTitle = "text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--nw-paper)]";
  const link =
    "inline-block py-0.5 text-sm text-[var(--nw-mute)] transition-colors hover:text-[var(--nw-paper)]";
  return (
    <footer className="border-t border-border bg-[var(--nw-ink)] text-[var(--nw-paper)]">
      <div className="page-container grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:py-20">
        <div>
          <Logo className="h-[18px]" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-[var(--nw-mute)]">
            Contemporary streetwear for those who move differently.
          </p>
        </div>
        <nav aria-label="Footer shop">
          <h2 className={colTitle}>Shop</h2>
          <ul className="mt-5 space-y-3">
            <li>
              <Link to="/shop" search={{ category: "All pieces" }} className={link}>
                All products
              </Link>
            </li>
            <li>
              <Link to="/shop" search={{ sort: "newest" }} className={link}>
                New arrivals
              </Link>
            </li>
            {CORE_CATEGORIES.map((category) => (
              <li key={category}>
                <Link to="/shop" search={{ category }} className={link}>
                  {category}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Footer help">
          <h2 className={colTitle}>Help</h2>
          <ul className="mt-5 space-y-3">
            {HELP_LINKS.map(([slug, label]) => (
              <li key={slug}>
                <Link to="/policies/$slug" params={{ slug }} className={link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {SOCIAL_LINKS.length > 0 && (
          <nav aria-label="Social media">
            <h2 className={colTitle}>Follow</h2>
            <ul className="mt-5 space-y-3">
              {SOCIAL_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
      <div className="border-t border-[var(--nw-line)]">
        <div className="page-container flex flex-col gap-4 py-6 text-xs text-[var(--nw-mute)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p>{cod ? "Payment: Cash on delivery" : "Payment: See checkout"}</p>
          <ul className="flex gap-6">
            {LEGAL_LINKS.map(([slug, label]) => (
              <li key={slug}>
                <Link
                  to="/policies/$slug"
                  params={{ slug }}
                  className="transition-colors hover:text-[var(--nw-paper)]"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  useProducts();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const icon = "hidden size-11 items-center justify-center md:flex";
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AnnouncementBar />
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-[background-color,border-color] duration-300 ${
          scrolled ? "border-border bg-background/95" : "border-transparent bg-background/70"
        }`}
      >
        <div className="page-container grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-[72px]">
          <div className="flex items-center">
            <button
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="-ml-3 flex size-11 items-center justify-center md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <PrimaryNav className="hidden items-center gap-9 md:flex" />
          </div>
          <Link to="/" aria-label="NOWHERE home" className="flex items-center justify-center px-2">
            <Logo className="h-[18px] md:h-[22px]" />
          </Link>
          <div className="-mr-2 flex items-center justify-end md:gap-1">
            <Link
              to="/shop"
              search={{ category: "All pieces" }}
              aria-label="Search"
              className={icon}
            >
              <Search className="size-5" />
            </Link>
            <Link to="/wishlist" aria-label="Wishlist" className={icon}>
              <Heart className="size-5" />
            </Link>
            <span className="hidden md:flex md:size-11 md:items-center md:justify-center">
              <ThemeToggle />
            </span>
            <Link to={user ? "/account" : "/login"} aria-label="Account" className={icon}>
              <User className="size-5" />
            </Link>
            <BagButton />
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
      <main className="animate-page-in flex-1">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
