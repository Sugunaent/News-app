import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Level } from '@/types';

interface LevelUpModalProps {
  level: Level;
  prevLevel: Level | null;
  currentXp: number;
  nextLevelXp: number | null;
  onClose: () => void;
}

export function LevelUpModal({ level, prevLevel, currentXp, nextLevelXp, onClose }: LevelUpModalProps) {
  const [phase, setPhase] = useState<'transition' | 'reveal'>('transition');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 800);
    const t2 = setTimeout(onClose, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  const prevPct = prevLevel ? 100 : 0;
  const newPct = nextLevelXp ? Math.min(100, (currentXp / nextLevelXp) * 100) : 100;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(12px)' }}
        onClick={onClose}
      />
      <div className="relative glass-card p-8 md:p-12 max-w-md w-full text-center animate-scale-in" style={{ background: 'var(--modal-bg)' }}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full glass flex items-center justify-center text-muted hover:text-primary transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {phase === 'transition' && prevLevel ? (
          <div className="py-8">
            <p className="text-sm text-muted mb-4">Level {prevLevel.level_number}</p>
            <div className="w-full max-w-xs mx-auto h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${prevPct}%`, background: 'linear-gradient(90deg, var(--brand-primary), var(--brand-accent))' }}
              />
            </div>
          </div>
        ) : (
          <div className="animate-level-celebrate">
            {/* Level image */}
            {level.image_url && (
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl overflow-hidden glow-primary">
                <img src={level.image_url} alt={level.name} className="w-full h-full object-cover" />
              </div>
            )}
            {!level.image_url && (
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-dark flex items-center justify-center glow-primary">
                <span className="font-display text-3xl text-white">{level.level_number}</span>
              </div>
            )}

            <p className="text-sm text-muted uppercase tracking-wider mb-2">Level Up!</p>
            <h2 className="font-display text-3xl text-primary mb-2">{level.name}</h2>
            <p className="text-sm text-secondary mb-8">Level {level.level_number}</p>

            {/* XP progress toward next level */}
            <div className="w-full max-w-xs mx-auto">
              <div className="flex justify-between text-xs text-muted mb-2">
                <span>{currentXp} XP</span>
                {nextLevelXp && <span>{nextLevelXp} XP</span>}
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${newPct}%`, background: 'linear-gradient(90deg, var(--brand-secondary), var(--brand-accent))' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
