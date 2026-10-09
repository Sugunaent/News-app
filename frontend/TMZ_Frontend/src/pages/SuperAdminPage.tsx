import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, FolderTree, HelpCircle, MessageSquare,
  Users, Gamepad2, Megaphone, Newspaper, Image, BarChart3, MessageSquareText,
  Mail, ScrollText, LogOut, Menu, X, Search, Plus, ChevronLeft,
  ShieldAlert, Loader2, Home as HomeIcon,
} from 'lucide-react';
import { TMSIcon } from '@/components/brand/TMSIcon';
import { useAuth } from '@/lib/useAuth';
import { useToast } from '@/lib/toast';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { searchArticles } from '@/lib/admin/api';
import type { AdminArticle } from '@/lib/admin/adminTypes';

const DashboardSection = lazy(() => import('@/components/admin/DashboardSection').then((module) => ({ default: module.DashboardSection })));
const ArticlesSection = lazy(() => import('@/components/admin/ArticlesSection').then((module) => ({ default: module.ArticlesSection })));
const HomeSection = lazy(() => import('@/components/admin/HomeSection').then((module) => ({ default: module.HomeSection })));
const CategoriesSection = lazy(() => import('@/components/admin/CategoriesSection').then((module) => ({ default: module.CategoriesSection })));
const QuizzesSection = lazy(() => import('@/components/admin/QuizzesSection').then((module) => ({ default: module.QuizzesSection })));
const OpinionsSection = lazy(() => import('@/components/admin/OpinionsSection').then((module) => ({ default: module.OpinionsSection })));
const CommentsSection = lazy(() => import('@/components/admin/CommentsSection').then((module) => ({ default: module.CommentsSection })));
const UsersSection = lazy(() => import('@/components/admin/UsersSection').then((module) => ({ default: module.UsersSection })));
const GamificationSection = lazy(() => import('@/components/admin/GamificationSection').then((module) => ({ default: module.GamificationSection })));
const PromotionsSection = lazy(() => import('@/components/admin/PromotionsSection').then((module) => ({ default: module.PromotionsSection })));
const AdvertisementsSection = lazy(() => import('@/components/admin/AdvertisementsSection').then((module) => ({ default: module.AdvertisementsSection })));
const MediaSection = lazy(() => import('@/components/admin/MediaSection').then((module) => ({ default: module.MediaSection })));
const AnalyticsSection = lazy(() => import('@/components/admin/AnalyticsSection').then((module) => ({ default: module.AnalyticsSection })));
const FeedbackSection = lazy(() => import('@/components/admin/FeedbackSection').then((module) => ({ default: module.FeedbackSection })));
const BusinessEnquiriesSection = lazy(() => import('@/components/admin/BusinessEnquiriesSection').then((module) => ({ default: module.BusinessEnquiriesSection })));
const AuditLogsSection = lazy(() => import('@/components/admin/AuditLogsSection').then((module) => ({ default: module.AuditLogsSection })));

type SectionKey =
  | 'dashboard' | 'home' | 'articles' | 'categories' | 'quizzes' | 'opinions'
  | 'comments' | 'users' | 'gamification' | 'promotions' | 'advertisements'
  | 'media' | 'analytics' | 'feedback' | 'business-enquiries' | 'audit-logs';

interface NavItem {
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'home', label: 'Home', icon: HomeIcon },
  { key: 'articles', label: 'Articles', icon: FileText },
  { key: 'categories', label: 'Categories', icon: FolderTree },
  { key: 'quizzes', label: 'Quizzes', icon: HelpCircle },
  { key: 'opinions', label: 'Opinions', icon: MessageSquare },
  { key: 'comments', label: 'Comments', icon: MessageSquareText },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'gamification', label: 'Gamification', icon: Gamepad2 },
  { key: 'promotions', label: 'Promotions', icon: Megaphone },
  { key: 'advertisements', label: 'Advertisements', icon: Newspaper },
  { key: 'media', label: 'Media', icon: Image },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'feedback', label: 'Feedback', icon: MessageSquare },
  { key: 'business-enquiries', label: 'Business Enquiries', icon: Mail },
  { key: 'audit-logs', label: 'Audit Logs', icon: ScrollText },
];

