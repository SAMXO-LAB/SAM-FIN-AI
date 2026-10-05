-- Optional receipt / photo attachments for transactions (up to 3 per transaction).
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- Images are shrunk to about 1400px in the browser before upload and stored as base64 text, so they live in
-- your database and follow the same Row Level Security as everything else. Served only to their owner by /api/receipts/<id>.
-- (At about 300 KB each, 1,000 receipts is roughly 300 MB. Move to Supabase Storage if you expect much more.)
create table if not exists public.transaction_receipts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  transaction_id uuid not null,
  mime           text not null check (mime in ('image/jpeg', 'image/png', 'image/webp')),
  data           text not null check (char_length(data) <= 700000),
  created_at     timestamptz not null default now(),
  foreign key (transaction_id, user_id) references public.transactions (id, user_id) on delete cascade
);
create index if not exists transaction_receipts_tx_idx   on public.transaction_receipts (transaction_id);
create index if not exists transaction_receipts_user_idx on public.transaction_receipts (user_id);

alter table public.transaction_receipts enable row level security;
do $$ begin
  create policy "receipts: own read"   on public.transaction_receipts for select to authenticated using (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "receipts: own insert" on public.transaction_receipts for insert to authenticated with check (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "receipts: own delete" on public.transaction_receipts for delete to authenticated using (user_id = (select auth.uid()));
exception when duplicate_object then null; end $$;

-- Limits: 3 per transaction and 300 per user, so the free database allowance cannot be used up by one account.
create or replace function public.receipts_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.transaction_receipts where transaction_id = new.transaction_id) >= 3 then
    raise exception 'receipt_limit_tx' using errcode = 'P0001';
  end if;
  if (select count(*) from public.transaction_receipts where user_id = new.user_id) >= 300 then
    raise exception 'receipt_limit_user' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists receipts_limit_trg on public.transaction_receipts;
create trigger receipts_limit_trg before insert on public.transaction_receipts
  for each row execute function public.receipts_limit();

notify pgrst, 'reload schema';
