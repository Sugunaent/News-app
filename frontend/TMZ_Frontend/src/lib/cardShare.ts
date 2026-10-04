export interface PublicCardData {
  username: string;
  articleTitle: string;
  articleId?: string;
  xpGained: number;
  cardType: 'completion' | 'opinion';
  opinionText?: string;
  date?: string;
}

/**
 * Resolves a clean public base URL for sharing.
 * When exported to GitHub and hosted on a production or custom domain,
 * it uses VITE_SITE_URL, VITE_APP_URL, or the active custom origin.
 * Never outputs internal Google AI Studio or Cloud Run preview domains.
 */
export function getCleanPublicOrigin(): string {
  // 1. Explicitly configured environment variable (recommended for production exports)
  const envUrl =
    (import.meta.env.VITE_SITE_URL as string | undefined) ||
    (import.meta.env.VITE_APP_URL as string | undefined);

  if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Inspect current browser window origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    const hostname = window.location.hostname.toLowerCase();

    // Exclude Google AI Studio and sandbox container preview hosts
    const isSandboxHost =
      hostname.includes('aistudio.google.com') ||
      hostname.includes('googleusercontent.com') ||
      hostname.includes('run.app');

    if (!isSandboxHost && origin.startsWith('http')) {
      return origin.replace(/\/+$/, '');
    }
  }

  // 3. Fallback clean production domain for The Modern Stories
  return 'https://themodernstories.com';
}

/**
 * Builds query parameters for a card.
 */
export function buildCardQueryParams(card: PublicCardData): URLSearchParams {
  const params = new URLSearchParams();
  if (card.username) params.set('u', card.username);
  if (card.articleTitle) params.set('title', card.articleTitle);
  if (card.articleId) params.set('id', card.articleId);
  if (card.xpGained !== undefined) params.set('xp', card.xpGained.toString());
  if (card.cardType) params.set('type', card.cardType);
  if (card.opinionText) params.set('quote', card.opinionText);
  if (card.date) params.set('d', card.date);
  return params;
}

/**
 * Builds a relative route path for instant in-app navigation without reloading (e.g. /card?u=...).
 */
export function buildCardRelativePath(card: PublicCardData): string {
  const params = buildCardQueryParams(card);
  return `/card?${params.toString()}`;
}

/**
 * Builds a clean, public HTTPS shareable link for external sharing.
 * Guaranteed to never output Google AI Studio internal domains.
 */
export function buildCardShareUrl(card: PublicCardData): string {
  const base = getCleanPublicOrigin();
  const path = buildCardRelativePath(card);
  return `${base}${path}`;
}

/**
 * Parses card attributes from URL search parameters or encoded data.
 */
export function parseCardShareUrl(search: string): PublicCardData {
  const params = new URLSearchParams(search);

  // Fallback for compact base64 payload if used
  const encoded = params.get('data');
  if (encoded) {
    try {
      const decodedJson = decodeURIComponent(escape(atob(encoded)));
      const parsed = JSON.parse(decodedJson);
      return {
        username: parsed.username || 'A modern reader',
        articleTitle: parsed.articleTitle || 'The Modern Stories',
        articleId: parsed.articleId || '',
        xpGained: Number(parsed.xpGained) || 30,
        cardType: parsed.cardType === 'opinion' ? 'opinion' : 'completion',
        opinionText: parsed.opinionText || undefined,
        date: parsed.date || undefined,
      };
    } catch {
      // Fall through to query parameters
    }
  }

  const username = params.get('u')?.trim() || 'A modern reader';
  const articleTitle = params.get('title')?.trim() || 'The Modern Stories';
  const articleId = params.get('id')?.trim() || '';
  const parsedXp = parseInt(params.get('xp') || '30', 10);
  const xpGained = isNaN(parsedXp) ? 30 : parsedXp;
  const cardType = params.get('type') === 'opinion' ? 'opinion' : 'completion';
  const opinionText = params.get('quote')?.trim() || undefined;
  const date = params.get('d')?.trim() || undefined;

  return {
    username,
    articleTitle,
    articleId,
    xpGained,
    cardType,
    opinionText,
    date,
  };
}
