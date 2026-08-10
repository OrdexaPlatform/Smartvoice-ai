import Link from "next/link";
import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/ui/shell";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type Invoice,
  type Order,
} from "@/lib/types";

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export default async function DashboardPage() {
  const { business } = await requireBusiness();
  const supabase = createClient();

  const [
    invoicesResult,
    ordersCountResult,
    newOrdersResult,
    unpaidInvoicesResult,
    recentOrdersResult,
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("total, payment_status")
      .eq("business_id", business.id),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("status", "new"),
    supabase
      .from("invoices")
      .select("id, invoice_number, total, payment_status, customer_id")
      .eq("business_id", business.id)
      .in("payment_status", ["unpaid", "partially_paid", "overdue"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("orders")
      .select("id, status, total, created_at, customer_id")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const invoices = invoicesResult.data ?? [];
  const totalSales = invoices.reduce((sum, i) => sum + Number(i.total), 0);

  const { data: paymentsData } = await supabase
    .from("payments")
    .select("amount, invoice_id, invoices!inner(business_id)")
    .eq("invoices.business_id", business.id);

  const totalPaid = (paymentsData ?? []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );
  const totalDue = totalSales - totalPaid;

  const stats = [
    { label: "إجمالي المبيعات", value: formatMoney(totalSales, business.currency) },
    { label: "المبالغ المدفوعة", value: formatMoney(totalPaid, business.currency) },
    { label: "المبالغ المستحقة", value: formatMoney(totalDue, business.currency) },
    { label: "عدد الطلبات", value: String(ordersCountResult.count ?? 0) },
    { label: "عدد الفواتير", value: String(invoices.length) },
    { label: "طلبات جديدة", value: String(newOrdersResult.count ?? 0) },
  ];

  return (
    <AppShell>
      <main className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              أهلًا، {business.name}
            </h1>
            <p className="text-sm text-muted-foreground">نظرة عامة على نشاطك</p>
          </div>
          <Link
            href="/import"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" />
            استيراد محادثة WhatsApp
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-border bg-card p-4"
            >
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">فواتير غير مدفوعة</h2>
              <Link href="/invoices" className="text-xs text-primary hover:underline">
                عرض الكل
              </Link>
            </div>
            {(unpaidInvoicesResult.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد فواتير غير مدفوعة 🎉</p>
            ) : (
              <ul className="space-y-2">
                {(unpaidInvoicesResult.data as Invoice[]).map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-secondary"
                    >
                      <span dir="ltr" className="font-medium">
                        {inv.invoice_number}
                      </span>
                      <span className="flex items-center gap-2">
                        {formatMoney(Number(inv.total), business.currency)}
                        <PaymentStatusBadge
                          status={inv.payment_status}
                          label={PAYMENT_STATUS_LABELS[inv.payment_status]}
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">أحدث الطلبات</h2>
              <Link href="/orders" className="text-xs text-primary hover:underline">
                عرض الكل
              </Link>
            </div>
            {(recentOrdersResult.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد طلبات بعد — ابدأ باستيراد محادثة WhatsApp.
              </p>
            ) : (
              <ul className="space-y-2">
                {(recentOrdersResult.data as Order[]).map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-secondary"
                    >
                      <span>{formatMoney(Number(order.total), business.currency)}</span>
                      <OrderStatusBadge
                        status={order.status}
                        label={ORDER_STATUS_LABELS[order.status]}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
