import type { Product } from "@/lib/supabase/types";
import { normalizeOptimizedImageUrl } from "@/lib/images/normalizeOptimizedImageUrl";

const DISCOUNT_CANDIDATES = [20, 18, 15, 12, 10, 8, 5] as const;
const MIN_MARGIN_PCT = 0.25;

const CONTEXTS = [
  {
    sourceKeywords: ["arena", "sanitaria", "arenero"],
    targetKeywords: ["alfombra", "bolsa", "sanitaria", "spray", "antiolor"],
  },
  {
    sourceKeywords: ["snack", "catnip"],
    targetKeywords: ["plato", "comedero", "arena", "bolsa"],
  },
  {
    sourceKeywords: ["plato", "comedero"],
    targetKeywords: ["snack", "alimento"],
  },
] as const;

export type ProductUpsellSuggestion = {
  id: string;
  name: string;
  image: string;
  price: number;
  offerPrice: number;
  discountPercent: number;
  savings: number;
};

function safeDiscount(price: number, costPrice: number | null) {
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

function buildBlob(p: Product) {
  return [p.name, p.category ?? "", ...(p.tags ?? [])].join(" ").toLowerCase();
}

export function pickProductUpsellSuggestions(
  currentProduct: Product,
  products: Product[],
  max = 2
): ProductUpsellSuggestion[] {
  const sourceBlob = buildBlob(currentProduct);
  const activeContext = CONTEXTS.find((c) => c.sourceKeywords.some((k) => sourceBlob.includes(k)));
  const contextKeywords = activeContext?.targetKeywords ?? [];

  const pool = products.filter(
    (p) => p.active && p.stock > 0 && p.id !== currentProduct.id && !p.has_variants
  );

  const scored = pool
    .map((p) => {
      const blob = buildBlob(p);
      const keywordScore = contextKeywords.reduce((acc, k) => acc + (blob.includes(k) ? 5 : 0), 0);
      const cheapScore = p.price <= 12000 ? 2 : p.price <= 25000 ? 1 : 0;
      return { p, score: keywordScore + cheapScore };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.p.price - b.p.price;
    });

  const picked = scored
    .slice(0, Math.max(max * 3, 6))
    .map(({ p }) => {
      const safe = safeDiscount(p.price, p.cost_price);
      return {
        id: p.id,
        name: p.name,
        image: normalizeOptimizedImageUrl(p.images?.[0] ?? ""),
        price: p.price,
        offerPrice: safe?.offerPrice ?? p.price,
        discountPercent: safe?.discountPercent ?? 0,
        savings: safe?.savings ?? 0,
      };
    })
    .slice(0, max);

  return picked;
}

