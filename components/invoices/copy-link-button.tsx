"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // فشل النسخ (متصفح قديم/صلاحيات) — لا داعي لإزعاج المستخدم،
      // الرابط ظاهر أصلًا ويقدر يختاره يدويًا.
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 rounded-md border border-input px-4 py-2.5 text-sm font-medium hover:bg-secondary"
    >
      {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      {copied ? "تم النسخ" : "نسخ رابط الفاتورة"}
    </button>
  );
}
