import { AppShell } from "@/components/ui/shell";
import { requireBusiness } from "@/lib/business";
import { ImportClient } from "@/components/import/import-client";

export default async function ImportPage() {
  await requireBusiness();

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">استيراد محادثة WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            الصق المحادثة، راجع البيانات، واحفظ العميل والطلب في ثوانٍ.
          </p>
        </div>
        <ImportClient />
      </main>
    </AppShell>
  );
}
