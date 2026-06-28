import type { Metadata } from "next";
import { getPublicOrderByNumber } from "@/lib/orders/getPublicOrderByNumber";
import { getCuentaSessionFromCookies } from "@/lib/cuenta/session";
import { SeguimientoLookupForm } from "@/components/store/seguimiento/SeguimientoLookupForm";
import { SeguimientoNotFound } from "@/components/store/seguimiento/SeguimientoNotFound";
import { SeguimientoOrderView } from "@/components/store/seguimiento/SeguimientoOrderView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seguimiento de pedido",
  description: "Consulta el estado de tu pedido con el número de orden.",
};

function parseOrderQuery(raw: string | string[] | undefined): "missing" | "invalid" | number {
  if (raw == null) return "missing";
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s == null || String(s).trim() === "") return "missing";
  const n = parseInt(String(s).trim(), 10);
  if (!Number.isFinite(n) || n < 1) return "invalid";
  return n;
}

function parseEmailQuery(raw: string | string[] | undefined): string | null {
  if (raw == null) return null;
  const s = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = (s ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function SeguimientoPage({
  searchParams,
}: {
  searchParams: { order?: string | string[]; email?: string | string[] };
}) {
  const session = getCuentaSessionFromCookies();
  const parsed = parseOrderQuery(searchParams.order);

  // ── Número inválido o ausente → mostrar formulario ────────────────────────
  if (parsed === "missing") {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-4 py-12">
        <SeguimientoLookupForm
          requiresEmail={!session}
          showMisPedidosLink={!!session}
        />
      </main>
    );
  }

  if (parsed === "invalid") {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-4 py-12">
        <SeguimientoLookupForm
          invalidNumber
          requiresEmail={!session}
          showMisPedidosLink={!!session}
        />
      </main>
    );
  }

  // ── Número válido — verificar propiedad ───────────────────────────────────
  if (session) {
    // Sesión activa: usar el email de la sesión directamente, sin pedirlo al usuario
    const order = await getPublicOrderByNumber(parsed, session.email);

    if (!order) {
      return (
        <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-4 py-12">
          <SeguimientoNotFound orderNumber={parsed} />
        </main>
      );
    }

    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        <SeguimientoOrderView order={order} />
      </main>
    );
  }

  // Sin sesión: requerir email como campo adicional
  const emailParam = parseEmailQuery(searchParams.email);

  if (!emailParam) {
    // Número presente pero email ausente → volver al formulario con número pre-cargado
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-4 py-12">
        <SeguimientoLookupForm
          requiresEmail
          prefillOrder={parsed}
          showMisPedidosLink={false}
        />
      </main>
    );
  }

  const order = await getPublicOrderByNumber(parsed, emailParam);

  if (!order) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-4 py-12">
        <SeguimientoNotFound orderNumber={parsed} />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <SeguimientoOrderView order={order} />
    </main>
  );
}
