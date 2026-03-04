-- Create a custom enum for user roles
create type user_role as enum ('student', 'mentor', 'admin');

-- Create a custom enum for booking status
create type booking_status as enum ('scheduled', 'completed', 'cancelled');

-- Create users profile table
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role user_role default 'student'
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create mentors table
create table public.mentors (
  id uuid references public.profiles(id) not null primary key,
  bio text,
  expertise text[],
  is_active boolean default false,
  hourly_rate numeric
);

-- Enable RLS on mentors
alter table public.mentors enable row level security;

-- Create bookings table
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  mentor_id uuid references public.mentors(id) not null,
  student_id uuid references public.profiles(id) not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status booking_status default 'scheduled',
  meet_link text
);

-- Enable RLS on bookings
alter table public.bookings enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Policies for mentors
create policy "Mentors are viewable by everyone."
  on public.mentors for select
  using ( true );

create policy "Mentors can update their own profile."
  on public.mentors for update
  using ( auth.uid() = id );
  
create policy "Mentors can insert their own profile."
  on public.mentors for insert
  with check ( auth.uid() = id );

-- Policies for bookings
create policy "Users can view their own bookings (as student or mentor)."
  on public.bookings for select
  using ( auth.uid() = student_id or auth.uid() = mentor_id );

create policy "Students can insert bookings."
  on public.bookings for insert
  with check ( auth.uid() = student_id );

create policy "Mentors can update their bookings."
  on public.bookings for update
  using ( auth.uid() = mentor_id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', (new.raw_user_meta_data->>'role')::user_role);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call handle_new_user on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
