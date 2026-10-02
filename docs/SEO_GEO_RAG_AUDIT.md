# SEO / AEO / GEO / RAG and Crawlability Audit

**Audit date:** 2026-09-29
**Scope:** repository source and deployment configuration only; no production crawl, Supabase query-plan access, or external Search Console data was available.

## Executive result

| Area | Result | Notes |
|---|---|---|
| Robots policy | Implemented | Public crawl allowed, including OAI-SearchBot; private app paths are disallowed. |
| XML sitemap | Implemented with a content-access gate | Static/public pages and active categories with published stories are listed. Article URLs are omitted by default because article bodies currently require login. |
| Canonicals | Implemented in SPA head management | Uses `SITE_URL` / `VITE_SITE_URL`, defaulting to the configured `.in` domain. Client-rendered deep-route metadata is not present in the initial HTML response. |
| Legacy article ID redirect | Server redirect implemented for Docker/Nginx and Vercel | Backend returns 301 to the published slug; deployment behavior still needs a live HTTP check. |
| 404 / soft 404 | Partial | React displays a not-found page and sets `noindex`, but Nginx and Vercel both use SPA fallbacks that respond with HTTP 200 for unknown paths. A true server 404 remains necessary. |
| Article crawlability | **Blocked (P0)** | The frontend redirects anonymous visitors to `/auth`; the detail API requires authentication. Googlebot/OAI-SearchBot cannot receive article body HTML from this SPA. |
| Heading/internal linking | Improved | Home hero now has a visible H1; category/article/about pages have semantic headings and visible breadcrumbs. Services, projects, and locations are not represented in this project. |
| AEO / FAQ | Partial | About-page FAQs are visible and share their exact copy with FAQPage JSON-LD. Article summary/key-takeaways are visible, but not every article has a substantive summary or FAQ. |
| GEO / entity data | Partial | Organization, WebSite, WebPage, BreadcrumbList, NewsArticle, and FAQPage markup are wired. Business location and other facts absent from the site were not invented. Verify supplied social profile URLs before treating them as official `sameAs` entities. |
| Image SEO | Partial | Existing article/team images use captions, titles, or names as alt text; hero uses eager/high-priority loading and fixed aspect sizing. Source assets are JPG/PNG; WebP/AVIF, responsive `srcset`, and CDN compression were not verified or implemented. |
| Performance | Improved, still partial | Route-level lazy chunks reduce initial JS; homepage discovery aggregates category articles; API responses expose `Server-Timing`. Live TTFB, DB timing, payload size, error rate, and index plans were not measurable without production access. |

## Implemented code changes

- `frontend/TMZ_Frontend/public/robots.txt` permits general and OAI search crawling while disallowing account/admin paths.
- `backend/app/routers/seo.py` serves a cacheable `/sitemap.xml`. It lists public static pages and active categories only when they contain published stories. Article URLs are deliberately gated behind `SITEMAP_ARTICLES_INDEXABLE=true`; do **not** enable that flag until anonymous crawlers can access substantive article content.
- `frontend/TMZ_Frontend/nginx.conf` serves robots.txt directly, proxies the dynamic sitemap, and routes legacy UUID article URLs to the backend 301 resolver.
- Vercel uses serverless proxies for the sitemap and legacy article redirect. Configure `SITEMAP_API_BASE_URL` or `VITE_API_BASE_URL` in the Vercel project with the backend origin.
- Route metadata uses the canonical site origin and marks private/not-found pages `noindex, nofollow`. Article/category metadata, WebPage/NewsArticle markup, FAQ markup, and breadcrumb markup are generated from visible page data.
- Homepage discovery groups category items after one published-teaser query rather than querying once per category. Responses now include `Server-Timing` and `X-Response-Time-ms` for live measurements.
- Page routes are lazy-loaded to reduce the initial JavaScript entry chunk.
- Footer social links no longer point to `#`; primary footer destinations and category URLs are crawlable anchors.
- Promotion authoring now selects an uploaded media asset ID, as required by the backend, and validates essential fields and HTTP(S) destination URLs.
- Dashboard article metrics now use real total/published/draft/pending-review counts instead of confusing top-list length and completions with article totals.
- Opinion blocks created without an explicit order receive the next per-article order, preventing duplicate-order failures when an article contains multiple polls.

## Verified blockers and follow-up decisions

1. **Public article access:** `backend/app/routers/articles.py` currently requires `get_current_user` for full article detail, and `frontend/TMZ_Frontend/src/pages/ArticlePage.tsx` redirects guests to sign-in. A Supabase migration also explicitly documents authenticated-only article bodies. This is the primary crawl/indexability blocker. Decide whether published article text may be publicly readable; if not, keep article URLs out of the sitemap and accept that they cannot be indexed as full articles.
2. **Server rendering:** the frontend uses `createRoot` and static Nginx/Vercel SPA rewrites. Route-specific metadata is applied after JavaScript runs. Search and social crawlers that do not execute client JavaScript will initially receive the generic index document, not the article's title/body/JSON-LD. SSR or route prerendering backed by a public content source is required for reliable article previews and retrieval.
3. **True not-found status:** client-side `noindex` does not change the initial HTTP 200 from SPA fallback. Add a server route/SSR/edge resolver that returns 404 for unknown paths.
4. **Canonical host enforcement:** the source configuration indicates `www.themodernstories.in`; `SITE_URL` / `VITE_SITE_URL` should be set explicitly in each deployment. Verify apex-to-www and HTTP-to-HTTPS redirect behavior at the deployed edge.
5. **CMS metadata model:** the editor/database currently does not persist a complete SEO/RAG record (SEO title/description, tags/topics, related content, explicit updated date, canonical override). Current article metadata derives from title, summary/subtitle, category, author, and article blocks.
6. **Structured content:** article blocks support text, image, quiz, opinion, and podcast. FAQ/summary/key-takeaway/link/CTA are not first-class CMS block types; FAQ is currently maintained on About only. Avoid declaring FAQ or service schema unless corresponding visible content exists.
7. **Business entity facts:** location/service areas, pricing, services, project portfolio, and verified social profiles are not established in the codebase. Add only after the owner supplies verified facts.
8. **Live performance/security checks:** measure deployed `/api/v1/articles`, `/api/v1/home/discovery`, promotions, media, search, and dashboard endpoint latency/payloads and run Supabase `EXPLAIN (ANALYZE, BUFFERS)` against production-like data. The selected Python environment lacks `pytest`, so the new backend route tests were syntax/diagnostic checked but not executed in this environment.

## Validation performed

- Frontend `npm run typecheck`, `npm run build`, and focused ESLint on changed UI files passed. Route-level chunks reduced the main JS bundle below Vite's 500 kB warning threshold.
- Parsed JSON-LD from the built HTML with `JSON.parse`; WebSite and Organization nodes were present and valid.
- Parsed `vercel.json` as JSON and confirmed sitemap rewrite presence.
- Python syntax checks and editor diagnostics reported no errors in modified backend modules/tests. Backend pytest execution was unavailable because pytest is not installed in the selected system interpreter.
