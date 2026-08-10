import Link from "next/link";
import { AppShell } from "@/components/ui/shell";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { OrderStatusBadge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types";

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${currency}`;
}

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { business } = await requireBusiness();
  const supabase = createClient();
  const statusFilter = searchParams.status as OrderStatus | undefined;

  let query = supabase
    .from("orders")
    .select("id, status, total, created_at, customers(name)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  if (statusFilter && STATUSES.includes(statusFilter)) {
    query = query.eq("status", statusFilter);
  }

  const { data: ordersRaw } = await query;
  const orders = (ordersRaw ?? []) as unknown as Array<{
    id: string;
    status: OrderStatus;
    total: number;
    created_at: string;
    customers: { name: string } | null;
  }>;

  return (
    <AppShell>
      <main className="space-y-4 p-6">
        <h1 className="text-2xl font-bold text-primary">الطلبات</h1>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/orders"
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              !statusFilter ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}
          >
            الكل
          </Link>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/orders?status=${s}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}
            >
              {ORDER_STATUS_LABELS[s]}
            </Link>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right">العميل</th>
                <th className="p-3 text-right">الإجمالي</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    لا توجد طلبات.
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                      {o.customers?.name ?? "—"}
                    </Link>
                  </td>
                  <td className="p-3">{formatMoney(Number(o.total), business.currency)}</td>
                  <td className="p-3">
                    <OrderStatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("ar-EG")}
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
