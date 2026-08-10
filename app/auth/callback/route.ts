import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * يُستدعى تلقائيًا من رابط تأكيد الإيميل أو رابط استرجاع كلمة المرور.
 * يحوّل الـ code القادم من Supabase إلى جلسة فعلية (session) عبر
 * exchangeCodeForSession، ثم يوجّه المستخدم للوجهة المناسبة.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/login?error=auth_callback_failed", requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
