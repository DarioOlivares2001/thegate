"use client";

import { useState, useEffect, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore } from "@/lib/cart/store";
import { pixelEvents } from "@/lib/pixel/events";
import { formatPrice } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/lib/supabase/types";

interface StickyAddToCartProps {
  product: Product;
  targetRef: RefObject<HTMLElement>;
  price?: number;
  stock?: number;
  image?: string;
  selectedVariant?: string;
  selectedVariantId?: string;
  selectedOptionValues?: Record<string, string>;
}

export function StickyAddToCart({
  product,
  targetRef,
  price,
  stock,
  image,
  selectedVariant,
  selectedVariantId,
  selectedOptionValues,
}: StickyAddToCartProps) {
  const [visible, setVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const add = useCartStore((s) => s.add);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const effectivePrice = price ?? product.price;
  const effectiveStock = stock ?? product.stock;
  const effectiveImage = image ?? product.images?.[0] ?? "";

  // Show sticky bar when the main CTA leaves the viewport
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef]);

  async function handleAdd() {
    if (adding || effectiveStock === 0) return;

    setAdding(true);
    try {
      add({
        product_id: product.id,
        variant_id: selectedVariantId,
        name: product.name,
        price: effectivePrice,
        quantity: 1,
        image: effectiveImage,
        variant: selectedVariant,
        option_values: selectedOptionValues,
      });
      pixelEvents.addToCart(product, 1);
      openDrawer();
    } finally {
      setAdding(false);
    }
  }

  return (
    // md:hidden — only renders on mobile, but AnimatePresence still needs the wrapper
    <div className="md:hidden">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="sticky-cart"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
            aria-label="Agregar al carro rápido"
          >
            <div className="flex items-center gap-3">
              {/* Product name + price */}
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-xs text-[var(--color-text-muted)]">
                  {product.name}
                </p>
                <p className="text-sm font-bold text-[var(--color-text)]">
                  {formatPrice(effectivePrice)}
                </p>
              </div>

              {/* CTA */}
              <Button
                onClick={handleAdd}
                loading={adding}
                disabled={effectiveStock === 0}
                size="md"
                className="shrink-0 min-w-[140px]"
              >
                {effectiveStock === 0 ? "Agotado" : "Agregar al carro"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
