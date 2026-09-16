import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full glass flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-accent transition-transform duration-500 rotate-0" />
      ) : (
        <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary transition-transform duration-500" />
      )}
    </button>
  );
}
