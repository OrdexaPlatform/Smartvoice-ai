"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FormMessage } from "@/components/auth/form-message";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      }
    );

    setLoading(false);

    // ملاحظة أمنية: لا نكشف هل البريد موجود في النظام أو لا — نعرض
    // نفس رسالة النجاح دائمًا، حتى لو فشل الإرسال داخليًا لبريد غير مسجّل.
    if (resetError && !resetError.message.includes("rate limit")) {
      setSent(true);
      return;
    }
    if (resetError) {
      setError("تم إرسال طلبات كثيرة. حاول مرة أخرى بعد قليل.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold text-primary">
            تحقق من بريدك الإلكتروني
          </h1>
          <p className="text-sm text-muted-foreground">
            إذا كان هذا البريد مسجّلاً لدينا، ستصلك رسالة تحتوي على رابط
            لإعادة تعيين كلمة المرور.
          </p>
          <Link href="/login" className="text-primary hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-primary">
            نسيت كلمة المرور؟
          </h1>
          <p className="text-sm text-muted-foreground">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
          </p>
        </div>

        {error && <FormMessage type="error" message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "جارٍ الإرسال..." : "إرسال رابط إعادة التعيين"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          تذكرت كلمة المرور؟{" "}
          <Link href="/login" className="text-primary hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </main>
  );
}
