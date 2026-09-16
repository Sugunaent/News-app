import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import { DotPattern } from '@/components/layout/DotPattern';
import { CursorFollower } from '@/components/layout/CursorFollower';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HomePage } from '@/pages/HomePage';
import { AboutPage } from '@/pages/AboutPage';
import { CategoryPage } from '@/pages/CategoryPage';
import { AuthPage } from '@/pages/AuthPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { ArticlePage } from '@/pages/ArticlePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SuperAdminPage } from '@/pages/SuperAdminPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { LegalPage } from '@/pages/LegalPage';
import { ProfileListPage } from '@/pages/ProfileListPage';
import { CardPage } from '@/pages/CardPage';

function AppLayout() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth' || location.pathname === '/auth/callback';

  return (
    <div className="relative min-h-screen flex flex-col">
      {!isAuthPage && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/article/:id" element={<ArticlePage />} />
          <Route path="/authors-picks" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:type" element={<ProfileListPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/superadmin" element={<SuperAdminPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/card" element={<CardPage />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

export default App;
