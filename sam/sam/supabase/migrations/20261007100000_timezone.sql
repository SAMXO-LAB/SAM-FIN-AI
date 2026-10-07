-- Time zone chosen with the country at sign-up. Used for "today", due dates and the greeting.
alter table public.profiles add column if not exists timezone text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_timezone_len') then
    alter table public.profiles add constraint profiles_timezone_len check (timezone is null or char_length(timezone) between 1 and 64);
  end if;
end $$;
notify pgrst, 'reload schema';
