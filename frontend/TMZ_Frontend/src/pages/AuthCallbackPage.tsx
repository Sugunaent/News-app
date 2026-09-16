import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { TMSLogo } from '@/components/brand/TMSLogo';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    async function handleAuthCallback() {
      try {
        // Check for error parameters in the URL query string or hash
        const queryParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
          window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash
        );

        const errorDesc =
          queryParams.get('error_description') ||
          hashParams.get('error_description') ||
          queryParams.get('error') ||
          hashParams.get('error');

        if (errorDesc) {
          throw new Error(errorDesc);
        }

        if (!isSupabaseConfigured() || !supabase) {
          throw new Error('Supabase client is not configured.');
        }

        // Handle PKCE auth code exchange if present
        const code = queryParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('[AuthCallback] exchangeCodeForSession warning/error:', exchangeError.message);
          }
        }

        // Confirm active session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          // Sync profile state
          try {
            await refreshProfile();
          } catch (profileErr) {
            console.warn('[AuthCallback] Profile refresh warning:', profileErr);
          }

          showToast('Welcome! Successfully signed in.', 'success');

          // Retrieve and clear stored redirect destination
          let destination = '/';
          try {
            const savedRedirect = localStorage.getItem('tms_auth_redirect');
            if (savedRedirect && savedRedirect.startsWith('/')) {
              destination = savedRedirect;
              localStorage.removeItem('tms_auth_redirect');
            }
          } catch {
            /* ignore storage errors */
          }

          navigate(destination, { replace: true });
          return;
        }

        // If session is not immediately returned, wait briefly for onAuthStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
          if (currentSession?.user) {
            subscription.unsubscribe();
            try {
              await refreshProfile();
            } catch {
              /* ignore */
            }
            showToast('Welcome! Successfully signed in.', 'success');
            let destination = '/';
            try {
              const savedRedirect = localStorage.getItem('tms_auth_redirect');
              if (savedRedirect && savedRedirect.startsWith('/')) {
                destination = savedRedirect;
                localStorage.removeItem('tms_auth_redirect');
              }
            } catch {
              /* ignore */
            }
            navigate(destination, { replace: true });
          }
        });

        // Timeout fallback if no session is detected within 6 seconds
        setTimeout(() => {
          subscription.unsubscribe();
          setErrorMessage('Authentication timed out or no active session was found.');
        }, 6000);

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Authentication callback failed.';
        console.error('[AuthCallback] Error:', err);
        setErrorMessage(message);
        showToast(message, 'error');
      }
    }

    handleAuthCallback();
  }, [navigate, refreshProfile, showToast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md glass-card p-8 md:p-10 flex flex-col items-center text-center animate-fade-in shadow-2xl border border-white/10 rounded-2xl">
        <div className="mb-6">
          <TMSLogo size="lg" />
        </div>

        {errorMessage ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-primary">Authentication Failed</h2>
            <p className="text-sm text-muted max-w-xs">{errorMessage}</p>
            <button
              onClick={() => navigate('/auth', { replace: true })}
              className="mt-4 px-6 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-medium hover:opacity-90 transition-all shadow-md"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            <h2 className="text-lg font-semibold text-primary">Completing Sign In...</h2>
            <p className="text-sm text-muted">Please wait while we verify your credentials and prepare your workspace.</p>
          </div>
        )}
      </div>
    </div>
  );
}
