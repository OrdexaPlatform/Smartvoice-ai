"use server";

import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";

export interface ReviewItem {
  name: string;
  quantity: number;
  unit_price: number;
}

function normalizeDeliveryDate(value: string): string | null {
  const text = value.trim();

  if (!text) {
    return null;
  }

  // لو التاريخ بالفعل بصيغة YYYY-MM-DD
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;
    }
  }

  // لو AI رجّع تاريخ بصيغة DD/MM/YYYY أو DD-MM-YYYY
  const arabicDateMatch = text.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/
  );

  if (arabicDateMatch) {
    const day = Number(arabicDateMatch[1]);
    const month = Number(arabicDateMatch[2]);
    const year = Number(arabicDateMatch[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;
    }
  }

  // لو AI رجّع تاريخ بصيغة YYYY/MM/DD
  const yearFirstMatch = text.match(
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
  );

  if (yearFirstMatch) {
    const year = Number(yearFirstMatch[1]);
    const month = Number(yearFirstMatch[2]);
    const day = Number(yearFirstMatch[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;
    }
  }

  // لو مكتوب كلام مثل:
  // اليوم الساعة 8 مساءً
  // بكرة الساعة 6
  // بعد بكرة
  //
  // لا نرسل الكلام إلى قاعدة البيانات لأن العمود date
  // يقبل تاريخًا فقط.
  //
  // المعلومة نفسها ستظل موجودة في notes لو كانت موجودة
  // في المحادثة.
  return null;
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
    if (
      !item.name.trim() ||
      item.quantity <= 0 ||
      item.unit_price < 0
    ) {
      return {
        error:
          "تأكد من صحة بيانات كل المنتجات (الاسم، الكمية، السعر).",
      };
    }
  }

  // ==========================================
  // العميل
  // ==========================================

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
      return {
        error:
          "تعذّر حفظ بيانات العميل: " +
          (customerError?.message || "خطأ غير معروف"),
      };
    }

    customerId = newCustomer.id;
  }

  // ==========================================
  // حساب إجمالي الطلب
  // ==========================================

  const total = input.items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  // ==========================================
  // طريقة الدفع
  // ==========================================

  const methodLabel: Record<string, string> = {
    cash: "نقدًا",
    cash_on_delivery: "الدفع عند الاستلام",
    bank_transfer: "تحويل بنكي",
    card: "بطاقة",
    other: "أخرى",
  };

  const notesParts: string[] = [];

  if (input.notes.trim()) {
    notesParts.push(input.notes.trim());
  }

  if (
    input.paymentMethod &&
    methodLabel[input.paymentMethod]
  ) {
    notesParts.push(
      `طريقة الدفع المذكورة في المحادثة: ${methodLabel[input.paymentMethod]}`
    );
  }

  // نحتفظ بالتاريخ الأصلي لو كان AI استخرج كلامًا مثل:
  // "اليوم الساعة 8 مساءً"
  //
  // حتى لا تضيع المعلومة.
  if (input.deliveryDate.trim()) {
    notesParts.push(
      `موعد التسليم المذكور: ${input.deliveryDate.trim()}`
    );
  }

  const combinedNotes =
    notesParts.length > 0
      ? notesParts.join(" | ")
      : null;

  // ==========================================
  // تحويل التاريخ إلى Date صالح لقاعدة البيانات
  // ==========================================

  const deliveryDate = normalizeDeliveryDate(
    input.deliveryDate
  );

  // ==========================================
  // إنشاء الطلب
  // ==========================================

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      business_id: business.id,
      customer_id: customerId,
      total,
      notes: combinedNotes,
      delivery_date: deliveryDate,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return {
      error:
        "تعذّر إنشاء الطلب: " +
        (orderError?.message || "خطأ غير معروف"),
    };
  }

  // ==========================================
  // عناصر الطلب
  // ==========================================

  const orderItemsPayload = input.items.map((item) => ({
    order_id: order.id,
    product_name: item.name.trim(),
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal:
      Math.round(
        item.quantity * item.unit_price * 100
      ) / 100,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsPayload);

  if (itemsError) {
    return {
      error:
        "تعذّر حفظ عناصر الطلب: " +
        itemsError.message,
    };
  }

  // ==========================================
  // تحديث سجل الاستيراد
  // ==========================================

  if (input.importId) {
    await supabase
      .from("conversation_imports")
      .update({ status: "saved" })
      .eq("id", input.importId);
  }

  // ==========================================
  // الانتقال إلى تفاصيل الطلب
  // ==========================================

  redirect(`/orders/${order.id}`);
                          }
