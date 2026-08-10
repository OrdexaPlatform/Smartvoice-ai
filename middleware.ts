import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * يحافظ على جلسة تسجيل الدخول محدّثة في كل طلب، ويطبّق حماية المسارات:
 * - مستخدم غير مسجّل يحاول فتح مسار محمي (/dashboard...) → /login
 * - مستخدم مسجّل يحاول فتح /login أو /signup أو /forgot-password → /dashboard
 * - /reset-password مستثناة عمدًا (راجع التعليق بالأسفل).
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // ملاحظة: /reset-password مُستثناة عمدًا من هذه القائمة. رابط استرجاع
  // كلمة المرور ينشئ جلسة مؤقتة (recovery session)، فلو أضفناها هنا
  // سيتم تحويل المستخدم المسجّل مؤقتًا إلى /dashboard قبل أن يتمكن من
  // تعيين كلمة مرور جديدة.
  const authPages = ["/login", "/signup", "/forgot-password"];
  const isAuthPage = authPages.some((p) => path.startsWith(p));

  // المسارات الخاصة بالتطبيق بعد تسجيل الدخول. ملاحظة: "/invoices"
  // (جمع) هنا لا تتعارض مع "/invoice/[public_id]" (مفرد، صفحة عامة)
  // لأن startsWith("/invoices") ترجع false لمسار يبدأ بـ "/invoice/".
  const protectedPrefixes = [
    "/dashboard",
    "/onboarding",
    "/settings",
    "/import",
    "/customers",
    "/orders",
    "/invoices",
  ];
  const isProtectedRoute = protectedPrefixes.some((p) => path.startsWith(p));

  if (!user && isProtectedRoute) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectTo", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
