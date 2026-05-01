import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductClient } from "./ProductClient";
import { getMockProduct, MOCK_PRODUCTS } from "@/lib/utils/mock-products";
import type { Database, Product, Review } from "@/lib/supabase/types";
import { pickProductUpsellSuggestions } from "@/lib/product/upsell";

interface Props {
  params: { slug: string };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];

// ─── Mock reviews ─────────────────────────────────────────────────────────────

const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    product_id: "",
    order_id: null,
    author_name: "Catalina M.",
    author_email: null,
    rating: 5,
    comment: "Excelente calidad. Llegaron al tercer día y el packaging es increíble. La talla fue perfecta siguiendo la guía.",
    photo_url: null,
    verified: true,
    active: true,
    status: "approved",
    created_at: "2026-03-15T10:00:00Z",
    updated_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "r2",
    product_id: "",
    order_id: null,
    author_name: "Diego V.",
    author_email: null,
    rating: 5,
    comment: "Las uso todos los días para ir a la oficina. Comodísimas y se ven mucho más caras de lo que son.",
    photo_url: null,
    verified: true,
    active: true,
    status: "approved",
    created_at: "2026-03-08T14:30:00Z",
    updated_at: "2026-03-08T14:30:00Z",
  },
  {
    id: "r3",
    product_id: "",
    order_id: null,
    author_name: "Valentina R.",
    author_email: null,
    rating: 4,
    comment: "Muy buena calidad. Le doy 4 estrellas porque esperaba un poco más de amortiguación en el talón, pero en general estoy muy contenta.",
    photo_url: null,
    verified: true,
    active: true,
    status: "approved",
    created_at: "2026-02-27T09:15:00Z",
    updated_at: "2026-02-27T09:15:00Z",
  },
  {
    id: "r4",
    product_id: "",
    order_id: null,
    author_name: "Sebastián L.",
    author_email: null,
    rating: 5,
    comment: "Compré el color gris carbón y es impresionante. El acabado mate es premium.",
    photo_url: null,
    verified: false,
    active: true,
    status: "approved",
    created_at: "2026-02-10T18:00:00Z",
    updated_at: "2026-02-10T18:00:00Z",
  },
];

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .single();
    if (data) return data as Product;
  } catch {
    // DB not configured yet
  }
  return getMockProduct(slug);
}

async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .eq("active", true)
      .order("position", { ascending: true });
    return (data ?? []) as ProductVariant[];
  } catch {
    return [];
  }
}

async function getReviews(productId: string): Promise<Review[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("active", true)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (data?.length) return data as Review[];
  } catch {
    // DB not configured yet
  }
  return MOCK_REVIEWS;
}

async function getUpsellCandidates(excludeId: string): Promise<Product[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .gt("stock", 0)
      .neq("id", excludeId)
      .limit(30);
    if (data?.length) return data as Product[];
  } catch {
    // DB not configured yet
  }
  return MOCK_PRODUCTS.filter((p) => p.id !== excludeId && p.active && p.stock > 0);
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: "Producto no encontrado" };
  return {
    title: product.meta_title ?? product.name,
    description: product.meta_desc ?? product.description?.slice(0, 155) ?? undefined,
    openGraph: {
      title: product.name,
      description: product.meta_desc ?? undefined,
      images: product.images?.[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const [reviews, variants, upsellCandidates] = await Promise.all([
    getReviews(product.id),
    getProductVariants(product.id),
    getUpsellCandidates(product.id),
  ]);
  const upsellSuggestions = pickProductUpsellSuggestions(product, upsellCandidates, 6);

  return (
    <ProductClient
      product={product}
      reviews={reviews}
      variants={variants}
      upsellSuggestions={upsellSuggestions}
    />
  );
}
