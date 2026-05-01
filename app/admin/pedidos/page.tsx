import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { PedidosClient } from "./PedidosClient";

export const metadata: Metadata = { title: "Pedidos — Admin" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getOrders() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (createAdminClient() as any)
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_email, items, total, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/pedidos] Error consultando orders:", error.message);
      return {
        orders: [],
        error: "No se pudieron cargar los pedidos desde Supabase.",
      };
    }

    return { orders: data ?? [], error: null };
  } catch (err) {
    console.error("[admin/pedidos] Excepción consultando orders:", err);
    return {
      orders: [],
      error: "Error inesperado al cargar pedidos.",
    };
  }
}

export default async function PedidosPage() {
  const { orders, error } = await getOrders();

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return <PedidosClient orders={orders} />;
}
