 -- Fix script for Mentorly Database

-- 1. Drop existing trigger and function to recreate them
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. Recreate the function with better robustness
--    - Sets search_path to 'public' to ensure it finds the 'profiles' table and 'user_role' type
--    - Uses COALESCE to fallback to 'student' role if missing
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    -- Safely cast to user_role, defaulting to 'student' if null or invalid
    coalesce(
      (new.raw_user_meta_data->>'role')::public.user_role,
      'student'::public.user_role
    )
  );
  return new;
exception
  when others then
    -- Log error (visible in Supabase logs) but raise it so transaction aborts
    raise notice 'Error in handle_new_user: %', SQLERRM;
    raise;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Re-attach the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Ensure profiles table handles deletions correctly (Optional but recommended)
--    If you delete a user in Auth, their profile should ideally be deleted too.
alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  add constraint profiles_id_fkey
    foreign key (id)
    references auth.users(id)
    on delete cascade;
