export default async function articleRedirectHandler(request, response) {
  const backendUrl = process.env.SITEMAP_API_BASE_URL || process.env.VITE_API_BASE_URL;
  const articleId = String(request.query?.articleId || '');
  if (!backendUrl || !/^[0-9a-f-]{36}$/i.test(articleId)) {
    response.status(404).send('Article not found');
    return;
  }

  try {
    const upstream = await fetch(
      `${backendUrl.replace(/\/$/, '')}/api/v1/articles/redirect/${encodeURIComponent(articleId)}`,
      { redirect: 'manual' },
    );
    const destination = upstream.headers.get('location');
    if (upstream.status === 301 && destination) {
      response.status(301).setHeader('Location', destination).setHeader('Cache-Control', 'public, max-age=86400').end();
      return;
    }
    response.status(upstream.status).send(await upstream.text());
  } catch {
    response.status(503).send('Article redirect service is temporarily unavailable');
  }
}
