import Link from "next/link";
import { AppShell } from "@/components/ui/shell";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { PaymentStatusBadge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS } from "@/lib/types";

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${currency}`;
}

export default async function InvoicesPage() {
  const { business } = await requireBusiness();
  const supabase = createClient();

  const { data: invoicesRaw } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, payment_status, issue_date, customers(name)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const invoices = (invoicesRaw ?? []) as unknown as Array<{
    id: string;
    invoice_number: string;
    total: number;
    payment_status: keyof typeof PAYMENT_STATUS_LABELS;
    issue_date: string;
    customers: { name: string } | null;
  }>;

  return (
    <AppShell>
      <main className="space-y-4 p-6">
        <h1 className="text-2xl font-bold text-primary">الفواتير</h1>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right">رقم الفاتورة</th>
                <th className="p-3 text-right">العميل</th>
                <th className="p-3 text-right">الإجمالي</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    لا توجد فواتير بعد.
                  </td>
                </tr>
              )}
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline" dir="ltr">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="p-3">{inv.customers?.name ?? "—"}</td>
                  <td className="p-3">{formatMoney(Number(inv.total), business.currency)}</td>
                  <td className="p-3">
                    <PaymentStatusBadge
                      status={inv.payment_status}
                      label={PAYMENT_STATUS_LABELS[inv.payment_status]}
                    />
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(inv.issue_date).toLocaleDateString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AppShell>
  );
}
