import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold text-primary">SmartInvoice AI</h1>
      <p className="text-muted-foreground max-w-md">
        حوّل محادثات WhatsApp إلى عملاء وطلبات وفواتير احترافية تلقائيًا
        باستخدام الذكاء الاصطناعي.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md border border-input px-5 py-2 text-sm font-medium hover:bg-secondary"
        >
          تسجيل الدخول
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          إنشاء حساب
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Task 1 (Setup) وTask 2 (Database) وTask 3 (Authentication) مكتملة.
        باقي الصفحات (Dashboard الفعلي، AI Import...) تُبنى في المهام
        التالية.
      </p>
    </main>
  );
}
