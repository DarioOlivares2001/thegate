import type { CartItem } from "@/lib/cart/store";
import type { Order, Product } from "@/lib/supabase/types";

declare global {
  function fbq(event: "track", name: string, params?: Record<string, unknown>): void;
}

export const pixelEvents = {
  pageView() {
    if (typeof fbq === "undefined") return;
    fbq("track", "PageView");
  },

  viewContent(product: Product) {
    if (typeof fbq === "undefined") return;
    fbq("track", "ViewContent", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: product.price / 100,
      currency: "CLP",
    });
  },

  addToCart(product: Product, quantity: number) {
    if (typeof fbq === "undefined") return;
    fbq("track", "AddToCart", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: (product.price * quantity) / 100,
      currency: "CLP",
    });
  },

  initiateCheckout(cart: CartItem[]) {
    if (typeof fbq === "undefined") return;
    fbq("track", "InitiateCheckout", {
      content_ids: cart.map((i) => i.product_id),
      num_items: cart.reduce((acc, i) => acc + i.quantity, 0),
      value: cart.reduce((acc, i) => acc + i.price * i.quantity, 0) / 100,
      currency: "CLP",
    });
  },

  purchase(order: Order) {
    if (typeof fbq === "undefined") return;
    const items = order.items as Array<{ product_id: string }>;
    fbq("track", "Purchase", {
      content_ids: items.map((i) => i.product_id),
      value: order.total / 100,
      currency: "CLP",
      order_id: order.order_number.toString(),
    });
  },
};
