import { BookOpen, Dumbbell, Repeat, Target, TrendingUp, type LucideIcon } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabase';
import type { GeneratedPlan } from './plan-schema';

type GoalRow = {
  id: string;
  title: string;
  icon: string;
  description: string;
  start_date: string;
  end_date: string;
  total_days: number;
  current_day: number;
  daily_time: number;
  goal_tasks: GoalTaskRow[];
};

type GoalTaskRow = {
  day_number: number;
  date: string;
  title: string;
  tasks: string[];
  estimated_time: number;
  encouragement: string;
  is_completed: boolean;
  note: string;
};

type HabitRow = {
  id: string;
  title: string;
  icon: string;
  start_date: string;
  end_date: string;
  current_day: number;
  streak: number;
  reminder_time: string;
  reminder_enabled: boolean;
  habit_checkins: HabitCheckinRow[];
};

type HabitCheckinRow = {
  day_number: number;
  date: string;
  title: string;
  is_completed: boolean;
  note: string;
};

const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  Dumbbell,
  Repeat,
  Target,
  TrendingUp,
};

const iconName = (icon: unknown) => {
  if (typeof icon === 'function' && 'displayName' in icon && typeof icon.displayName === 'string') {
    return icon.displayName;
  }
  if (typeof icon === 'function' && 'name' in icon && typeof icon.name === 'string') {
    return icon.name;
  }
  return 'Target';
};

const toLocalDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export async function loadDailyData() {
  if (!isSupabaseConfigured || !supabase) {
    return { status: 'unconfigured' as const, goals: [], habits: [] };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { status: 'signed-out' as const, goals: [], habits: [] };
  }

  const [{ data: goalRows, error: goalsError }, { data: habitRows, error: habitsError }] = await Promise.all([
    supabase
      .from('goals')
      .select('*, goal_tasks(*)')
      .order('created_at', { ascending: true })
      .order('day_number', { referencedTable: 'goal_tasks', ascending: true }),
    supabase
      .from('habits')
      .select('*, habit_checkins(*)')
      .order('created_at', { ascending: true })
      .order('day_number', { referencedTable: 'habit_checkins', ascending: true }),
  ]);

  if (goalsError) throw goalsError;
  if (habitsError) throw habitsError;

  return {
    status: 'loaded' as const,
    goals: ((goalRows ?? []) as GoalRow[]).map((goal) => ({
      id: goal.id,
      title: goal.title,
      icon: iconMap[goal.icon] ?? Target,
      description: goal.description,
      startDate: toLocalDate(goal.start_date),
      endDate: toLocalDate(goal.end_date),
      totalDays: goal.total_days,
      currentDay: goal.current_day,
      dailyTime: goal.daily_time,
      days: (goal.goal_tasks ?? []).map((day) => ({
        day_number: day.day_number,
        date: day.date,
        title: day.title,
        tasks: day.tasks ?? [],
        estimated_time: day.estimated_time,
        encouragement: day.encouragement,
        is_completed: day.is_completed,
        note: day.note,
      })),
    })),
    habits: ((habitRows ?? []) as HabitRow[]).map((habit) => ({
      id: habit.id,
      title: habit.title,
      icon: iconMap[habit.icon] ?? Repeat,
      startDate: toLocalDate(habit.start_date),
      endDate: toLocalDate(habit.end_date),
      currentDay: habit.current_day,
      streak: habit.streak,
      reminderTime: habit.reminder_time?.slice(0, 5) ?? '20:00',
      reminderEnabled: habit.reminder_enabled,
      checkins: (habit.habit_checkins ?? []).map((checkin) => ({
        day_number: checkin.day_number,
        date: checkin.date,
        title: checkin.title,
        is_completed: checkin.is_completed,
        note: checkin.note,
      })),
    })),
  };
}

export async function updateGoalTaskCompletion(goalId: string, dayNumber: number, isCompleted: boolean) {
  if (!supabase) return;
  const { error } = await supabase
    .from('goal_tasks')
    .update({ is_completed: isCompleted })
    .eq('goal_id', goalId)
    .eq('day_number', dayNumber);
  if (error) throw error;
}

