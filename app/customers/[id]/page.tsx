import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/ui/shell";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/types";

interface CustomerOrderRow {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
}

interface CustomerInvoiceRow {
  id: string;
  invoice_number: string;
  total: number;
  payment_status: PaymentStatus;
  created_at: string;
}

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${currency}`;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { business } = await requireBusiness();
  const supabase = createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!customer) {
    notFound();
  }

  const [{ data: ordersRaw }, { data: invoicesRaw }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, total, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, invoice_number, total, payment_status, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false }),
  ]);

  // الـ Supabase client هنا غير مربوط بـ Generic Database type (لا يوجد
  // types مولّدة تلقائيًا بعد من `supabase gen types`)، فـ TypeScript
  // بيستنتج status/payment_status كـ string عام بدل الـ union الدقيق.
  // نحدد النوع الصحيح صراحةً هنا بدل الاعتماد على الاستنتاج التلقائي،
  // بنفس النمط المستخدم في orders/page.tsx وinvoices/page.tsx.
  const orders = (ordersRaw ?? []) as unknown as CustomerOrderRow[];
  const invoices = (invoicesRaw ?? []) as unknown as CustomerInvoiceRow[];

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">{customer.name}</h1>
          <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            {customer.phone && <p dir="ltr">{customer.phone}</p>}
            {customer.address && <p>{customer.address}</p>}
          </div>
        </div>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">الطلبات ({orders.length})</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد طلبات.</p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="flex items-center justify-between py-2 text-sm hover:opacity-80"
                  >
                    <span>{formatMoney(Number(o.total), business.currency)}</span>
                    <OrderStatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">الفواتير ({invoices.length})</h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد فواتير.</p>
          ) : (
            <ul className="divide-y divide-border">
              {invoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between py-2 text-sm hover:opacity-80"
                  >
                    <span dir="ltr">{inv.invoice_number}</span>
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
      </main>
    </AppShell>
  );
}
