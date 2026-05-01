"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart/store";
import { pixelEvents } from "@/lib/pixel/events";
import { formatPrice } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProductTieredDiscount } from "@/components/store/ProductTieredDiscount";
import type { Product } from "@/lib/supabase/types";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  selectedVariant?: string;
}

function calcDiscount(price: number, compareAtPrice: number): number {
  return Math.round((1 - price / compareAtPrice) * 100);
}

export function ProductCard({ product, priority = false, selectedVariant }: ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const add = useCartStore((s) => s.add);
  const openDrawer = useCartStore((s) => s.openDrawer);

  const hasOffer = !!product.compare_at_price && product.compare_at_price > product.price;
  const discount = hasOffer ? calcDiscount(product.price, product.compare_at_price!) : 0;
  const coverImage = product.images?.[0] ?? "";

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (adding || product.stock === 0) return;

    setAdding(true);
    try {
      add({
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: coverImage,
        variant: selectedVariant,
      });
      pixelEvents.addToCart(product, 1);
      openDrawer();
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="group flex w-full flex-col">
      {/* Image */}
      <Link
        href={`/productos/${product.slug}`}
        className="relative block aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-background)]"
        aria-label={product.name}
        tabIndex={-1}
      >
        {coverImage ? (
          <Image
            src={coverImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
            <ShoppingBag className="h-10 w-10" strokeWidth={1} />
          </div>
        )}

        {/* Discount badge */}
        {hasOffer && (
          <div className="absolute left-2.5 top-2.5">
            <Badge variant="danger">−{discount}%</Badge>
          </div>
        )}

        {/* Out of stock overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
            <Badge variant="default">Agotado</Badge>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="mt-3 flex flex-col gap-2 px-0.5">
        <Link href={`/productos/${product.slug}`} className="group/name">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-[var(--color-text)] group-hover/name:underline group-hover/name:underline-offset-2">
            {product.name}
          </h3>
        </Link>

        {/* Prices */}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-[var(--color-text)]">
            {formatPrice(product.price)}
          </span>
          {hasOffer && (
            <span className="text-sm text-[var(--color-text-muted)] line-through">
              {formatPrice(product.compare_at_price!)}
            </span>
          )}
        </div>

        <ProductTieredDiscount unitPrice={product.price} quantity={1} compact />

        {/* CTA */}
        <Button
          onClick={handleAdd}
          loading={adding}
          disabled={product.stock === 0}
          size="sm"
          fullWidth
          className="mt-1"
        >
          {product.stock === 0 ? "Agotado" : "Agregar y desbloquear 🎁"}
        </Button>
      </div>
    </article>
  );
}
