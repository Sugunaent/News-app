import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      <p className="text-muted text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-brand-accent/20" />
      </div>
      <p className="text-muted text-sm">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
        <p className="text-red-500 text-2xl">!</p>
      </div>
      <p className="text-muted text-sm text-center max-w-md">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary text-sm">
          Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="skeleton h-48 w-full" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3.5 sm:mb-4">
      <h2 className="font-display text-2xl md:text-3xl text-primary">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="text-sm text-brand-primary hover:text-brand-accent transition-colors flex items-center gap-1 group"
        >
          {action}
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </button>
      )}
    </div>
  );
}

export function Modal({
  children,
  isOpen,
  onClose,
  maxWidth = 'max-w-xl',
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
      <div
        className="fixed inset-0 transition-opacity duration-300"
        style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative glass-card my-auto w-full ${maxWidth} max-h-[85vh] sm:max-h-[82vh] flex flex-col rounded-2xl animate-scale-in shadow-2xl overflow-hidden border`}
        style={{
          background: 'var(--modal-bg)',
          borderColor: 'var(--border-default)',
          boxShadow: 'var(--shadow-elevated)',
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-5 sm:p-6 md:p-7 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
