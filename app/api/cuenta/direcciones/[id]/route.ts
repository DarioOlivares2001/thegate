import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeClienteEmail } from "@/lib/clientes/upsertClienteFromOrder";
import { getCuentaSessionFromCookies } from "@/lib/cuenta/session";

export const runtime = "nodejs";

const patchSchema = z.object({
  nombre: z.string().min(1).max(120).optional(),
  direccion: z.string().min(3).max(300).optional(),
  comuna: z.string().min(1).max(120).optional(),
  region: z.string().min(1).max(120).optional(),
  referencia: z.string().max(300).optional().nullable(),
  telefono: z.string().max(40).optional().nullable(),
  is_default: z.boolean().optional(),
});

async function assertOwnDireccion(
  admin: any,
  email: string,
  direccionId: string
): Promise<{ ok: true; clienteId: string } | { ok: false; status: number; message: string }> {
  const norm = normalizeClienteEmail(email);
  const { data: c } = await admin.from("clientes").select("id").eq("email", norm).maybeSingle();
  if (!c?.id) return { ok: false, status: 404, message: "Cliente no encontrado." };
  const clienteId = String(c.id);
  const { data: row } = await admin
    .from("cliente_direcciones")
    .select("id")
    .eq("id", direccionId)
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (!row) return { ok: false, status: 404, message: "Dirección no encontrada." };
  return { ok: true, clienteId };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = getCuentaSessionFromCookies();
  if (!session?.email) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const id = String(params.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const own = await assertOwnDireccion(admin, session.email, id);
  if (!own.ok) {
    return NextResponse.json({ error: own.message }, { status: own.status });
  }

  const p = parsed.data;
  const patch: Record<string, unknown> = {};
  if (p.nombre != null) patch.nombre = p.nombre.trim();
  if (p.direccion != null) patch.direccion = p.direccion.trim();
  if (p.comuna != null) patch.comuna = p.comuna.trim();
  if (p.region != null) patch.region = p.region.trim();
  if (p.referencia !== undefined) patch.referencia = p.referencia?.trim() || null;
  if (p.telefono !== undefined) patch.telefono = p.telefono?.trim() || null;

  if ("is_default" in parsed.data) {
    if (p.is_default === true) {
      await admin.from("cliente_direcciones").update({ is_default: false }).eq("cliente_id", own.clienteId);
      patch.is_default = true;
    } else {
      patch.is_default = false;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true as const });
  }

  const { error } = await admin.from("cliente_direcciones").update(patch).eq("id", id);
  if (error) {
    console.error("[cuenta-direcciones] patch", error.message);
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true as const });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = getCuentaSessionFromCookies();
  if (!session?.email) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const id = String(params.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const own = await assertOwnDireccion(admin, session.email, id);
  if (!own.ok) {
    return NextResponse.json({ error: own.message }, { status: own.status });
  }

  const { error } = await admin.from("cliente_direcciones").delete().eq("id", id);
  if (error) {
    console.error("[cuenta-direcciones] delete", error.message);
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true as const });
}
