import { NextResponse } from "next/server";

export async function GET() {
  // TODO: listar pedidos desde Supabase
  return NextResponse.json({ pedidos: [] });
}

export async function POST() {
  // TODO: crear pedido en Supabase
  return NextResponse.json({ pedido: null }, { status: 201 });
}
