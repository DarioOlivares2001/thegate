import type { Metadata } from "next";
import Link from "next/link";
import { Hero } from "@/components/store/Hero";
import { Button } from "@/components/ui/Button";
import { BentoGrid, type BentoItem } from "@/components/store/BentoGrid";
import { SocialProof } from "@/components/store/SocialProof";
import { getStoreSettings } from "@/lib/store-settings/getStoreSettings";
import { normalizeProductCategory } from "@/lib/product/categories";
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
    subtitle: normalizeProductCategory(p.category) || undefined,
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
  const packItems = bentoItems.filter(
    (item) =>
      typeof item.price === "number" &&
      typeof item.compareAtPrice === "number" &&
      item.compareAtPrice > item.price
  );
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
          ¿Te pasa esto con tu gato?
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {[
            "Mal olor en la casa, incluso limpiando seguido",
            "Arena que no absorbe y ensucia todo",
            "Tu gato deja arena por toda la casa",
            "Gastando dinero en arena que no funciona",
          ].map((problem) => (
            <article
              key={problem}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4"
            >
              <p className="text-sm font-semibold text-[var(--color-text)]">{problem}</p>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-base font-medium text-[var(--color-text)] sm:text-lg">
          El problema no es tu gato, es la arena que estás usando.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/productos">
            <Button size="lg" variant="primary">
              Ver productos recomendados
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl border-t border-[var(--color-border)] px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <h2 className="mb-6 text-center font-display text-3xl font-bold text-[var(--color-text)] sm:mb-8 sm:text-4xl">
          La solución está en usar productos que realmente funcionan
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-center text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
          Nuestros productos están diseñados para eliminar olores, mantener tu hogar limpio y facilitar tu día a día con
          tu gato.
        </p>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            "Control efectivo de olores",
            "Menos suciedad en el hogar",
            "Mayor duración y rendimiento",
          ].map((item) => (
            <article
              key={item}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-center"
            >
              <p className="text-sm font-semibold text-[var(--color-text)]">{item}</p>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-base font-medium text-[var(--color-text)] sm:text-lg">
          Deja de gastar dinero en soluciones que no funcionan.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/productos">
            <Button size="lg" variant="primary">
              Ver productos recomendados
            </Button>
          </Link>
        </div>
      </section>

      <BentoGrid title="Productos recomendados para eliminar el olor" items={bentoItems} />

      <section id="packs-ahorro">
        <BentoGrid title="Ahorra más comprando en pack" items={packsToShow} />
      </section>

      <SocialProof />

      <section className="mx-auto w-full max-w-7xl border-t border-[var(--color-border)] px-4 py-14 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-2xl text-center text-base font-medium text-[var(--color-text)] sm:text-lg">
          Compra hoy y elimina el olor desde el primer uso
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/productos">
            <Button size="lg" variant="primary">
              Comprar ahora
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
