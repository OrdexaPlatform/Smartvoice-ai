"use client";

import { useState, useTransition } from "react";
import { FormMessage } from "@/components/auth/form-message";
import type { Business } from "@/lib/types";

const CURRENCIES = ["EGP", "SAR", "AED", "USD", "KWD"];

type ActionResult = { error?: string } | void;

export function BusinessForm({
  initialData,
  action,
  submitLabel,
}: {
  initialData?: Partial<Business>;
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(formData: FormData) {
    setError("");
    setSuccess(false);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && <FormMessage type="error" message={error} />}
      {success && (
        <FormMessage type="success" message="تم الحفظ بنجاح." />
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          اسم النشاط التجاري *
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={initialData?.name ?? ""}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            رقم الهاتف
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={initialData?.phone ?? ""}
            dir="ltr"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={initialData?.email ?? ""}
            dir="ltr"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="address" className="text-sm font-medium">
          العنوان
        </label>
        <input
          id="address"
          name="address"
          defaultValue={initialData?.address ?? ""}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="tax_number" className="text-sm font-medium">
            الرقم الضريبي (اختياري)
          </label>
          <input
            id="tax_number"
            name="tax_number"
            defaultValue={initialData?.tax_number ?? ""}
            dir="ltr"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="currency" className="text-sm font-medium">
            العملة
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={initialData?.currency ?? "EGP"}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="logo_url" className="text-sm font-medium">
          رابط الشعار (Logo URL)
        </label>
        <input
          id="logo_url"
          name="logo_url"
          type="url"
          defaultValue={initialData?.logo_url ?? ""}
          dir="ltr"
          placeholder="https://..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          رفع الملفات مباشرة (Supabase Storage) سيُضاف لاحقًا — استخدم
          رابطًا مباشرًا للشعار حاليًا.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
      >
        {isPending ? "جارٍ الحفظ..." : submitLabel}
      </button>
    </form>
  );
}
