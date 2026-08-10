import { parsedConversationSchema, type ParsedConversationInput } from "./schema";

const SYSTEM_PROMPT = `أنت نظام استخراج بيانات من محادثات WhatsApp لمتجر أو شركة صغيرة تتحدث العربية (فصحى أو عامية، خصوصًا المصرية).

مهمتك: قراءة المحادثة المُعطاة واستخراج معلومات العميل والطلب منها فقط.

قواعد صارمة:
- لا تخترع أي معلومة غير مذكورة صراحةً في المحادثة.
- أي معلومة غير موجودة يجب أن تكون null (أو مصفوفة فارغة للمنتجات إن لم تُذكر).
- احسب total لكل عنصر = quantity × unit_price فقط إذا كان unit_price مذكورًا؛ وإلا اجعل unit_price = null.
- أرجع JSON فقط، بدون أي نص أو شرح أو Markdown code fences حوله.

الشكل المطلوب بالضبط:
{
  "customer": { "name": string|null, "phone": string|null, "address": string|null },
  "order": {
    "items": [ { "name": string, "quantity": number, "unit_price": number|null } ],
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

/**
 * نقطة الدخول الوحيدة لتحليل محادثة WhatsApp. باقي الكود (API route،
 * صفحة Review) لا يعرف أي شيء عن مزوّد الذكاء الاصطناعي المستخدم —
 * لتغييره لاحقًا (OpenAI، Gemini، إلخ) يكفي تعديل هذا الملف فقط.
 */
export async function parseConversation(
  rawText: string
): Promise<ParsedConversationInput> {
  const provider = process.env.AI_PROVIDER || "anthropic";

  let rawOutput: string;

  switch (provider) {
    case "anthropic":
      rawOutput = await callAnthropic(rawText);
      break;
    default:
      throw new AIParseError(`مزوّد الذكاء الاصطناعي غير مدعوم: ${provider}`);
  }

  let parsedJson: unknown;
  try {
    // بعض النماذج قد تُحيط بالـ JSON بـ ```json ... ``` رغم التعليمات،
    // نزيلها احتياطًا قبل parsing.
    const cleaned = rawOutput.replace(/^```json\s*|```\s*$/g, "").trim();
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

async function callAnthropic(rawText: string): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new AIParseError("متغيّر البيئة AI_API_KEY غير مضبوط.");
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: rawText }],
      }),
    });
  } catch (err) {
    throw new AIParseError("تعذّر الاتصال بخدمة الذكاء الاصطناعي.", err);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AIParseError(
      `خدمة الذكاء الاصطناعي أرجعت خطأ (${response.status}).`,
      body
    );
  }

  const data = await response.json();
  const textBlock = data?.content?.find(
    (block: { type: string }) => block.type === "text"
  );

  if (!textBlock?.text) {
    throw new AIParseError("رد الذكاء الاصطناعي فارغ.");
  }

  return textBlock.text as string;
}
