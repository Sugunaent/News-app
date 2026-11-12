export const CONSENT_STORAGE_KEY = 'tms-privacy-consent-v1';

export interface PrivacyConsent {
  analytics: boolean;
  advertising: boolean;
  aiPersonalization: boolean;
  pushNotifications: boolean;
  updatedAt: string;
}

export function hasGlobalPrivacyControlSignal(): boolean {
  return typeof navigator !== 'undefined'
    && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function readPrivacyConsent(): PrivacyConsent | null {
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Partial<PrivacyConsent>;
    if (typeof value.updatedAt !== 'string') return null;
    return {
      analytics: value.analytics === true,
      advertising: value.advertising === true,
      aiPersonalization: value.aiPersonalization === true,
      pushNotifications: value.pushNotifications === true,
      updatedAt: value.updatedAt,
    };
  } catch (error) {
    console.error('[privacy-consent] Could not read saved consent preferences:', error);
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return readPrivacyConsent()?.analytics === true;
}
