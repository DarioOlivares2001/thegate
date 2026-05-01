import { clsx } from "clsx";
import { formatPrice } from "@/lib/utils/format";

/** Descuento por volumen (solo informativo; no se aplica en checkout todavía). */
const VOLUME_TIERS = [
  { units: 2, percentOff: 10 },
  { units: 3, percentOff: 20 },
] as const;

function unitPriceAfterDiscount(baseUnitPrice: number, percentOff: number) {
  return Math.round(Math.max(0, baseUnitPrice) * (1 - percentOff / 100));
}

type ProductTieredDiscountProps = {
  unitPrice: number;
  /** Cantidad elegida; al subir, resalta los niveles ya alcanzados. */
  quantity?: number;
  /** Tarjeta de grid: tipografía más compacta. */
  compact?: boolean;
};

/**
 * Bloque informativo: más unidades → mayor % OFF (referencia sobre el precio unitario actual).
 */
export function ProductTieredDiscount({
  unitPrice,
  quantity = 1,
  compact = false,
}: ProductTieredDiscountProps) {
  const safePrice = Math.max(0, unitPrice);

  return (
    <div
      className={clsx(
        "rounded-[var(--radius-md)] border border-[var(--color-border)]/70 bg-[var(--color-background)]",
        compact ? "px-2 py-1.5" : "px-3 py-2.5"
      )}
    >
      <p
        className={clsx(
          "font-medium leading-snug text-[var(--color-text-muted)]",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        💸 Mientras más llevas, menos pagas
      </p>
      <ul
        className={clsx(
          "mt-1.5 space-y-1",
          compact ? "text-[10px] leading-tight" : "text-xs leading-snug"
        )}
      >
        {VOLUME_TIERS.map((tier) => {
          const reached = quantity >= tier.units;
          const refUnit = unitPriceAfterDiscount(safePrice, tier.percentOff);
          return (
            <li
              key={tier.units}
              className={clsx(
                "rounded-[var(--radius-sm)] px-1.5 py-0.5 transition-all duration-200 ease-out",
                reached
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-text)] ring-1 ring-[var(--color-primary)]/30"
                  : "text-[var(--color-text-muted)]"
              )}
            >
              <span className="font-medium tabular-nums">
                {compact ? `${tier.units} u.` : `${tier.units} unidades`}
              </span>
              <span className="mx-0.5 text-[var(--color-text-muted)]">→</span>
              <span className="font-semibold text-[var(--color-primary)]">{tier.percentOff}% OFF</span>
              {!compact && (
                <span className="ml-1 text-[var(--color-text-muted)]">
                  · ~{formatPrice(refUnit)} c/u
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
