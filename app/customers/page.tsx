import Link from "next/link";
import { AppShell } from "@/components/ui/shell";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${currency}`;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const { business } = await requireBusiness();
  const supabase = createClient();
  const q = searchParams.q?.trim() || "";

  let query = supabase
    .from("customers")
    .select("id, name, phone, address, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data: customers } = await query;

  // إحصائيات لكل عميل (طلبات/مدفوعات) — نجمعها دفعة واحدة بدل استعلام
  // منفصل لكل عميل لتفادي مشكلة N+1.
  const customerIds = (customers ?? []).map((c) => c.id);

  const [{ data: orders }, { data: invoices }] = await Promise.all([
    customerIds.length
      ? supabase
          .from("orders")
          .select("customer_id")
          .in("customer_id", customerIds)
      : Promise.resolve({ data: [] as { customer_id: string }[] }),
    customerIds.length
      ? supabase
          .from("invoices")
          .select("customer_id, total, payment_status")
          .in("customer_id", customerIds)
      : Promise.resolve({
          data: [] as { customer_id: string; total: number; payment_status: string }[],
        }),
  ]);

  const ordersCountByCustomer = new Map<string, number>();
  for (const o of orders ?? []) {
    ordersCountByCustomer.set(
      o.customer_id,
      (ordersCountByCustomer.get(o.customer_id) ?? 0) + 1
    );
  }

  const totalsByCustomer = new Map<string, number>();
  for (const inv of invoices ?? []) {
    totalsByCustomer.set(
      inv.customer_id,
      (totalsByCustomer.get(inv.customer_id) ?? 0) + Number(inv.total)
    );
  }

  return (
    <AppShell>
      <main className="space-y-4 p-6">
        <h1 className="text-2xl font-bold text-primary">العملاء</h1>

        <form className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-md border border-input px-4 py-2 text-sm hover:bg-secondary"
          >
            بحث
          </button>
        </form>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">الهاتف</th>
                <th className="p-3 text-right">عدد الطلبات</th>
                <th className="p-3 text-right">إجمالي المشتريات</th>
              </tr>
            </thead>
            <tbody>
              {(customers ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    لا يوجد عملاء بعد.
                  </td>
                </tr>
              )}
              {(customers ?? []).map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <Link href={`/customers/${c.id}`} className="font-medium text-primary hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="p-3" dir="ltr">
                    {c.phone || "—"}
                  </td>
                  <td className="p-3">{ordersCountByCustomer.get(c.id) ?? 0}</td>
                  <td className="p-3">
                    {formatMoney(totalsByCustomer.get(c.id) ?? 0, business.currency)}
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
