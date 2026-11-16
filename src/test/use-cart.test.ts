import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useCart } from "@/hooks/use-cart";
import { getProduct } from "@/lib/store-catalog";

const hoodie = getProduct("studio-hoodie")!;

describe("useCart", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.clearCart());
  });

  it("adds items and totals the subtotal", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(hoodie, "M", "ink", 2));
    expect(result.current.count).toBe(2);
    expect(result.current.subtotalCents).toBe(hoodie.priceCents * 2);
  });

  it("merges identical size/colour lines and caps quantity at 5", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(hoodie, "M", "ink", 4));
    act(() => result.current.addItem(hoodie, "M", "ink", 4));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.quantity).toBe(5);
  });

  it("keeps different sizes as separate lines", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(hoodie, "M", "ink"));
    act(() => result.current.addItem(hoodie, "L", "ink"));
    expect(result.current.items).toHaveLength(2);
  });

  it("removes a line when quantity drops below 1, and clears the cart", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addItem(hoodie, "M", "ink"));
    act(() => result.current.setQuantity(hoodie.id, "M", "ink", 0));
    expect(result.current.items).toHaveLength(0);
    act(() => result.current.addItem(hoodie, "S", "cloud"));
    act(() => result.current.clearCart());
    expect(result.current.count).toBe(0);
  });
});
