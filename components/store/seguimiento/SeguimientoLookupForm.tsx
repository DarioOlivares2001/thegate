import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SeguimientoLookupForm({
  invalidNumber,
  showMisPedidosLink,
}: {
  /** true si había query `order` pero no era un entero &gt; 0 */
  invalidNumber?: boolean;
  showMisPedidosLink?: boolean;
}) {
  return (
    <section className="mx-auto w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:p-8">
      <h1 className="font-display text-2xl font-bold text-[var(--color-text)]">Seguimiento de pedido</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
        Ingresa el número que recibiste por correo al confirmar tu compra para ver el estado y los detalles.
      </p>

      <form method="get" action="/seguimiento" className="mt-8 flex flex-col gap-4">
        <Input
          id="seguimiento-order"
          name="order"
          type="text"
          inputMode="numeric"
          pattern="[0-9]+"
          autoComplete="off"
          placeholder="Ej: 34"
          label="Ingresa tu número de pedido"
          required
          className="font-mono"
        />
        {invalidNumber ? (
          <p className="text-xs text-[var(--color-error)]" role="alert">
            Escribe un número de pedido válido (solo dígitos, sin espacios).
          </p>
        ) : null}
        <Button type="submit" size="lg" fullWidth>
          Buscar pedido
        </Button>
      </form>

      {showMisPedidosLink && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            ¿Tienes cuenta?{" "}
            <Link href="/cuenta/pedidos" className="font-medium text-[var(--color-primary)] underline underline-offset-2">
              Ver mis pedidos
            </Link>
          </p>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-[var(--color-text-muted)]">
        <Link href="/productos" className="font-medium text-[var(--color-primary)] underline underline-offset-2">
          Volver a la tienda
        </Link>
      </p>
    </section>
  );
}
