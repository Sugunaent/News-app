const SITE_URL = 'https://themodernstories.in';
const PUBLIC_PATHS = ['/', '/about', '/latest', '/authors-picks', '/privacy', '/compliance', '/legal'];
const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

function sendFallbackSitemap(response) {
  const urls = PUBLIC_PATHS.map((path) => `  <url><loc>${new URL(path, SITE_URL)}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${SITEMAP_NS}">\n${urls}\n</urlset>`;
  response
    .status(200)
    .setHeader('Content-Type', 'application/xml; charset=utf-8')
    .setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate')
    .send(body);
}

export default async function sitemapHandler(_request, response) {
  const backendUrl = process.env.SITEMAP_API_BASE_URL || process.env.VITE_API_BASE_URL;
  if (!backendUrl) {
    sendFallbackSitemap(response);
    return;
  }

  try {
    const upstream = await fetch(`${backendUrl.replace(/\/$/, '')}/sitemap.xml`, {
      headers: { Accept: 'application/xml' },
    });
    const body = await upstream.text();
    if (!upstream.ok || !body.includes(`<urlset xmlns="${SITEMAP_NS}">`)) {
      sendFallbackSitemap(response);
      return;
    }
    response
      .status(200)
      .setHeader('Content-Type', upstream.headers.get('content-type') || 'application/xml; charset=utf-8')
      .setHeader('Cache-Control', upstream.headers.get('cache-control') || 'no-cache, max-age=0, must-revalidate')
      .send(body);
  } catch {
    sendFallbackSitemap(response);
  }
}
