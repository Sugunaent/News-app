import { createContext, useContext } from 'react';

export type LoginPromptReason = 'gamification' | 'bookmark' | 'comment' | 'personalized';

interface AuthPromptContextValue {
  requestLogin: (reason: LoginPromptReason) => void;
}

export const AuthPromptContext = createContext<AuthPromptContextValue | undefined>(undefined);

export function useAuthPrompt() {
  const context = useContext(AuthPromptContext);
  if (!context) throw new Error('useAuthPrompt must be used within AuthPromptProvider');
  return context;
}
