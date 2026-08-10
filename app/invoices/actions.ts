"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/types";

export async function recordPayment(
  invoiceId: string,
  amount: number,
  method: PaymentMethod,
  notes: string
) {
  const { business } = await requireBusiness();
  const supabase = createClient();

  if (!amount || amount <= 0) {
    return { error: "المبلغ يجب أن يكون أكبر من صفر." };
  }

  // تأكد إن الفاتورة تتبع نفس الـ business قبل أي إدخال (دفاع إضافي
  // فوق RLS، بنفس نمط باقي المشروع)
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, total")
    .eq("id", invoiceId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!invoice) {
    return { error: "الفاتورة غير موجودة." };
  }

  const { error } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    method,
    notes: notes.trim() || null,
  });

  if (error) {
    // رسالة الخطأ من الـ trigger (مثل تجاوز الإجمالي) بتوصل هنا كما هي
    return { error: "تعذّر تسجيل الدفعة: " + error.message };
  }

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}
