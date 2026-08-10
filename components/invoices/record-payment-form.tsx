"use client";

import { useState, useTransition } from "react";
import { recordPayment } from "@/app/invoices/actions";
import { FormMessage } from "@/components/auth/form-message";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/types";

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export function RecordPaymentForm({
  invoiceId,
  remaining,
}: {
  invoiceId: string;
  remaining: number;
}) {
  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : "");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (remaining <= 0) {
    return (
      <p className="text-sm text-muted-foreground">
        تم سداد الفاتورة بالكامل. لا توجد مبالغ متبقية.
      </p>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    startTransition(async () => {
      const result = await recordPayment(invoiceId, Number(amount), method, notes);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setNotes("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <FormMessage type="error" message={error} />}
      {success && <FormMessage type="success" message="تم تسجيل الدفعة بنجاح." />}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs">المبلغ (المتبقي: {remaining.toFixed(2)})</label>
          <input
            type="number"
            min={0.01}
            max={remaining}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs">طريقة الدفع</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs">ملاحظات</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "جارٍ التسجيل..." : "تسجيل الدفعة"}
      </button>
    </form>
  );
}
