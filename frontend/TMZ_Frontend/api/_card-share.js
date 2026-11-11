const SITE_URL = 'https://www.themodernstories.in';
const CARD_TYPES = new Set(['completion', 'opinion', 'quiz']);

function getText(params, key, fallback, maxLength) {
  const value = params.get(key)?.trim();
  return value ? value.slice(0, maxLength) : fallback;
}

function getSafeImageUrl(value) {
  if (!value || value.length > 2048) return '';

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const allowedHost = hostname === 'themodernstories.in'
      || hostname.endsWith('.themodernstories.in')
      || hostname.endsWith('.supabase.co')
      || hostname === 'images.pexels.com'
      || hostname === 'images.unsplash.com';

    if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowedHost) {
      return '';
    }

    return url.toString();
  } catch {
    return '';
  }
}

export function parseCardQuery(searchParams) {
  const rawXp = Number.parseInt(searchParams.get('xp') || '30', 10);
  const cardType = searchParams.get('type');

  return {
    username: getText(searchParams, 'u', 'A modern reader', 80),
    articleTitle: getText(searchParams, 'title', 'The Modern Stories', 180),
    articleId: getText(searchParams, 'id', '', 100),
    articleImageUrl: getSafeImageUrl(searchParams.get('image') || ''),
    xpGained: Number.isFinite(rawXp) ? Math.min(Math.max(rawXp, 0), 1000000) : 30,
    cardType: CARD_TYPES.has(cardType) ? cardType : 'completion',
    activityTitle: getText(searchParams, 'activity', '', 180),
    activityQuestion: getText(searchParams, 'question', '', 280),
    activityAnswer: getText(searchParams, 'answer', '', 280),
    opinionText: getText(searchParams, 'quote', '', 280),
    date: getText(searchParams, 'd', '', 32),
  };
}

export function buildCardParams(card) {
  const params = new URLSearchParams();
  params.set('u', card.username);
  params.set('title', card.articleTitle);
  if (card.articleId) params.set('id', card.articleId);
  if (card.articleImageUrl) params.set('image', card.articleImageUrl);
  params.set('xp', String(card.xpGained));
  params.set('type', card.cardType);
  if (card.activityTitle) params.set('activity', card.activityTitle);
  if (card.activityQuestion) params.set('question', card.activityQuestion);
  if (card.activityAnswer) params.set('answer', card.activityAnswer);
  if (card.opinionText) params.set('quote', card.opinionText);
  if (card.date) params.set('d', card.date);
  return params;
}

export function getCardPreviewMetadata(card) {
  const subject = card.cardType === 'opinion'
    ? `shared an opinion on “${card.articleTitle}”`
    : card.cardType === 'quiz'
      ? `answered “${card.activityTitle || 'a quiz'}” while reading “${card.articleTitle}”`
      : `completed reading “${card.articleTitle}”`;
  const detail = card.cardType === 'opinion'
    ? card.opinionText
    : card.cardType === 'quiz'
      ? card.activityAnswer
      : '';

  return {
    title: `${card.username} ${subject} | The Modern Stories`,
    description: [
      `${card.username} ${subject} on The Modern Stories.`,
      card.cardType === 'opinion' && card.activityTitle ? `Question: “${card.activityTitle}”.` : '',
      card.cardType === 'quiz' && card.activityQuestion ? `Question: “${card.activityQuestion}”.` : '',
      detail ? `“${detail}”` : '',
      `Earned +${card.xpGained} XP.`,
    ].filter(Boolean).join(' '),
  };
}

export function getCardUrls(card) {
  const query = buildCardParams(card).toString();
  const cardUrl = new URL(`/card?${query}`, SITE_URL);
  const imageUrl = new URL(`/api/card-image?${query}`, SITE_URL);
  return { cardUrl: cardUrl.toString(), imageUrl: imageUrl.toString() };
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}
