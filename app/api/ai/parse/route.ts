import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessOrNull } from "@/lib/business";
import { parseConversation, AIParseError } from "@/lib/ai/provider";

export async function POST(request: Request) {
  const businessCtx = await getBusinessOrNull();
  if (!businessCtx) {
    return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  }
  const { business } = businessCtx;

  let rawText: string;
  try {
    const body = await request.json();
    rawText = (body?.text ?? "").toString().trim();
  } catch {
    return NextResponse.json(
      { error: "طلب غير صالح." },
      { status: 400 }
    );
  }

  if (!rawText) {
    return NextResponse.json(
      { error: "الرجاء لصق نص المحادثة أولًا." },
      { status: 400 }
    );
  }

  const supabase = createClient();

  try {
    const parsed = await parseConversation(rawText);

    // نحفظ سجل الاستيراد بحالة "parsed" حتى يقدر المستخدم يرجع له لاحقًا
    const { data: importRow, error: insertError } = await supabase
      .from("conversation_imports")
      .insert({
        business_id: business.id,
        raw_text: rawText,
        parsed_json: parsed,
        status: "parsed",
      })
      .select("id")
      .single();

    if (insertError || !importRow) {
      throw new Error(insertError?.message || "فشل حفظ سجل الاستيراد.");
    }

    return NextResponse.json({ importId: importRow.id, data: parsed });
  } catch (err) {
    // نحفظ محاولة فاشلة أيضًا بحالة "failed" حتى لا يُفقد النص الأصلي،
    // كما طلب الـ MVP scope صراحة.
    await supabase.from("conversation_imports").insert({
      business_id: business.id,
      raw_text: rawText,
      status: "failed",
    });

    if (err instanceof AIParseError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }

    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء التحليل." },
      { status: 500 }
    );
  }
}
