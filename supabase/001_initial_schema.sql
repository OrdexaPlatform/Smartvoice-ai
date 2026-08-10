-- =========================================================
-- SmartInvoice AI — Database Schema (MVP) — Final (Task 2, Approved)
-- ملاحظة: هذا الملف للمراجعة والتوثيق فقط. لم يتم تنفيذه تلقائيًا.
-- الصقه يدويًا في Supabase SQL Editor بعد المراجعة النهائية.
-- =========================================================

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 1) profiles
-- =========================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- 2) businesses
-- =========================================================
create table public.businesses (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles(id) on delete restrict,
  name              text not null,
  logo_url          text,
  phone             text,
  email             text,
  address           text,
  tax_number        text,
  currency          text not null default 'EGP',
  invoice_settings  jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_businesses_owner_id on public.businesses(owner_id);

create trigger trg_businesses_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create or replace function public.prevent_owner_change()
returns trigger language plpgsql as $$
begin
  if OLD.owner_id <> NEW.owner_id then
    raise exception 'businesses.owner_id cannot be changed';
  end if;
  return NEW;
end;
$$;

create trigger trg_businesses_lock_owner
before update on public.businesses
for each row execute function public.prevent_owner_change();

-- =========================================================
-- 3) customers
-- =========================================================
create table public.customers (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete restrict,
  name         text not null,
  phone        text,
  address      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_customers_business_id on public.customers(business_id);
create index idx_customers_phone on public.customers(phone);

create trigger trg_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create or replace function public.prevent_business_id_change()
returns trigger language plpgsql as $$
begin
  if OLD.business_id <> NEW.business_id then
    raise exception '% : changing business_id is not allowed', TG_TABLE_NAME;
  end if;
  return NEW;
end;
$$;

create trigger trg_customers_lock_business
before update on public.customers
for each row execute function public.prevent_business_id_change();

-- =========================================================
-- 4) products
-- =========================================================
create table public.products (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete restrict,
  name           text not null,
  default_price  numeric(12,2) check (default_price >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_products_business_id on public.products(business_id);

create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger trg_products_lock_business
before update on public.products
for each row execute function public.prevent_business_id_change();

-- =========================================================
-- 5) orders
-- =========================================================
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete restrict,
  customer_id    uuid not null references public.customers(id) on delete restrict,
  status         text not null default 'new'
                 check (status in ('new','confirmed','preparing','shipped','delivered','cancelled')),
  total          numeric(12,2) not null default 0 check (total >= 0),
  notes          text,
  delivery_date  date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_orders_business_id on public.orders(business_id);
create index idx_orders_customer_id on public.orders(customer_id);
create index idx_orders_status on public.orders(status);

create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.check_order_customer_business()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cust_business_id uuid;
begin
  select business_id into cust_business_id
  from public.customers
  where id = NEW.customer_id;

  if not found then
    raise exception 'Customer % does not exist', NEW.customer_id;
  end if;

  if cust_business_id <> NEW.business_id then
    raise exception 'Customer % does not belong to business %', NEW.customer_id, NEW.business_id;
  end if;

  if TG_OP = 'UPDATE' and OLD.business_id <> NEW.business_id then
    raise exception 'orders.business_id cannot be changed after creation';
  end if;

  return NEW;
end;
$$;

create trigger trg_orders_check_customer_business
before insert or update on public.orders
for each row execute function public.check_order_customer_business();

-- =========================================================
-- 6) order_items
-- =========================================================
create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  product_name  text not null,
  quantity      numeric(10,2) not null check (quantity > 0),
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  subtotal      numeric(12,2) not null check (subtotal >= 0),
  created_at    timestamptz not null default now(),
  constraint chk_order_item_subtotal check (subtotal = round(quantity * unit_price, 2))
);

create index idx_order_items_order_id on public.order_items(order_id);

-- =========================================================
-- 7) invoices
-- =========================================================
create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete restrict,
  order_id         uuid not null references public.orders(id) on delete restrict,
  customer_id      uuid not null references public.customers(id) on delete restrict,
  public_id        uuid not null default gen_random_uuid(),
  invoice_number   text,
  issue_date       date not null default current_date,
  due_date         date,
  subtotal         numeric(12,2) not null default 0 check (subtotal >= 0),
  discount         numeric(12,2) not null default 0 check (discount >= 0),
  tax              numeric(12,2) not null default 0 check (tax >= 0),
  total            numeric(12,2) not null default 0 check (total >= 0),
  payment_status   text not null default 'unpaid'
                   check (payment_status in ('unpaid','partially_paid','paid','overdue')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (order_id),
  unique (public_id),
  unique (business_id, invoice_number),
  constraint chk_invoice_totals check (
    discount <= subtotal
    and total = subtotal - discount + tax
  )
);

