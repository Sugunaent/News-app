export default async function sitemapHandler(_request, response) {
  const backendUrl = process.env.SITEMAP_API_BASE_URL || process.env.VITE_API_BASE_URL;
  if (!backendUrl) {
    response.status(503).setHeader('Cache-Control', 'no-store').send('Sitemap source is not configured');
    return;
  }

  try {
    const upstream = await fetch(`${backendUrl.replace(/\/$/, '')}/sitemap.xml`, {
      headers: { Accept: 'application/xml' },
    });
    const body = await upstream.text();
    response
      .status(upstream.status)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/xml; charset=utf-8')
      .setHeader('Cache-Control', upstream.headers.get('cache-control') || 'public, max-age=300, stale-while-revalidate=3600')
      .send(body);
  } catch {
    response.status(503).setHeader('Cache-Control', 'no-store').send('Sitemap source is temporarily unavailable');
  }
}