export async function updateHabitCheckinCompletion(habitId: string, dayNumber: number, isCompleted: boolean) {
  if (!supabase) return;
  const { error } = await supabase
    .from('habit_checkins')
    .update({ is_completed: isCompleted })
    .eq('habit_id', habitId)
    .eq('day_number', dayNumber);
  if (error) throw error;
}

export async function updateHabitReminder(habitId: string, patch: { reminderTime?: string; reminderEnabled?: boolean }) {
  if (!supabase) return;
  const { error } = await supabase
    .from('habits')
    .update({
      reminder_time: patch.reminderTime,
      reminder_enabled: patch.reminderEnabled,
    })
    .eq('id', habitId);
  if (error) throw error;
}

export async function createGoalWithTasks(input: {
  title: string;
  description?: string;
  endDate: string;
  dailyTime: number;
  plan: GeneratedPlan;
}) {
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Please sign in before saving a plan.');

  const start = new Date();
  const end = new Date(`${input.endDate}T00:00:00`);
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      title: input.title,
      icon: 'Target',
      description: input.description ?? input.plan.summary,
      start_date: start.toISOString().slice(0, 10),
      end_date: Number.isNaN(end.getTime()) ? input.endDate : end.toISOString().slice(0, 10),
      total_days: input.plan.days.length,
      current_day: 1,
      daily_time: input.dailyTime,
    })
    .select()
    .single();
  if (goalError) throw goalError;

  const tasks = input.plan.days.map((day, index) => ({
    goal_id: goal.id,
    user_id: userId,
    day_number: day.day_number,
    task_order: index,
    date: new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10),
    title: day.title,
    tasks: day.tasks,
    estimated_time: day.estimated_time,
    encouragement: day.encouragement,
  }));

  const { error: tasksError } = await supabase.from('goal_tasks').insert(tasks);
  if (tasksError) throw tasksError;

  return goal.id as string;
}

export async function createHabitWithCheckins(input: {
  title: string;
  endDate: string;
  dailyTime: number;
  plan: GeneratedPlan;
}) {
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Please sign in before saving a plan.');

  const start = new Date();
  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      title: input.title,
      icon: 'Repeat',
      start_date: start.toISOString().slice(0, 10),
      end_date: input.endDate,
      current_day: 1,
      streak: 0,
      reminder_time: '20:00',
      reminder_enabled: true,
    })
    .select()
    .single();
  if (habitError) throw habitError;

  const checkins = input.plan.days.map((day, index) => ({
    habit_id: habit.id,
    user_id: userId,
    day_number: day.day_number,
    date: new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10),
    title: `${day.title}: ${day.tasks.join('；')}`,
  }));

  const { error: checkinsError } = await supabase.from('habit_checkins').insert(checkins);
  if (checkinsError) throw checkinsError;

  return habit.id as string;
}

export async function updateGoal(goalId: string, patch: { title?: string; description?: string }) {
  if (!supabase) return;
  const { error } = await supabase.from('goals').update(patch).eq('id', goalId);
  if (error) throw error;
}

export async function deleteGoal(goalId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('goals').delete().eq('id', goalId);
  if (error) throw error;
}

export async function updateHabit(habitId: string, patch: { title?: string }) {
  if (!supabase) return;
  const { error } = await supabase.from('habits').update(patch).eq('id', habitId);
  if (error) throw error;
}

export async function deleteHabit(habitId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('habits').delete().eq('id', habitId);
  if (error) throw error;
}

export async function savePushSubscription(subscription: PushSubscription) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Please sign in before enabling reminders.');

  const json = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'user_id,endpoint' },
  );
  if (error) throw error;

  const { error: settingsError } = await supabase.from('reminder_settings').upsert(
    {
      user_id: userId,
      daily_enabled: true,
      daily_time: '20:00',
      streak_enabled: true,
      streak_cutoff: '22:00',
      behind_enabled: true,
      behind_threshold_days: 3,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Sydney',
    },
    { onConflict: 'user_id' },
  );
  if (settingsError) throw settingsError;
}
