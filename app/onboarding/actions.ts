"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createBusiness(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "الجلسة منتهية، الرجاء تسجيل الدخول مرة أخرى." };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "اسم النشاط التجاري مطلوب." };
  }

  // لا يجوز لمستخدم إنشاء أكثر من Business واحد في نطاق الـ MVP
  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect("/dashboard");
  }

  const { error } = await supabase.from("businesses").insert({
    owner_id: user.id,
    name,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    address: (formData.get("address") as string) || null,
    tax_number: (formData.get("tax_number") as string) || null,
    currency: (formData.get("currency") as string) || "EGP",
    logo_url: (formData.get("logo_url") as string) || null,
  });

  if (error) {
    return { error: "تعذّر إنشاء النشاط التجاري: " + error.message };
  }

  redirect("/dashboard");
}
