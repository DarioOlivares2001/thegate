"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { z } from "zod";
import { clsx } from "clsx";
import { Lock, ChevronDown, ShoppingBag, ArrowLeft, Truck, MessageCircle } from "lucide-react";
import { useCartStore, type CartItem } from "@/lib/cart/store";
import { pixelEvents } from "@/lib/pixel/events";
import { formatPrice } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { CheckoutRecommendations } from "@/components/store/CheckoutRecommendations";
import {
  buildWhatsAppCartUrl,
  buildWhatsAppOrderMessage,
  normalizeWhatsAppDigits,
} from "@/lib/cart/whatsappCartOrder";

// ─── Constants ────────────────────────────────────────────────────────────────

const SHIPPING_FREE_THRESHOLD = 30_000;
const SHIPPING_COST = 3_990;

const CHILE_REGIONS = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana de Santiago",
  "Libertador General Bernardo O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén del General Carlos Ibáñez del Campo",
  "Magallanes y de la Antártica Chilena",
];

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(3, "Ingresa tu nombre completo"),
  phone: z
    .string()
    .min(9, "Teléfono inválido")
    .regex(/^[+0-9\s()\-]+$/, "Solo números y símbolos"),
  address: z.string().min(5, "Ingresa tu dirección completa"),
  city: z.string().min(2, "Ingresa tu ciudad"),
  region: z.string().min(1, "Selecciona una región"),
});

type FormData = z.infer<typeof schema>;
type FormErrors = Partial<Record<keyof FormData, string>>;

// ─── Envío gratis (gamificación) ──────────────────────────────────────────────

