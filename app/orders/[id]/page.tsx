import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/ui/shell";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusSelect } from "@/components/orders/order-status-select";
import { CreateInvoiceButton } from "@/components/orders/create-invoice-button";

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${currency}`;
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { business } = await requireBusiness();
  const supabase = createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, customers(id, name, phone, address)")
    .eq("id", params.id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const [{ data: items }, { data: existingInvoice }] = await Promise.all([
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id),
    supabase
      .from("invoices")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle(),
  ]);

  const customer = (order as unknown as { customers: { id: string; name: string; phone: string | null; address: string | null } }).customers;

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">تفاصيل الطلب</h1>
            <Link href={`/customers/${customer.id}`} className="text-sm text-primary hover:underline">
              {customer.name}
            </Link>
            {customer.phone && (
              <p className="text-sm text-muted-foreground" dir="ltr">{customer.phone}</p>
            )}
          </div>
          <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
        </div>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">المنتجات</h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-right">المنتج</th>
                <th className="p-2 text-right">الكمية</th>
                <th className="p-2 text-right">السعر</th>
                <th className="p-2 text-right">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="p-2">{item.product_name}</td>
                  <td className="p-2">{item.quantity}</td>
                  <td className="p-2">{formatMoney(Number(item.unit_price), business.currency)}</td>
                  <td className="p-2">{formatMoney(Number(item.subtotal), business.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex justify-end border-t border-border pt-3 text-sm font-bold">
            الإجمالي: {formatMoney(Number(order.total), business.currency)}
          </div>
        </section>

        {order.notes && (
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-1 font-semibold">ملاحظات</h2>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </section>
        )}

        <section>
          {existingInvoice ? (
            <Link
              href={`/invoices/${existingInvoice.id}`}
              className="inline-block rounded-md border border-input px-4 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              عرض الفاتورة الخاصة بهذا الطلب
            </Link>
          ) : (
            <CreateInvoiceButton orderId={order.id} />
          )}
        </section>
      </main>
    </AppShell>
  );
}
