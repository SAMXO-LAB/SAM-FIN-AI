-- ════════════════════════════════════════════════════════════════════
-- Sam — initial schema
-- Money is stored as BIGINT minor units (paise for INR). Never floats.
-- Every user-owned table has Row Level Security: a user can only see and
-- change rows where user_id = auth.uid(). Cross-table references use
-- composite foreign keys (id, user_id) so a row can never point at
-- another user's account, loan or goal.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── helpers ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── profiles ───────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text check (char_length(full_name) <= 80),
  currency      char(3) not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  country       text check (char_length(country) <= 60),
  income_range  text check (char_length(income_range) <= 40),
  goals         text[] not null default '{}',
  notify_emi    boolean not null default true,
  notify_bills  boolean not null default true,
  notify_lent   boolean not null default true,
  notify_budget boolean not null default true,
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically for every new auth user (email or Google).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 80)
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── accounts ───────────────────────────────────────────────────────
create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 60),
  institution     text check (char_length(institution) <= 60),
  type            text not null check (type in ('bank','savings','cash','credit_card','wallet','other')),
  opening_balance bigint not null default 0,
  currency        char(3) not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  notes           text check (char_length(notes) <= 300),
  archived        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, user_id)
);
create index accounts_user_idx on public.accounts (user_id);
create trigger accounts_updated before update on public.accounts
  for each row execute function public.set_updated_at();

-- ─── categories (system rows have user_id null) ─────────────────────
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  kind       text not null check (kind in ('income','expense')),
  icon       text not null default 'circle-dashed',
  sort       int not null default 100,
  created_at timestamptz not null default now()
);
create unique index categories_unique_name on public.categories (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), kind, lower(name));

insert into public.categories (name, kind, icon, sort) values
  ('Food','expense','utensils',1), ('Groceries','expense','shopping-basket',2), ('Transport','expense','car',3),
  ('Shopping','expense','shopping-bag',4), ('Housing','expense','house',5), ('Bills','expense','receipt',6),
  ('Entertainment','expense','clapperboard',7), ('Health','expense','heart-pulse',8), ('Education','expense','graduation-cap',9),
  ('Travel','expense','plane',10), ('Subscriptions','expense','repeat',11), ('EMI','expense','landmark',12), ('Other','expense','circle-dashed',99),
  ('Salary','income','briefcase',1), ('Freelance','income','laptop',2), ('Business','income','store',3), ('Interest','income','percent',4),
  ('Dividends','income','trending-up',5), ('Gifts','income','gift',6), ('Other income','income','circle-plus',99);

-- ─── loans & EMIs ───────────────────────────────────────────────────
create table public.loans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 60),
  lender          text check (char_length(lender) <= 60),
  loan_type       text not null check (loan_type in ('personal','home','vehicle','education','consumer','credit_card_emi','other')),
  principal       bigint not null check (principal > 0),
  annual_rate     numeric(6,3) not null check (annual_rate >= 0 and annual_rate < 100),
  tenure_months   int not null check (tenure_months between 1 and 480),
  first_emi_date  date not null,
  processing_fee  bigint not null default 0 check (processing_fee >= 0),
  interest_type   text not null default 'reducing' check (interest_type in ('reducing','flat')),
  account_id      uuid,
  notes           text check (char_length(notes) <= 300),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id) references public.accounts (id, user_id) on delete set null (account_id)
);
create index loans_user_idx on public.loans (user_id);
create trigger loans_updated before update on public.loans
  for each row execute function public.set_updated_at();

-- ─── transactions ───────────────────────────────────────────────────
create table public.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type            text not null check (type in ('income','expense','transfer')),
  amount          bigint not null check (amount > 0 and amount < 100000000000000),
  occurred_on     date not null,
  category_id     uuid references public.categories (id) on delete set null,
  account_id      uuid,
  from_account_id uuid,
  to_account_id   uuid,
  counterparty    text check (char_length(counterparty) <= 80),
  description     text check (char_length(description) <= 120),
  payment_method  text check (payment_method in ('upi','card','debit_card','cash','bank_transfer','auto_debit','other')),
  notes           text check (char_length(notes) <= 500),
  tags            text[] not null default '{}',
  is_recurring    boolean not null default false,
  loan_id         uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, user_id),
  foreign key (account_id, user_id)      references public.accounts (id, user_id) on delete cascade,
  foreign key (from_account_id, user_id) references public.accounts (id, user_id) on delete cascade,
  foreign key (to_account_id, user_id)   references public.accounts (id, user_id) on delete cascade,
  foreign key (loan_id, user_id)         references public.loans (id, user_id) on delete set null (loan_id),
  constraint transactions_shape check (
    (type in ('income','expense') and account_id is not null and from_account_id is null and to_account_id is null)
    or
    (type = 'transfer' and account_id is null and from_account_id is not null and to_account_id is not null and from_account_id <> to_account_id)
  )
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_account_idx on public.transactions (account_id);
create index transactions_from_idx on public.transactions (from_account_id);
create index transactions_to_idx on public.transactions (to_account_id);
create index transactions_category_idx on public.transactions (user_id, category_id);
create trigger transactions_updated before update on public.transactions
  for each row execute function public.set_updated_at();

create table public.loan_payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  loan_id        uuid not null,
  installment_no int not null check (installment_no >= 1),
  paid_on        date not null,
  amount         bigint not null check (amount > 0),
  transaction_id uuid,
  created_at     timestamptz not null default now(),
  unique (loan_id, installment_no),
  foreign key (loan_id, user_id) references public.loans (id, user_id) on delete cascade,
  foreign key (transaction_id, user_id) references public.transactions (id, user_id) on delete set null (transaction_id)
);
create index loan_payments_loan_idx on public.loan_payments (loan_id);

