export const SITE_NAME = 'The Modern Stories';
export const SITE_URL = 'https://themodernstories.com';
export const DEFAULT_DESCRIPTION = "Discover The Modern Stories (TMS): India's leading AEO & GEO-powered digital platform for modern narratives, cyber articles, technology insights, personality growth, and inspiring contemporary literature. Empowering readers and stories.";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/modern_stories_hero.jpg`;
export const SITE_ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const SITE_WEBSITE_ID = `${SITE_URL}/#website`;

export const SITE_ENTITY_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': SITE_WEBSITE_ID,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      alternateName: 'TMS News',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${SITE_URL}/latest?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
      publisher: { '@id': SITE_ORGANIZATION_ID },
    },
    {
      '@type': 'Organization',
      '@id': SITE_ORGANIZATION_ID,
      name: SITE_NAME,
      alternateName: 'TMS News',
      url: `${SITE_URL}/`,
      sameAs: [
        'https://www.instagram.com/themodernstories_official/',
        'https://www.youtube.com/@THEMODERNSTORIES-c6n',
        'https://www.linkedin.com/company/the-modern-stories/',
      ],
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.svg`,
      },
      founder: { '@id': `${SITE_URL}/#founder` },
    },
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#founder`,
      name: 'Tolety Mohana Shyam',
      alternateName: ['Mohana Shyam T', 'Mohan Shyam T', 'Mohan Shyam'],
      jobTitle: 'Founder',
      worksFor: { '@id': SITE_ORGANIZATION_ID },
      knowsAbout: [
        'Digital storytelling',
        'Editorial journalism',
        'Contemporary literature',
        'Interactive articles',
      ],
    },
  ],
};

export interface PageMetadata {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  image?: string;
  imageAlt?: string;
  robots?: string;
  ogType?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  author?: string;
}

function upsertMeta(selector: string, identifyingAttribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(identifyingAttribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function canonicalUrl(path = window.location.pathname): string {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function setPageMetadata(metadata: PageMetadata): void {
  const canonical = canonicalUrl(metadata.canonicalPath ?? window.location.pathname);
  const title = metadata.title;
  const image = metadata.image || DEFAULT_SOCIAL_IMAGE;

  document.title = title;
  upsertMeta('meta[name="description"]', 'name', 'description', metadata.description);
  upsertMeta('meta[name="keywords"]', 'name', 'keywords', metadata.keywords || '');
  upsertMeta('meta[name="author"]', 'name', 'author', metadata.author || SITE_NAME);
  upsertMeta('meta[name="robots"]', 'name', 'robots', metadata.robots || 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
  upsertMeta('meta[property="og:type"]', 'property', 'og:type', metadata.ogType || 'website');
  upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', metadata.ogTitle || title);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', metadata.ogDescription || metadata.description);
  upsertMeta('meta[property="og:image"]', 'property', 'og:image', image);
  upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', metadata.imageAlt || 'The Modern Stories brand cover with contemporary editorial storytelling');
  upsertMeta('meta[property="og:locale"]', 'property', 'og:locale', 'en_US');

  upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  upsertMeta('meta[name="twitter:site"]', 'name', 'twitter:site', '@TheModernStories');
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', metadata.twitterTitle || metadata.ogTitle || title);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', metadata.twitterDescription || metadata.ogDescription || metadata.description);
  upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);

  let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = canonical;
}

export function upsertJsonLd(id: string, data: unknown): void {
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
}

export function removeJsonLd(id: string): void {
  document.getElementById(id)?.remove();
}
