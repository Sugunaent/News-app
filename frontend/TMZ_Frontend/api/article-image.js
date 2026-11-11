import {
  fetchArticle,
  getArticleImage,
  getArticleSlug,
  getBackendBaseUrl,
  isAllowedArticleImageUrl,
} from './_article-share.js';

export default async function articleImageHandler(request, response) {
  response
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    .setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD, OPTIONS');
    response.status(405).send('Method not allowed');
    return;
  }

  const slug = getArticleSlug(request);
  const backendUrl = getBackendBaseUrl();
  if (!slug) {
    response.status(400).send('A valid article slug is required');
    return;
  }
  if (!backendUrl) {
    response.status(503).send('Article image service is not configured');
    return;
  }

  let upstream;
  try {
    upstream = await fetchArticle(slug, backendUrl);
  } catch (error) {
    console.error('[article-image] Article lookup failed:', error);
    response.status(503).send('Article image service is temporarily unavailable');
    return;
  }

  if (!upstream.ok) {
    response.status(upstream.status === 404 ? 404 : 503)
      .send(upstream.status === 404 ? 'Article not found' : 'Article image service is temporarily unavailable');
    return;
  }

  let article;
  try {
    article = await upstream.json();
  } catch (error) {
    console.error('[article-image] Article response was not valid JSON:', error);
    response.status(502).send('Article image service returned an invalid response');
    return;
  }

  const image = getArticleImage(article, backendUrl);
  if (!image) {
    response.status(404).send('Article image not found');
    return;
  }

  let imageResponse;
  try {
    imageResponse = await fetch(image.url, {
      method: request.method,
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    console.error('[article-image] Cover image request failed:', error);
    response.status(502).send('Article image is temporarily unavailable');
    return;
  }

  const resolvedImageUrl = imageResponse.url || image.url;
  if (!isAllowedArticleImageUrl(resolvedImageUrl)) {
    response.status(502).send('Article image resolved to an unsupported host');
    return;
  }
  if (!imageResponse.ok) {
    response.status(502).send('Article image could not be retrieved');
    return;
  }

  const contentType = imageResponse.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
    || image.mimeType;
  const allowedImageTypes = new Set([
    'image/avif',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);
  if (!allowedImageTypes.has(contentType)) {
    response.status(415).send('Article image has an unsupported media type');
    return;
  }

  const maxImageBytes = 8 * 1024 * 1024;
  const declaredLength = Number(imageResponse.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxImageBytes) {
    response.status(413).send('Article image exceeds the maximum supported size');
    return;
  }

  let imageBuffer;
  if (request.method === 'HEAD') {
    imageBuffer = null;
  } else {
    try {
      const reader = imageResponse.body?.getReader();
      if (!reader) {
        response.status(502).send('Article image response had no body');
        return;
      }
      const chunks = [];
      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxImageBytes) {
          await reader.cancel();
          response.status(413).send('Article image exceeds the maximum supported size');
          return;
        }
        chunks.push(Buffer.from(value));
      }
      imageBuffer = Buffer.concat(chunks, totalBytes);
    } catch (error) {
      console.error('[article-image] Cover image body could not be read:', error);
      response.status(502).send('Article image is temporarily unavailable');
      return;
    }
  }

  response
    .status(200)
    .setHeader('Content-Type', contentType)
    .setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600')
    .setHeader('Content-Length', imageBuffer?.byteLength ?? imageResponse.headers.get('content-length') ?? '0')
    .send(imageBuffer || '');
}
