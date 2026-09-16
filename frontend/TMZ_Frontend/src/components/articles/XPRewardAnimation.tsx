import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export function XPRewardAnimation({ xp, onComplete }: { xp: number; onComplete: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
      <div className="animate-xp-rise flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-6 py-4 rounded-2xl glass-card glow-primary">
          <Sparkles className="w-6 h-6 text-brand-secondary animate-glow-pulse" />
          <span className="font-display text-3xl text-brand-secondary">+{xp} XP</span>
        </div>
        <p className="text-sm text-secondary font-body">Article completed</p>
      </div>
    </div>
  );
}