function FreeShippingProgressCard({ subtotal }: { subtotal: number }) {
  const hasFreeShipping = subtotal >= SHIPPING_FREE_THRESHOLD;
  const remaining = Math.max(0, SHIPPING_FREE_THRESHOLD - subtotal);
  const progressPct = hasFreeShipping
    ? 100
    : Math.min(100, (subtotal / SHIPPING_FREE_THRESHOLD) * 100);

  return (
    <motion.div
      layout
      className="rounded-[var(--radius-md)] border border-[var(--color-border)]/90 bg-gradient-to-br from-[var(--color-primary)]/[0.07] via-[var(--color-surface)] to-[var(--color-background)] px-3.5 py-3 shadow-sm"
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-base"
          aria-hidden
        >
          🚚
        </span>
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            {hasFreeShipping ? (
              <motion.div
                key="unlocked"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="space-y-1"
              >
                <p className="text-sm font-semibold leading-snug text-[var(--color-text)]">
                  🎉 ¡Tienes envío GRATIS en este pedido!
                </p>
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                  🚚 Disfruta tu beneficio
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="locked"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="space-y-1"
              >
                <p className="text-sm font-semibold leading-snug text-[var(--color-text)]">
                  🚚 Te faltan {formatPrice(remaining)} para envío GRATIS
                </p>
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                  💡 Agrega un producto más y ahorra el envío
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]/55"
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={
              hasFreeShipping
                ? "Envío gratis desbloqueado"
                : `Progreso hacia envío gratis: ${Math.round(progressPct)} por ciento`
            }
          >
            <motion.div
              aria-hidden
              className="h-full rounded-full bg-brand-gradient shadow-[0_0_12px_rgba(255,255,255,0.12)]"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "spring", stiffness: 280, damping: 34, mass: 0.75 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Styled select ────────────────────────────────────────────────────────────

function FormSelect({
  label,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
      )}
      <select
        className={clsx(
          "h-10 w-full rounded-[var(--radius-sm)] border bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] transition-shadow outline-none",
          "focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]",
          "disabled:opacity-50",
          error
            ? "border-[var(--color-error)] focus:ring-[var(--color-error)]"
            : "border-[var(--color-border)]"
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-xs text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Order summary content ────────────────────────────────────────────────────

function OrderSummaryContent({
  items,
  subtotal,
  shippingCost,
  total,
  totalSavings,
  savingsPercent,
}: {
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  totalSavings: number;
  savingsPercent: number | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <FreeShippingProgressCard subtotal={subtotal} />

      {/* Items */}
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={`${item.product_id}-${item.variant ?? ""}`} className="flex gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-background)] border border-[var(--color-border)]">
              {item.image ? (
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-[var(--color-border)]" strokeWidth={1} />
                </div>
              )}
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-text-muted)] text-[9px] font-bold text-white">
                {item.quantity}
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-center min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-text)]">{item.name}</p>
              {item.variant && (
                <p className="text-xs text-[var(--color-text-muted)]">{item.variant}</p>
              )}
            </div>
            <p className="shrink-0 text-sm font-semibold text-[var(--color-text)]">
              {formatPrice(item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <div className="border-t border-[var(--color-border)] pt-4 flex flex-col gap-2">
        <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <Truck className="h-3.5 w-3.5" />
            Envío
          </span>
          {shippingCost === 0 ? (
            <span className="font-medium text-[var(--color-success)]">Gratis</span>
          ) : (
            <span className="text-[var(--color-text-muted)]">{formatPrice(shippingCost)}</span>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] pt-3 flex justify-between items-baseline">
        <span className="text-base font-semibold text-[var(--color-text)]">Total</span>
        <span className="text-xl font-bold text-[var(--color-text)]">{formatPrice(total)}</span>
      </div>
      {totalSavings > 0 && (
        <p className="text-sm font-extrabold text-[#16a34a]">
          {savingsPercent && savingsPercent > 0
            ? `💸 Ahorraste ${formatPrice(totalSavings)} (${savingsPercent}% en total)`
            : `💸 Ahorraste ${formatPrice(totalSavings)} en este pedido`}
        </p>
      )}
    </div>
  );
}

// ─── Checkout page ────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, total: cartTotal } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    email: "",
    name: "",
    phone: "",
    address: "",
    city: "",
    region: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [waCfg, setWaCfg] = useState<{
    loaded: boolean;
    supportWhatsapp: string;
  }>({ loaded: false, supportWhatsapp: "" });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/checkout/whatsapp-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setWaCfg({
          loaded: true,
          supportWhatsapp: typeof data.supportWhatsapp === "string" ? data.supportWhatsapp : "",
        });
      })
      .catch(() => {
        if (!cancelled) setWaCfg((prev) => ({ ...prev, loaded: true }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = cartTotal();
  const shippingCost = subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_COST;
  const total = subtotal + shippingCost;
  const { totalSavings, savingsPercent } = useMemo(() => {
    let savings = 0;
    let totalOriginal = 0;
    for (const item of items) {
      const priceComparative = item.originalPrice;
      if (typeof priceComparative === "number" && priceComparative > item.price) {
        savings += (priceComparative - item.price) * item.quantity;
        totalOriginal += priceComparative * item.quantity;
      }
    }
    const percent = totalOriginal > 0 ? Math.round((savings / totalOriginal) * 100) : null;
    return { totalSavings: savings, savingsPercent: percent };
  }, [items]);

  const waDigits = useMemo(
    () => normalizeWhatsAppDigits(waCfg.supportWhatsapp),
    [waCfg.supportWhatsapp]
  );

  const whatsappCheckoutUrl = useMemo(() => {
    if (!waCfg.loaded || !waDigits || items.length === 0) {
      return null;
    }
    const msg = buildWhatsAppOrderMessage(items, total);
    return buildWhatsAppCartUrl(waDigits, msg);
  }, [waCfg.loaded, waDigits, items, total]);

  if (!mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <ShoppingBag className="h-12 w-12 text-[var(--color-text-muted)]" strokeWidth={1} />
        <p className="font-semibold text-[var(--color-text)]">Tu carrito está vacío</p>
        <Link href="/productos">
          <Button variant="secondary">Ver productos</Button>
        </Link>
      </div>
    );
  }

  function handleChange(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormData;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      const firstErrorField = document.querySelector("[aria-invalid='true']");
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    try {
      pixelEvents.initiateCheckout(items);

      const res = await fetch("/api/flow/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: result.data,
          items: items.map((i) => ({
            product_id: i.product_id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            image: i.image,
            variant: i.variant,
          })),
          subtotal,
          shippingCost,
          total,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Error al procesar el pago. Intenta nuevamente.");
        return;
      }

      try {
        const redirect = String(data.redirectUrl ?? "");
        const abs = redirect.startsWith("http")
          ? redirect
          : `${window.location.origin}${redirect.startsWith("/") ? "" : "/"}${redirect}`;
        const u = new URL(abs);
        const ord = u.searchParams.get("order");
        if (ord && result.data.email) {
          sessionStorage.setItem(
            "cuenta_postcompra",
            JSON.stringify({
              order: ord,
              email: result.data.email,
              name: result.data.name,
              t: Date.now(),
            })
          );
        }
      } catch {
        // ignorar si la URL de retorno no es parseable
      }

      window.location.href = data.redirectUrl;
    } catch {
      toast.error("Error de conexión. Verifica tu internet e intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">

      {/* ── Mobile summary bar ── */}
      <div className="lg:hidden sticky top-24 z-30 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3"
          aria-expanded={summaryOpen}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
            <ShoppingBag className="h-4 w-4" />
            {summaryOpen ? "Ocultar" : "Ver"} resumen del pedido
            <ChevronDown
              className={clsx(
                "h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-200",
                summaryOpen && "rotate-180"
              )}
            />
          </span>
          <span className="font-bold text-[var(--color-text)]">{formatPrice(total)}</span>
        </button>

        <AnimatePresence initial={false}>
          {summaryOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="border-t border-[var(--color-border)] px-4 py-4">
                <OrderSummaryContent
                  items={items}
                  subtotal={subtotal}
                  shippingCost={shippingCost}
                  total={total}
                  totalSavings={totalSavings}
                  savingsPercent={savingsPercent}
                />
                <CheckoutRecommendations
                  subtotal={subtotal}
                  freeShippingThreshold={SHIPPING_FREE_THRESHOLD}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[1fr_380px] lg:gap-16 lg:px-8 lg:py-12">

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">

          {/* Back link */}
          <Link
            href="/carrito"
            className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al carrito
          </Link>

          {/* Contact */}
          <section className="flex flex-col gap-4">
            <h2 className="font-display text-lg font-bold text-[var(--color-text)]">
              Datos de contacto
            </h2>
            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              autoComplete="email"
              value={form.email}
              onChange={handleChange("email")}
              error={errors.email}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nombre completo"
                type="text"
                placeholder="Juan Pérez"
                autoComplete="name"
                value={form.name}
                onChange={handleChange("name")}
                error={errors.name}
              />
              <Input
                label="Teléfono WhatsApp"
                type="tel"
                placeholder="+56 9 1234 5678"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange("phone")}
                error={errors.phone}
              />
            </div>
          </section>

          {/* Shipping */}
          <section className="flex flex-col gap-4">
            <h2 className="font-display text-lg font-bold text-[var(--color-text)]">
              Dirección de envío
            </h2>
            <Input
              label="Dirección"
              type="text"
              placeholder="Av. Providencia 1234, Dpto 56"
              autoComplete="street-address"
              value={form.address}
              onChange={handleChange("address")}
              error={errors.address}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Ciudad"
                type="text"
                placeholder="Santiago"
                autoComplete="address-level2"
                value={form.city}
                onChange={handleChange("city")}
                error={errors.city}
              />
              <FormSelect
                label="Región"
                value={form.region}
                onChange={handleChange("region")}
                error={errors.region}
                autoComplete="address-level1"
              >
                <option value="">Selecciona una región...</option>
                {CHILE_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </FormSelect>
            </div>
          </section>

          {/* CTA */}
          <section className="flex flex-col gap-3">
            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loading}
              className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90 active:bg-[var(--color-accent)]/80 gap-2"
            >
              <Lock className="h-4 w-4" />
              Pagar con Flow — {formatPrice(total)}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <Lock className="h-3 w-3" />
              Pago 100% seguro con cifrado SSL. Aceptamos WebPay, tarjetas y transferencia.
            </p>
            {whatsappCheckoutUrl && (
              <a
                href={whatsappCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[#1e9e51] bg-gradient-to-b from-[#2adf72] to-[#22c55e] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(34,197,94,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:from-[#30e779] hover:to-[#20bd59] hover:shadow-[0_14px_28px_rgba(34,197,94,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/45"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/30">
                  <MessageCircle className="h-3.5 w-3.5" />
                </span>
                Coordinar pedido por WhatsApp
              </a>
            )}
          </section>
        </form>

        {/* ── Desktop summary ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="font-display text-base font-bold text-[var(--color-text)] mb-5">
              Resumen del pedido
            </h2>
            <OrderSummaryContent
              items={items}
              subtotal={subtotal}
              shippingCost={shippingCost}
              total={total}
              totalSavings={totalSavings}
              savingsPercent={savingsPercent}
            />
            <CheckoutRecommendations
              subtotal={subtotal}
              freeShippingThreshold={SHIPPING_FREE_THRESHOLD}
            />
            <Button
              type="button"
              size="lg"
              fullWidth
              loading={loading}
              onClick={handleSubmit as unknown as React.MouseEventHandler}
              className="mt-5 bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90 gap-2"
            >
              <Lock className="h-4 w-4" />
              Pagar con Flow
            </Button>
            {whatsappCheckoutUrl && (
              <a
                href={whatsappCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[#1e9e51] bg-gradient-to-b from-[#2adf72] to-[#22c55e] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(34,197,94,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:from-[#30e779] hover:to-[#20bd59] hover:shadow-[0_14px_28px_rgba(34,197,94,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/45"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/30">
                  <MessageCircle className="h-3.5 w-3.5" />
                </span>
                Coordinar pedido por WhatsApp
              </a>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
