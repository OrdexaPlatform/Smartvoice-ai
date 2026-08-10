"use server";

import { revalidatePath } from "next/cache";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";

export async function updateBusiness(formData: FormData) {
  const { business } = await requireBusiness();
  const supabase = createClient();

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    return { error: "اسم النشاط التجاري مطلوب." };
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      address: (formData.get("address") as string) || null,
      tax_number: (formData.get("tax_number") as string) || null,
      currency: (formData.get("currency") as string) || "EGP",
      logo_url: (formData.get("logo_url") as string) || null,
    })
    .eq("id", business.id);

  if (error) {
    return { error: "تعذّر حفظ التعديلات: " + error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
