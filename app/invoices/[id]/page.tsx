import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { AppShell } from "@/components/ui/shell";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { PaymentStatusBadge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/types";
import { RecordPaymentForm } from "@/components/invoices/record-payment-form";
import { WhatsAppShareButton } from "@/components/invoices/whatsapp-share-button";
import { CopyLinkButton } from "@/components/invoices/copy-link-button";

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${currency}`;
}

function getSiteOrigin() {
  const h = headers();
  const host = h.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  return `${protocol}://${host}`;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { business } = await requireBusiness();
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, customers(*)")
    .eq("id", params.id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!invoice) {
    notFound();
  }

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id),
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("paid_at", { ascending: false }),
  ]);

  const customer = (invoice as unknown as { customers: { id: string; name: string } }).customers;

  const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Number(invoice.total) - totalPaid;

  const publicUrl = `${getSiteOrigin()}/invoice/${invoice.public_id}`;

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary" dir="ltr">
              {invoice.invoice_number}
            </h1>
            <Link href={`/customers/${customer.id}`} className="text-sm text-primary hover:underline">
              {customer.name}
            </Link>
          </div>
          <PaymentStatusBadge
            status={invoice.payment_status}
            label={PAYMENT_STATUS_LABELS[invoice.payment_status]}
          />
        </div>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">عناصر الفاتورة</h2>
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
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.quantity}</td>
                  <td className="p-2">{formatMoney(Number(item.unit_price), business.currency)}</td>
                  <td className="p-2">{formatMoney(Number(item.subtotal), business.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الإجمالي الفرعي</span>
              <span>{formatMoney(Number(invoice.subtotal), business.currency)}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الخصم</span>
                <span>- {formatMoney(Number(invoice.discount), business.currency)}</span>
              </div>
            )}
            {Number(invoice.tax) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الضريبة</span>
                <span>{formatMoney(Number(invoice.tax), business.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1 font-bold">
              <span>الإجمالي</span>
              <span>{formatMoney(Number(invoice.total), business.currency)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>المدفوع</span>
              <span>{formatMoney(totalPaid, business.currency)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>المتبقي</span>
              <span>{formatMoney(remaining, business.currency)}</span>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap gap-3">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            تحميل PDF
          </a>
          <CopyLinkButton url={publicUrl} />
          <WhatsAppShareButton
            customerName={customer.name}
            businessName={business.name}
            invoiceNumber={invoice.invoice_number}
            total={Number(invoice.total)}
            currency={business.currency}
            publicUrl={publicUrl}
          />
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">تسجيل دفعة</h2>
          <RecordPaymentForm invoiceId={invoice.id} remaining={remaining} />
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">سجل المدفوعات</h2>
          {(payments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مدفوعات بعد.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {(payments ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span>
                    {formatMoney(Number(p.amount), business.currency)} — {PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS]}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(p.paid_at).toLocaleDateString("ar-EG")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}
