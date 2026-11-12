import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  CONSENT_STORAGE_KEY,
  hasGlobalPrivacyControlSignal,
  readPrivacyConsent,
  type PrivacyConsent,
} from './privacyConsentStorage';
import { PrivacyConsentContext } from './privacyConsentContext';
const CONSENT_EVENT = 'tms:privacy-settings';

function loadAdScript(): void {
  if (document.querySelector('script[data-tms-consent="advertising"]')) return;
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.dataset.tmsConsent = 'advertising';
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6285044921746102';
  script.onerror = () => console.error('[privacy-consent] The advertising script failed to load.');
  document.head.appendChild(script);
}

function ConsentControls({
  values,
  onChange,
}: {
  values: Omit<PrivacyConsent, 'updatedAt'>;
  onChange: (key: keyof Omit<PrivacyConsent, 'updatedAt'>, value: boolean) => void;
}) {
  const hasGpcSignal = hasGlobalPrivacyControlSignal();
  const options: Array<{
    key: keyof Omit<PrivacyConsent, 'updatedAt'>;
    title: string;
    description: string;
    disabled?: boolean;
  }> = [
    { key: 'analytics', title: 'Analytics', description: 'Optional audience measurement. No third-party analytics tag is currently configured.' },
    {
      key: 'advertising',
      title: 'Advertising',
      description: hasGpcSignal
        ? 'Disabled because your browser sent a Global Privacy Control opt-out signal.'
        : 'Allows the Google AdSense script and related advertising technologies.',
      disabled: hasGpcSignal,
    },
    { key: 'aiPersonalization', title: 'AI personalization', description: 'No AI-based reader personalization is currently enabled; this choice remains off.' , disabled: true },
    { key: 'pushNotifications', title: 'Push notifications', description: 'Allows the notification provider to initialize. Browser permission is requested separately.' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-subtle p-3">
        <div>
          <p className="text-sm font-semibold text-primary">Essential storage</p>
          <p className="mt-1 text-xs text-secondary">Required for security, sign-in, and saving your privacy choices.</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-secondary">Always on</span>
      </div>
      {options.map((option) => (
        <label key={option.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-subtle p-3">
          <span>
            <span className="block text-sm font-semibold text-primary">{option.title}</span>
            <span className="mt-1 block text-xs text-secondary">{option.description}</span>
          </span>
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-brand-primary"
            checked={option.key === 'advertising' && hasGpcSignal ? false : values[option.key]}
            disabled={option.disabled}
            onChange={(event) => onChange(option.key, event.currentTarget.checked)}
            aria-label={`Allow ${option.title}`}
          />
        </label>
      ))}
    </div>
  );
}

export function PrivacyConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<PrivacyConsent | null>(readPrivacyConsent);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [choices, setChoices] = useState<Omit<PrivacyConsent, 'updatedAt'>>({
    analytics: false,
    advertising: false,
    aiPersonalization: false,
    pushNotifications: false,
  });

  useEffect(() => {
    const openSettings = () => {
      setChoices(consent
        ? {
          analytics: consent.analytics,
          advertising: consent.advertising,
          aiPersonalization: consent.aiPersonalization,
          pushNotifications: consent.pushNotifications,
        }
        : { analytics: false, advertising: false, aiPersonalization: false, pushNotifications: false });
      setSettingsOpen(true);
    };
    window.addEventListener(CONSENT_EVENT, openSettings);
    return () => window.removeEventListener(CONSENT_EVENT, openSettings);
  }, [consent]);

  useEffect(() => {
    const script = document.querySelector<HTMLScriptElement>('script[data-tms-consent="advertising"]');
    if (consent?.advertising && !hasGlobalPrivacyControlSignal()) {
      loadAdScript();
    } else {
      script?.remove();
    }
  }, [consent]);

  const saveConsent = useCallback((next: Omit<PrivacyConsent, 'updatedAt'>) => {
    const value: PrivacyConsent = {
      ...next,
      advertising: next.advertising && !hasGlobalPrivacyControlSignal(),
      updatedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(value));
    } catch (error) {
      console.error('[privacy-consent] Could not persist privacy preferences:', error);
    }
    setConsent(value);
    setSettingsOpen(false);
  }, []);

  const openPrivacySettings = useCallback(() => {
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }, []);

  const contextValue = useMemo(
    () => ({ consent, saveConsent, openPrivacySettings }),
    [consent, saveConsent, openPrivacySettings],
  );

  const updateChoice = (key: keyof typeof choices, value: boolean) => {
    setChoices((current) => ({ ...current, [key]: value }));
  };

  const acceptAll = () => saveConsent({
    analytics: true,
    advertising: true,
    aiPersonalization: false,
    pushNotifications: true,
  });
  const rejectOptional = () => saveConsent({
    analytics: false,
    advertising: false,
    aiPersonalization: false,
    pushNotifications: false,
  });

  return (
    <PrivacyConsentContext.Provider value={contextValue}>
      {children}
      {(consent === null || settingsOpen) && (
        <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-5" role="dialog" aria-modal="false" aria-labelledby="privacy-consent-title">
          <div className="mx-auto max-h-[85vh] max-w-3xl overflow-y-auto rounded-2xl border border-subtle bg-card p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="privacy-consent-title" className="text-lg font-bold text-primary">Your privacy choices</h2>
                <p className="mt-2 text-sm leading-relaxed text-secondary">
                  Essential storage is always active. Optional advertising, analytics, AI personalization, and push services stay off until you choose. This privacy-first setting is applied worldwide; we do not use IP-based geolocation to decide your choices.
                </p>
              </div>
              {settingsOpen && consent && (
                <button type="button" className="text-sm text-secondary underline" onClick={() => setSettingsOpen(false)}>Close</button>
              )}
            </div>

            <div className="mt-4">
              <ConsentControls values={choices} onChange={updateChoice} />
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={rejectOptional}>Reject optional</button>
              <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => saveConsent(choices)}>Save choices</button>
              <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={acceptAll}>Accept all</button>
            </div>
            <p className="mt-3 text-xs text-muted">
              You can change these choices at any time from the footer. See our <a className="underline" href="/privacy">Privacy Policy</a> and <a className="underline" href="/compliance">Compliance &amp; AI transparency</a>.
            </p>
          </div>
        </div>
      )}
    </PrivacyConsentContext.Provider>
  );
}
