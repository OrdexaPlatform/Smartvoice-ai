import { notFound } from "next/navigation";

import { createServiceClient } from "@/lib/supabase/service";
import {
  PAYMENT_STATUS_LABELS,
  type PaymentStatus,
} from "@/lib/types";
import { PaymentStatusBadge } from "@/components/ui/badge";

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
  })} ${currency}`;
}

interface InvoiceData {
  id: string;
  public_id: string;
  invoice_number: string;
  total: number;
  payment_status: PaymentStatus;
  issue_date: string;
  businesses: {
    name: string;
    phone: string | null;
    logo_url: string | null;
    currency?: string | null;
  } | null;
  customers: {
    name: string;
    address: string | null;
    phone?: string | null;
  } | null;
}

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  subtotal: number;
}

export default async function PublicInvoicePage({
  params,
}: {
  params: { public_id: string };
}) {
  const supabase = createServiceClient();

  const { data: invoiceRaw } = await supabase
    .from("invoices")
    .select("*, customers(*), businesses(*)")
    .eq("public_id", params.public_id)
    .maybeSingle();

  if (!invoiceRaw) {
    notFound();
  }

  const invoice = invoiceRaw as unknown as InvoiceData;

  const { data: itemsRaw } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoice.id);

  const items = (itemsRaw ?? []) as unknown as InvoiceItem[];

  const business = invoice.businesses;
  const customer = invoice.customers;

  if (!business) {
    notFound();
  }

  const currency = business.currency ?? "جنيه";

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            {business.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo_url}
                alt={business.name}
                className="h-16 w-16 rounded-md object-contain"
              />
            )}

            <div>
              <h1 className="text-xl font-bold">{business.name}</h1>

              {business.phone && (
                <p className="text-sm text-muted-foreground" dir="ltr">
                  {business.phone}
                </p>
              )}
            </div>
          </div>

          <div className="text-left">
            <p className="text-xs text-muted-foreground">
              فاتورة رقم
            </p>

            <p className="font-bold" dir="ltr">
              {invoice.invoice_number}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">
              فاتورة إلى
            </p>

            <p className="font-medium">
              {customer?.name ?? "عميل"}
            </p>

            {customer?.address && (
              <p className="text-muted-foreground">
                {customer.address}
              </p>
            )}

            {customer?.phone && (
              <p className="text-muted-foreground" dir="ltr">
                {customer.phone}
              </p>
            )}
          </div>

          <div className="text-left">
            <p className="text-xs text-muted-foreground">
              تاريخ الإصدار
            </p>

            <p>
              {new Date(invoice.issue_date).toLocaleDateString(
                "ar-EG"
              )}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-t border-border pt-2 text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="py-2 text-right">المنتج</th>
                <th className="py-2 text-center">الكمية</th>
                <th className="py-2 text-left">الإجمالي</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-border"
                >
                  <td className="py-2">
                    {item.name}
                  </td>

                  <td className="py-2 text-center">
                    {item.quantity}
                  </td>

                  <td className="py-2 text-left">
                    {formatMoney(
                      Number(item.subtotal),
                      currency
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <PaymentStatusBadge
            status={invoice.payment_status}
            label={
              PAYMENT_STATUS_LABELS[invoice.payment_status]
            }
          />

          <p className="text-lg font-bold">
            {formatMoney(
              Number(invoice.total),
              currency
            )}
          </p>
        </div>

        <a
          href={`/api/public-invoices/${invoice.public_id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-md bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          تحميل PDF
        </a>
      </div>
    </main>
  );
}
