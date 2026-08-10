"use client";

import { useState, useTransition } from "react";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { FormMessage } from "@/components/auth/form-message";
import { saveImportAndCreateOrder, type ReviewItem } from "@/app/import/actions";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/types";

type ReviewState = {
  importId: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: ReviewItem[];
  paymentMethod: PaymentMethod | "";
  deliveryDate: string;
  notes: string;
};

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export function ImportClient() {
  const [rawText, setRawText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [review, setReview] = useState<ReviewState | null>(null);
  const [saveError, setSaveError] = useState("");
  const [isSaving, startSaving] = useTransition();

  async function handleAnalyze() {
    if (!rawText.trim()) {
      setAnalyzeError("الصق نص المحادثة أولًا.");
      return;
    }
    setAnalyzing(true);
    setAnalyzeError("");
    setReview(null);

    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      const json = await res.json();

      if (!res.ok) {
        setAnalyzeError(json.error || "تعذّر تحليل المحادثة.");
        return;
      }

      const data = json.data;
      setReview({
        importId: json.importId,
        customerName: data.customer.name || "",
        customerPhone: data.customer.phone || "",
        customerAddress: data.customer.address || "",
        items: data.order.items.map((i: { name: string; quantity: number; unit_price: number | null }) => ({
          name: i.name,
          quantity: i.quantity,
          unit_price: i.unit_price ?? 0,
        })),
        paymentMethod: data.order.payment_method || "",
        deliveryDate: data.order.delivery_date || "",
        notes: data.order.notes || "",
      });
    } catch {
      setAnalyzeError("تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateItem(index: number, patch: Partial<ReviewItem>) {
    if (!review) return;
    const items = [...review.items];
    items[index] = { ...items[index], ...patch };
    setReview({ ...review, items });
  }

  function removeItem(index: number) {
    if (!review) return;
    setReview({ ...review, items: review.items.filter((_, i) => i !== index) });
  }

  function addItem() {
    if (!review) return;
    setReview({
      ...review,
      items: [...review.items, { name: "", quantity: 1, unit_price: 0 }],
    });
  }

  function handleSave() {
    if (!review) return;
    setSaveError("");
    startSaving(async () => {
      const result = await saveImportAndCreateOrder({
        importId: review.importId,
        customerName: review.customerName,
        customerPhone: review.customerPhone,
        customerAddress: review.customerAddress,
        items: review.items,
        paymentMethod: review.paymentMethod,
        deliveryDate: review.deliveryDate,
        notes: review.notes,
      });
      // لو نجح، الـ action بتعمل redirect بنفسها ومستنيّتش ترجع هنا.
      if (result?.error) {
        setSaveError(result.error);
      }
    });
  }

  const total = review
    ? review.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
    : 0;

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <label htmlFor="conversation" className="text-sm font-medium">
          الصق محادثة WhatsApp هنا
        </label>
        <textarea
          id="conversation"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={8}
          placeholder="السلام عليكم، أنا أحمد من مدينة نصر. عايز 3 تيشيرتات XL..."
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {analyzeError && <FormMessage type="error" message={analyzeError} />}
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {analyzing ? "جارٍ التحليل..." : "✨ تحليل المحادثة"}
        </button>
      </section>

      {review && (
        <section className="space-y-6 rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold">مراجعة البيانات المستخرجة</h2>

          {saveError && <FormMessage type="error" message={saveError} />}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">العميل</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs">الاسم</label>
                <input
                  value={review.customerName}
                  onChange={(e) =>
                    setReview({ ...review, customerName: e.target.value })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs">الهاتف</label>
                <input
                  value={review.customerPhone}
                  onChange={(e) =>
                    setReview({ ...review, customerPhone: e.target.value })
                  }
                  dir="ltr"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs">العنوان</label>
                <input
                  value={review.customerAddress}
                  onChange={(e) =>
                    setReview({ ...review, customerAddress: e.target.value })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              المنتجات
            </h3>
            <div className="space-y-2">
              {review.items.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[140px] flex-1 space-y-1">
                    <label className="text-xs">المنتج</label>
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(idx, { name: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <label className="text-xs">الكمية</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(idx, { quantity: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <label className="text-xs">سعر الوحدة</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(idx, { unit_price: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-xs">الإجمالي</label>
                    <div className="rounded-md border border-transparent px-3 py-2 text-sm font-medium">
                      {(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="rounded-md p-2 text-destructive hover:bg-destructive/10"
                    aria-label="حذف المنتج"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addItem}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة منتج
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs">طريقة الدفع</label>
              <select
                value={review.paymentMethod}
                onChange={(e) =>
                  setReview({
                    ...review,
                    paymentMethod: e.target.value as PaymentMethod,
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">غير محددة</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs">موعد التسليم</label>
              <input
                type="date"
                value={review.deliveryDate}
                onChange={(e) =>
                  setReview({ ...review, deliveryDate: e.target.value })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs">ملاحظات</label>
              <input
                value={review.notes}
                onChange={(e) => setReview({ ...review, notes: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              الإجمالي: <span className="font-bold text-foreground">{total.toFixed(2)}</span>
            </p>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "جارٍ الحفظ..." : "حفظ العميل وإنشاء الطلب"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
