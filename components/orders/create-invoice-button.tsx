"use client";

import { useState, useTransition } from "react";
import { FileText } from "lucide-react";
import { createInvoiceFromOrder } from "@/app/orders/actions";
import { FormMessage } from "@/components/auth/form-message";

export function CreateInvoiceButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleClick() {
    setError("");
    startTransition(async () => {
      const result = await createInvoiceFromOrder(orderId);
      if (result?.error) {
        setError(result.error);
      }
      // النجاح بيعمل redirect من داخل الـ action نفسها.
    });
  }

  return (
    <div className="space-y-2">
      {error && <FormMessage type="error" message={error} />}
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        <FileText className="h-4 w-4" />
        {isPending ? "جارٍ الإنشاء..." : "إنشاء فاتورة"}
      </button>
    </div>
  );
}
