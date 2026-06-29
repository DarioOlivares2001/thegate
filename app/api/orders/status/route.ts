import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const orderNum = Number(request.nextUrl.searchParams.get("order"));
  if (!Number.isFinite(orderNum) || orderNum <= 0) {
    return NextResponse.json({ error: "Parámetro order requerido" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin as any)
      .from("orders")
      .select("status")
      .eq("order_number", orderNum)
      .maybeSingle();

    if (error) {
      console.error("[orders/status] error consultando orden:", error.message);
      return NextResponse.json({ error: "Error consultando orden" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ status: data.status as string });
  } catch (err) {
    console.error("[orders/status] excepción:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
