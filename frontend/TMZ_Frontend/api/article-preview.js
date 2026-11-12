import {
  escapeArticleHtml,
  fetchArticle,
  getArticleDescription,
  getArticleImage,
  getArticleSlug,
  getArticleTitle,
  getArticleUrl,
  getBackendBaseUrl,
} from './_article-share.js';

export default async function articlePreviewHandler(request, response) {
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
    response.status(503).send('Article preview service is not configured');
    return;
  }

  let upstream;
  try {
    upstream = await fetchArticle(slug, backendUrl);
  } catch (error) {
    console.error('[article-preview] Article lookup failed:', error);
    response.status(503).send('Article preview service is temporarily unavailable');
    return;
  }

  if (!upstream.ok) {
    response.status(upstream.status === 404 ? 404 : 503)
      .send(upstream.status === 404 ? 'Article not found' : 'Article preview service is temporarily unavailable');
    return;
  }

  let article;
  try {
    article = await upstream.json();
  } catch (error) {
    console.error('[article-preview] Article response was not valid JSON:', error);
    response.status(502).send('Article preview service returned an invalid response');
    return;
  }

  const articleUrl = getArticleUrl(request, slug);
  const image = getArticleImage(article, backendUrl);
  const imageUrl = image
    ? new URL(`/api/article-image?slug=${encodeURIComponent(slug)}`, articleUrl).toString()
    : 'https://www.themodernstories.in/modern_stories_hero.jpg';
  const title = escapeArticleHtml(getArticleTitle(article));
  const description = escapeArticleHtml(getArticleDescription(article));
  const publishedAt = typeof article.published_at === 'string'
    && !Number.isNaN(Date.parse(article.published_at))
    ? new Date(article.published_at).toISOString()
    : '';
  const updatedAt = typeof article.updated_at === 'string'
    && !Number.isNaN(Date.parse(article.updated_at))
    ? new Date(article.updated_at).toISOString()
    : publishedAt;
  const rawAuthorName = typeof article.author_name === 'string'
    ? article.author_name.trim().slice(0, 120)
    : '';
  const authorName = escapeArticleHtml(rawAuthorName);
  const textBlocks = Array.isArray(article.blocks)
    ? article.blocks.filter((block) => block?.type === 'TEXT' && typeof block.text === 'string')
    : [];
  const articleText = textBlocks.map((block) => block.text.trim()).filter(Boolean);
  const contentHtml = articleText.map((text) => text
    .split(/\n{2,}/)
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
      return heading
        ? `<h2>${escapeArticleHtml(heading[1])}</h2>`
        : `<p>${escapeArticleHtml(trimmed).replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n'))
    .join('\n');
  const faqItems = articleText.join('\n').matchAll(
    /(?:^|\n)\s*(?:Q|Question):\s*(.+?)\s*\n\s*(?:A|Answer):\s*(.+?)(?=\n\s*(?:Q|Question):|$)/gims,
  );
  const faq = [...faqItems]
    .map((match) => ({
      question: match[1].replace(/\s+/g, ' ').trim(),
      answer: match[2].replace(/\s+/g, ' ').trim(),
    }))
    .filter((item) => item.question && item.answer);
  const organizationSchema = {
    '@type': 'NewsMediaOrganization',
    '@id': 'https://themodernstories.in/#organization',
    name: 'The Modern Stories',
    url: 'https://themodernstories.in/',
    alternateName: 'TMS',
    knowsAbout: [
      'Mindfulness',
      'Health and Wellness',
      'Artificial Intelligence',
      'Cybersecurity',
      'Modern Literature',
      'Personal Growth',
    ],
  };
  const siteOrganizationSchema = {
    '@context': 'https://schema.org',
    ...organizationSchema,
  };
  const categoryName = typeof article.category?.name === 'string'
    ? article.category.name.trim().slice(0, 120)
    : '';
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    '@id': `${articleUrl}#article`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    headline: getArticleTitle(article),
    description: getArticleDescription(article),
    image: [imageUrl],
    ...(publishedAt ? { datePublished: publishedAt } : {}),
    ...(updatedAt ? { dateModified: updatedAt } : {}),
    author: rawAuthorName
      ? { '@type': 'Person', name: rawAuthorName }
      : organizationSchema,
    publisher: { '@id': organizationSchema['@id'] },
    ...(categoryName ? {
      articleSection: categoryName,
      about: { '@type': 'Thing', name: categoryName },
    } : {}),
    inLanguage: 'en',
  };
  const jsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c');
  const structuredData = `
  <script type="application/ld+json">${jsonLd(siteOrganizationSchema)}</script>
  <script type="application/ld+json">${jsonLd(articleSchema)}</script>
  ${faq.length ? `<script type="application/ld+json">${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  })}</script>` : ''}`;
  const escapedArticleUrl = escapeArticleHtml(articleUrl);
  const escapedImageUrl = escapeArticleHtml(imageUrl);
  const imageMetadata = `
  <meta property="og:image" content="${escapedImageUrl}">
  <meta property="og:image:secure_url" content="${escapedImageUrl}">
  ${image?.mimeType ? `<meta property="og:image:type" content="${escapeArticleHtml(image.mimeType)}">` : '<meta property="og:image:type" content="image/jpeg">'}
  <meta property="og:image:alt" content="${title}">`;

  const body = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="classification" content="News, Media, Health &amp; Wellness, Technology, Lifestyle">
  <meta name="category" content="Digital Publishing &amp; Storytelling">
  <meta name="rating" content="General">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${escapedArticleUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="The Modern Stories">
  <meta property="og:url" content="${escapedArticleUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:locale" content="en_US">
  ${imageMetadata}
  ${publishedAt ? `<meta property="article:published_time" content="${escapeArticleHtml(publishedAt)}">` : ''}
  ${updatedAt ? `<meta property="article:modified_time" content="${escapeArticleHtml(updatedAt)}">` : ''}
  ${authorName ? `<meta property="article:author" content="${authorName}">` : ''}
  ${article.category?.name ? `<meta property="article:section" content="${escapeArticleHtml(String(article.category.name).slice(0, 120))}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${escapedImageUrl}">
  ${structuredData}
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${description}</p>
    <article>${contentHtml}</article>
    <a href="${escapedArticleUrl}">Read this story on The Modern Stories</a>
  </main>
</body>
</html>`;

  response
    .status(200)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    .setHeader('Vary', 'User-Agent')
    .send(request.method === 'HEAD' ? '' : body);
}
