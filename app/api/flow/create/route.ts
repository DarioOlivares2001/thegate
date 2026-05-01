import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderNotification } from "@/lib/email/sendOrderNotification";

const FLOW_API_URL   = process.env.FLOW_API_URL            ?? "https://sandbox.flow.cl/api";
const FLOW_API_KEY   = process.env.FLOW_API_KEY            ?? "";
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY        ?? "";
const SITE_URL       = process.env.NEXT_PUBLIC_SITE_URL    ?? "http://localhost:3000";
const FLOW_MOCK      =
  process.env.FLOW_MOCK === "true" || FLOW_API_KEY.toLowerCase().includes("sandbox");

// ─── HMAC-SHA256 signing ──────────────────────────────────────────────────────

function sign(params: Record<string, string>, secret: string): string {
  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

// ─── Shared order shape ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildOrderPayload(body: any, status: "pending" | "paid") {
  const { customer, items, subtotal, shippingCost, total } = body;
  return {
    status,
    customer_name:    customer.name,
    customer_email:   customer.email,
    customer_phone:   customer.phone ?? null,
    shipping_address: {
      direccion: customer.address,
      ciudad:    customer.city,
      region:    customer.region,
    },
    items:         items        ?? [],
    subtotal:      subtotal     ?? 0,
    shipping_cost: shippingCost ?? 0,
    total,
  };
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, total } = body;

    if (!customer?.email || !total) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // ── Mock mode ─────────────────────────────────────────────────────────────
    // Uses the admin client (service_role) so it bypasses RLS and can set
    // status = 'paid' directly — simulating a completed Flow payment.
    if (FLOW_MOCK) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (createAdminClient() as any)
        .from("orders")
        .insert(buildOrderPayload(body, "paid"))
        .select("order_number")
        .single();

      if (error) {
        console.error("[Flow mock] Error creando orden:", error.message);
        return NextResponse.json(
          { error: "Error al crear la orden de prueba" },
          { status: 500 }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderNumber: number = (data as any).order_number;
      const mockToken = `MOCK-${orderNumber}`;
      console.info(`[Flow mock] Orden #${orderNumber} creada con status 'paid'`);
      console.log("[order-created]", {
        mode: "mock",
        orderNumber,
        status: "paid",
        customerEmail: customer.email,
      });

      try {
        console.log("[email] trigger notificación pedido (mock)");
        await sendOrderNotification({
          orderNumber,
          orderStatus: "paid",
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone ?? null,
          shippingAddress: {
            direccion: customer.address,
            ciudad: customer.city,
            region: customer.region,
          },
          items: body.items ?? [],
          subtotal: Number(body.subtotal ?? 0),
          shippingCost: Number(body.shippingCost ?? 0),
          total: Number(total),
        });
      } catch (emailError) {
        console.error("[email-error] Falló notificación de pedido:", emailError);
      }

      return NextResponse.json({
        redirectUrl: `${SITE_URL}/checkout/confirmacion?order=${orderNumber}&token=${mockToken}&mock=1`,
        token:        mockToken,
        flowOrder:    0,
        commerceOrder: `TG-${orderNumber}`,
      });
    }

    // ── Live mode — insert pending order, then call Flow ──────────────────────

    // Persist order first (mandatory). If this fails, do not continue to Flow.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orderData, error: orderError } = await (createAdminClient() as any)
      .from("orders")
      .insert(buildOrderPayload(body, "pending"))
      .select("order_number")
      .single();

    if (orderError || !orderData?.order_number) {
      console.error("[Flow create] Error creando orden pending:", orderError?.message);
      return NextResponse.json(
        { error: "No se pudo crear la orden antes de iniciar el pago." },
        { status: 500 }
      );
    }

    const commerceOrder = `TG-${orderData.order_number}`;
    console.log("[order-created]", {
      mode: "live",
      orderNumber: orderData.order_number,
      status: "pending",
      customerEmail: customer.email,
    });

    try {
      console.log("[email] trigger notificación pedido (live)");
      await sendOrderNotification({
        orderNumber: orderData.order_number,
        orderStatus: "pending",
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone ?? null,
        shippingAddress: {
          direccion: customer.address,
          ciudad: customer.city,
          region: customer.region,
        },
        items: body.items ?? [],
        subtotal: Number(body.subtotal ?? 0),
        shippingCost: Number(body.shippingCost ?? 0),
        total: Number(total),
      });
    } catch (emailError) {
      console.error("[email-error] Falló notificación de pedido:", emailError);
    }

    if (!FLOW_API_KEY || !FLOW_SECRET_KEY) {
      return NextResponse.json(
        {
          error:
            "Las credenciales de Flow no están configuradas. " +
            "Agrega FLOW_API_KEY y FLOW_SECRET_KEY en .env.local",
        },
        { status: 503 }
      );
    }

    const params: Record<string, string> = {
      apiKey:           FLOW_API_KEY,
      subject:          `Compra TheGate — ${commerceOrder}`,
      currency:         "CLP",
      amount:           String(Math.round(total)),
      email:            customer.email,
      urlConfirmation:  `${SITE_URL}/api/flow/webhook`,
      urlReturn:        `${SITE_URL}/checkout/confirmacion`,
      commerceOrder,
    };
    params.s = sign(params, FLOW_SECRET_KEY);

    const flowRes = await fetch(`${FLOW_API_URL}/payment/create`, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams(params).toString(),
    });

    const flowData = await flowRes.json();

    if (!flowRes.ok || flowData.code !== 200) {
      console.error("Flow error:", flowData);
      return NextResponse.json(
        { error: flowData.message ?? "Error al crear la orden en Flow" },
        { status: 502 }
      );
    }

    // Store Flow token on the pending order (non-critical)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (createAdminClient() as any)
        .from("orders")
        .update({
          flow_token: flowData.token,
          flow_order: String(flowData.flowOrder),
        })
        .eq("status", "pending")
        .is("flow_token", null);
    } catch {
      // Non-critical
    }

    return NextResponse.json({
      redirectUrl:   `${flowData.url}?token=${flowData.token}`,
      token:         flowData.token,
      flowOrder:     flowData.flowOrder,
      commerceOrder,
    });
  } catch (err) {
    console.error("Flow create route error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