export function SuperAdminPage() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AdminArticle[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [editorArticleId, setEditorArticleId] = useState<string | null>(null);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      void searchArticles(query)
        .then((results) => {
          if (!active) return;
          setSearchResults(results);
          setSearchOpen(true);
        })
        .catch((error: unknown) => {
          console.error('[SuperAdminPage] Article search failed:', error);
          if (active) {
            setSearchResults([]);
            setSearchOpen(false);
            showToast('Article search failed. Please try again.', 'error');
          }
        })
        .finally(() => {
          if (active) setSearchLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, showToast]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('[SuperAdminPage] Sign out failed:', error);
      showToast('Could not sign out. Please try again.', 'error');
    }
  };

  const openArticleEditor = (id?: string) => {
    setEditorArticleId(id ?? null);
    setActiveSection('articles');
  };

  // Auth gate
  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ background: 'var(--bg-page)' }}>
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-brand-primary" />
          </div>
          <h1 className="font-display text-2xl text-primary mb-2">Superadmin Access</h1>
          <p className="text-sm text-muted mb-6">You need to be signed in to access the CMS. Only users with admin privileges can enter.</p>
          <button onClick={() => navigate('/auth', { state: { redirect: '/superadmin' } })} className="btn-primary w-full">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role?.toUpperCase() === 'SUPERADMIN';

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ background: 'var(--bg-page)' }}>
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="font-display text-2xl text-primary mb-2">Unauthorized</h1>
          <p className="text-sm text-muted mb-6">You do not have Superadmin privileges. Contact an administrator if you believe this is an error.</p>
          <button onClick={() => navigate('/')} className="btn-secondary w-full">
            Back to Site
          </button>
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardSection onNavigate={(k) => setActiveSection(k as SectionKey)} />;
      case 'home': return <HomeSection openArticleEditor={openArticleEditor} />;
      case 'articles': return <ArticlesSection editorArticleId={editorArticleId} setEditorArticleId={setEditorArticleId} />;
      case 'categories': return <CategoriesSection />;
      case 'quizzes': return <QuizzesSection />;
      case 'opinions': return <OpinionsSection />;
      case 'comments': return <CommentsSection />;
      case 'users': return <UsersSection />;
      case 'gamification': return <GamificationSection />;
      case 'promotions': return <PromotionsSection />;
      case 'advertisements': return <AdvertisementsSection />;
      case 'media': return <MediaSection />;
      case 'analytics': return <AnalyticsSection />;
      case 'feedback': return <FeedbackSection />;
      case 'business-enquiries': return <BusinessEnquiriesSection />;
      case 'audit-logs': return <AuditLogsSection />;
      default: return <DashboardSection onNavigate={(k) => setActiveSection(k as SectionKey)} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex" style={{ background: 'var(--bg-page)' }}>
      {/* Sidebar — Desktop */}
      <aside
        className={`hidden md:flex flex-col transition-all duration-300 shrink-0 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
        style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border-default)' }}
      >
        <SidebarContent
          items={navItems}
          activeKey={activeSection}
          onSelect={(k) => { setActiveSection(k); setMobileSidebarOpen(false); }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          profile={profile}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Sidebar — Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[110]">
          <div className="absolute inset-0" style={{ background: 'var(--modal-overlay)' }} onClick={() => setMobileSidebarOpen(false)} />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 flex flex-col animate-slide-up"
            style={{ background: 'var(--bg-card)' }}
          >
            <SidebarContent
              items={navItems}
              activeKey={activeSection}
              onSelect={(k) => { setActiveSection(k); setMobileSidebarOpen(false); }}
              collapsed={false}
              onToggleCollapse={() => {}}
              profile={profile}
              onSignOut={handleSignOut}
              onClose={() => setMobileSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header
          className="h-14 flex items-center justify-between px-4 shrink-0"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)' }}
        >
          {/* Left: mobile menu + profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-secondary hover:text-primary"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={`${profile.display_name || 'Administrator'} profile photo`} className="w-full h-full object-cover" />
                ) : (
                  profile?.display_name?.[0]?.toUpperCase() ?? 'A'
                )}
              </div>
              <span className="text-sm text-primary font-body hidden sm:block">
                {profile?.display_name ?? 'Admin'}
              </span>
            </div>
          </div>

          {/* Right: create + search + theme */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openArticleEditor()}
              className="btn-primary text-sm py-2 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:block">Create Article</span>
            </button>

            {/* Search */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                  placeholder="Search articles..."
                  className="input-field text-sm py-2 pl-9 pr-3 w-32 sm:w-48"
                />
              </div>
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute top-full right-0 mt-2 w-72 glass-card p-2 z-50 max-h-80 overflow-y-auto">
                  {searchResults.map((art) => (
                    <button
                      key={art.id}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                        openArticleEditor(art.id);
                      }}
                      className="block w-full text-left px-3 py-2 rounded-lg hover:bg-brand-accent/10 transition-colors"
                    >
                      <p className="text-sm text-primary font-body line-clamp-1">{art.title}</p>
                      <p className="text-xs text-muted">{art.status} · {art.category_name}</p>
                    </button>
                  ))}
                </div>
              )}
              {searchLoading && (
                <p className="absolute right-0 top-full mt-2 text-xs text-muted" role="status">
                  Searching...
                </p>
              )}
            </div>

            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Suspense
            fallback={
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted" role="status">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading admin section...
              </div>
            }
          >
            {renderSection()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/* ===== Sidebar Content ===== */

function SidebarContent({
  items, activeKey, onSelect, collapsed, onToggleCollapse, profile: _profile, onSignOut, onClose,
}: {
  items: NavItem[];
  activeKey: SectionKey;
  onSelect: (k: SectionKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  profile: { display_name: string; avatar_url: string | null } | null;
  onSignOut: () => void;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className={`h-14 flex items-center px-4 shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-2.5">
          <TMSIcon className="w-7 h-7 shrink-0" />
          {!collapsed && (
            <span className="font-display font-semibold text-sm text-primary tracking-tight">Superadmin</span>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-secondary hover:text-primary">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {items.map((item) => {
          const active = activeKey === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all ${
                active
                  ? 'text-white'
                  : 'text-secondary hover:text-primary hover:bg-brand-accent/5'
              } ${collapsed ? 'justify-center' : ''}`}
              style={active ? { background: 'var(--brand-primary)' } : undefined}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Logout */}
      <div className="p-2 shrink-0" style={{ borderTop: '1px solid var(--border-default)' }}>
        <button
          onClick={onSignOut}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-secondary hover:text-red-500 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle — desktop only */}
      {!onClose && (
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex items-center justify-center py-2 text-muted hover:text-primary transition-colors"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      )}
    </>
  );
}
