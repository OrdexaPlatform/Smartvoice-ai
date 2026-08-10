-- =========================================================
-- SmartInvoice AI — Migration 002: Payments logic (Task 14)
-- ملاحظة: هذا الملف للمراجعة فقط، لم يُنفَّذ. يُلصق بعد
-- 001_initial_schema.sql في Supabase SQL Editor.
--
-- الغرض (كان مؤجّلًا عمدًا من Task 2 كما اتفقنا):
--   1. منع إدخال دفعة تجعل مجموع المدفوعات يتجاوز invoices.total.
--   2. تحديث invoices.payment_status تلقائيًا بعد كل دفعة:
--      unpaid → partially_paid → paid.
-- =========================================================

create or replace function public.payments_after_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_invoice_id uuid;
  inv_total numeric(12,2);
  paid_sum numeric(12,2);
  new_status text;
begin
  target_invoice_id := coalesce(NEW.invoice_id, OLD.invoice_id);

  select total into inv_total
  from public.invoices
  where id = target_invoice_id
  for update; -- قفل الصف لمنع Race Condition بين دفعتين متزامنتين

  select coalesce(sum(amount), 0) into paid_sum
  from public.payments
  where invoice_id = target_invoice_id;

  if paid_sum > inv_total then
    raise exception
      'إجمالي المدفوعات (%) يتجاوز إجمالي الفاتورة (%)', paid_sum, inv_total;
  end if;

  if paid_sum <= 0 then
    new_status := 'unpaid';
  elsif paid_sum < inv_total then
    new_status := 'partially_paid';
  else
    new_status := 'paid';
  end if;

  -- overdue حالة يدوية (تُضبط لاحقًا بمهمة مجدولة تقارن due_date
  -- بالتاريخ الحالي)، فلا نستبدلها هنا إلا لو الفاتورة اتدفعت بالكامل
  -- أو لسه من غير أي دفعة.
  update public.invoices
  set payment_status = new_status
  where id = target_invoice_id
    and (payment_status <> 'overdue' or new_status = 'paid');

  return NEW;
end;
$$;

-- AFTER INSERT فقط: المدفوعات لا تُعدَّل ولا تُحذف في الـ MVP (راجع
-- عدم وجود UPDATE/DELETE policy على payments في RLS)، فالتحقق من
-- التطابق مطلوب فقط عند الإضافة.
create trigger trg_payments_after_insert
after insert on public.payments
for each row execute function public.payments_after_change();
