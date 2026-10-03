import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'EN' | 'TE' | 'HI';

interface LanguageContextValue {
  currentLang: Language;
  setLanguage: (language: Language) => void;
}

const LANGUAGE_STORAGE_KEY = 'tms-language';

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'EN' || stored === 'TE' || stored === 'HI') return stored;
  } catch (error) {
    console.warn('[Language] Could not read saved language preference:', error);
  }
  return 'EN';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLang, setCurrentLang] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = currentLang.toLowerCase();
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLang);
    } catch (error) {
      console.warn('[Language] Could not save language preference:', error);
    }
  }, [currentLang]);

  return (
    <LanguageContext.Provider value={{ currentLang, setLanguage: setCurrentLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
