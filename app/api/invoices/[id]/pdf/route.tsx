import { renderToBuffer } from "@react-pdf/renderer";
import { getBusinessOrNull } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { InvoicePdfDocument } from "@/lib/pdf/invoice-pdf";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const businessCtx = await getBusinessOrNull();
  if (!businessCtx) {
    return new Response("غير مصرّح", { status: 401 });
  }
  const { business } = businessCtx;
  const supabase = createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, customers(*)")
    .eq("id", params.id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!invoice) {
    return new Response("الفاتورة غير موجودة", { status: 404 });
  }

  const { data: items } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoice.id);

  try {
    const buffer = await renderToBuffer(
      <InvoicePdfDocument
        business={business}
        customer={invoice.customers}
        invoice={invoice}
        items={items ?? []}
      />
    );

    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (err) {
    return new Response(
      `تعذّر توليد PDF: ${err instanceof Error ? err.message : "خطأ غير معروف"}`,
      { status: 500 }
    );
  }
}
