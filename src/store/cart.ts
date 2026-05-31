import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  size: string;
  color: string;
  qty: number;
}

interface CartState {
  items: CartItem[];
  addItem: (i: CartItem) => void;
  removeItem: (id: string, size: string, color: string) => void;
  updateQty: (id: string, size: string, color: string, qty: number) => void;
  clear: () => void;
  totalPrice: () => number;
  totalCount: () => number;
}

const keyOf = (id: string, size: string, color: string) => `${id}|${size}|${color}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((s) => {
          const idx = s.items.findIndex(
            (x) => keyOf(x.id, x.size, x.color) === keyOf(item.id, item.size, item.color),
          );
          if (idx >= 0) {
            const items = [...s.items];
            items[idx] = { ...items[idx], qty: items[idx].qty + item.qty };
            return { items };
          }
          return { items: [...s.items, item] };
        }),
      removeItem: (id, size, color) =>
        set((s) => ({
          items: s.items.filter((x) => keyOf(x.id, x.size, x.color) !== keyOf(id, size, color)),
        })),
      updateQty: (id, size, color, qty) =>
        set((s) => ({
          items: s.items.map((x) =>
            keyOf(x.id, x.size, x.color) === keyOf(id, size, color) ? { ...x, qty: Math.max(1, qty) } : x,
          ),
        })),
      clear: () => set({ items: [] }),
      totalPrice: () => get().items.reduce((a, b) => a + b.price * b.qty, 0),
      totalCount: () => get().items.reduce((a, b) => a + b.qty, 0),
    }),
    { name: "ihs-cart" },
  ),
);

// Single source of truth for order pricing — used by both /cart and /checkout
export function priceBreakdown(subtotal: number) {
  const shipping = subtotal === 0 || subtotal > 999 ? 0 : 79;
  const gst = Math.round(subtotal * 0.05);
  return { subtotal, shipping, gst, total: subtotal + gst + shipping };
}