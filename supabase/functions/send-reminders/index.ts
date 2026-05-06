import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

type ReminderRow = {
  user_id: string;
  daily_enabled: boolean;
  daily_time: string;
  streak_enabled: boolean;
  streak_cutoff: string;
  behind_enabled: boolean;
  behind_threshold_days: number;
  timezone: string;
  last_daily_sent_at: string | null;
  last_streak_sent_at: string | null;
  last_behind_sent_at: string | null;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:you@example.com';

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const localTime = (timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());

const sentToday = (value: string | null, timeZone: string) => {
  if (!value) return false;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date(value)) === formatter.format(new Date());
};

const due = (target: string, row: ReminderRow, lastSent: string | null) => {
  const timeZone = row.timezone || 'Australia/Sydney';
  return localTime(timeZone) === target.slice(0, 5) && !sentToday(lastSent, timeZone);
};

Deno.serve(async () => {
  const { data: settings, error: settingsError } = await supabase
    .from('reminder_settings')
    .select('*');

  if (settingsError) {
    return Response.json({ error: settingsError.message }, { status: 500 });
  }

  let attempted = 0;
  let sent = 0;

  for (const row of (settings ?? []) as ReminderRow[]) {
    const notifications: Array<{ key: 'daily' | 'streak' | 'behind'; title: string; body: string }> = [];

    if (row.daily_enabled && due(row.daily_time, row, row.last_daily_sent_at)) {
      notifications.push({
        key: 'daily',
        title: '每日提醒',
        body: '到点啦，看看今天还有哪些小任务可以完成。',
      });
    }

    if (row.streak_enabled && due(row.streak_cutoff, row, row.last_streak_sent_at)) {
      notifications.push({
        key: 'streak',
        title: '连续打卡守护',
        body: '今天还没结束，回来补上一小步，别让 streak 断掉。',
      });
    }

    if (!notifications.length) continue;

    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', row.user_id);

    if (subsError) continue;

    for (const notification of notifications) {
      for (const sub of (subscriptions ?? []) as SubscriptionRow[]) {
        attempted += 1;
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              title: notification.title,
              body: notification.body,
              tag: `daily-app-${notification.key}`,
              url: '/',
            }),
          );
          sent += 1;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      }

      const patch =
        notification.key === 'daily' ? { last_daily_sent_at: new Date().toISOString() } :
        notification.key === 'streak' ? { last_streak_sent_at: new Date().toISOString() } :
        { last_behind_sent_at: new Date().toISOString() };

      await supabase.from('reminder_settings').update(patch).eq('user_id', row.user_id);
    }
  }

  return Response.json({ attempted, sent });
});
