import { supabase } from '@/integrations/supabase/client';

/**
 * Auth service. Owns ALL Supabase Auth calls.
 * Components must NEVER import supabase.auth directly.
 */

export interface AuthStateHandler {
  (event: string, session: import('@supabase/supabase-js').Session | null): void;
}

const phoneToEmail = (phone: string): string => `${phone}@lovevest.app`;

export async function signInWithPhone(phone: string, password: string) {
  const email = phoneToEmail(phone);
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPhone(
  phone: string,
  password: string,
  nickname: string
) {
  const email = phoneToEmail(phone);
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname, phone } },
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentAuthUser() {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

/**
 * Subscribe to Supabase auth state changes. Returns the unsubscribe handle.
 * Caller is responsible for calling .unsubscribe() exactly once.
 */
export function subscribeToAuthState(handler: AuthStateHandler) {
  const { data } = supabase.auth.onAuthStateChange(handler);
  return data.subscription;
}