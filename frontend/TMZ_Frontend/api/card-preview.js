import {
  escapeHtml,
  getCardPreviewMetadata,
  getCardUrls,
  parseCardQuery,
} from './_card-share.js';

export default function cardPreviewHandler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    response.status(405).send('Method not allowed');
    return;
  }

  const requestUrl = new URL(request.url, 'https://themodernstories.in');
  const card = parseCardQuery(requestUrl.searchParams);
  const metadata = getCardPreviewMetadata(card);
  const { cardUrl, imageUrl } = getCardUrls(card);
  const appUrl = new URL(cardUrl);
  appUrl.searchParams.set('view', 'app');
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const escapedCardUrl = escapeHtml(cardUrl);
  const escapedImageUrl = escapeHtml(imageUrl);
  const body = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${escapedCardUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="The Modern Stories">
  <meta property="og:url" content="${escapedCardUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${escapedImageUrl}">
  <meta property="og:image:secure_url" content="${escapedImageUrl}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${title}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${escapedImageUrl}">
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${description}</p>
    <a href="${escapedCardUrl}">View this card on The Modern Stories</a>
  </main>
  <script>window.location.replace(${JSON.stringify(appUrl.toString())})</script>
</body>
</html>`;

  response
    .status(200)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    .setHeader('Vary', 'User-Agent')
    .send(request.method === 'HEAD' ? '' : body);
}
