# SmartInvoice AI — MVP

تطبيق SaaS عربي يحوّل محادثات WhatsApp إلى عملاء وطلبات وفواتير تلقائيًا
باستخدام الذكاء الاصطناعي.

**الفكرة الأساسية:** WhatsApp Conversation → AI → Customer + Order + Invoice

## حالة المشروع

جميع الـ Tasks (1–15) منفّذة على مستوى الكود. **لم يُنفَّذ أي شيء داخل
Supabase أو أي خدمة خارجية بعد** — المشروع جاهز للربط والتشغيل، لكنه
لم يُختبر فعليًا بتشغيل حقيقي (لا يوجد اتصال إنترنت في بيئة البناء).

| Task | الوصف | الحالة |
|---|---|---|
| 1 | Project setup (Next.js + TS + Tailwind + RTL) | ✅ كود مكتمل |
| 2 | Database schema + RLS (`supabase/001_initial_schema.sql`) | ✅ SQL معتمد، غير منفَّذ |
| 3 | Authentication (login/signup/forgot/reset) | ✅ كود مكتمل |
| 4 | Business profile (`/onboarding`, `/settings`) | ✅ كود مكتمل |
| 5 | Dashboard ببيانات حقيقية | ✅ كود مكتمل |
| 6 | AI Conversation Parser (`/api/ai/parse`) | ✅ كود مكتمل |
| 7 | Review screen + حفظ العميل/الطلب (`/import`) | ✅ كود مكتمل |
| 8 | Customers (`/customers`) | ✅ كود مكتمل |
| 9 | Orders (`/orders`) | ✅ كود مكتمل |
| 10 | Invoices (`/invoices`) | ✅ كود مكتمل |
| 11 | PDF generation | ✅ كود مكتمل، يحتاج ملفات خط (راجع أدناه) |
| 12 | Public invoice page (`/invoice/[public_id]`) | ✅ كود مكتمل |
| 13 | WhatsApp sharing (wa.me link) | ✅ كود مكتمل |
| 14 | Payments (`supabase/002_payments_logic.sql`) | ✅ SQL معتمد، غير منفَّذ |
| 15 | Final Code Review | ✅ تم (راجع "مشاكل معروفة" أدناه) |

## التشغيل محليًا

```bash
npm install
cp .env.example .env.local   # واملأ القيم (راجع "متغيرات البيئة")
npm run dev
```

افتح http://localhost:3000

**قبل أول استخدام فعلي، لازم:**
1. تنفيذ SQL في Supabase (راجع القسم التالي).
2. إضافة ملفات الخط العربي لـ PDF (راجع "خط PDF العربي").
3. ضبط Redirect URLs في Supabase Auth (راجع "ربط المشروع بـ Supabase").

## ربط المشروع بـ Supabase

