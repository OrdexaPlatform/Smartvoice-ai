import { AppShell } from "@/components/ui/shell";
import { BusinessForm } from "@/components/business/business-form";
import { requireBusiness } from "@/lib/business";
import { updateBusiness } from "./actions";

export default async function SettingsPage() {
  const { business } = await requireBusiness();

  return (
    <AppShell>
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-2xl font-bold text-primary">الإعدادات</h1>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">بيانات النشاط التجاري</h2>
          <BusinessForm
            initialData={business}
            action={updateBusiness}
            submitLabel="حفظ التعديلات"
          />
        </section>
      </main>
    </AppShell>
  );
}
