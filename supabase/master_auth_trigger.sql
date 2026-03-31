-- Master Auth Trigger for Mentorly
-- This script combines the "Add Mentor Fix" with "Strict Student Authorization Check"
-- 1. Sets search_path correctly to avoid role/table resolution issues.
-- 2. Strictly whitelists students while allowing mentors/admins through.

-- 1. Drop existing trigger and function to recreate them cleanly
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. Recreate the master function
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
  -- 1. If role is 'student', check if their email is in the authorized_students table.
  if user_role_val = 'student'::public.user_role then
    if not exists (select 1 from public.authorized_students where email = new.email) then
      raise exception 'Unauthorized student: % is not on the authorized list.', new.email;
    end if;
  end if;

  -- 2. Insert into profiles
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, full_name_val, user_role_val);

  return new;
exception
  when others then
    -- Log errors in Supabase logs but raise them to abort user creation
    raise notice 'Error in handle_new_user: %', SQLERRM;
    raise;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Re-attach the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Ensure authorized_students table is ready
create table if not exists public.authorized_students (
  email text primary key,
  created_at timestamp with time zone default now(),
  added_by uuid references auth.users(id)
);
