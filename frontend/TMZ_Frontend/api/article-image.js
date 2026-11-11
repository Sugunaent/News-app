import { fetchArticle, getArticleImage, getArticleSlug, getBackendBaseUrl } from './_article-share.js';

export default async function articleImageHandler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
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

  response
    .status(302)
    .setHeader('Location', image.url)
    .setHeader('Cache-Control', 'no-store')
    .end();
}
