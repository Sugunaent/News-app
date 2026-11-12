const DEFAULT_CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

export default async function llmsHandler(request, response, resource) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    response.status(405).send('Method not allowed');
    return;
  }

  const backendUrl = process.env.SITEMAP_API_BASE_URL || process.env.VITE_API_BASE_URL;
  if (!backendUrl) {
    response.status(503).send('Published content index is not configured');
    return;
  }

  try {
    const upstream = await fetch(`${backendUrl.replace(/\/+$/, '')}/${resource}`, {
      headers: { Accept: 'text/markdown, text/plain' },
      signal: AbortSignal.timeout(10000),
    });
    const body = await upstream.text();
    response
      .status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'text/markdown; charset=utf-8')
      .setHeader('Cache-Control', upstream.headers.get('cache-control') || DEFAULT_CACHE_CONTROL)
      .send(request.method === 'HEAD' ? '' : body);
  } catch (error) {
    console.error(`[${resource}] Published content index request failed:`, error);
    response.status(503).send('Published content index is temporarily unavailable');
  }
}
