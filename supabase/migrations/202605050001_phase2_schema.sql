create extension if not exists "pgcrypto";

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  icon text not null default 'Target',
  description text not null default '',
  start_date date not null,
  end_date date not null,
  total_days integer not null check (total_days > 0),
  current_day integer not null default 1 check (current_day > 0),
  daily_time integer not null default 30 check (daily_time > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goal_tasks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  task_order integer not null default 0,
  date date not null,
  title text not null,
  tasks text[] not null default '{}',
  estimated_time integer not null default 30 check (estimated_time > 0),
  encouragement text not null default '',
  is_completed boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (goal_id, day_number)
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  icon text not null default 'Repeat',
  start_date date not null,
  end_date date not null,
  current_day integer not null default 1 check (current_day > 0),
  streak integer not null default 0 check (streak >= 0),
  reminder_time time not null default '20:00',
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  date date not null,
  title text not null,
  is_completed boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, day_number)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.reminder_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  daily_enabled boolean not null default true,
  daily_time time not null default '20:00',
  streak_enabled boolean not null default true,
  streak_cutoff time not null default '22:00',
  behind_enabled boolean not null default true,
  behind_threshold_days integer not null default 3 check (behind_threshold_days > 0),
  weekly_enabled boolean not null default false,
  weekly_day integer not null default 1 check (weekly_day between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at before update on public.goals
for each row execute function public.set_updated_at();

drop trigger if exists set_goal_tasks_updated_at on public.goal_tasks;
create trigger set_goal_tasks_updated_at before update on public.goal_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_habits_updated_at on public.habits;
create trigger set_habits_updated_at before update on public.habits
for each row execute function public.set_updated_at();

drop trigger if exists set_habit_checkins_updated_at on public.habit_checkins;
create trigger set_habit_checkins_updated_at before update on public.habit_checkins
for each row execute function public.set_updated_at();

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at before update on public.push_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_reminder_settings_updated_at on public.reminder_settings;
create trigger set_reminder_settings_updated_at before update on public.reminder_settings
for each row execute function public.set_updated_at();

create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists goal_tasks_goal_id_idx on public.goal_tasks(goal_id);
create index if not exists goal_tasks_user_date_idx on public.goal_tasks(user_id, date);
create index if not exists habits_user_id_idx on public.habits(user_id);
create index if not exists habit_checkins_habit_id_idx on public.habit_checkins(habit_id);
create index if not exists habit_checkins_user_date_idx on public.habit_checkins(user_id, date);
create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.goals enable row level security;
alter table public.goal_tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_settings enable row level security;

drop policy if exists "Users can read their goals" on public.goals;
create policy "Users can read their goals" on public.goals
for select using (auth.uid() = user_id);

drop policy if exists "Users can create their goals" on public.goals;
create policy "Users can create their goals" on public.goals
for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their goals" on public.goals;
create policy "Users can update their goals" on public.goals
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their goals" on public.goals;
create policy "Users can delete their goals" on public.goals
for delete using (auth.uid() = user_id);

drop policy if exists "Users can read their goal tasks" on public.goal_tasks;
create policy "Users can read their goal tasks" on public.goal_tasks
for select using (auth.uid() = user_id);

drop policy if exists "Users can create their goal tasks" on public.goal_tasks;
create policy "Users can create their goal tasks" on public.goal_tasks
for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.goals where goals.id = goal_tasks.goal_id and goals.user_id = auth.uid())
);

drop policy if exists "Users can update their goal tasks" on public.goal_tasks;
create policy "Users can update their goal tasks" on public.goal_tasks
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their goal tasks" on public.goal_tasks;
create policy "Users can delete their goal tasks" on public.goal_tasks
for delete using (auth.uid() = user_id);

drop policy if exists "Users can read their habits" on public.habits;
create policy "Users can read their habits" on public.habits
for select using (auth.uid() = user_id);

drop policy if exists "Users can create their habits" on public.habits;
create policy "Users can create their habits" on public.habits
for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their habits" on public.habits;
create policy "Users can update their habits" on public.habits
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their habits" on public.habits;
create policy "Users can delete their habits" on public.habits
for delete using (auth.uid() = user_id);

drop policy if exists "Users can read their habit checkins" on public.habit_checkins;
create policy "Users can read their habit checkins" on public.habit_checkins
for select using (auth.uid() = user_id);

drop policy if exists "Users can create their habit checkins" on public.habit_checkins;
create policy "Users can create their habit checkins" on public.habit_checkins
for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.habits where habits.id = habit_checkins.habit_id and habits.user_id = auth.uid())
);

drop policy if exists "Users can update their habit checkins" on public.habit_checkins;
create policy "Users can update their habit checkins" on public.habit_checkins
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their habit checkins" on public.habit_checkins;
create policy "Users can delete their habit checkins" on public.habit_checkins
for delete using (auth.uid() = user_id);

drop policy if exists "Users can manage their push subscriptions" on public.push_subscriptions;
create policy "Users can manage their push subscriptions" on public.push_subscriptions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage their reminder settings" on public.reminder_settings;
create policy "Users can manage their reminder settings" on public.reminder_settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
