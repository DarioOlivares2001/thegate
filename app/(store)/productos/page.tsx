import type { Metadata } from "next";
import { MOCK_PRODUCTS } from "@/lib/utils/mock-products";
import { ProductsClient } from "./ProductsClient";
import { SocialProofToast } from "@/components/store/SocialProofToast";
import type { Product } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Productos",
  description: "Explora nuestro catálogo completo.",
};

async function getProducts(): Promise<Product[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (data?.length) return data as Product[];
  } catch {
    // DB not configured yet
  }
  return MOCK_PRODUCTS;
}

export default async function ProductosPage() {
  const products = await getProducts();
  return (
    <>
      <ProductsClient initialProducts={products} />
      <SocialProofToast products={products.map((p) => p.name)} />
    </>
  );
}
