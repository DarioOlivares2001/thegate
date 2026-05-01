import { normalizeOptimizedImageUrl } from "@/lib/images/normalizeOptimizedImageUrl";

const DISCOUNT_CANDIDATES = [20, 18, 15, 12, 10, 8, 5] as const;
const MIN_MARGIN_PCT = 0.25;

const CONTEXT_RULES = [
  {
    id: "litter",
    cartKeywords: ["arena", "arenero", "sanitaria"],
    recommendKeywords: ["alfombra", "bolsa", "sanitaria", "spray", "antiolor", "arenero"],
    title: "Completa la limpieza de tu gato 🐾",
  },
  {
    id: "snack",
    cartKeywords: ["snack", "catnip", "galleta"],
    recommendKeywords: ["plato", "comedero", "juguete", "arena", "bolsa"],
    title: "Haz más feliz a tu michi 😸",
  },
  {
    id: "bowl",
    cartKeywords: ["plato", "comedero"],
    recommendKeywords: ["snack", "alimento", "bolsa"],
    title: "Combina perfecto con snacks 🐟",
  },
] as const;

export const FALLBACK_RECOMMENDATION_TITLE = "Antes de pagar, muchos agregan esto";

export type CheckoutRecRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  cost_price?: number | null;
  images: string[];
  stock: number;
  category: string | null;
  tags: string[] | null;
  /** Si es true, se excluye del checkout rápido (requiere elegir variante). */
  has_variants?: boolean | null;
};

export type CheckoutRecProduct = Pick<
  CheckoutRecRow,
  "id" | "slug" | "name" | "price" | "images"
> & {
  offerPrice?: number;
  discountPercent?: number;
  savings?: number;
};

export function getRecommendationContext(cartProductNames: string[]): {
  title: string;
  recommendKeywords: string[] | null;
} {
  const cartBlob = cartProductNames.join(" ").toLowerCase();
  for (const rule of CONTEXT_RULES) {
    if (rule.cartKeywords.some((k) => cartBlob.includes(k))) {
      return { title: rule.title, recommendKeywords: [...rule.recommendKeywords] };
    }
  }
  return { title: FALLBACK_RECOMMENDATION_TITLE, recommendKeywords: null };
}

function scoreByContextKeywords(product: CheckoutRecRow, keywords: string[] | null): number {
  if (!keywords || keywords.length === 0) return 0;
  const blob = [product.name, product.category ?? "", ...(product.tags ?? [])]
    .join(" ")
    .toLowerCase();
  return keywords.reduce((acc, k) => acc + (blob.includes(k) ? 4 : 0), 0);
}

function scoreGenericComplementary(product: CheckoutRecRow): number {
  const blob = [product.name, product.category ?? "", ...(product.tags ?? [])]
    .join(" ")
    .toLowerCase();
  const genericHints = ["bolsa", "snack", "juguete", "arena", "comedero", "accesorio"];
  return genericHints.reduce((acc, k) => acc + (blob.includes(k) ? 1 : 0), 0);
}

function safeDiscount(price: number, costPrice?: number | null) {
  if (!costPrice || costPrice <= 0 || price <= 0) return null;
  for (const discountPercent of DISCOUNT_CANDIDATES) {
    const offerPrice = Math.round(price * (1 - discountPercent / 100));
    if (offerPrice <= costPrice) continue;
    const marginPct = (offerPrice - costPrice) / offerPrice;
    if (marginPct >= MIN_MARGIN_PCT) {
      return { offerPrice, discountPercent, savings: price - offerPrice };
    }
  }
  return null;
}

/**
 * Elige hasta `max` productos: excluye carrito, aplica contexto inteligente
 * y usa descuento seguro si `cost_price` lo permite.
 */
export function pickCheckoutRecommendations(
  rows: CheckoutRecRow[],
  excludeProductIds: string[],
  cartProductNames: string[],
  max = 2
): { title: string; products: CheckoutRecProduct[] } {
  const ex = new Set(excludeProductIds);
  const { title, recommendKeywords } = getRecommendationContext(cartProductNames);
  const pool = rows.filter(
    (p) => !ex.has(p.id) && p.stock > 0 && p.has_variants !== true
  );

  const scored = pool
    .map((p) => ({
      p,
      score: scoreByContextKeywords(p, recommendKeywords) + scoreGenericComplementary(p),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.p.stock - a.p.stock;
    });

  const picked: CheckoutRecProduct[] = [];
  const seen = new Set<string>();

  for (const { p } of scored) {
    if (picked.length >= max) break;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const safe = safeDiscount(p.price, p.cost_price);
    picked.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: safe?.offerPrice ?? p.price,
      images: (Array.isArray(p.images) ? p.images : []).map((img) =>
        normalizeOptimizedImageUrl(String(img ?? ""))
      ),
      offerPrice: safe?.offerPrice,
      discountPercent: safe?.discountPercent,
      savings: safe?.savings,
    });
  }

  if (picked.length < max) {
    const rest = pool
      .filter((p) => !seen.has(p.id))
      .sort((a, b) => b.stock - a.stock);
    for (const p of rest) {
      if (picked.length >= max) break;
      seen.add(p.id);
      const safe = safeDiscount(p.price, p.cost_price);
      picked.push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        price: safe?.offerPrice ?? p.price,
        images: (Array.isArray(p.images) ? p.images : []).map((img) =>
          normalizeOptimizedImageUrl(String(img ?? ""))
        ),
        offerPrice: safe?.offerPrice,
        discountPercent: safe?.discountPercent,
        savings: safe?.savings,
      });
    }
  }

  return { title, products: picked.slice(0, max) };
}
