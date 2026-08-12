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
  // =========================================================
  // ضع مفتاح Gemini الجديد هنا
  // =========================================================

  const apiKey = "AQ.Ab8RN6LC-_9o7shruVn0XEzdxibOtlwRiWAngf4XPzREOJ-Otg";

  // =========================================================

  if (!apiKey || apiKey === "AQ.Ab8RN6LC-_9o7shruVn0XEzdxibOtlwRiWAngf4XPzREOJ-Otg") {
    throw new AIParseError("مفتاح Gemini غير مضبوط.");
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
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

    /*
     * استخراج النص من Interaction.
     * لا نستخدم interaction.output_text
     * لأنه غير موجود في TypeScript type الخاص بالـSDK.
     */

    const output = interaction.outputs;

    if (!Array.isArray(output) || output.length === 0) {
      throw new AIParseError("رد الذكاء الاصطناعي فارغ.");
    }

    let text = "";

    for (const item of output) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const block = item as {
        type?: string;
        text?: string;
        content?: unknown;
      };

      // بعض أشكال الـoutput تحتوي text مباشرة
      if (typeof block.text === "string") {
        text += block.text;
      }

      // شكل آخر يحتوي content كنص
      if (
        block.type === "text" &&
        typeof block.content === "string"
      ) {
        text += block.content;
      }

      // وبعض الردود تحتوي content كمصفوفة
      if (Array.isArray(block.content)) {
        for (const contentItem of block.content) {
          if (
            contentItem &&
            typeof contentItem === "object" &&
            "text" in contentItem &&
            typeof (contentItem as { text?: unknown }).text === "string"
          ) {
            text += (contentItem as { text: string }).text;
          }
        }
      }
    }

    text = text.trim();

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
