import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, LogIn } from 'lucide-react';
import { TMSLogo } from '@/components/brand/TMSLogo';
import { LanguageToggle } from '@/components/common/LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/lib/useAuth';
import { useLanguage } from '@/lib/language';
import type { Category } from '@/types';
import { fetchCategories } from '@/lib/api';

export function Header() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const { currentLang, setLanguage } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    fetchCategories()
      .then((items) => {
        if (mounted) setCategories(items);
      })
      .catch((error: unknown) => {
        console.error('[Header] Could not load categories:', error);
        if (mounted) setCategories([]);
      })
      .finally(() => {
        if (mounted) setCategoriesLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navLabels = {
    EN: {
      home: 'Home',
      about: 'About',
      categories: 'Categories',
      loading: 'Loading categories...',
      empty: 'No categories available',
      profile: 'Profile',
      viewProfile: 'View Profile',
      login: 'Login',
    },
    TE: {
      home: 'హోమ్',
      about: 'మా గురించి',
      categories: 'వర్గాలు',
      loading: 'వర్గాలు లోడ్ అవుతున్నాయి...',
      empty: 'వర్గాలు అందుబాటులో లేవు',
      profile: 'ప్రొఫైల్',
      viewProfile: 'ప్రొఫైల్ చూడండి',
      login: 'లాగిన్',
    },
    HI: {
      home: 'होम',
      about: 'हमारे बारे में',
      categories: 'श्रेणियाँ',
      loading: 'श्रेणियाँ लोड हो रही हैं...',
      empty: 'कोई श्रेणी उपलब्ध नहीं है',
      profile: 'प्रोफ़ाइल',
      viewProfile: 'प्रोफ़ाइल देखें',
      login: 'लॉगिन',
    },
  }[currentLang];

  const navItems = [
    { label: navLabels.home, path: '/' },
    { label: navLabels.about, path: '/about' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className="sticky top-0 z-[100] transition-all duration-300"
      style={{
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--nav-border)',
      }}
    >
      <div className="mx-auto flex min-h-14 w-full max-w-[1440px] flex-wrap items-center justify-between gap-1 px-2 py-2 sm:min-h-16 sm:gap-4 sm:px-6 lg:px-8 xl:px-10 2xl:max-w-[1536px]">
        {/* Logo */}
        <Link to="/" className="flex items-center group shrink-0" aria-label="The Modern Stories">
          <TMSLogo size="md" hideSubtitleOnMobile={true} className="group-hover:opacity-90 transition-opacity" />
        </Link>

        {/* Navigation & Controls */}
        <nav className="relative flex min-w-0 max-w-full flex-wrap items-center justify-end gap-0.5 sm:gap-1.5 md:gap-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link header-tab px-1.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.label}
              {isActive(item.path) && (
                <span className="header-tab-bump" aria-hidden="true" />
              )}
            </Link>
          ))}

          {/* Categories dropdown */}
          <div ref={catRef} className="relative">
            <button
              onClick={() => setCatOpen((v) => !v)}
              className={`nav-link header-tab px-1.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium flex items-center gap-0.5 sm:gap-1 whitespace-nowrap ${location.pathname.startsWith('/category') ? 'active' : ''}`}
              aria-expanded={catOpen}
              aria-haspopup="true"
            >
              <span>{navLabels.categories}</span>
              <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform shrink-0 ${catOpen ? 'rotate-180' : ''}`} />
            </button>
            {catOpen && (
              <div
                className="absolute top-full right-0 mt-2 p-2 min-w-[190px] max-w-[260px] rounded-2xl animate-scale-in z-50 shadow-2xl"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-elevated)',
                }}
              >
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    onClick={() => setCatOpen(false)}
                    className="block px-3 py-2 rounded-lg text-xs sm:text-sm text-secondary hover:text-primary hover:bg-brand-accent/10 transition-all truncate"
                  >
                    {cat.name}
                  </Link>
                ))}
                {categoriesLoading ? (
                  <p className="break-words px-3 py-2 text-xs text-muted">{navLabels.loading}</p>
                ) : categories.length === 0 ? (
                  <p className="break-words px-3 py-2 text-xs text-muted">{navLabels.empty}</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Profile / Avatar (Responsive: Avatar Image/Badge on Mobile) */}
          {user ? (
            <Link
              to="/profile"
              className={`nav-link flex items-center gap-1.5 p-0.5 sm:px-2.5 sm:py-1.5 rounded-full sm:rounded-lg shrink-0 ${isActive('/profile') ? 'active font-semibold text-brand-primary' : 'text-secondary hover:text-primary'}`}
              title={profile?.display_name || navLabels.viewProfile}
              aria-label={navLabels.viewProfile}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || 'Profile'}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-brand-primary/40 shadow-sm shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white text-[11px] sm:text-xs font-bold shadow-sm shrink-0">
                  {profile?.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="hidden md:inline text-xs sm:text-sm">{navLabels.profile}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className={`nav-link flex items-center gap-1 px-1.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 ${isActive('/login') || isActive('/auth') ? 'active' : ''}`}
              aria-label={navLabels.login}
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">{navLabels.login}</span>
            </Link>
          )}

          <LanguageToggle currentLang={currentLang} onLanguageChange={setLanguage} />

          {/* Theme Toggle Button */}
          <div className="shrink-0 ml-0.5 sm:ml-1">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
