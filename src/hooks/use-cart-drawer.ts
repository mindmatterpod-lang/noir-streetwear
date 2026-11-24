import { useSyncExternalStore } from "react";

let open = false;
let message: string | null = null;
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

export function setCartOpen(next: boolean) {
  open = next;
  if (!next) message = null;
  emit();
}
/** Opens the drawer with a confirmation line. Call only after the item really is in the cart. */
export function openCartWithMessage(text: string) {
  message = text;
  open = true;
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useCartDrawer() {
  const isOpen = useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
  const addedMessage = useSyncExternalStore(
    subscribe,
    () => message,
    () => null,
  );
  return { isOpen, setOpen: setCartOpen, addedMessage };
}
