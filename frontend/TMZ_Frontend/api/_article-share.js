const SITE_URL = 'https://themodernstories.in';

export function getArticleSlug(request) {
  const rawSlug = request.query?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  return typeof slug === 'string' && slug.length > 0 && slug.length <= 200 && !slug.includes('/')
    ? slug
    : '';
}

export function getBackendBaseUrl() {
  const value = process.env.SITEMAP_API_BASE_URL || process.env.VITE_API_BASE_URL;
  if (!value) return '';

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      return '';
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export async function fetchArticle(slug, backendUrl) {
  return fetch(
    `${backendUrl}/api/v1/articles/${encodeURIComponent(slug)}?lang=en`,
    { headers: { Accept: 'application/json' } },
  );
}

export function getArticleImage(article, backendUrl) {
  const cover = article?.cover;
  const imageBlock = Array.isArray(article?.blocks)
    ? article.blocks.find((block) => block?.type === 'IMAGE')
    : null;
  const media = imageBlock?.media;
  const rawUrl = article?.cover_image_url
    || cover?.signed_url
    || cover?.url
    || media?.signed_url
    || media?.url
    || imageBlock?.external_url
    || '';
  if (typeof rawUrl !== 'string' || !rawUrl || rawUrl.length > 4096) return null;

  try {
    const url = new URL(rawUrl, `${backendUrl}/`);
    const hostname = url.hostname.toLowerCase();
    const allowedHost = hostname === 'themodernstories.in'
      || hostname.endsWith('.themodernstories.in')
      || hostname.endsWith('.supabase.co')
      || hostname === 'images.pexels.com'
      || hostname === 'images.unsplash.com';
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowedHost) return null;

    return {
      url: url.toString(),
      mimeType: getImageMimeType({ ...article, cover: cover || media }, url),
    };
  } catch {
    return null;
  }
}

function getImageMimeType(article, imageUrl) {
  const declaredType = article?.cover?.mime_type;
  if (typeof declaredType === 'string' && /^image\/[a-z0-9.+-]+$/i.test(declaredType)) {
    return declaredType.toLowerCase();
  }

  const extension = imageUrl.pathname.split('.').pop()?.toLowerCase();
  const knownTypes = {
    avif: 'image/avif',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return knownTypes[extension || ''] || '';
}

export function getArticleUrl(request, slug) {
  const forwardedHost = request.headers?.['x-forwarded-host'];
  const requestHost = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || request.headers?.host;
  const host = typeof requestHost === 'string' ? requestHost.split(',')[0].trim().toLowerCase() : '';
  const origin = host === 'themodernstories.in' || host === 'www.themodernstories.in'
    ? `https://${host}`
    : SITE_URL;

  return new URL(`/article/${encodeURIComponent(slug)}`, origin).toString();
}

export function escapeArticleHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function getArticleTitle(article) {
  return typeof article?.title === 'string' && article.title.trim()
    ? article.title.trim().slice(0, 180)
    : 'The Modern Stories';
}

export function getArticleDescription(article) {
  const description = [article?.summary, article?.subtitle]
    .find((value) => typeof value === 'string' && value.trim());
  return description
    ? description.trim().slice(0, 300)
    : `Read “${getArticleTitle(article)}” on The Modern Stories.`;
}
