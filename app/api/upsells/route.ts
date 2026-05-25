import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  FALLBACK_RECOMMENDATION_TITLE,
  pickCheckoutRecommendations,
  type CheckoutRecRow,
} from "@/lib/checkout/recommendations";
import {
  computeUpsellDiscountPercentFromPrices,
  computeUpsellSavingsDisplay,
} from "@/lib/cart/upsellOfferDisplay";
import { normalizeOptimizedImageUrl } from "@/lib/images/normalizeOptimizedImageUrl";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      cartProductIds?: string[];
      cartProductNames?: string[];
    };
    const cartProductIds = Array.isArray(body.cartProductIds)
      ? body.cartProductIds.filter(Boolean)
      : [];
    const cartProductNames = Array.isArray(body.cartProductNames)
      ? body.cartProductNames.filter(Boolean)
      : [];

    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "id,slug,name,price,compare_at_price,cost_price,stock,images,active,has_variants,category,tags,discount_enabled,discount_max_percent,discount_steps"
      )
      .eq("active", true)
      .gt("stock", 0)
      .eq("has_variants", false)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      return NextResponse.json({ offers: [] }, { status: 200 });
    }

    const rows = (data ?? []) as CheckoutRecRow[];
    const { title, products } = pickCheckoutRecommendations(
      rows,
      cartProductIds,
      cartProductNames,
      2
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    const offers = products.map((p) => {
      const base = byId.get(p.id);
      const list = base?.price ?? p.price;
      const compare = base?.compare_at_price ?? p.compare_at_price ?? null;
      const offerPrice =
        typeof p.offerPrice === "number" && p.offerPrice > 0 ? p.offerPrice : list;
      const discountPercent =
        typeof p.discountPercent === "number" && p.discountPercent > 0
          ? p.discountPercent
          : computeUpsellDiscountPercentFromPrices({
              listPrice: list,
              compareAtPrice: compare,
              offerPrice,
              discountPercentHint: p.discountPercent,
              displayPercentCap:
                base?.discount_enabled === true
                  ? Math.min(100, Math.max(0, Number(base.discount_max_percent) || 0))
                  : null,
            });
      const savings = computeUpsellSavingsDisplay(list, compare, offerPrice);
      return {
        id: p.id,
        name: p.name,
        image: normalizeOptimizedImageUrl(p.images?.[0] ?? ""),
        price: list,
        compare_at_price: compare,
        offerPrice,
        discountPercent,
        savings,
        stock: base?.stock ?? 0,
        discount_enabled: base?.discount_enabled === true,
        discount_max_percent: base?.discount_max_percent ?? null,
      };
    });

    return NextResponse.json(
      { title: title || FALLBACK_RECOMMENDATION_TITLE, offers },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ offers: [] }, { status: 200 });
  }
}
