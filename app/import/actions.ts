"use server";

import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";

export interface ReviewItem {
  name: string;
  quantity: number;
  unit_price: number;
}

export async function saveImportAndCreateOrder(input: {
  importId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: ReviewItem[];
  paymentMethod: string;
  deliveryDate: string;
  notes: string;
}) {
  const { business } = await requireBusiness();
  const supabase = createClient();

  const name = input.customerName.trim();
  if (!name) {
    return { error: "اسم العميل مطلوب." };
  }
  if (input.items.length === 0) {
    return { error: "أضف منتجًا واحدًا على الأقل." };
  }
  for (const item of input.items) {
    if (!item.name.trim() || item.quantity <= 0 || item.unit_price < 0) {
      return { error: "تأكد من صحة بيانات كل المنتجات (الاسم، الكمية، السعر)." };
    }
  }

  // البحث عن عميل بنفس رقم الهاتف داخل نفس الـ business لتفادي التكرار.
  // لو مفيش هاتف، ننشئ عميل جديد دائمًا (الاسم وحده مش معرّف كافٍ).
  let customerId: string | null = null;

  if (input.customerPhone.trim()) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", business.id)
      .eq("phone", input.customerPhone.trim())
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    }
  }

  if (!customerId) {
    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert({
        business_id: business.id,
        name,
        phone: input.customerPhone.trim() || null,
        address: input.customerAddress.trim() || null,
      })
      .select("id")
      .single();

    if (customerError || !newCustomer) {
      return { error: "تعذّر حفظ بيانات العميل: " + customerError?.message };
    }
    customerId = newCustomer.id;
  }

  const total = input.items.reduce(
    (sum, i) => sum + i.quantity * i.unit_price,
    0
  );

  // جدول orders لا يحتوي على عمود payment_method في الـ schema المعتمد
  // (Task 2) — طريقة الدفع الفعلية تُسجَّل لاحقًا في جدول payments عند
  // إنشاء الفاتورة وتسجيل الدفعة. لتفادي فقدان المعلومة اللي استخرجها
  // الـ AI بصمت، نلحقها بالملاحظات كمرجع للمستخدم فقط.
  const methodLabel: Record<string, string> = {
    cash: "نقدًا",
    cash_on_delivery: "الدفع عند الاستلام",
    bank_transfer: "تحويل بنكي",
    card: "بطاقة",
    other: "أخرى",
  };
  const notesParts = [input.notes.trim()];
  if (input.paymentMethod && methodLabel[input.paymentMethod]) {
    notesParts.push(`طريقة الدفع المذكورة في المحادثة: ${methodLabel[input.paymentMethod]}`);
  }
  const combinedNotes = notesParts.filter(Boolean).join(" | ") || null;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      business_id: business.id,
      customer_id: customerId,
      total,
      notes: combinedNotes,
      delivery_date: input.deliveryDate || null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { error: "تعذّر إنشاء الطلب: " + orderError?.message };
  }

  const orderItemsPayload = input.items.map((i) => ({
    order_id: order.id,
    product_name: i.name.trim(),
    quantity: i.quantity,
    unit_price: i.unit_price,
    subtotal: Math.round(i.quantity * i.unit_price * 100) / 100,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsPayload);

  if (itemsError) {
    return { error: "تعذّر حفظ عناصر الطلب: " + itemsError.message };
  }

  if (input.importId) {
    await supabase
      .from("conversation_imports")
      .update({ status: "saved" })
      .eq("id", input.importId);
  }

  redirect(`/orders/${order.id}`);
}
