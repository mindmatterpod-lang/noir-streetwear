import { useSyncExternalStore } from "react";

import { getProduct } from "@/lib/store-catalog";
import type { CartItem, Product, ProductColor, ProductSize } from "@/types/store";

const STORAGE_KEY = "afterform-cart-v1";
const EMPTY_CART: CartItem[] = [];
let cartSnapshot: CartItem[] = EMPTY_CART;
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<CartItem>;
  return typeof item.productId === "string" &&
    typeof item.size === "string" && ["S", "M", "L", "XL", "XXL"].includes(item.size) &&
    typeof item.color === "string" && ["ink", "cherry", "fern", "cloud", "navy"].includes(item.color) &&
    typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 5 &&
    getProduct(item.productId) !== undefined;
}

function initializeCart() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    cartSnapshot = Array.isArray(parsed) ? parsed.filter(isCartItem) : EMPTY_CART;
  } catch {
    cartSnapshot = EMPTY_CART;
  }
}

function getSnapshot(): CartItem[] {
  return cartSnapshot;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!initialized && typeof window !== "undefined") {
    const before = cartSnapshot;
    initializeCart();
    if (before !== cartSnapshot) notify();
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    try {
      const parsed: unknown = event.newValue ? JSON.parse(event.newValue) : [];
      cartSnapshot = Array.isArray(parsed) ? parsed.filter(isCartItem) : EMPTY_CART;
    } catch {
      cartSnapshot = EMPTY_CART;
    }
    notify();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function commitCart(next: CartItem[]) {
  cartSnapshot = next;
  initialized = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Cart actions remain usable in the current tab when browser storage is unavailable.
  }
  notify();
}

function itemKey(item: CartItem) {
  return `${item.productId}:${item.size}:${item.color}`;
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    items,
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotalCents: items.reduce((total, item) => {
      const product = getProduct(item.productId);
      return total + (product?.priceCents ?? 0) * item.quantity;
    }, 0),
    addItem: (product: Product, size: ProductSize, color: ProductColor, quantity = 1) => {
      const key = `${product.id}:${size}:${color}`;
      const existing = cartSnapshot.find((item) => itemKey(item) === key);
      const nextQuantity = Math.min(product.stock, 5, (existing?.quantity ?? 0) + quantity);
      const next = existing
        ? cartSnapshot.map((item) => itemKey(item) === key ? { ...item, quantity: nextQuantity } : item)
        : [...cartSnapshot, { productId: product.id, size, color, quantity: Math.min(quantity, 5, product.stock) }];
      commitCart(next);
    },
    setQuantity: (productId: string, size: ProductSize, color: ProductColor, quantity: number) => {
      const key = `${productId}:${size}:${color}`;
      if (quantity < 1) {
        commitCart(cartSnapshot.filter((item) => itemKey(item) !== key));
        return;
      }
      const product = getProduct(productId);
      const cap = Math.min(product?.stock ?? 5, 5);
      commitCart(cartSnapshot.map((item) => itemKey(item) === key ? { ...item, quantity: Math.min(quantity, cap) } : item));
    },
    removeItem: (productId: string, size: ProductSize, color: ProductColor) => {
      const key = `${productId}:${size}:${color}`;
      commitCart(cartSnapshot.filter((item) => itemKey(item) !== key));
    },
    clearCart: () => commitCart(EMPTY_CART),
  };
}
