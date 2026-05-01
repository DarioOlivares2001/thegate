"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID = ["pending", "paid", "preparing", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = (typeof VALID)[number];

export async function updateOrderStatusAction(
  id: string,
  status: string
): Promise<{ error?: string }> {
  const normalizedStatus = status === "ready_to_ship" ? "shipped" : status;
  if (!VALID.includes(normalizedStatus as OrderStatus)) return { error: "Estado inválido." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (createAdminClient() as any)
    .from("orders")
    .update({ status: normalizedStatus })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${id}`);
  return {};
}
