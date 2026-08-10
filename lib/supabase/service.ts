import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * ⚠️ صلاحيات كاملة تتجاوز RLS بالكامل.
 *
 * الاستخدام الوحيد المسموح به في هذا المشروع: قراءة فاتورة عامة واحدة
 * بواسطة public_id (UUID عشوائي غير قابل للتخمين) في:
 *   - app/invoice/[public_id]/page.tsx
 *   - app/api/public-invoices/[public_id]/pdf/route.ts
 *
 * ممنوع استيراد هذا الملف داخل أي Client Component، وممنوع استخدامه
 * لأي استعلام غير مفلتر بـ public_id محدد.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY أو NEXT_PUBLIC_SUPABASE_URL غير مضبوطة في متغيرات البيئة."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
