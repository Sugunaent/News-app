import { useEffect, useState } from 'react';
import type { Badge } from '@/types';

export function BadgePopup({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500);
    }, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-8 right-8 z-[350] animate-slide-up">
      <div className="glass-card p-5 flex items-center gap-4 max-w-sm glow-accent">
        {badge.image_url ? (
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
            <img src={badge.image_url} alt={badge.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-secondary to-brand-accent flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">★</span>
          </div>
        )}
        <div>
          <p className="text-xs text-brand-secondary uppercase tracking-wider mb-1">Badge Earned</p>
          <h3 className="font-display text-base text-primary">{badge.name}</h3>
          <p className="text-xs text-muted">{badge.description}</p>
        </div>
      </div>
    </div>
  );
}
