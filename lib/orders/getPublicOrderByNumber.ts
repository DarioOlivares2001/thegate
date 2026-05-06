import { createAdminClient } from "@/lib/supabase/admin";

/** Campos mínimos para la vista pública de seguimiento (sin id ni tokens de pago). */
export type PublicOrderTracking = {
  order_number: number;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  items: unknown;
  subtotal: number;
  shipping_cost: number;
  total: number;
  created_at: string;
};

export async function getPublicOrderByNumber(
  orderNumber: number
): Promise<PublicOrderTracking | null> {
  if (!Number.isFinite(orderNumber) || orderNumber < 1) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createAdminClient() as any;
    const { data, error } = await admin
      .from("orders")
      .select(
        "order_number, status, customer_name, customer_email, customer_phone, items, subtotal, shipping_cost, total, created_at"
      )
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error) {
      console.error("[seguimiento] getPublicOrderByNumber", error.message);
      return null;
    }
    if (!data) return null;

    return data as PublicOrderTracking;
  } catch (e) {
    console.error("[seguimiento] getPublicOrderByNumber excepción", e);
    return null;
  }
}
