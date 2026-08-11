import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { AppShell } from "@/components/ui/shell";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { PaymentStatusBadge } from "@/components/ui/badge";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type PaymentStatus,
} from "@/lib/types";
import { RecordPaymentForm } from "@/components/invoices/record-payment-form";
import { WhatsAppShareButton } from "@/components/invoices/whatsapp-share-button";
import { CopyLinkButton } from "@/components/invoices/copy-link-button";

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
  })} ${currency}`;
}

function getSiteOrigin() {
  const h = headers();
  const host = h.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

  return `${protocol}://${host}`;
}

interface InvoiceCustomer {
  id: string;
  name: string;
}

interface InvoiceData {
  id: string;
  public_id: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_status: PaymentStatus;
  customers: InvoiceCustomer | null;
}

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  paid_at: string;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { business } = await requireBusiness();
  const supabase = createClient();

  const { data: invoiceRaw } = await supabase
    .from("invoices")
    .select("*, customers(*)")
    .eq("id", params.id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!invoiceRaw) {
    notFound();
  }

  const invoice = invoiceRaw as unknown as InvoiceData;

  if (!invoice.customers) {
    notFound();
  }

  const customer = invoice.customers;

  const [{ data: itemsRaw }, { data: paymentsRaw }] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice.id),

    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("paid_at", { ascending: false }),
  ]);

  const items = (itemsRaw ?? []) as unknown as InvoiceItem[];
  const payments = (paymentsRaw ?? []) as unknown as PaymentRow[];

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

  const remaining = Number(invoice.total) - totalPaid;

  const publicUrl = `${getSiteOrigin()}/invoice/${invoice.public_id}`;

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {invoice.invoice_number}
            </h1>

            <Link
              href={`/customers/${customer.id}`}
              className="text-sm text-primary hover:underline"
            >
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

          <div className="overflow-x-auto">
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
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-border"
                  >
                    <td className="p-2">{item.name}</td>

                    <td className="p-2">
                      {item.quantity}
                    </td>

                    <td className="p-2">
                      {formatMoney(
                        Number(item.unit_price),
                        business.currency
                      )}
                    </td>

                    <td className="p-2">
                      {formatMoney(
                        Number(item.subtotal),
                        business.currency
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                الإجمالي الفرعي
              </span>

              <span>
                {formatMoney(
                  Number(invoice.subtotal),
                  business.currency
                )}
              </span>
            </div>

            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  الخصم
                </span>

                <span>
                  -{" "}
                  {formatMoney(
                    Number(invoice.discount),
                    business.currency
                  )}
                </span>
              </div>
            )}

            {Number(invoice.tax) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  الضريبة
                </span>

                <span>
                  {formatMoney(
                    Number(invoice.tax),
                    business.currency
                  )}
                </span>
              </div>
            )}

            <div className="flex justify-between border-t border-border pt-1 font-bold">
              <span>الإجمالي</span>

              <span>
                {formatMoney(
                  Number(invoice.total),
                  business.currency
                )}
              </span>
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>المدفوع</span>

              <span>
                {formatMoney(
                  totalPaid,
                  business.currency
                )}
              </span>
            </div>

            <div className="flex justify-between font-medium">
              <span>المتبقي</span>

              <span>
                {formatMoney(
                  remaining,
                  business.currency
                )}
              </span>
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

          <RecordPaymentForm
            invoiceId={invoice.id}
            remaining={remaining}
          />
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">سجل المدفوعات</h2>

          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا توجد مدفوعات بعد.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between py-2"
                >
                  <span>
                    {formatMoney(
                      Number(payment.amount),
                      business.currency
                    )}{" "}
                    —{" "}
                    {
                      PAYMENT_METHOD_LABELS[
                        payment.method as keyof typeof PAYMENT_METHOD_LABELS
                      ]
                    }
                  </span>

                  <span className="text-muted-foreground">
                    {new Date(
                      payment.paid_at
                    ).toLocaleDateString("ar-EG")}
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
