import type { Metadata } from "next";
import { Hero } from "@/components/store/Hero";
import { BentoGrid, type BentoItem } from "@/components/store/BentoGrid";
import { SocialProof } from "@/components/store/SocialProof";
import { getStoreSettings } from "@/lib/store-settings/getStoreSettings";
import { MOCK_PRODUCTS } from "@/lib/utils/mock-products";
import type { Product } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Tienda para gatos",
  description: "La mejor experiencia de compra online del país. Diseño editorial, checkout ultra-fluido, mobile-first.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

function productToBentoItem(p: Product, index: number): BentoItem {
  const hasOffer = !!p.compare_at_price && p.compare_at_price > p.price;
  return {
    id: p.id,
    type: index === 0 ? "featured" : "product",
    size: index === 0 || index === 3 ? "large" : "normal",
    title: p.name,
    subtitle: p.category ?? undefined,
    price: p.price,
    compareAtPrice: hasOffer ? p.compare_at_price! : undefined,
    image: p.images?.[0] ?? undefined,
    href: `/productos/${p.slug}`,
    badge: p.stock === 0 ? "Agotado" : p.stock <= 5 ? "Últimas unidades" : undefined,
  };
}

async function getFeaturedProducts(): Promise<BentoItem[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("id, slug, name, price, compare_at_price, images, category, stock")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data?.length) {
      return (data as Product[]).map(productToBentoItem);
    }
  } catch {
    // DB not configured yet
  }
  return MOCK_PRODUCTS.slice(0, 5).map(productToBentoItem);
}

export default async function HomePage() {
  const settings = await getStoreSettings();
  const bentoItems = await getFeaturedProducts();
  const packItems = bentoItems.filter((item) => item.compareAtPrice && item.compareAtPrice > item.price);
  const packsToShow = packItems.length > 0 ? packItems : bentoItems.slice(0, 3);

  return (
    <main>
      <Hero
        desktopBannerUrl={settings.hero_banner_desktop_url}
        mobileBannerUrl={settings.hero_banner_mobile_url}
        heroOverlayMode={settings.hero_overlay_mode}
        heroOverlayOpacity={settings.hero_overlay_opacity}
      />

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="mb-8 font-display text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
          Problemas comunes
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {[
            "Olor en arenero",
            "Arena que no rinde",
            "Gato ensucia todo",
            "Gastas dinero sin resultados",
          ].map((problem) => (
            <article
              key={problem}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
            >
              <p className="text-sm font-semibold text-[var(--color-text)]">{problem}</p>
            </article>
          ))}
        </div>
      </section>

      <BentoGrid title="Soluciones para tu gato" items={bentoItems} />

      <section id="packs-ahorro">
        <BentoGrid title="Ahorra más comprando en pack" items={packsToShow} />
      </section>

      <SocialProof />
    </main>
  );
}
