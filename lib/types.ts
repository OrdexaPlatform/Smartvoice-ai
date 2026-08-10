export type OrderStatus =
  | "new"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partially_paid" | "paid" | "overdue";

export type PaymentMethod =
  | "cash"
  | "cash_on_delivery"
  | "bank_transfer"
  | "card"
  | "other";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "جديد",
  confirmed: "مؤكد",
  preparing: "قيد التحضير",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "غير مدفوعة",
  partially_paid: "مدفوعة جزئيًا",
  paid: "مدفوعة",
  overdue: "متأخرة",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقدًا",
  cash_on_delivery: "الدفع عند الاستلام",
  bank_transfer: "تحويل بنكي",
  card: "بطاقة",
  other: "أخرى",
};

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_number: string | null;
  currency: string;
  invoice_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  default_price: number | null;
}

export interface Order {
  id: string;
  business_id: string;
  customer_id: string;
  status: OrderStatus;
  total: number;
  notes: string | null;
  delivery_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Invoice {
  id: string;
  business_id: string;
  order_id: string;
  customer_id: string;
  public_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  notes: string | null;
}

/** الشكل المتوقع من الذكاء الاصطناعي عند تحليل محادثة WhatsApp */
export interface ParsedConversation {
  customer: {
    name: string | null;
    phone: string | null;
    address: string | null;
  };
  order: {
    items: Array<{
      name: string;
      quantity: number;
      unit_price: number | null;
    }>;
    payment_method: PaymentMethod | null;
    payment_status: "unpaid" | "paid" | null;
    delivery_date: string | null;
    notes: string | null;
  };
}
