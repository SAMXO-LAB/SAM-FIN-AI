-- Profile picture and gender (both optional).
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- avatar_kind: 'default' = a picture is chosen automatically from the gender,
--              'preset'  = one of the built-in avatars (avatar_key, e.g. 'm3'),
--              'photo'   = the user's own photo, stored as a small data URL in avatar_data
--                          (resized to about 256px in the browser; served only to its owner by /api/avatar).
alter table public.profiles
  add column if not exists gender text not null default 'unspecified',
  add column if not exists avatar_kind text not null default 'default',
  add column if not exists avatar_key text,
  add column if not exists avatar_data text,
  add column if not exists avatar_updated_at timestamptz;

do $$ begin
  alter table public.profiles add constraint profiles_gender_chk check (gender in ('male', 'female', 'unspecified'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_avatar_kind_chk check (avatar_kind in ('default', 'preset', 'photo'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_avatar_key_chk check (avatar_key is null or avatar_key ~ '^[mfn][1-6]$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_avatar_data_chk check (avatar_data is null or (char_length(avatar_data) <= 100000 and avatar_data ~ '^data:image/(jpeg|webp|png);base64,'));
exception when duplicate_object then null; end $$;

-- Make the new columns visible to the API right away.
notify pgrst, 'reload schema';