1. أنشئ مشروع جديد على [supabase.com](https://supabase.com).
2. Project Settings → API → انسخ `Project URL` و`anon public key` و
   `service_role key` إلى `.env.local`.
3. SQL Editor → نفّذ **بالترتيب**:
   - `supabase/001_initial_schema.sql`
   - `supabase/002_payments_logic.sql`
4. Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (أو دومين الإنتاج لاحقًا)
   - Redirect URLs: `http://localhost:3000/auth/callback`
5. تأكد إن كل الجداول العشرة + `business_invoice_counters` ظهرت،
   وإن RLS مفعّل (أيقونة القفل) على كل جدول فيه بيانات مستخدمين.

## خط PDF العربي (خطوة يدوية مطلوبة)

توليد PDF (Task 11) يحتاج ملفي خط عربي غير موجودين في هذا المستودع
(بيئة البناء الحالية بدون اتصال إنترنت لتحميلهما):

1. حمّل خط [Tajawal](https://fonts.google.com/specimen/Tajawal) من
   Google Fonts (الوزن Regular والوزن Bold على الأقل).
2. ضع الملفين في `public/fonts/` بالاسمين بالضبط:
   - `public/fonts/Tajawal-Regular.ttf`
   - `public/fonts/Tajawal-Bold.ttf`
3. بدون هذه الملفات، أي محاولة لتوليد PDF (تحميل من صفحة الفاتورة أو
   من الفاتورة العامة) هترجع خطأ 500 واضح يشرح المشكلة، لا تفشل بصمت.

## متغيرات البيئة

| المتغير | الاستخدام | من أين |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server (يحترم RLS) | Supabase → API |
| `SUPABASE_SERVICE_ROLE_KEY` | **سيرفر فقط** — الفاتورة العامة فقط | Supabase → API |
| `AI_PROVIDER` | `anthropic` (افتراضي) | — |
| `AI_API_KEY` | مفتاح Anthropic API | [console.anthropic.com](https://console.anthropic.com) |

## رفع المشروع على GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/smartinvoice-ai.git
git branch -M main
git push -u origin main
```

تأكد إن `.env.local` مش متتبّع (موجود في `.gitignore`) قبل الرفع.
ملفات الخط (`public/fonts/*.ttf`) لازم تتضاف للـ commit بعد ما تحمّلها
يدويًا (مش placeholder وموجودة فعليًا)، عشان PDF تشتغل بعد الـ deploy.

## النشر على Vercel

1. Import المشروع من GitHub في [vercel.com](https://vercel.com).
2. أضف نفس متغيرات البيئة (`.env.example`) في Project Settings → Environment Variables.
3. حدّث Redirect URLs في Supabase Auth بإضافة دومين Vercel:
   `https://your-project.vercel.app/auth/callback`
4. Deploy.

## الحسابات/المفاتيح المطلوبة لتشغيل نسخة كاملة

- **حساب Supabase** (مجاني كافٍ للبدء) — Project URL + anon key + service_role key.
- **مفتاح Anthropic API** (`AI_API_KEY`) — لتفعيل تحليل محادثات WhatsApp فعليًا؛
  بدونه، `/import` هيرجع خطأ واضح عند الضغط على "تحليل المحادثة" بدل ما يفشل بصمت.
- **حساب GitHub** — لرفع الكود (اختياري لو هتشغل محليًا بس).
- **حساب Vercel** (مجاني كافٍ للبدء) — للنشر (اختياري).

## مشاكل معروفة / محدودية الـ MVP (بعد المراجعة النهائية)

1. **تأكيد الإيميل عبر جهاز مختلف عن جهاز التسجيل ممكن يفشل** — سلوك
   متوقع من آلية PKCE في Supabase، مش خطأ في الكود (تفصيل في قسم
   Authentication بالأسفل).
2. **PDF بدون ملفات الخط هيفشل بخطأ واضح** — مقصود (Fail loudly بدل
   الفشل الصامت)، الحل خطوة يدوية موضحة أعلاه.
3. **لا يوجد Supabase generated types** — كل استعلامات قاعدة البيانات
   في المشروع غير مربوطة بـ TypeScript types مولّدة تلقائيًا من الـ
   schema (`supabase gen types typescript`)، لأن ده يحتاج CLI متصل
   بمشروع Supabase فعلي وغير متاح في بيئة البناء الحالية. الكود يعتمد
   على الأنواع اليدوية في `lib/types.ts` بدل ذلك. **يُنصح بتوليد
   الأنواع الحقيقية بعد أول ربط بـ Supabase** لزيادة أمان الأنواع.
4. **`payments` لها RLS policy لـ UPDATE لكن لا يوجد trigger يعيد حساب
   `payment_status` عند التعديل** — التطبيق حاليًا لا يعرض أي واجهة
   لتعديل دفعة موجودة (فقط إضافة)، فالفجوة نظرية حاليًا، لكن أي تطوير
   مستقبلي لتعديل المدفوعات لازم يراعي هذه النقطة.
5. **رفع الشعار (Logo)** يتم حاليًا برابط URL يدوي فقط، وليس عبر رفع
   ملف مباشر إلى Supabase Storage — قرار واعٍ لتبسيط الـ MVP، مذكور
   Feature لاحقة.
6. **لا يوجد اختبار تلقائي (unit/e2e tests)** — خارج نطاق الـ MVP بالكامل
   كما هو محدد أصلًا في نطاق المشروع (بند 19).
7. **لم يتم تشغيل `npm install` أو `npm run build` فعليًا** — بيئة
   العمل الحالية بدون اتصال إنترنت. المراجعة تمت عن طريق قراءة الكود
   يدويًا سطرًا بسطر (types، imports، تناسق الـ routes)، وليس عبر
   تنفيذ فعلي. **الخطوة الأولى بعد استلام المشروع: نفّذ `npm install`
   ثم `npm run build` محليًا وأبلغني بأي خطأ يظهر.**

## هيكل المشروع

```
app/
  page.tsx                          → الصفحة الرئيسية
  login|signup|forgot-password|reset-password/  → Authentication
  auth/callback|signout/route.ts     → معالجة الجلسات
  onboarding/                        → إنشاء Business أول مرة
  settings/                          → تعديل بيانات Business
  dashboard/                         → لوحة التحكم
  import/                            → AI Import + Review (أهم شاشة)
  customers/[id]/                    → العملاء
  orders/[id]/                       → الطلبات
  invoices/[id]/                     → الفواتير
  invoice/[public_id]/               → الفاتورة العامة (بدون تسجيل دخول)
  api/ai/parse/                      → تحليل محادثة WhatsApp عبر AI
  api/invoices/[id]/pdf/             → PDF محمي (صاحب النشاط)
  api/public-invoices/[public_id]/pdf/ → PDF عام
components/
  auth/ business/ import/ invoices/ orders/ ui/
lib/
  ai/          → طبقة abstraction لمزوّد الذكاء الاصطناعي + Zod schema
  pdf/          → مكوّن مستند الفاتورة (react-pdf)
  supabase/      → client / server / service (service_role، سيرفر فقط)
  business.ts     → helper لجلب Business الحالي + حماية الصفحات
  types.ts         → أنواع TypeScript مطابقة للـ schema
supabase/
  001_initial_schema.sql  → Schema + RLS (Task 2، معتمد وغير منفَّذ)
  002_payments_logic.sql   → منطق المدفوعات (Task 14، معتمد وغير منفَّذ)
middleware.ts   → حماية المسارات + تحديث الجلسة
```
