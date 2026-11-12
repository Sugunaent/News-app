import { useContext } from 'react';
import { PrivacyConsentContext } from './privacyConsentContext';

export function usePrivacyConsent() {
  const value = useContext(PrivacyConsentContext);
  if (!value) throw new Error('usePrivacyConsent must be used within PrivacyConsentProvider.');
  return value;
}
