import { renderToBuffer } from "@react-pdf/renderer";
import { createServiceClient } from "@/lib/supabase/service";
import { InvoicePdfDocument } from "@/lib/pdf/invoice-pdf";

export async function GET(
  request: Request,
  { params }: { params: { public_id: string } }
) {
  const supabase = createServiceClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, customers(*), businesses(*)")
    .eq("public_id", params.public_id)
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
        business={invoice.businesses}
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
