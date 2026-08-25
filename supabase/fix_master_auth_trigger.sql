-- ───────────────────────────────────────────────────────────────────────────
-- SQL Script to fix Case Sensitivity in Google OAuth Student Authorization
-- Run this in your Supabase SQL Editor
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role_val public.user_role;
  full_name_val text;
begin
  -- A. Determine the Role (from metadata, default to 'student')
  user_role_val := coalesce(
    (new.raw_user_meta_data->>'role')::public.user_role,
    'student'::public.user_role
  );

  -- B. Determine Full Name (from metadata, default to email username)
  full_name_val := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  -- C. STRICT AUTHORIZATION CHECK (Only for non-Mentors/non-Admins)
  -- Uses lower() to ensure case-insensitive matching
  if user_role_val = 'student'::public.user_role then
    if not exists (select 1 from public.authorized_students where lower(email) = lower(new.email)) then
      raise exception 'Unauthorized student: % is not on the authorized list.', new.email;
    end if;
  end if;

  -- 2. Insert into profiles
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, full_name_val, user_role_val);

  return new;
exception
  when others then
    raise notice 'Error in handle_new_user: %', SQLERRM;
    raise;
end;
$$ language plpgsql security definer set search_path = public;
