import { PaymentStatus, OrderStatus } from "@/lib/types";

const orderColors: Record<OrderStatus, string> = {
  new: "bg-secondary text-secondary-foreground",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-amber-100 text-amber-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentColors: Record<PaymentStatus, string> = {
  unpaid: "bg-red-100 text-red-800",
  partially_paid: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-200 text-red-900",
};

export function OrderStatusBadge({
  status,
  label,
}: {
  status: OrderStatus;
  label: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${orderColors[status]}`}
    >
      {label}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  label,
}: {
  status: PaymentStatus;
  label: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${paymentColors[status]}`}
    >
      {label}
    </span>
  );
}
