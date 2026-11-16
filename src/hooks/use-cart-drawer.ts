import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();
export function setCartOpen(next: boolean) {
  open = next;
  for (const l of listeners) l();
}
export function useCartDrawer() {
  const isOpen = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
    () => false,
  );
  return { isOpen, setOpen: setCartOpen };
}
