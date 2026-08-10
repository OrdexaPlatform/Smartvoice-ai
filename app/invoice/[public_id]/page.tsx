import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { PAYMENT_STATUS_LABELS } from "@/lib/types";
import { PaymentStatusBadge } from "@/components/ui/badge";

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${currency}`;
}

export default async function PublicInvoicePage({
  params,
}: {
  params: { public_id: string };
}) {
  // ⚠️ نستخدم service_role هنا فقط، ونفلتر بـ public_id (UUID عشوائي)
  // بشكل صريح. لا تُستخدم هذه الطريقة في أي مكان آخر بالمشروع.
  const supabase = createServiceClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, customers(*), businesses(*)")
    .eq("public_id", params.public_id)
    .maybeSingle();

  if (!invoice) {
    notFound();
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoice.id);

  const business = invoice.businesses;
  const customer = invoice.customers;

  return (
    <main className="min-h-screen bg-secondary/30 p-4 sm:p-8">
      <div className="mx-auto max-w-xl space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            {business.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt={business.name} className="mb-2 h-12 object-contain" />
            )}
            <h1 className="text-lg font-bold">{business.name}</h1>
            {business.phone && <p className="text-xs text-muted-foreground" dir="ltr">{business.phone}</p>}
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">فاتورة رقم</p>
            <p dir="ltr" className="font-mono font-bold">{invoice.invoice_number}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">فاتورة إلى</p>
            <p className="font-medium">{customer.name}</p>
            {customer.address && <p className="text-muted-foreground">{customer.address}</p>}
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">تاريخ الإصدار</p>
            <p>{new Date(invoice.issue_date).toLocaleDateString("ar-EG")}</p>
          </div>
        </div>

        <table className="w-full border-t border-border pt-2 text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="py-2 text-right">المنتج</th>
              <th className="py-2 text-center">الكمية</th>
              <th className="py-2 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-left">
                  {formatMoney(Number(item.subtotal), business.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <PaymentStatusBadge
            status={invoice.payment_status}
            label={PAYMENT_STATUS_LABELS[invoice.payment_status]}
          />
          <p className="text-lg font-bold">
            {formatMoney(Number(invoice.total), business.currency)}
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
