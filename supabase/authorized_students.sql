-- Create table for authorized student emails
create table if not exists public.authorized_students (
  email text primary key,
  created_at timestamp with time zone default now(),
  added_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.authorized_students enable row level security;

-- Only admins can manage this table
create policy "Admins can manage authorized students"
  on public.authorized_students
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Function to handle new user signup with authorization check
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role_val user_role;
  full_name_val text;
begin
  -- Determine role: 
  -- 1. From metadata
  -- 2. Default to 'student' if not set
  user_role_val := (new.raw_user_meta_data->>'role')::user_role;
  if user_role_val is null then
    user_role_val := 'student';
  end if;

  full_name_val := new.raw_user_meta_data->>'full_name';
  if full_name_val is null then
    full_name_val := split_part(new.email, '@', 1);
  end if;

  -- If it's a student, check if they are authorized
  if user_role_val = 'student' then
    if not exists (select 1 from public.authorized_students where email = new.email) then
      raise exception 'Email % is not authorized to join as a student.', new.email;
    end if;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, full_name_val, user_role_val);
  return new;
end;
$$ language plpgsql security definer;
