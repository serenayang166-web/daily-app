import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) return { status: 'unconfigured' as const };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { status: 'signed-in' as const };
}

export async function signUpWithPassword(email: string, password: string) {
  if (!supabase) return { status: 'unconfigured' as const };
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return { status: 'signed-up' as const };
}

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
