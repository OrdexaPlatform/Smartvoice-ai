import { createClient } from "@/lib/supabase/server";
import {
  parsedConversationSchema,
  type ParsedConversationInput,
} from "./schema";

const SYSTEM_PROMPT = `أنت نظام استخراج بيانات من محادثات WhatsApp لمتجر أو شركة صغيرة تتحدث العربية (فصحى أو عامية، خصوصًا المصرية).

مهمتك: قراءة المحادثة المُعطاة واستخراج معلومات العميل والطلب منها فقط.

قواعد صارمة:
- لا تخترع أي معلومة غير مذكورة صراحةً في المحادثة.
- أي معلومة غير موجودة يجب أن تكون null.
- إذا لم توجد منتجات، اجعل items مصفوفة فارغة.
- الكمية يجب أن تكون رقمًا.
- السعر يجب أن يكون رقمًا فقط إذا كان مذكورًا بوضوح، وإلا null.
- لا تخمن أي سعر.
- delivery_date يجب أن يحتفظ بالتاريخ أو الوقت كما ذكره العميل، حتى لو كان بصيغة عامية مثل:
  "النهارده الساعة 8"
  "بكرة بالليل"
  "الخميس"
  "اليوم الساعة 8 مساءً"
- لا تحاول تحويل delivery_date إلى تاريخ SQL أو ISO.
- notes يجب أن تحتوي على أي معلومات إضافية مهمة ذكرها العميل.
- payment_method يجب أن يكون واحدًا من:
  cash
  cash_on_delivery
  bank_transfer
  card
  other
  أو null.
- payment_status يجب أن يكون:
  paid أو unpaid أو null.
- لا تخترع اسم العميل أو رقم الهاتف أو العنوان.
- أرجع JSON فقط بدون Markdown أو شرح.

الشكل المطلوب بالضبط:
{
  "customer": {
    "name": string|null,
    "phone": string|null,
    "address": string|null
  },
  "order": {
    "items": [
      {
        "name": string,
        "quantity": number,
        "unit_price": number|null
      }
    ],
    "payment_method": "cash"|"cash_on_delivery"|"bank_transfer"|"card"|"other"|null,
    "payment_status": "unpaid"|"paid"|null,
    "delivery_date": string|null,
    "notes": string|null
  }
}`;

export class AIParseError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AIParseError";
  }
}

export async function parseConversation(
  rawText: string
): Promise<ParsedConversationInput> {
  if (!rawText.trim()) {
    throw new AIParseError("نص المحادثة فارغ.");
  }

  const rawOutput = await callGemini(rawText);

  let parsedJson: unknown;

  try {
    const cleaned = rawOutput
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    parsedJson = JSON.parse(cleaned);
  } catch (err) {
    console.error("GEMINI JSON ERROR:", err);
    console.error("RAW GEMINI OUTPUT:", rawOutput);

    throw new AIParseError(
      "تعذّر فهم رد الذكاء الاصطناعي (JSON غير صالح).",
      err
    );
  }

  const result = parsedConversationSchema.safeParse(parsedJson);

  if (!result.success) {
    console.error("GEMINI SCHEMA ERROR:", result.error);

    throw new AIParseError(
      "رد الذكاء الاصطناعي لا يطابق الصيغة المتوقعة.",
      result.error
    );
  }

  return result.data;
}

async function callGemini(rawText: string): Promise<string> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase.functions.invoke(
      "gemini-parse",
      {
        body: {
          text: rawText,
          systemPrompt: SYSTEM_PROMPT,
        },
      }
    );

    if (error) {
      console.error("SUPABASE GEMINI FUNCTION ERROR:", error);

      throw new AIParseError(
        `تعذّر الاتصال بخدمة Gemini: ${error.message}`
      );
    }

    if (!data) {
      throw new AIParseError("خدمة Gemini أعادت ردًا فارغًا.");
    }

    if (data.error) {
      throw new AIParseError(
        `Gemini Error: ${data.error}`
      );
    }

    if (typeof data.text !== "string" || !data.text.trim()) {
      console.error("INVALID GEMINI FUNCTION RESPONSE:", data);

      throw new AIParseError(
        "خدمة Gemini أعادت ردًا غير صالح."
      );
    }

    return data.text.trim();
  } catch (err) {
    if (err instanceof AIParseError) {
      throw err;
    }

    console.error("GEMINI PROVIDER ERROR:", err);

    throw new AIParseError(
      `Gemini Error: ${
        err instanceof Error ? err.message : String(err)
      }`,
      err
    );
  }
}
