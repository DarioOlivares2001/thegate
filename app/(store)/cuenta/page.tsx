import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/utils/format";
import { getCuentaSessionFromCookies } from "@/lib/cuenta/session";
import { LogoutButton } from "./LogoutButton";

export const metadata: Metadata = {
  title: "Mi cuenta",
};

export default async function CuentaIndexPage() {
  const session = getCuentaSessionFromCookies();
  if (!session) redirect("/cuenta/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data: cliente, error } = await admin
    .from("clientes")
    .select("nombre,email,total_orders,total_spent,last_order_at")
    .eq("email", session.email)
    .maybeSingle();

  if (error || !cliente) {
    redirect("/cuenta/login");
  }

  const nombre = String(cliente.nombre ?? "Cliente");
  const email = String(cliente.email ?? session.email);
  const totalOrders = Number(cliente.total_orders ?? 0);
  const totalSpent = Number(cliente.total_spent ?? 0);
  const lastOrderAt = cliente.last_order_at
    ? new Date(String(cliente.last_order_at)).toLocaleString("es-CL", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Sin pedidos";

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center px-4 py-12">
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text)] sm:text-3xl">Mi cuenta</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Hola, {nombre}.</p>
        <p className="text-sm text-[var(--color-text-muted)]">{email}</p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <article className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <p className="text-xs text-[var(--color-text-muted)]">Pedidos</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text)]">{totalOrders}</p>
          </article>
          <article className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <p className="text-xs text-[var(--color-text-muted)]">Total gastado</p>
            <p className="mt-1 text-xl font-semibold text-[var(--color-text)]">{formatPrice(totalSpent)}</p>
          </article>
          <article className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
            <p className="text-xs text-[var(--color-text-muted)]">Último pedido</p>
            <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{lastOrderAt}</p>
          </article>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/cuenta/pedidos" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" fullWidth className="sm:min-w-[180px]">
              Ver mis pedidos
            </Button>
          </Link>
          <Link href="/productos" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" fullWidth className="sm:min-w-[180px]">
              Seguir comprando
            </Button>
          </Link>
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
