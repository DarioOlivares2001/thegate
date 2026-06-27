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

export default async function SeguimientoPage({
  searchParams,
}: {
  searchParams: { order?: string | string[] };
}) {
  const session = getCuentaSessionFromCookies();
  const parsed = parseOrderQuery(searchParams.order);

  if (parsed === "missing") {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-4 py-12">
        <SeguimientoLookupForm showMisPedidosLink={!!session} />
      </main>
    );
  }

  if (parsed === "invalid") {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-4 py-12">
        <SeguimientoLookupForm invalidNumber showMisPedidosLink={!!session} />
      </main>
    );
  }

  const order = await getPublicOrderByNumber(parsed);

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
