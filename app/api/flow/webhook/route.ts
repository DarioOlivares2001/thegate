import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmPaidOrderAndDecrementStock } from "@/lib/orders/confirmPaidAndDecrementStock";
import { revalidateAfterStockChange } from "@/lib/orders/revalidateAfterStockChange";

const FLOW_API_URL = process.env.FLOW_API_URL ?? "https://sandbox.flow.cl/api";
const FLOW_API_KEY = process.env.FLOW_API_KEY ?? "";
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY ?? "";

/**
 * HMAC-SHA256 sobre claves ordenadas (mismo esquema que /payment/create).
 */
function sign(params: Record<string, string>, secret: string): string {
  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

function parseOrderNumberFromCommerceOrder(commerceOrder: string): number | null {
  const raw = String(commerceOrder ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.startsWith("TG-") ? raw.slice(3) : raw;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Webhook de confirmación de Flow.
 *
 * Flujo:
 *  1. Flow nos envía `token` (POST x-www-form-urlencoded).
 *  2. Consultamos `payment/getStatus` con `apiKey` + `token` firmado.
 *  3. Si `status === 2` (paid), llamamos RPC para descontar stock y
 *     marcar la orden como `paid` (idempotente).
 *
 * Para evitar reintentos infinitos de Flow ante errores transitorios,
 * siempre respondemos 200 salvo error de protocolo (body inválido).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const token = String(body.get("token") ?? "").trim();
    if (!token) {
      console.warn("[flow-webhook] body sin token");
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    if (!FLOW_API_KEY || !FLOW_SECRET_KEY) {
      console.error("[flow-webhook] credenciales Flow no configuradas");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // ── 1. Consultar estado del pago a Flow ─────────────────────────────────
    const queryParams: Record<string, string> = {
      apiKey: FLOW_API_KEY,
      token,
    };
    queryParams.s = sign(queryParams, FLOW_SECRET_KEY);
    const qs = new URLSearchParams(queryParams).toString();

    const res = await fetch(`${FLOW_API_URL}/payment/getStatus?${qs}`, {
      method: "GET",
    });
    const data: unknown = await res.json().catch(() => ({}));
    const obj = (data ?? {}) as Record<string, unknown>;

    if (!res.ok) {
      console.error("[flow-webhook] getStatus respondió error", {
        status: res.status,
        body: obj,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const statusCode = Number(obj.status);
    const commerceOrder = String(obj.commerceOrder ?? "").trim();
    const orderNumber = parseOrderNumberFromCommerceOrder(commerceOrder);

    if (!orderNumber) {
      console.warn("[flow-webhook] commerceOrder inválido", { commerceOrder });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const admin = createAdminClient();

    // ── 2. Buscar la orden ──────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderRow, error: orderErr } = await (admin as any)
      .from("orders")
      .select("id, status, stock_discounted")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (orderErr) {
      console.error("[flow-webhook] error consultando orden", {
        orderNumber,
        error: orderErr.message,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }
    if (!orderRow) {
      console.warn("[flow-webhook] orden no encontrada", { orderNumber });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Flow status:
    //  1 → pending
    //  2 → paid
    //  3 → rejected
    //  4 → cancelled
    if (statusCode !== 2) {
      console.log("[flow-webhook] estado no-paid, no se descuenta stock", {
        orderNumber,
        statusCode,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // ── 3. Descontar stock (idempotente) ───────────────────────────────────
    const stockRes = await confirmPaidOrderAndDecrementStock(admin, orderRow.id as string);
    if (!stockRes.ok) {
      console.error("[flow-webhook] error descontando stock", {
        orderNumber,
        error: stockRes.error,
        code: stockRes.code,
      });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    console.log("[flow-webhook] orden confirmada", {
      orderNumber,
      alreadyDiscounted: stockRes.alreadyDiscounted,
      decrementedLines: stockRes.decrementedLines,
      finalStatus: stockRes.finalStatus,
    });

    // Sólo invalidar caches cuando hubo descuento real (evita re-invalidar
    // ante webhooks duplicados que entran al early-return idempotente).
    if (!stockRes.alreadyDiscounted && stockRes.decrementedLines > 0) {
      revalidateAfterStockChange();
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[flow-webhook] excepción", err);
    return NextResponse.json({ error: "Error en webhook" }, { status: 500 });
  }
}