create index idx_invoices_business_id on public.invoices(business_id);
create index idx_invoices_customer_id on public.invoices(customer_id);
create index idx_invoices_payment_status on public.invoices(payment_status);
create index idx_invoices_public_id on public.invoices(public_id);

create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create table public.business_invoice_counters (
  business_id  uuid primary key references public.businesses(id) on delete restrict,
  last_number  bigint not null default 0
);
alter table public.business_invoice_counters enable row level security;

create or replace function public.invoices_before_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  next_num bigint;
  ord_business_id uuid;
  ord_customer_id uuid;
  cust_business_id uuid;
begin
  if NEW.invoice_number is null then
    insert into public.business_invoice_counters (business_id, last_number)
    values (NEW.business_id, 1)
    on conflict (business_id)
    do update set last_number = public.business_invoice_counters.last_number + 1
    returning last_number into next_num;

    NEW.invoice_number := 'INV-' || lpad(next_num::text, 6, '0');
  end if;

  select business_id, customer_id into ord_business_id, ord_customer_id
  from public.orders where id = NEW.order_id;

  if not found then
    raise exception 'Order % does not exist', NEW.order_id;
  end if;

  if ord_business_id <> NEW.business_id then
    raise exception 'Order % does not belong to business %', NEW.order_id, NEW.business_id;
  end if;

  if ord_customer_id <> NEW.customer_id then
    raise exception 'invoices.customer_id must match the order''s customer_id';
  end if;

  select business_id into cust_business_id
  from public.customers where id = NEW.customer_id;

  if cust_business_id <> NEW.business_id then
    raise exception 'Customer % does not belong to business %', NEW.customer_id, NEW.business_id;
  end if;

  return NEW;
end;
$$;

create trigger trg_invoices_before_insert
before insert on public.invoices
for each row execute function public.invoices_before_insert();

create or replace function public.invoices_before_update()
returns trigger
language plpgsql
as $$
begin
  if OLD.business_id <> NEW.business_id
     or OLD.order_id <> NEW.order_id
     or OLD.customer_id <> NEW.customer_id then
    raise exception 'invoices.business_id/order_id/customer_id cannot be changed after creation';
  end if;
  return NEW;
end;
$$;

create trigger trg_invoices_before_update
before update on public.invoices
for each row execute function public.invoices_before_update();

-- =========================================================
-- 8) invoice_items
-- =========================================================
create table public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  name        text not null,
  quantity    numeric(10,2) not null check (quantity > 0),
  unit_price  numeric(12,2) not null check (unit_price >= 0),
  subtotal    numeric(12,2) not null check (subtotal >= 0),
  created_at  timestamptz not null default now(),
  constraint chk_invoice_item_subtotal check (subtotal = round(quantity * unit_price, 2))
);

create index idx_invoice_items_invoice_id on public.invoice_items(invoice_id);

-- =========================================================
-- 9) payments
-- =========================================================
-- ملاحظة: التحقق من أن مجموع المدفوعات لا يتجاوز invoices.total، وتحديث
-- payment_status تلقائيًا، مؤجَّل عمدًا إلى Task المدفوعات (Task 14).
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete restrict,
  amount      numeric(12,2) not null check (amount > 0),
  method      text not null default 'cash'
              check (method in ('cash','cash_on_delivery','bank_transfer','card','other')),
  paid_at     timestamptz not null default now(),
  notes       text,
  created_at  timestamptz not null default now()
);

create index idx_payments_invoice_id on public.payments(invoice_id);

-- =========================================================
-- 10) conversation_imports
-- =========================================================
create table public.conversation_imports (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete restrict,
  raw_text     text not null,
  parsed_json  jsonb,
  status       text not null default 'pending'
               check (status in ('pending','parsed','failed','saved')),
  created_at   timestamptz not null default now()
);

create index idx_conversation_imports_business_id on public.conversation_imports(business_id);

create trigger trg_conversation_imports_lock_business
before update on public.conversation_imports
for each row execute function public.prevent_business_id_change();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.conversation_imports enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "businesses_select_own" on public.businesses
for select using (owner_id = auth.uid());
create policy "businesses_insert_own" on public.businesses
for insert with check (owner_id = auth.uid());
create policy "businesses_update_own" on public.businesses
for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "businesses_delete_own" on public.businesses
for delete using (owner_id = auth.uid());

