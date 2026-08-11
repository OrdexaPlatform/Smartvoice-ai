import { GoogleGenAI } from "@google/genai";
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
- لا تحاول تخمين السعر من اسم المنتج.
- delivery_date يجب أن يحتوي على التاريخ أو الوقت كما ذكره العميل، حتى لو كان بصيغة عامية مثل:
  "النهارده الساعة 8"
  "بكرة بالليل"
  "الخميس"
  "اليوم 8 مساءً"
  ولا تحاول تحويله إلى تاريخ SQL أو ISO؛ النظام الآخر سيتعامل معه.
- notes يجب أن تحتوي على أي معلومات إضافية مهمة ذكرها العميل.
- payment_method يجب أن يكون واحدًا من:
  cash
  cash_on_delivery
  bank_transfer
  card
  other
  أو null إذا لم يذكر العميل طريقة الدفع.
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
  // ضع مفتاح Gemini الجديد هنا فقط.
  // لا تضع GEMINI_API_KEY= قبله.
  // لا تضع Project ID.
  // لا تضع Project Number.
  const apiKey = "AQ.Ab8RN6LbEMa2wX-gzeOPw4meh6-ovq5QjdragBvYP47f5vN73g";

  if (!apiKey || apiKey === "AQ.Ab8RN6LbEMa2wX-gzeOPw4meh6-ovq5QjdragBvYP47f5vN73g") {
    throw new AIParseError("مفتاح Gemini غير مضبوط.");
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: "v1",
      },
    });

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: rawText,
      system_instruction: SYSTEM_PROMPT,
      generation_config: {
        temperature: 0,
      },
      store: false,
    });

    const text = interaction.output_text;

    if (!text) {
      throw new AIParseError("رد الذكاء الاصطناعي فارغ.");
    }

    return text;
  } catch (err) {
    if (err instanceof AIParseError) {
      throw err;
    }

    console.error("GEMINI API ERROR:", err);

    throw new AIParseError(
      `Gemini Error: ${
        err instanceof Error ? err.message : String(err)
      }`,
      err
    );
  }
}
