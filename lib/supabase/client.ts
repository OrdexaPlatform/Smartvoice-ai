import { createBrowserClient } from "@supabase/ssr";

/**
 * يُستخدم فقط داخل Client Components.
 * لا يحتوي على أي صلاحيات خاصة (يستخدم anon key فقط)
 * والحماية الفعلية تتم عبر Row Level Security في قاعدة البيانات.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
