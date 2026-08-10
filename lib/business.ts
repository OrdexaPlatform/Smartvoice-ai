import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/types";

/**
 * يجلب Business الخاص بالمستخدم المسجّل حاليًا. لو لم يُسجّل دخول،
 * أو لم يُنشئ Business بعد، يحوّله تلقائيًا للمكان المناسب.
 * يُستخدم في كل صفحة محمية تحتاج بيانات business_id (Dashboard,
 * Customers, Orders, Invoices, Import...).
 */
export async function requireBusiness(): Promise<{
  business: Business;
  userId: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`تعذّر جلب بيانات النشاط التجاري: ${error.message}`);
  }

  if (!business) {
    redirect("/onboarding");
  }

  return { business: business as Business, userId: user.id };
}

/**
 * نسخة مخصصة لـ API Routes: بترجع null بدل ما تعمل redirect() (اللي
 * مصمم للـ Server Components/Actions فقط ومش سلوكه موثوق داخل Route
 * Handler). المستدعي مسؤول عن إرجاع NextResponse مناسب.
 */
export async function getBusinessOrNull(): Promise<{
  business: Business;
  userId: string;
} | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: business, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error || !business) return null;

  return { business: business as Business, userId: user.id };
}
