```tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/ui/shell";
import { requireBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";

import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/ui/badge";

import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/types";

export const dynamic = "force-dynamic";

function formatMoney(amount: number, currency: string) {
  const formattedAmount = amount.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
  });

  return formattedAmount + " " + currency;
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

  const [{ data: orders }, { data: invoices }] = await Promise.all([
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

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>

          {customer.phone && <p>{customer.phone}</p>}

          {customer.address && <p>{customer.address}</p>}
        </div>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">
            الطلبات ({(orders ?? []).length})
          </h2>

          {(orders ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا توجد طلبات.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(orders ?? []).map((o) => {
                const status = o.status as OrderStatus;

                return (
                  <li key={o.id}>
                    <Link
                      href={"/orders/" + o.id}
                      className="flex items-center justify-between py-2 text-sm hover:opacity-80"
                    >
                      <span>
                        {formatMoney(
                          Number(o.total),
                          business.currency
                        )}
                      </span>

                      <OrderStatusBadge
                        status={status}
                        label={ORDER_STATUS_LABELS[status]}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">
            الفواتير ({(invoices ?? []).length})
          </h2>

          {(invoices ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا توجد فواتير.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(invoices ?? []).map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={"/invoices/" + inv.id}
                    className="flex items-center justify-between py-2 text-sm hover:opacity-80"
                  >
                    <span dir="ltr">{inv.invoice_number}</span>

                    <span className="flex items-center gap-2">
                      {formatMoney(
                        Number(inv.total),
                        business.currency
                      )}

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
      </div>
    </AppShell>
  );
}
```
