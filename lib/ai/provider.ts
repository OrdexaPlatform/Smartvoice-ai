import { GoogleGenAI } from "@google/genai";
import {
  parsedConversationSchema,
  type ParsedConversationInput,
} from "./schema";

const SYSTEM_PROMPT = `أنت نظام استخراج بيانات من محادثات WhatsApp لمتجر أو شركة صغيرة تتحدث العربية (فصحى أو عامية، خصوصًا المصرية).

مهمتك: قراءة المحادثة المُعطاة واستخراج معلومات العميل والطلب منها فقط.

قواعد صارمة:
- لا تخترع أي معلومة غير مذكورة صراحةً في المحادثة.
- أي معلومة غير موجودة يجب أن تكون null (أو مصفوفة فارغة للمنتجات إن لم تُذكر).
- احسب total لكل عنصر = quantity × unit_price فقط إذا كان unit_price مذكورًا؛ وإلا اجعل unit_price = null.
- أرجع JSON فقط، بدون أي نص أو شرح أو Markdown code fences حوله.

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
    throw new AIParseError(
      "تعذّر فهم رد الذكاء الاصطناعي (JSON غير صالح).",
      err
    );
  }

  const result = parsedConversationSchema.safeParse(parsedJson);

  if (!result.success) {
    throw new AIParseError(
      "رد الذكاء الاصطناعي لا يطابق الصيغة المتوقعة.",
      result.error
    );
  }

  return result.data;
}

async function callGemini(rawText: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new AIParseError("متغيّر البيئة GEMINI_API_KEY غير مضبوط.");
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: rawText,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    const text = response.text;

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
