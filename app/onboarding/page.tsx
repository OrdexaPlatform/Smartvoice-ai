import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BusinessForm } from "@/components/business/business-form";
import { createBusiness } from "./actions";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingBusiness } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existingBusiness) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold text-primary">
            مرحبًا بك في SmartInvoice AI
          </h1>
          <p className="text-sm text-muted-foreground">
            خطوة واحدة قبل البدء: أخبرنا عن نشاطك التجاري
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <BusinessForm action={createBusiness} submitLabel="متابعة" />
        </div>
      </div>
    </main>
  );
}
