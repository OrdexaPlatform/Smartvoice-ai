import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * يُستخدم داخل Server Components وRoute Handlers وServer Actions.
 * كل استعلامات قاعدة البيانات الحساسة (وأي استدعاء لمزوّد AI) يجب أن
 * تمر من هنا، وليس من client.ts، حتى لا يتم كشف أي مفتاح حساس.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // يحدث عند استدعائها من Server Component — يمكن تجاهله
            // بشرط وجود middleware.ts يقوم بتحديث الجلسة.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // نفس السبب أعلاه
          }
        },
      },
    }
  );
}
