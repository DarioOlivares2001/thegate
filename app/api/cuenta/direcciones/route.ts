import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeClienteEmail } from "@/lib/clientes/upsertClienteFromOrder";
import { getCuentaSessionFromCookies } from "@/lib/cuenta/session";

export const runtime = "nodejs";

const postSchema = z.object({
  nombre: z.string().min(1).max(120),
  direccion: z.string().min(3).max(300),
  comuna: z.string().min(1).max(120),
  region: z.string().min(1).max(120),
  referencia: z.string().max(300).optional().nullable(),
  telefono: z.string().max(40).optional().nullable(),
  is_default: z.boolean().optional(),
});

async function getClienteId(admin: any, email: string): Promise<string | null> {
  const { data, error } = await admin.from("clientes").select("id").eq("email", email).maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

export async function GET() {
  const session = getCuentaSessionFromCookies();
  if (!session?.email) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const email = normalizeClienteEmail(session.email);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const clienteId = await getClienteId(admin, email);
  if (!clienteId) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  const { data, error } = await admin
    .from("cliente_direcciones")
    .select("id,nombre,direccion,comuna,region,referencia,telefono,is_default,created_at,updated_at")
    .eq("cliente_id", clienteId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[cuenta-direcciones] list", error.message);
    return NextResponse.json({ error: "No se pudieron cargar las direcciones." }, { status: 500 });
  }

  return NextResponse.json({ direcciones: data ?? [] });
}

export async function POST(request: Request) {
  const session = getCuentaSessionFromCookies();
  if (!session?.email) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const email = normalizeClienteEmail(session.email);
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const clienteId = await getClienteId(admin, email);
  if (!clienteId) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
  }

  const d = parsed.data;
  const isDefault = Boolean(d.is_default);

  if (isDefault) {
    await admin.from("cliente_direcciones").update({ is_default: false }).eq("cliente_id", clienteId);
  }

  const { data: inserted, error: insErr } = await admin
    .from("cliente_direcciones")
    .insert({
      cliente_id: clienteId,
      nombre: d.nombre.trim(),
      direccion: d.direccion.trim(),
      comuna: d.comuna.trim(),
      region: d.region.trim(),
      referencia: d.referencia?.trim() || null,
      telefono: d.telefono?.trim() || null,
      is_default: isDefault,
    })
    .select("id")
    .single();

  if (insErr) {
    console.error("[cuenta-direcciones] insert", insErr.message);
    return NextResponse.json({ error: "No se pudo crear la dirección." }, { status: 500 });
  }

  return NextResponse.json({ ok: true as const, id: inserted?.id });
}
