import { useEffect, useState } from 'react';
import { fetchPublicAdvertisements } from '@/lib/api';

export function ConditionalAdSlot({ enabled = true, slot = 'ARTICLE_INLINE' }: { enabled?: boolean; slot?: string }) {
  const [advertisement, setAdvertisement] = useState<any | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchPublicAdvertisements(slot)
      .then((items) => {
        if (active) setAdvertisement(items[0] ?? null);
      })
      .catch(() => {
        if (active) setAdvertisement(null);
      });

    return () => {
      active = false;
    };
  }, [enabled, slot]);

  if (!enabled || !advertisement) return null;

  return (
    <a
      href={`/api/v1/advertisements/${advertisement.id}/click`}
      target="_blank"
      rel="noreferrer"
      className="glass-card p-4 my-6 flex items-center gap-4 min-h-[90px]"
    >
      {advertisement.image?.signed_url && (
        <img src={advertisement.image.signed_url} alt="" className="w-24 h-16 object-cover rounded-lg" loading="lazy" />
      )}
      <span className="text-sm text-primary">{advertisement.title}</span>
    </a>
  );
}