-- ─── money lent & borrowed (one table, direction column) ────────────
create table public.debts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  direction    text not null check (direction in ('lent','borrowed')),
  person_name  text not null check (char_length(person_name) between 1 and 80),
  contact      text check (char_length(contact) <= 120),
  amount       bigint not null check (amount > 0),
  interest_pct numeric(6,2) not null default 0 check (interest_pct >= 0 and interest_pct <= 100),
  start_date   date not null,
  due_date     date,
  notes        text check (char_length(notes) <= 300),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id),
  check (due_date is null or due_date >= start_date)
);
create index debts_user_dir_idx on public.debts (user_id, direction);
create trigger debts_updated before update on public.debts
  for each row execute function public.set_updated_at();

create table public.debt_payments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  debt_id    uuid not null,
  paid_on    date not null,
  amount     bigint not null check (amount > 0),
  note       text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  foreign key (debt_id, user_id) references public.debts (id, user_id) on delete cascade
);
create index debt_payments_debt_idx on public.debt_payments (debt_id);

-- ─── budgets ────────────────────────────────────────────────────────
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount      bigint not null check (amount > 0),
  period      text not null default 'monthly' check (period in ('monthly')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, category_id, period)
);
create trigger budgets_updated before update on public.budgets
  for each row execute function public.set_updated_at();

-- ─── goals ──────────────────────────────────────────────────────────
create table public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  target      bigint not null check (target > 0),
  target_date date not null,
  priority    text not null default 'medium' check (priority in ('high','medium','low')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id)
);
create index goals_user_idx on public.goals (user_id);
create trigger goals_updated before update on public.goals
  for each row execute function public.set_updated_at();

create table public.goal_contributions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_id        uuid not null,
  amount         bigint not null check (amount <> 0),
  contributed_on date not null default current_date,
  created_at     timestamptz not null default now(),
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade
);
create index goal_contrib_goal_idx on public.goal_contributions (goal_id);

-- ─── audit log (written only by triggers) ───────────────────────────
create table public.audit_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  action     text not null,
  entity     text not null,
  entity_id  uuid,
  created_at timestamptz not null default now()
);
create index audit_logs_user_idx on public.audit_logs (user_id, created_at desc);

create or replace function public.audit_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs (user_id, action, entity, entity_id)
  values (old.user_id, 'delete', tg_table_name, old.id);
  return old;
end $$;

create trigger audit_accounts     after delete on public.accounts     for each row execute function public.audit_delete();
create trigger audit_transactions after delete on public.transactions for each row execute function public.audit_delete();
create trigger audit_loans        after delete on public.loans        for each row execute function public.audit_delete();
create trigger audit_debts        after delete on public.debts        for each row execute function public.audit_delete();
create trigger audit_goals        after delete on public.goals        for each row execute function public.audit_delete();

-- ─── balances (security_invoker: obeys the caller's RLS) ────────────
create view public.account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.opening_balance
    + coalesce((select sum(case when t.type = 'income' then t.amount else -t.amount end)
                from public.transactions t where t.account_id = a.id), 0)
    + coalesce((select sum(t.amount) from public.transactions t where t.to_account_id = a.id), 0)
    - coalesce((select sum(t.amount) from public.transactions t where t.from_account_id = a.id), 0)
    as balance
from public.accounts a;

-- ─── delete own account (removes auth user; cascades all data) ──────
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════
alter table public.profiles           enable row level security;
alter table public.accounts           enable row level security;
alter table public.categories         enable row level security;
alter table public.transactions       enable row level security;
alter table public.loans              enable row level security;
alter table public.loan_payments      enable row level security;
alter table public.debts              enable row level security;
alter table public.debt_payments      enable row level security;
alter table public.budgets            enable row level security;
alter table public.goals              enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.audit_logs         enable row level security;

-- profiles: read and update only your own row (rows are created by trigger)
create policy "profiles: own read"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles: own update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- owner-only tables
do $$
declare t text;
begin
  foreach t in array array['accounts','loans','loan_payments','debts','debt_payments','goals','goal_contributions'] loop
    execute format('create policy "%1$s: own rows" on public.%1$I for all to authenticated
                    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- categories: everyone signed in reads system rows; users manage their own
create policy "categories: read" on public.categories for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "categories: own write" on public.categories for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "categories: own update" on public.categories for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "categories: own delete" on public.categories for delete to authenticated
  using (user_id = (select auth.uid()));

-- transactions & budgets: own rows, and the category must be visible to you
create policy "transactions: own read" on public.transactions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "transactions: own delete" on public.transactions for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "transactions: own insert" on public.transactions for insert to authenticated
  with check (user_id = (select auth.uid()) and (category_id is null or exists (
    select 1 from public.categories c where c.id = category_id and (c.user_id is null or c.user_id = (select auth.uid())))));
create policy "transactions: own update" on public.transactions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (category_id is null or exists (
    select 1 from public.categories c where c.id = category_id and (c.user_id is null or c.user_id = (select auth.uid())))));

create policy "budgets: own read" on public.budgets for select to authenticated using (user_id = (select auth.uid()));
create policy "budgets: own delete" on public.budgets for delete to authenticated using (user_id = (select auth.uid()));
create policy "budgets: own insert" on public.budgets for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.categories c where c.id = category_id and (c.user_id is null or c.user_id = (select auth.uid()))));
create policy "budgets: own update" on public.budgets for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.categories c where c.id = category_id and (c.user_id is null or c.user_id = (select auth.uid()))));

-- audit log: read your own history; only triggers can write
create policy "audit: own read" on public.audit_logs for select to authenticated using (user_id = (select auth.uid()));

-- anonymous visitors get nothing
revoke all on all tables in schema public from anon;
