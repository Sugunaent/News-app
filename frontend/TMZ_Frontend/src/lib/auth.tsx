import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import { fetchProfile } from './api';
import { DEFAULT_PROFILE } from './mock/data';
import { supabase, isSupabaseConfigured } from './supabase';

/* ---- Universal User type (compatible with Supabase User and standard User) ---- */
export interface AppUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

/* ---- Universal Session type ---- */
export interface AppSession {
  user: AppUser;
  access_token?: string;
}

const STORAGE_KEY = 'tms_auth_session';

function loadStoredSession(): AppSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredSession(session: AppSession | null) {
  if (session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function mapUserToProfile(appUser: AppUser): UserProfile {
  const meta = (appUser.user_metadata || {}) as Record<string, unknown>;
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.user_name === 'string' && meta.user_name) ||
    appUser.email?.split('@')[0] ||
    DEFAULT_PROFILE.display_name;

  const avatarUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null;

  return {
    id: appUser.id,
    email: appUser.email || DEFAULT_PROFILE.email,
    display_name: displayName,
    avatar_url: avatarUrl,
    xp: DEFAULT_PROFILE.xp,
    level: DEFAULT_PROFILE.level,
    bio: (typeof meta.bio === 'string' && meta.bio) || DEFAULT_PROFILE.bio,
  };
}

interface AuthContextValue {
  session: Session | AppSession | null;
  user: User | AppUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (redirectToPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | AppSession | null>(null);
  const [user, setUser] = useState<User | AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (isConfigured && supabase) {
      // 1. Check active Supabase session
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          fetchProfile(currentSession.user.id)
            .then((p) => setProfile(p || mapUserToProfile(currentSession.user as AppUser)))
            .catch(() => setProfile(mapUserToProfile(currentSession.user as AppUser)))
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      });

      // 2. Listen to Supabase auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, newSession: Session | null) => {
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          // Do not await API work inside Supabase's auth callback. Refresh
          // events must return immediately so Supabase can finish the cycle.
          void Promise.resolve().then(async () => {
            try {
              const p = await fetchProfile(newSession.user.id);
              setProfile(p || mapUserToProfile(newSession.user as AppUser));
            } catch {
              setProfile(mapUserToProfile(newSession.user as AppUser));
            } finally {
              setLoading(false);
            }
          });
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Load stored session if exists
      const saved = loadStoredSession();
      if (saved?.user) {
        setSession(saved);
        setUser(saved.user);
        fetchProfile(saved.user.id)
          .then((p) => setProfile(p || mapUserToProfile(saved.user)))
          .catch(() => setProfile(mapUserToProfile(saved.user)))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    }
  }, [isConfigured]);

  const applyLocalSession = async (localUser: AppUser, customProfile?: UserProfile) => {
    const sess: AppSession = { user: localUser };
    saveStoredSession(sess);
    setSession(sess);
    setUser(localUser);
    if (customProfile) {
      setProfile(customProfile);
      return;
    }
    try {
      const p = await fetchProfile(localUser.id);
      setProfile(p || mapUserToProfile(localUser));
    } catch {
      setProfile(mapUserToProfile(localUser));
    }
  };

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    if (isConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        setProfile(mapUserToProfile(data.user as AppUser));
      }
    } else {
      const localUser: AppUser = {
        id: `user-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: cleanEmail,
        user_metadata: {
          full_name: cleanEmail.split('@')[0],
        },
      };
      await applyLocalSession(localUser);
    }
  };

  const signUp = async (email: string, password: string) => {
    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    if (isConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        setProfile(mapUserToProfile(data.user as AppUser));
      }
    } else {
      const localUser: AppUser = {
        id: `user-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: cleanEmail,
        user_metadata: {
          full_name: cleanEmail.split('@')[0],
        },
      };
      await applyLocalSession(localUser);
    }
  };

  const signInWithGoogle = async (redirectToPath?: string) => {
    if (redirectToPath) {
      try {
        localStorage.setItem('tms_auth_redirect', redirectToPath);
      } catch {
        /* ignore */
      }
    }
    if (isConfigured && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } else {
      throw new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Google Authentication.');
    }
  };

  const signOut = async () => {
    if (isConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    saveStoredSession(null);
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      try {
        const p = await fetchProfile(user.id);
        if (p) {
          setProfile(p);
        } else {
          setProfile(mapUserToProfile(user as AppUser));
        }
      } catch {
        setProfile(mapUserToProfile(user as AppUser));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isConfigured,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

