import { BookOpen, Dumbbell, Repeat, Target, TrendingUp, type LucideIcon } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './supabase';

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

export function serializeGoalForInsert(goal: any, userId: string) {
  return {
    user_id: userId,
    title: goal.title,
    icon: iconName(goal.icon),
    description: goal.description ?? '',
    start_date: goal.startDate?.toISOString?.().slice(0, 10),
    end_date: goal.endDate?.toISOString?.().slice(0, 10),
    total_days: goal.totalDays,
    current_day: goal.currentDay,
    daily_time: goal.dailyTime,
  };
}