create policy "customers_select_own_business" on public.customers
for select using (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "customers_insert_own_business" on public.customers
for insert with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "customers_update_own_business" on public.customers
for update using (business_id in (select id from public.businesses where owner_id = auth.uid()))
with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "customers_delete_own_business" on public.customers
for delete using (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "products_select_own_business" on public.products
for select using (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "products_insert_own_business" on public.products
for insert with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "products_update_own_business" on public.products
for update using (business_id in (select id from public.businesses where owner_id = auth.uid()))
with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "products_delete_own_business" on public.products
for delete using (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "orders_select_own_business" on public.orders
for select using (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "orders_insert_own_business" on public.orders
for insert with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "orders_update_own_business" on public.orders
for update using (business_id in (select id from public.businesses where owner_id = auth.uid()))
with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "orders_delete_own_business" on public.orders
for delete using (business_id in (select id from public.businesses where owner_id = auth.uid()));

create policy "order_items_select" on public.order_items
for select using (
  exists (select 1 from public.orders o join public.businesses b on b.id = o.business_id
          where o.id = order_items.order_id and b.owner_id = auth.uid())
);
create policy "order_items_insert" on public.order_items
for insert with check (
  exists (select 1 from public.orders o join public.businesses b on b.id = o.business_id
          where o.id = order_items.order_id and b.owner_id = auth.uid())
);
create policy "order_items_update" on public.order_items
for update using (
  exists (select 1 from public.orders o join public.businesses b on b.id = o.business_id
          where o.id = order_items.order_id and b.owner_id = auth.uid())
)
with check (
  exists (select 1 from public.orders o join public.businesses b on b.id = o.business_id
          where o.id = order_items.order_id and b.owner_id = auth.uid())
);
create policy "order_items_delete" on public.order_items
for delete using (
  exists (select 1 from public.orders o join public.businesses b on b.id = o.business_id
          where o.id = order_items.order_id and b.owner_id = auth.uid())
);

create policy "invoices_select_own_business" on public.invoices
for select using (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "invoices_insert_own_business" on public.invoices
for insert with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "invoices_update_own_business" on public.invoices
for update using (business_id in (select id from public.businesses where owner_id = auth.uid()))
with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "invoices_delete_own_business" on public.invoices
for delete using (business_id in (select id from public.businesses where owner_id = auth.uid()));
-- لا policy لـ anon — الفاتورة العامة تُقرأ عبر service_role على السيرفر فقط.

create policy "invoice_items_select" on public.invoice_items
for select using (
  exists (select 1 from public.invoices i join public.businesses b on b.id = i.business_id
          where i.id = invoice_items.invoice_id and b.owner_id = auth.uid())
);
create policy "invoice_items_insert" on public.invoice_items
for insert with check (
  exists (select 1 from public.invoices i join public.businesses b on b.id = i.business_id
          where i.id = invoice_items.invoice_id and b.owner_id = auth.uid())
);
create policy "invoice_items_update" on public.invoice_items
for update using (
  exists (select 1 from public.invoices i join public.businesses b on b.id = i.business_id
          where i.id = invoice_items.invoice_id and b.owner_id = auth.uid())
)
with check (
  exists (select 1 from public.invoices i join public.businesses b on b.id = i.business_id
          where i.id = invoice_items.invoice_id and b.owner_id = auth.uid())
);
create policy "invoice_items_delete" on public.invoice_items
for delete using (
  exists (select 1 from public.invoices i join public.businesses b on b.id = i.business_id
          where i.id = invoice_items.invoice_id and b.owner_id = auth.uid())
);

create policy "payments_select" on public.payments
for select using (
  exists (select 1 from public.invoices i join public.businesses b on b.id = i.business_id
          where i.id = payments.invoice_id and b.owner_id = auth.uid())
);
create policy "payments_insert" on public.payments
for insert with check (
  exists (select 1 from public.invoices i join public.businesses b on b.id = i.business_id
          where i.id = payments.invoice_id and b.owner_id = auth.uid())
);
create policy "payments_update" on public.payments
for update using (
  exists (select 1 from public.invoices i join public.businesses b on b.id = i.business_id
          where i.id = payments.invoice_id and b.owner_id = auth.uid())
)
with check (
  exists (select 1 from public.invoices i join public.businesses b on b.id = i.business_id
          where i.id = payments.invoice_id and b.owner_id = auth.uid())
);
-- لا policy للحذف — سجل المدفوعات لا يُحذف.

create policy "conversation_imports_select" on public.conversation_imports
for select using (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "conversation_imports_insert" on public.conversation_imports
for insert with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
create policy "conversation_imports_update" on public.conversation_imports
for update using (business_id in (select id from public.businesses where owner_id = auth.uid()))
with check (business_id in (select id from public.businesses where owner_id = auth.uid()));
