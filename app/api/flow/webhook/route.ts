import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const commerceOrder = String(body.get("commerceOrder") ?? "");
    const status = String(body.get("status") ?? "");
    // TODO: verificar firma + actualizar orden a "paid".
    // Preparado para correo de pago confirmado cuando la orden se marque pagada.
    console.log("[order-email-customer] webhook listo para pago confirmado", {
      commerceOrder,
      status,
    });
    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Error en webhook" }, { status: 500 });
  }
}
