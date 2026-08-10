"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { FormMessage } from "@/components/auth/form-message";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(mapAuthError(signUpError.message));
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold text-primary">
            تحقق من بريدك الإلكتروني
          </h1>
          <p className="text-sm text-muted-foreground">
            أرسلنا رابط تأكيد إلى <span dir="ltr">{email}</span>. افتح
            الرابط لتفعيل حسابك ثم سجّل دخولك.
          </p>
          <Link href="/login" className="text-primary hover:underline">
            الذهاب لتسجيل الدخول
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-primary">إنشاء حساب</h1>
          <p className="text-sm text-muted-foreground">
            ابدأ مع SmartInvoice AI في دقيقة واحدة
          </p>
        </div>

        {error && <FormMessage type="error" message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-sm font-medium">
              الاسم الكامل
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

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

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              كلمة المرور
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              6 أحرف على الأقل.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-primary hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </main>
  );
}

function mapAuthError(message: string): string {
  if (message.includes("User already registered")) {
    return "هذا البريد الإلكتروني مسجّل بالفعل.";
  }
  if (message.includes("Password should be at least")) {
    return "كلمة المرور قصيرة جدًا (6 أحرف على الأقل).";
  }
  if (message.includes("Unable to validate email")) {
    return "صيغة البريد الإلكتروني غير صحيحة.";
  }
  return "حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.";
}
