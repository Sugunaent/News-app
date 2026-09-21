import { useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Settings as SettingsIcon, User, Palette, LogOut,
  Sun, Moon, Upload, Check, AlertCircle, ArrowLeft, Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { updateProfile, uploadAvatar } from '@/lib/api';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/auth" state={{ redirect: '/settings' }} replace />;
  }

  return (
    <div className="relative z-10 max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
      {/* Back */}
      <button
        type="button"
        onClick={() => {
          if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
            navigate(-1);
          } else {
            navigate('/profile');
          }
        }}
        className="inline-flex items-center gap-2 px-3 py-1.5 -ml-2 rounded-xl text-sm font-medium text-secondary hover:text-primary hover:bg-white/5 active:scale-95 transition-all cursor-pointer mb-6"
        aria-label="Back to Profile"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Profile
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-brand-primary" />
        </div>
        <h1 className="font-display text-2xl md:text-3xl text-primary">Settings</h1>
      </div>

      <div className="space-y-8">
        <AccountSection
          user={user}
          profile={profile}
          refreshProfile={refreshProfile}
        />
        <AppearanceSection />
        <AccountActionsSection signOut={signOut} />
      </div>
    </div>
  );
}

/* ===== Account Section ===== */

function AccountSection({
  user, profile, refreshProfile,
}: {
  user: { id: string; email?: string };
  profile: { id: string; display_name: string; email: string; avatar_url: string | null };
  refreshProfile: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      showToast('Display name cannot be empty', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(profile.id, { display_name: displayName.trim() });
      await refreshProfile();
      showToast('Display name updated', 'success');
    } catch {
      showToast('Could not update display name', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setAvatarError('Image must be under 10MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file');
      return;
    }

    setAvatarUploading(true);
    setAvatarError('');
    setAvatarSuccess(false);

    try {
      await uploadAvatar(profile.id, file);
      await refreshProfile();
      setAvatarSuccess(true);
      showToast('Avatar updated', 'success');
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch {
      setAvatarError('Could not upload avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <GlassCard hover={false} className="p-6 md:p-8">
      <div className="flex items-center gap-2.5 mb-6">
        <User className="w-5 h-5 text-brand-primary" />
        <h2 className="font-display text-xl text-primary">Account</h2>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5 mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-2xl font-display shrink-0 overflow-hidden relative">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            profile.display_name?.[0]?.toUpperCase() || 'U'
          )}
          {avatarUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={avatarUploading}
            className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {avatarUploading ? 'Uploading...' : 'Change Avatar'}
          </button>
          {avatarSuccess && (
            <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
              <Check className="w-3 h-3" /> Avatar updated successfully
            </p>
          )}
          {avatarError && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {avatarError}
            </p>
          )}
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-4">
        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
        />
        <div className="flex justify-end">
          <Button onClick={handleSaveName} disabled={saving || displayName === profile.display_name} size="sm">
            {saving ? 'Saving...' : 'Save Name'}
          </Button>
        </div>
      </div>

      {/* Email (read-only) */}
      <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border-default)' }}>
        <label className="block text-sm text-secondary font-body mb-1.5">Email</label>
        <input
          type="email"
          value={user.email ?? ''}
          readOnly
          className="input-field opacity-60 cursor-not-allowed"
        />
        <p className="text-xs text-muted mt-1.5">Email cannot be changed from here.</p>
      </div>

      {/* Account Status */}
      <div className="mt-6 pt-6 flex items-center gap-3" style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <div>
          <p className="text-sm text-primary font-body">Account Active</p>
          <p className="text-xs text-muted">Your account is in good standing</p>
        </div>
      </div>
    </GlassCard>
  );
}

/* ===== Appearance Section ===== */

function AppearanceSection() {
  const { theme, toggleTheme } = useTheme();

  return (
    <GlassCard hover={false} className="p-6 md:p-8">
      <div className="flex items-center gap-2.5 mb-6">
        <Palette className="w-5 h-5 text-brand-primary" />
        <h2 className="font-display text-xl text-primary">Appearance</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => { if (theme !== 'light') toggleTheme(); }}
          className={`p-5 rounded-2xl border-2 transition-all text-left ${theme === 'light' ? 'border-brand-primary' : 'border-transparent'
            }`}
          style={{ background: 'var(--btn-secondary)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="font-body text-sm text-primary">Light</span>
            {theme === 'light' && <Check className="w-4 h-4 text-brand-primary ml-auto" />}
          </div>
          <div className="h-16 rounded-xl overflow-hidden flex">
            <div className="flex-1 bg-white" />
            <div className="w-12 bg-gray-100 border-l border-gray-200" />
          </div>
        </button>

        <button
          onClick={() => { if (theme !== 'dark') toggleTheme(); }}
          className={`p-5 rounded-2xl border-2 transition-all text-left ${theme === 'dark' ? 'border-brand-primary' : 'border-transparent'
            }`}
          style={{ background: 'var(--btn-secondary)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Moon className="w-5 h-5 text-blue-400" />
            <span className="font-body text-sm text-primary">Dark</span>
            {theme === 'dark' && <Check className="w-4 h-4 text-brand-primary ml-auto" />}
          </div>
          <div className="h-16 rounded-xl overflow-hidden flex">
            <div className="flex-1 bg-gray-900" />
            <div className="w-12 bg-gray-800 border-l border-gray-700" />
          </div>
        </button>
      </div>
    </GlassCard>
  );
}

/* ===== Account Actions Section — Logout only ===== */

function AccountActionsSection({ signOut }: { signOut: () => Promise<void> }) {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLogout = async () => {
    await signOut();
    showToast('Signed out successfully', 'success');
    navigate('/');
  };

  return (
    <GlassCard hover={false} className="p-6 md:p-8">
      <div className="flex items-center gap-2.5 mb-6">
        <h2 className="font-display text-xl text-primary">Account Actions</h2>
      </div>

      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:bg-brand-accent/5 text-secondary hover:text-primary"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-body text-sm">Logout</span>
      </button>
    </GlassCard>
  );
}
