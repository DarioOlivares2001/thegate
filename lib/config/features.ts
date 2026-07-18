/**
 * Flags de features opcionales para esta tienda/nicho. Apagar un flag solo
 * oculta el render en el frontend: lógica, endpoints y datos en BD quedan
 * intactos para poder reactivarlo rápido en otro nicho.
 */

/** Bloques de ofertas/upsells en el carrito (CartDrawer) y en checkout (CheckoutRecommendations). */
export const SHOW_CART_UPSELLS = false;
