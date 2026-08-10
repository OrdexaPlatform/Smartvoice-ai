"use client";

import { useTransition } from "react";
import { updateOrderStatus } from "@/app/orders/actions";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types";

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={currentStatus}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() => {
          updateOrderStatus(orderId, e.target.value as OrderStatus);
        })
      }
      className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {ORDER_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
