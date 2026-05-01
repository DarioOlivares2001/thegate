"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  MapPin,
  Package,
  CreditCard,
  ChevronDown,
  Workflow,
} from "lucide-react";
import { formatPrice } from "@/lib/utils/format";
import { toast } from "@/components/ui/Toast";
import { OrderTimeline } from "@/components/admin/OrderTimeline";
import { updateOrderStatusAction } from "../actions";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "pending",   label: "Pedido recibido" },
  { value: "paid",      label: "Pago confirmado" },
  { value: "preparing", label: "Preparando" },
  { value: "shipped",   label: "En despacho" },
  { value: "delivered", label: "Entregado" },
  { value: "cancelled", label: "Cancelado" },
] as const;

function normalizeStatus(status: string): string {
  return status === "ready_to_ship" ? "shipped" : status;
}

const STATUS_CLS: Record<string, string> = {
  pending:   "bg-amber-50  text-amber-700  border-amber-200",
  paid:      "bg-blue-50   text-blue-700   border-blue-200",
  preparing: "bg-violet-50 text-violet-700 border-violet-200",
  shipped:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-green-50  text-green-700  border-green-200",
  cancelled: "bg-zinc-100  text-zinc-500   border-zinc-200",
};

const STATUS_DOT: Record<string, string> = {
  pending:   "bg-amber-400",
  paid:      "bg-blue-400",
  preparing: "bg-violet-400",
  shipped:   "bg-indigo-400",
  delivered: "bg-green-400",
  cancelled: "bg-zinc-400",
};

function getPrimaryAction(status: string): { label: string; nextStatus: string | null; done?: boolean } {
  if (status === "pending") {
    return { label: "Confirmar pago", nextStatus: "paid" };
  }
  if (status === "paid") {
    return { label: "Empezar preparación", nextStatus: "preparing" };
  }
  if (status === "preparing") {
    return { label: "Marcar en despacho", nextStatus: "shipped" };
  }
  if (status === "shipped") {
    return { label: "Marcar como entregado", nextStatus: "delivered" };
  }
  if (status === "delivered") {
    return { label: "Pedido completado", nextStatus: null, done: true };
  }
  return { label: "Pedido cancelado", nextStatus: null, done: true };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3.5">
        <span className="text-zinc-400">{icon}</span>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-zinc-800">{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function OrderDetail({ order }: { order: any }) {
  const [currentStatus, setCurrentStatus] = useState<string>(normalizeStatus(order.status));
  const [status, setStatus] = useState<string>(normalizeStatus(order.status));
  const [saving, setSaving] = useState(false);
  const currentOrderStatus = currentStatus;

  const addr = order.shipping_address ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = Array.isArray(order.items) ? order.items : [];

  async function handleSave(nextStatus: string) {
    if (nextStatus === currentOrderStatus) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await updateOrderStatusAction(order.id, nextStatus as any);
      if (result.error) {
        toast.error(result.error);
      } else {
        setCurrentStatus(nextStatus);
        setStatus(nextStatus);
        toast.success("Estado actualizado correctamente.");
      }
    } finally {
      setSaving(false);
    }
  }

  const primaryAction = getPrimaryAction(currentOrderStatus);
  const canCancel = currentOrderStatus !== "delivered" && currentOrderStatus !== "cancelled";
  const hasManualChanges = status !== currentOrderStatus;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/pedidos"
          className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a pedidos
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-zinc-900">
              Pedido #{order.order_number}
            </h1>
            <p className="mt-0.5 text-xs text-zinc-400">
              {new Date(order.created_at).toLocaleDateString("es-CL", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              STATUS_CLS[currentOrderStatus] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[currentOrderStatus] ?? "bg-zinc-400"}`}
            />
            {STATUS_OPTIONS.find((s) => s.value === currentOrderStatus)?.label ?? currentOrderStatus}
          </span>
        </div>
      </div>

      <OrderTimeline status={currentOrderStatus} />

      {/* ── Order management (primary action) ── */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-3.5">
          <Workflow className="h-4 w-4 text-zinc-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Gestión del pedido
          </h2>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">Estado actual:</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  STATUS_CLS[currentOrderStatus] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[currentOrderStatus] ?? "bg-zinc-400"}`}
                />
                {STATUS_OPTIONS.find((s) => s.value === currentOrderStatus)?.label ?? currentOrderStatus}
              </span>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                onClick={() => primaryAction.nextStatus && handleSave(primaryAction.nextStatus)}
                disabled={saving || !primaryAction.nextStatus}
                className="flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Guardando…" : primaryAction.label}
              </button>

              {canCancel && (
                <button
                  type="button"
                  onClick={() => handleSave("cancelled")}
                  disabled={saving}
                  className="flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cancelar pedido
                </button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Cambio manual
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-9 w-full appearance-none rounded-[var(--radius-sm)] border border-zinc-300 bg-white pl-3 pr-8 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
              <button
                type="button"
                onClick={() => handleSave(status)}
                disabled={saving || !hasManualChanges}
                className="flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Guardando…" : "Guardar cambio manual"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">

        {/* LEFT — Products */}
        <div className="flex flex-col gap-6">
          <Card title="Productos comprados" icon={<Package className="h-4 w-4" />}>
            {items.length === 0 ? (
              <p className="text-sm text-zinc-400">Sin productos registrados.</p>
            ) : (
              <div className="flex flex-col divide-y divide-zinc-50">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {items.map((item: any, i: number) => (
                  <div key={i} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                    {/* Thumbnail */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 border border-zinc-200">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name ?? "Producto"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-5 w-5 text-zinc-300" strokeWidth={1} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 truncate">
                        {item.name ?? "Producto"}
                      </p>
                      {item.variant && (
                        <p className="text-xs text-zinc-400 mt-0.5">{item.variant}</p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1">
                        {formatPrice(item.price ?? 0)} × {item.quantity ?? 1}
                      </p>
                    </div>

                    {/* Subtotal */}
                    <p className="shrink-0 font-semibold text-zinc-900">
                      {formatPrice((item.price ?? 0) * (item.quantity ?? 1))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT — Summary, Customer */}
        <div className="flex flex-col gap-5">

          {/* Order totals */}
          <Card title="Resumen del pedido" icon={<CreditCard className="h-4 w-4" />}>
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal ?? 0)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Envío</span>
                <span>
                  {order.shipping_cost === 0
                    ? "Gratis"
                    : formatPrice(order.shipping_cost ?? 0)}
                </span>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-2.5 font-bold text-zinc-900">
                <span>Total</span>
                <span>{formatPrice(order.total ?? 0)}</span>
              </div>
            </div>
          </Card>

          {/* Customer info */}
          <Card title="Datos del cliente" icon={<User className="h-4 w-4" />}>
            <div className="flex flex-col gap-3">
              <InfoRow label="Nombre" value={order.customer_name} />
              <InfoRow label="Email" value={order.customer_email} />
              <InfoRow label="Teléfono" value={order.customer_phone} />
            </div>
          </Card>

          {/* Shipping address */}
          <Card title="Dirección de envío" icon={<MapPin className="h-4 w-4" />}>
            <div className="flex flex-col gap-3">
              <InfoRow label="Dirección" value={addr.direccion ?? addr.address ?? addr.line1} />
              <InfoRow label="Ciudad"    value={addr.ciudad    ?? addr.city} />
              <InfoRow label="Región"    value={addr.region    ?? addr.state} />
              <InfoRow label="País"      value={addr.pais      ?? addr.country ?? "Chile"} />
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
