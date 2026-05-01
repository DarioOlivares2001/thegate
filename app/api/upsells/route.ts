import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  FALLBACK_RECOMMENDATION_TITLE,
  pickCheckoutRecommendations,
  type CheckoutRecRow,
} from "@/lib/checkout/recommendations";
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
      .select("id,slug,name,price,cost_price,stock,images,active,has_variants,category,tags")
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
      const originalPrice = base?.price ?? p.price;
      const offerPrice =
        typeof p.offerPrice === "number" && p.offerPrice > 0 ? p.offerPrice : originalPrice;
      const computedSavings = Math.max(0, originalPrice - offerPrice);
      const savings =
        typeof p.savings === "number" && p.savings > 0 ? p.savings : computedSavings;
      const discountPercent =
        typeof p.discountPercent === "number" && p.discountPercent > 0
          ? p.discountPercent
          : originalPrice > 0 && savings > 0
            ? Math.round((savings / originalPrice) * 100)
            : 0;
      return {
        id: p.id,
        name: p.name,
        image: normalizeOptimizedImageUrl(p.images?.[0] ?? ""),
        price: originalPrice,
        offerPrice,
        discountPercent,
        savings,
        stock: base?.stock ?? 0,
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
