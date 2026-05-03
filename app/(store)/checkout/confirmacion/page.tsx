"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCartStore } from "@/lib/cart/store";
import { Button } from "@/components/ui/Button";

const POST_COMPRA_STORAGE = "cuenta_postcompra";
const POST_COMPRA_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Animated check SVG ───────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.05 }}
      className="flex h-24 w-24 items-center justify-center rounded-full bg-green-50 ring-8 ring-green-100"
    >
      <svg viewBox="0 0 52 52" className="h-12 w-12" aria-hidden>
        <motion.circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke="#16a34a"
          strokeWidth="2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
        <motion.path
          fill="none"
          stroke="#16a34a"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 27l8 8 16-16"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, delay: 0.38, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const order = searchParams.get("order");
  const cleared = useRef(false);
  const clear = useCartStore((s) => s.clear);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!order) {
      setCustomerEmail(null);
      return;
    }
    try {
      const raw = sessionStorage.getItem(POST_COMPRA_STORAGE);
      if (!raw) {
        setCustomerEmail(null);
        return;
      }
      const d = JSON.parse(raw) as { order?: string; email?: string; t?: number };
      if (d.order !== order || !d.email) {
        setCustomerEmail(null);
        return;
      }
      if (typeof d.t === "number" && Date.now() - d.t > POST_COMPRA_MAX_AGE_MS) {
        setCustomerEmail(null);
        return;
      }
      setCustomerEmail(d.email);
    } catch {
      setCustomerEmail(null);
    }
  }, [order]);

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    clear();
  }, [clear]);

  return (
    <main className="flex min-h-[82vh] flex-col items-center justify-center px-4 py-16 text-center">
      <CheckIcon />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4, ease: "easeOut" }}
        className="mt-8 flex flex-col items-center gap-5"
      >
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-text)] sm:text-4xl">
          ¡Pedido confirmado!
        </h1>

        {order && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3.5">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
              Número de orden
            </p>
            <p className="mt-0.5 font-display text-xl font-bold text-[var(--color-text)]">
              {order}
            </p>
          </div>
        )}

        <p className="max-w-xs text-[var(--color-text-muted)] leading-relaxed">
          Te enviaremos los detalles a tu email en los próximos minutos.
        </p>

        {customerEmail && order && (
          <div className="mt-2 w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-left shadow-sm">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Crea tu cuenta y recibe descuentos exclusivos en tus próximas compras
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Es opcional: tu compra ya está confirmada con o sin cuenta.
            </p>
            <Link
              href={`/cuenta/crear?email=${encodeURIComponent(customerEmail)}&order=${encodeURIComponent(order)}`}
              className="mt-4 inline-flex w-full justify-center"
            >
              <Button type="button" size="lg" fullWidth variant="secondary">
                Crear mi cuenta
              </Button>
            </Link>
          </div>
        )}

        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/productos">
            <Button size="lg">Seguir comprando</Button>
          </Link>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-12 text-xs text-[var(--color-text-muted)]"
      >
        Pago procesado de forma segura por Flow Chile
      </motion.p>
    </main>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfirmacionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--color-text-muted)]">
          Cargando…
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
