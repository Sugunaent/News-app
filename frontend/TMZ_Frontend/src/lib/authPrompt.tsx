import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/States';
import { AuthPromptContext, type LoginPromptReason, useAuthPrompt } from './authPromptContext';

const promptCopy: Record<LoginPromptReason, { title: string; message: string }> = {
  gamification: {
    title: 'Keep your reading progress',
    message: 'Sign in to save your 50 Reading Points & maintain your daily streak!',
  },
  bookmark: {
    title: 'Save this story',
    message: 'Sign in to bookmark stories and find them whenever you want.',
  },
  comment: {
    title: 'Join the conversation',
    message: 'Sign in to share your thoughts with the community.',
  },
  personalized: {
    title: 'Make it yours',
    message: 'Sign in to access your profile, settings, and personalized reading experience.',
  },
};

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<LoginPromptReason | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const copy = reason ? promptCopy[reason] : null;

  const goToSignIn = () => {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    setReason(null);
    navigate('/auth', { state: { redirect } });
  };

  return (
    <AuthPromptContext.Provider value={{ requestLogin: setReason }}>
      {children}
      <Modal isOpen={reason !== null} onClose={() => setReason(null)} maxWidth="max-w-md">
        {copy && (
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-primary">{copy.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">{copy.message}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={() => setReason(null)} className="btn-secondary">
                Maybe later
              </button>
              <button type="button" onClick={goToSignIn} className="btn-primary">
                Sign in
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AuthPromptContext.Provider>
  );
}

export function LoginRequiredNotice({ resource }: { resource: string }) {
  const { requestLogin } = useAuthPrompt();

  return (
    <div className="mx-auto flex min-h-[40vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-bold text-primary">Sign in to continue</h1>
      <p className="mt-3 text-sm text-secondary">Sign in to access your {resource}.</p>
      <button
        type="button"
        onClick={() => requestLogin('personalized')}
        className="btn-primary mt-6"
      >
        Sign in
      </button>
    </div>
  );
}
