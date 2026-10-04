-- Daily message allowance for the Sam assistant (protects the model bill).
create table if not exists public.assistant_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default (now() at time zone 'utc')::date,
  count   integer not null default 0,
  primary key (user_id, day)
);
alter table public.assistant_usage enable row level security;   -- no policies: only the function below can touch it
revoke all on public.assistant_usage from anon, authenticated;

create or replace function public.assistant_take(p_limit integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  if auth.uid() is null then
    return false;
  end if;
  insert into public.assistant_usage (user_id, day, count)
  values (auth.uid(), (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set count = public.assistant_usage.count + 1
  returning count into used;
  if used > p_limit then
    update public.assistant_usage set count = p_limit where user_id = auth.uid() and day = (now() at time zone 'utc')::date;
    return false;
  end if;
  return true;
end $$;
revoke all on function public.assistant_take(integer) from public, anon;
grant execute on function public.assistant_take(integer) to authenticated;
