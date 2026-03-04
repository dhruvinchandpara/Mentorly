-- Create availability table
create table public.availability (
  id uuid default gen_random_uuid() primary key,
  mentor_id uuid references public.mentors(id) not null,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null
);

-- Enable RLS on availability
alter table public.availability enable row level security;

-- Policies for availability
create policy "Mentors can view their own availability."
  on public.availability for select
  using ( auth.uid() = mentor_id );

create policy "Mentors can insert their own availability."
  on public.availability for insert
  with check ( auth.uid() = mentor_id );

create policy "Mentors can update their own availability."
  on public.availability for update
  using ( auth.uid() = mentor_id );

create policy "Mentors can delete their own availability."
  on public.availability for delete
  using ( auth.uid() = mentor_id );
