import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { User } from '@/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  signInWithPhone,
  signUpWithPhone,
  signOut as authSignOut,
  getCurrentAuthUser,
  subscribeToAuthState,
} from '@/services/authService';
import {
  fetchProfileForSupabaseUser,
  updateProfileSafeFields,
  attachReferralCode,
  validateInvitationCode,
} from '@/services/profileService';
import { creditUserEarnings } from '@/services/ordersService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshProfile: () => Promise<void>;
  /** Last realtime event affecting the current user. Components can react to it. */
  lastRealtimeEvent: RealtimeEvent | null;
}

interface RegisterData {
  nickname: string;
  phone: string;
  password: string;
  invitationCode?: string;
}

export type RealtimeEvent =
  | { kind: 'wallet_credited'; delta: number; newBalance: number; at: number }
  | { kind: 'recharge_approved'; amount: number; at: number }
  | { kind: 'recharge_rejected'; amount: number; at: number };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Module-level dedupe caches. They survive React.StrictMode's double-mount in
// dev so a second AuthProvider invocation reuses the in-flight /profiles
// promise instead of firing a second request.
const profileCache = new Map<string, User>();
const profileRequests = new Map<string, Promise<User | null>>();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<RealtimeEvent | null>(null);
  const hasAuthSubscriptionRef = useRef(false);

  // Deduped profile fetcher. Reuses cached User or in-flight Promise so two
  // simultaneous callers (login() + onAuthStateChange) share ONE request.
  const fetchProfile = useCallback(
    async (supabaseUser: SupabaseUser): Promise<User | null> => {
      const cached = profileCache.get(supabaseUser.id);
      if (cached) return cached;

      const pending = profileRequests.get(supabaseUser.id);
      if (pending) return pending;

      const request = (async () => {
        try {
          // Ensure any pending daily earnings are credited before we read profile values.
          // Safe to call multiple times; credits only per IST day boundary.
          await creditUserEarnings(supabaseUser.id);
          const profile = await fetchProfileForSupabaseUser(supabaseUser);
          if (profile) profileCache.set(supabaseUser.id, profile);
          return profile;
        } finally {
          profileRequests.delete(supabaseUser.id);
        }
      })();
      profileRequests.set(supabaseUser.id, request);
      return request;
    },
    []
  );

  const refreshProfile = useCallback(async () => {
    const supabaseUser = await getCurrentAuthUser();
    if (!supabaseUser) return;
    profileCache.delete(supabaseUser.id);
    profileRequests.delete(supabaseUser.id);
    const profile = await fetchProfile(supabaseUser);
    if (profile) setUser(profile);
  }, [fetchProfile]);

  // Single auth subscription. Module-level cache makes StrictMode's
  // double-mount safe — the second mount reuses the cached profile.
  useEffect(() => {
    if (hasAuthSubscriptionRef.current) return;
    hasAuthSubscriptionRef.current = true;
    let cancelled = false;

    const subscription = subscribeToAuthState((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // Defer async work so we don't deadlock the auth event stream.
        setTimeout(async () => {
          const profile = await fetchProfile(session.user);
          if (cancelled) return;
          if (profile) setUser(profile);
          setIsLoading(false);
        }, 0);
      } else if (event === 'INITIAL_SESSION') {
        if (!cancelled) setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      hasAuthSubscriptionRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const login = useCallback(
    async (phone: string, password: string) => {
      try {
        const { data, error } = await signInWithPhone(phone, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            return {
              success: false,
              error: 'Invalid phone number or password. Please try again.',
            };
          }
          return { success: false, error: error.message };
        }
        if (data.user) {
          // onAuthStateChange will load the profile — avoid a duplicate fetch.
          return { success: true };
        }
        return { success: false, error: 'Login failed. Please try again.' };
      } catch (err) {
        console.error('Login error:', err);
        return { success: false, error: 'An unexpected error occurred.' };
      }
    },
    []
  );

  const register = useCallback(
    async (data: RegisterData) => {
      try {
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(data.phone)) {
          return {
            success: false,
            error: 'Please enter a valid 10-digit Indian mobile number.',
          };
        }
        if (data.password.length < 6) {
          return { success: false, error: 'Password must be at least 6 characters.' };
        }
        if (data.invitationCode) {
          const valid = await validateInvitationCode(data.invitationCode);
          if (!valid) return { success: false, error: 'Invalid invitation code.' };
        }

        const { data: authData, error: authError } = await signUpWithPhone(
          data.phone,
          data.password,
          data.nickname
        );
        if (authError) {
          if (authError.message.includes('already registered')) {
            return {
              success: false,
              error: 'This phone number is already registered.',
            };
          }
          return { success: false, error: authError.message };
        }
        if (!authData.user) {
          return { success: false, error: 'Registration failed. Please try again.' };
        }
        if (data.invitationCode) {
          await attachReferralCode(authData.user.id, data.invitationCode);
        }
        return { success: true };
      } catch (err) {
        console.error('Registration error:', err);
        return { success: false, error: 'An unexpected error occurred.' };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await authSignOut();
    profileCache.clear();
    profileRequests.clear();
    setUser(null);
  }, []);

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      if (!user) return;
      try {
        const supabaseUser = await getCurrentAuthUser();
        if (!supabaseUser) return;
        const safeUpdates: { nickname?: string; profile_picture?: string } = {};
        if (updates.nickname !== undefined) safeUpdates.nickname = updates.nickname;
        if (updates.profilePicture !== undefined)
          safeUpdates.profile_picture = updates.profilePicture;

        const { error } = await updateProfileSafeFields(supabaseUser.id, safeUpdates);
        if (error) {
          console.error('Error updating profile:', error);
          return;
        }
        const next = { ...user, ...updates };
        profileCache.set(supabaseUser.id, next);
        setUser(next);
      } catch (err) {
        console.error('Error in updateUser:', err);
      }
    },
    [user]
  );

  // Memoize context value — prevents every consumer from re-rendering when
  // an unrelated piece of provider state changes.
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      updateUser,
      refreshProfile,
      lastRealtimeEvent,
    }),
    [user, isLoading, login, register, logout, updateUser, refreshProfile, lastRealtimeEvent]
  );

  // ---------------------------------------------------------------------------
  // Realtime: subscribe to the user's profile row (wallet) and recharge_requests.
  // One channel per authenticated user. Cleans up on logout / unmount.
  // ---------------------------------------------------------------------------
  const authId = user?.authId ?? null;
  useEffect(() => {
    if (!authId) return;

    const channel = supabase
      .channel(`user-state:${authId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${authId}` },
        (payload) => {
          const next = payload.new as Record<string, unknown>;
          const prev = (payload.old ?? {}) as Record<string, unknown>;
          const newBalance = Number(next.balance ?? 0);
          const oldBalance = Number(prev.balance ?? newBalance);
          setUser((curr) => {
            if (!curr) return curr;
            const merged: User = {
              ...curr,
              balance: newBalance,
              totalRecharge: Number(next.total_recharge ?? curr.totalRecharge),
              totalWithdrawal: Number(next.total_withdrawal ?? curr.totalWithdrawal),
              productRevenue: Number(next.product_revenue ?? curr.productRevenue),
            };
            profileCache.set(authId, merged);
            return merged;
          });
          const delta = newBalance - oldBalance;
          if (delta > 0) {
            setLastRealtimeEvent({ kind: 'wallet_credited', delta, newBalance, at: Date.now() });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'recharge_requests', filter: `user_id=eq.${authId}` },
        (payload) => {
          const next = payload.new as Record<string, unknown>;
          const status = String(next.status ?? '');
          const amount = Number(next.amount ?? 0);
          if (status === 'approved') {
            setLastRealtimeEvent({ kind: 'recharge_approved', amount, at: Date.now() });
          } else if (status === 'rejected') {
            setLastRealtimeEvent({ kind: 'recharge_rejected', amount, at: Date.now() });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
