import { useEffect, useState } from 'react';
import { fetchPromotions, fetchPublicAdvertisements } from '@/lib/api';
import { buildApiUrl } from '@/lib/backendClient';

interface PublicAdvertisement {
  id: string;
  title: string;
  image_url?: string | null;
  image?: { signed_url?: string | null } | null;
}

interface PublicPromotion {
  title: string;
  description: string;
  image_url: string;
  external_url: string;
}

export function ConditionalAdSlot({ enabled = true, slot = 'ARTICLE_INLINE' }: { enabled?: boolean; slot?: string }) {
  const [advertisement, setAdvertisement] = useState<PublicAdvertisement | null>(null);
  const [fallbackPromotion, setFallbackPromotion] = useState<PublicPromotion | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const loadAdvertisement = async () => {
      setAdvertisement(null);
      setFallbackPromotion(null);
      try {
        const items = await fetchPublicAdvertisements(slot);
        if (items[0]) {
          if (active) setAdvertisement(items[0]);
          return;
        }
      } catch (error) {
        console.error(`[AdSlot] Failed to load advertisement for slot "${slot}":`, error);
      }

      try {
        const promotions = await fetchPromotions();
        if (active) setFallbackPromotion(promotions[0] ?? null);
      } catch (error) {
        console.error(`[AdSlot] Failed to load fallback promotion for slot "${slot}":`, error);
      }
    };

    void loadAdvertisement();

    return () => {
      active = false;
    };
  }, [enabled, slot]);

  if (!enabled || (!advertisement && !fallbackPromotion)) return null;

  if (!advertisement && fallbackPromotion) {
    return (
      <a
        href={fallbackPromotion.external_url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="glass-card p-4 my-6 flex items-center gap-4 min-h-[90px]"
      >
        {fallbackPromotion.image_url && (
          <img
            src={fallbackPromotion.image_url}
            alt=""
            aria-hidden="true"
            className="w-24 h-16 object-cover rounded-lg"
            loading="lazy"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
        )}
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-primary">{fallbackPromotion.title}</span>
          {fallbackPromotion.description && (
            <span className="mt-1 block line-clamp-2 text-xs text-secondary">{fallbackPromotion.description}</span>
          )}
        </span>
      </a>
    );
  }

  if (!advertisement) return null;

  return (
    <a
      href={buildApiUrl(`/api/v1/advertisements/${advertisement.id}/click`)}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="glass-card p-4 my-6 flex items-center gap-4 min-h-[90px]"
    >
      {(advertisement.image?.signed_url || advertisement.image_url) && (
        <img src={advertisement.image?.signed_url || advertisement.image_url || ''} alt={`${advertisement.title} advertisement`} className="w-24 h-16 object-cover rounded-lg" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
      )}
      <span className="text-sm text-primary">{advertisement.title}</span>
    </a>
  );
}
