import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { canonicalUrl, setPageMetadata, upsertJsonLd } from '@/lib/seo';
import { ThemeProvider } from '@/lib/theme';
import { LanguageProvider } from '@/lib/language';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import { DotPattern } from '@/components/layout/DotPattern';
import { CursorFollower } from '@/components/layout/CursorFollower';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
const HomePage = lazy(() => import('@/pages/HomePage').then((module) => ({ default: module.HomePage })));
const AboutPage = lazy(() => import('@/pages/AboutPage').then((module) => ({ default: module.AboutPage })));
const CategoryPage = lazy(() => import('@/pages/CategoryPage').then((module) => ({ default: module.CategoryPage })));
const AuthPage = lazy(() => import('@/pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage').then((module) => ({ default: module.AuthCallbackPage })));
const ArticlePage = lazy(() => import('@/pages/ArticlePage').then((module) => ({ default: module.ArticlePage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const SuperAdminPage = lazy(() => import('@/pages/SuperAdminPage').then((module) => ({ default: module.SuperAdminPage })));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then((module) => ({ default: module.PrivacyPage })));
const LegalPage = lazy(() => import('@/pages/LegalPage').then((module) => ({ default: module.LegalPage })));
const ProfileListPage = lazy(() => import('@/pages/ProfileListPage').then((module) => ({ default: module.ProfileListPage })));
const CardPage = lazy(() => import('@/pages/CardPage').then((module) => ({ default: module.CardPage })));
const LatestPage = lazy(() => import('@/pages/LatestPage').then((module) => ({ default: module.LatestPage })));
const AuthorsPicksPage = lazy(() => import('@/pages/AuthorsPicksPage').then((module) => ({ default: module.AuthorsPicksPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

function AppLayout() {
  const location = useLocation();
  const isAuthPage = ['/auth', '/login', '/auth/callback'].includes(location.pathname);

  useEffect(() => {
    const pageMeta: Record<string, { title: string; description: string; ogTitle?: string; ogDescription?: string }> = {
      '/': {
        title: "The Modern Stories | India's Premier AEO & GEO Digital Storytelling Platform",
        description: "Discover The Modern Stories (TMS): India's leading AEO & GEO-powered digital platform for modern narratives, cyber articles, technology insights, personality growth, and inspiring contemporary literature. Empowering readers and stories.",
        ogTitle: "The Modern Stories | India's Premier AEO & GEO Digital Storytelling Platform",
        ogDescription: "Discover The Modern Stories (TMS): India's leading AEO & GEO-powered digital platform for modern narratives, cyber articles, technology insights, personality growth, and inspiring contemporary literature. Empowering readers and stories.",
      },
      '/about': { title: 'About | The Modern Stories', description: 'Learn more about The Modern Stories editorial platform.' },
      '/latest': { title: 'Latest Stories | The Modern Stories', description: 'Browse the newest articles, features, and editorial content.' },
      '/authors-picks': { title: 'Author\'s Picks | The Modern Stories', description: 'Explore hand-picked stories selected by the editorial team.' },
      '/privacy': { title: 'Privacy Policy | The Modern Stories', description: 'Read The Modern Stories privacy policy and data protection information.' },
      '/legal': { title: 'Legal | The Modern Stories', description: 'Review the legal policies and terms for The Modern Stories platform.' },
      '/profile': { title: 'Your Profile | The Modern Stories', description: 'Manage your reading history, saved stories, and achievement data.' },
      '/settings': { title: 'Settings | The Modern Stories', description: 'Manage account settings and preferences.' },
      '/superadmin': { title: 'Super Admin | The Modern Stories', description: 'Editorial management and content administration tools.' },
    };

    const categoryMatch = location.pathname.match(/^\/category\/([^/]+)\/?$/);
    const categoryName = categoryMatch?.[1]
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    const categoryMeta = categoryName
      ? { title: `${categoryName} Stories | The Modern Stories`, description: `Explore contemporary ${categoryName.toLowerCase()} stories, features, and interactive narratives from The Modern Stories.` }
      : null;
    const isArticleRoute = /^\/article\/[^/]+\/?$/.test(location.pathname);
    const isKnownRoute = Boolean(pageMeta[location.pathname] || categoryMeta || isArticleRoute);
    const isPrivateRoute = /^\/(auth|login|profile|settings|superadmin|card)(\/|$)/.test(location.pathname);
    const routeMeta = pageMeta[location.pathname] ?? categoryMeta ?? (isArticleRoute
      ? { title: 'Story | The Modern Stories', description: 'Read an interactive story from The Modern Stories.' }
      : { title: 'Page not found | The Modern Stories', description: 'The requested page could not be found.' });
    setPageMetadata({
      ...routeMeta,
      canonicalPath: location.pathname,
      robots: isPrivateRoute || !isKnownRoute || isArticleRoute ? 'noindex, nofollow' : undefined,
      ogTitle: 'ogTitle' in routeMeta ? routeMeta.ogTitle : undefined,
      ogDescription: 'ogDescription' in routeMeta ? routeMeta.ogDescription : undefined,
    });

    upsertJsonLd('page-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonicalUrl(location.pathname)}#webpage`,
      url: canonicalUrl(location.pathname),
      name: routeMeta.title,
      description: routeMeta.description,
      isPartOf: { '@id': `${canonicalUrl('/')}#website` },
      about: { '@type': 'Thing', name: 'Contemporary Ideas, Journalism, and Interactive Storytelling' },
    });
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex flex-col">
      {!isAuthPage && <Header />}
      <main className="flex-1">
        <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-muted" role="status">Loading page…</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/latest" element={<LatestPage />} />
            <Route path="/authors-picks" element={<AuthorsPicksPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/article/:slug" element={<ArticlePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:type" element={<ProfileListPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/superadmin" element={<SuperAdminPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/legal" element={<LegalPage />} />
            <Route path="/card" element={<CardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <ScrollToTop />
              <DotPattern />
              <CursorFollower />
              <AppLayout />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
