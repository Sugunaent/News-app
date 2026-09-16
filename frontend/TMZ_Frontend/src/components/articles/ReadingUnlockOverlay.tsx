import { Lock, CheckCircle2, Sparkles } from 'lucide-react';

interface ReadingUnlockOverlayProps {
  remainingPct: number;
  completedPct: number;
  bonusXp?: number;
  bounds?: { left: number; width: number } | null;
}

export function ReadingUnlockOverlay({
  remainingPct,
  completedPct,
  bonusXp = 0,
  bounds,
}: ReadingUnlockOverlayProps) {
  const isComplete = completedPct >= 100;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (circumference * Math.min(100, completedPct)) / 100;

  // Compute container position strictly locked to reading container bounds
  const hasBounds = Boolean(bounds && bounds.width > 0);
  const containerStyle: React.CSSProperties = hasBounds
    ? {
        position: 'fixed',
        bottom: 0,
        left: `${bounds!.left}px`,
        width: `${bounds!.width}px`,
        maxWidth: '100vw',
        zIndex: 50,
      }
    : {
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '56rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        zIndex: 50,
      };

  return (
    <div
      className="pointer-events-none flex justify-center items-end"
      style={containerStyle}
      role="status"
      aria-label={`Reading progress: ${completedPct}%`}
    >
      {/* Taller Rectangular Frosted Glass Dock with extended height and feather mask */}
      <div
        className="relative w-full rounded-t-3xl px-5 sm:px-8 md:px-12 pt-20 sm:pt-24 pb-5 sm:pb-6 flex flex-col items-center justify-end pointer-events-auto transition-all duration-300 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, var(--bg-glass) 35%, var(--bg-card) 75%, var(--bg-card) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.5) 18%, black 40%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.5) 18%, black 40%, black 100%)',
          boxShadow: '0 -16px 40px -8px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Soft, feathered ambient glow line blending into background */}
        <div
          className="absolute top-0 left-0 right-0 h-20 pointer-events-none opacity-25"
          style={{
            background: isComplete
              ? 'radial-gradient(ellipse at 50% 0%, var(--brand-secondary) 0%, transparent 75%)'
              : 'radial-gradient(ellipse at 50% 0%, var(--brand-primary) 0%, transparent 75%)',
          }}
        />

        {/* Content Centered inside the glassmorphism overlay */}
        <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center justify-center gap-3">
          {/* Top Row: Circular Ring + Centered Text Information + Reward Badge */}
          <div className="w-full flex items-center justify-between gap-3 sm:gap-5">
            {/* Circular Progress Ring */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
              <svg className="w-10 h-10 sm:w-11 sm:h-11 -rotate-90" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  stroke="var(--border-default)"
                  strokeWidth="3.5"
                  opacity="0.6"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  stroke={isComplete ? 'var(--brand-secondary)' : 'var(--brand-primary)'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-brand-secondary" />
                ) : (
                  <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-primary" />
                )}
              </div>
            </div>

            {/* Reading Status Text - Fully Centered */}
            <div className="flex-1 min-w-0 flex flex-col items-center justify-center text-center px-2">
              <div className="flex items-center justify-center gap-2 flex-wrap text-center">
                <span className="text-primary font-bold text-sm sm:text-base tracking-tight whitespace-nowrap">
                  {isComplete ? 'Story Completed' : `${completedPct}% Read`}
                </span>
                <span className="text-muted text-xs whitespace-nowrap">
                  {isComplete ? '• Reached Comments' : `• ${remainingPct}% left`}
                </span>
              </div>
              <p className="text-xs text-muted line-clamp-1 mt-0.5 text-center">
                {isComplete
                  ? 'Keep scrolling comments to claim shareable card'
                  : 'Scroll down as you read to unlock completion card'}
              </p>
            </div>

            {/* Reward Badge */}
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-primary/15 text-brand-primary border border-brand-primary/25 shadow-sm whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5" />
              <span>+{30 + bonusXp} XP</span>
            </div>
          </div>

          {/* Progress Bar along bottom of info */}
          <div
            className="w-full h-1.5 sm:h-2 rounded-full overflow-hidden shadow-inner"
            style={{ background: 'var(--border-default)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, completedPct)}%`,
                background: isComplete
                  ? 'var(--brand-secondary)'
                  : 'linear-gradient(90deg, var(--brand-primary), var(--brand-secondary))',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
