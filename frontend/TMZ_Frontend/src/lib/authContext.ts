import { createContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@/types';
import type { AppSession, AppUser } from './authTypes';

export interface AuthContextValue {
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

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
