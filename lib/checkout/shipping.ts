/** Misma regla que checkout tienda: envío gratis sobre umbral en CLP. */
export const CHECKOUT_SHIPPING_FREE_THRESHOLD = 30_000;
export const CHECKOUT_SHIPPING_COST = 3_990;

export function computeShippingCostClp(itemsSubtotal: number): number {
  const s = Number.isFinite(itemsSubtotal) && !Number.isNaN(itemsSubtotal) ? Math.max(0, itemsSubtotal) : 0;
  return s >= CHECKOUT_SHIPPING_FREE_THRESHOLD ? 0 : CHECKOUT_SHIPPING_COST;
}
