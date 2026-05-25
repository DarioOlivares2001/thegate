import type { Product } from "@/lib/supabase/types";
import { computeSafeUpsellDiscountFromProduct } from "@/lib/checkout/recommendations";
import { normalizeOptimizedImageUrl } from "@/lib/images/normalizeOptimizedImageUrl";

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

  const out: ProductUpsellSuggestion[] = [];
  for (const { p } of scored) {
    if (out.length >= max) break;
    const safe = computeSafeUpsellDiscountFromProduct(p.price, p.cost_price, {
      discount_enabled: p.discount_enabled,
      discount_max_percent: p.discount_max_percent,
    });
    if (!safe || safe.discountPercent <= 0) continue;
    out.push({
      id: p.id,
      name: p.name,
      image: normalizeOptimizedImageUrl(p.images?.[0] ?? ""),
      price: p.price,
      offerPrice: safe.offerPrice,
      discountPercent: safe.discountPercent,
      savings: safe.savings,
    });
  }

  return out;
}
