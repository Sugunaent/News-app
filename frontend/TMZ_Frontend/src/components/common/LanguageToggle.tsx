import type { Language } from '@/lib/language';

interface LanguageToggleProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

const languages: Language[] = ['EN', 'TE', 'HI'];

export function LanguageToggle({ currentLang, onLanguageChange }: LanguageToggleProps) {
  const activeIndex = languages.indexOf(currentLang);

  return (
    <div
      className="relative inline-flex max-w-full shrink-0 items-center rounded-full border border-neutral-200 bg-neutral-100/50 p-1 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/50"
      role="group"
      aria-label="Select language"
    >
      <span
        className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out dark:bg-neutral-800 motion-reduce:transition-none"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
        aria-hidden="true"
      />
      {languages.map((lang) => {
        const isActive = currentLang === lang;
        const languageName = lang === 'EN' ? 'English' : lang === 'TE' ? 'Telugu' : 'Hindi';

        return (
          <button
            key={lang}
            type="button"
            onClick={() => onLanguageChange(lang)}
            className={`relative z-10 min-w-[2rem] rounded-full px-2.5 py-1.5 text-xs font-semibold tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 ${
              isActive
                ? 'text-neutral-900 dark:text-white'
                : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
            }`}
            aria-label={languageName}
            aria-pressed={isActive}
          >
            {lang}
          </button>
        );
      })}
    </div>
  );
}
