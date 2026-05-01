import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  product_id: string;
  variant_id?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
  option_values?: Record<string, string>;
  isUpsellOffer?: boolean;
  originalPrice?: number;
  discountPercent?: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (item: CartItem) => void;
  remove: (product_id: string, variant?: string) => void;
  updateQuantity: (product_id: string, quantity: number, variant?: string) => void;
  clear: () => void;
  total: () => number;
  itemCount: () => number;
}

function isSameItem(
  a: CartItem,
  b: Pick<CartItem, "product_id" | "variant" | "variant_id">
) {
  if (a.variant_id && b.variant_id) return a.variant_id === b.variant_id;
  return a.product_id === b.product_id && a.variant === b.variant;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),

      add(item) {
        set((state) => {
          const existing = state.items.find((i) => isSameItem(i, item));
          if (existing) {
            return {
              items: state.items.map((i) =>
                isSameItem(i, item)
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },

      remove(product_id, variant) {
        set((state) => ({
          items: state.items.filter((i) => !isSameItem(i, { product_id, variant })),
        }));
      },

      updateQuantity(product_id, quantity, variant) {
        if (quantity < 1) {
          get().remove(product_id, variant);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            isSameItem(i, { product_id, variant }) ? { ...i, quantity } : i
          ),
        }));
      },

      clear() {
        set({ items: [] });
      },

      total() {
        return get().items.reduce((acc, i) => acc + i.price * i.quantity, 0);
      },

      itemCount() {
        return get().items.reduce((acc, i) => acc + i.quantity, 0);
      },
    }),
    {
      name: "thegate-cart",
      partialize: (state) => ({ items: state.items }),
    }
  )
);
