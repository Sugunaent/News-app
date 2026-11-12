import { createContext } from 'react';
import type { PrivacyConsent } from './privacyConsentStorage';

export interface PrivacyConsentContextValue {
  consent: PrivacyConsent | null;
  saveConsent: (choices: Omit<PrivacyConsent, 'updatedAt'>) => void;
  openPrivacySettings: () => void;
}

export const PrivacyConsentContext = createContext<PrivacyConsentContextValue | null>(null);
