"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const { business } = await requireBusiness();
  const supabase = createClient();

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("business_id", business.id);

  if (error) {
    return { error: "تعذّر تحديث حالة الطلب: " + error.message };
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
}

export async function createInvoiceFromOrder(orderId: string) {
  const { business } = await requireBusiness();
  const supabase = createClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, customer_id, business_id")
    .eq("id", orderId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (orderError || !order) {
    return { error: "الطلب غير موجود." };
  }

  // لكل طلب فاتورة واحدة فقط (unique constraint على order_id) — لو
  // موجودة بالفعل، وجّه المستخدم لها بدل محاولة إنشاء ثانية.
  const { data: existingInvoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existingInvoice) {
    redirect(`/invoices/${existingInvoice.id}`);
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_name, quantity, unit_price, subtotal")
    .eq("order_id", orderId);

  if (itemsError || !items || items.length === 0) {
    return { error: "لا يمكن إنشاء فاتورة لطلب بدون عناصر." };
  }

  const subtotal = items.reduce((sum, i) => sum + Number(i.subtotal), 0);

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      business_id: business.id,
      order_id: order.id,
      customer_id: order.customer_id,
      subtotal,
      discount: 0,
      tax: 0,
      total: subtotal,
      // invoice_number يتولّد تلقائيًا داخل قاعدة البيانات (Task 2)
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    return { error: "تعذّر إنشاء الفاتورة: " + invoiceError?.message };
  }

  const invoiceItemsPayload = items.map((i) => ({
    invoice_id: invoice.id,
    name: i.product_name,
    quantity: i.quantity,
    unit_price: i.unit_price,
    subtotal: i.subtotal,
  }));

  const { error: invoiceItemsError } = await supabase
    .from("invoice_items")
    .insert(invoiceItemsPayload);

  if (invoiceItemsError) {
    return { error: "تعذّر حفظ عناصر الفاتورة: " + invoiceItemsError.message };
  }

  revalidatePath(`/orders/${orderId}`);
  redirect(`/invoices/${invoice.id}`);
}
