import type { VercelConfig } from '@vercel/config/v1';

declare const process: { env: { VERCEL_ENV?: string } };

const isPreview = process.env.VERCEL_ENV === 'preview';
const previewFeedbackSources = isPreview
  ? ' https://vercel.live wss://vercel.live'
  : '';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googletagservices.com https://*.doubleclick.net https://cdn.onesignal.com https://*.onesignal.com${isPreview ? ' https://vercel.live' : ''}`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.railway.app https://*.onrender.com https://*.vercel.app https://*.onesignal.com https://api.onesignal.com https://*.google.com https://*.googleapis.com https://*.googlesyndication.com https://*.doubleclick.net${previewFeedbackSources}`,
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://googleads.g.doubleclick.net https://*.doubleclick.net",
  "media-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  'upgrade-insecure-requests',
].join('; ');

export const config: VercelConfig = {
  rewrites: [
    {
      source: '/article/:articleId([0-9a-fA-F-]{36})',
      destination: '/api/article-redirect?articleId=:articleId',
    },
    {
      source: '/article/:slug',
      has: [
        {
          type: 'header',
          key: 'user-agent',
          value:
            '.*(WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterestbot|Redditbot|Googlebot|Google-Extended|bingbot|GPTBot|OAI-SearchBot|ChatGPT-User|PerplexityBot|ClaudeBot|Applebot-Extended|meta-externalagent|meta-externalfetcher).*',
        },
      ],
      destination: '/api/article-preview?slug=:slug',
    },
    { source: '/llms.txt', destination: '/api/llms.txt' },
    { source: '/llms-full.txt', destination: '/api/llms-full.txt' },
    { source: '/sitemap.xml', destination: '/api/sitemap.xml' },
    {
      source: '/card',
      has: [{ type: 'query', key: 'view', value: 'app' }],
      destination: '/index.html',
    },
    {
      source: '/card',
      has: [
        {
          type: 'header',
          key: 'user-agent',
          value:
            '.*(WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterestbot|Redditbot|Googlebot|bingbot|meta-externalagent|meta-externalfetcher).*',
        },
      ],
      destination: '/api/card-preview',
    },
    { source: '/(.*)', destination: '/index.html' },
  ],
  headers: [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
      ],
    },
  ],
};
