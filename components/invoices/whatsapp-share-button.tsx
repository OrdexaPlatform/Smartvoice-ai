"use client";

import { MessageCircle } from "lucide-react";

/**
 * Task 13: بدون WhatsApp Business API — مجرد رابط مشاركة (wa.me) برسالة
 * جاهزة، بيفتح تطبيق واتساب على جهاز المستخدم ليختار المستلم بنفسه.
 */
export function WhatsAppShareButton({
  customerName,
  businessName,
  invoiceNumber,
  total,
  currency,
  publicUrl,
}: {
  customerName: string;
  businessName: string;
  invoiceNumber: string;
  total: number;
  currency: string;
  publicUrl: string;
}) {
  const message = [
    `مرحبًا ${customerName}،`,
    `تم إصدار فاتورة جديدة من ${businessName}.`,
    `رقم الفاتورة: ${invoiceNumber}`,
    `الإجمالي: ${total.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${currency}`,
    ``,
    `عرض الفاتورة:`,
    publicUrl,
  ].join("\n");

  const href = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-md border border-input px-4 py-2.5 text-sm font-medium hover:bg-secondary"
    >
      <MessageCircle className="h-4 w-4" />
      إرسال عبر WhatsApp
    </a>
  );
}
