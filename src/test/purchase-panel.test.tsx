import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PurchasePanel } from "@/components/shop/PurchasePanel";
import { useCart } from "@/hooks/use-cart";
import { PRODUCTS } from "@/lib/store-catalog";
import { renderHook } from "@testing-library/react";

const product = PRODUCTS.find((p) => p.slug === "studio-hoodie")!;

beforeEach(() => {
  window.localStorage.clear();
  renderHook(() => useCart()).result.current.clearCart();
});
afterEach(cleanup);

describe("PurchasePanel", () => {
  it("refuses to add without a size and shows a helpful message", () => {
    render(<PurchasePanel product={product} />);
    fireEvent.click(screen.getByRole("button", { name: /add to bag/i }));
    expect(screen.getByRole("alert").textContent).toMatch(/select a size/i);
    expect(renderHook(() => useCart()).result.current.count).toBe(0);
  });

  it("adds the chosen size, colour and quantity once a size is selected", () => {
    render(<PurchasePanel product={product} />);
    fireEvent.click(screen.getByRole("button", { name: "L" }));
    fireEvent.click(screen.getByRole("button", { name: "Ink" }));
    fireEvent.click(screen.getByRole("button", { name: /increase quantity/i }));
    fireEvent.click(screen.getByRole("button", { name: /add to bag/i }));
    const { items } = renderHook(() => useCart()).result.current;
    expect(items).toEqual([{ productId: product.id, size: "L", color: "ink", quantity: 2 }]);
  });

  it("never lets the bag exceed the per-order limit", () => {
    render(<PurchasePanel product={product} />);
    fireEvent.click(screen.getByRole("button", { name: "M" }));
    for (let i = 0; i < 6; i++)
      fireEvent.click(screen.getByRole("button", { name: /add(ed)? to bag/i }));
    expect(renderHook(() => useCart()).result.current.count).toBe(5);
  });

  it("disables everything for a sold-out product", () => {
    render(<PurchasePanel product={{ ...product, stock: 0 }} />);
    expect((screen.getByRole("button", { name: "M" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /sold out/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
