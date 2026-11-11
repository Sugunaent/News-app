import { ImageResponse } from '@vercel/og';
import { getCardPreviewMetadata, parseCardQuery } from './_card-share.js';

export const config = { runtime: 'edge' };

export default function cardImageHandler(request: Request) {
  const url = new URL(request.url);
  const card = parseCardQuery(url.searchParams);
  const articleImageUrl = card.articleId
    ? new URL(`/api/article-image?slug=${encodeURIComponent(card.articleId)}`, url.origin).toString()
    : card.articleImageUrl;
  const metadata = getCardPreviewMetadata(card);
  const label = card.cardType === 'opinion'
    ? 'READER PERSPECTIVE'
    : card.cardType === 'quiz'
      ? 'QUIZ ANSWER'
      : 'READING MILESTONE';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 34,
          background: 'linear-gradient(135deg, #eaf8f1 0%, #e8f4fb 100%)',
          color: '#102a43',
          fontFamily: 'Noto Sans, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'stretch',
            gap: 30,
            padding: 34,
            borderRadius: 28,
            border: '2px solid rgba(0, 119, 182, 0.24)',
            background: '#ffffff',
          }}
        >
          {articleImageUrl && (
            <img
              src={articleImageUrl}
              alt=""
              width={360}
              height={562}
              style={{ width: 360, height: '100%', objectFit: 'cover', borderRadius: 18 }}
            />
          )}

          <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: '#0077b6' }}>
                THE MODERN STORIES
              </div>
              <div
                style={{
                  display: 'flex',
                  flexShrink: 0,
                  padding: '10px 18px',
                  borderRadius: 24,
                  background: '#eaf8f1',
                  color: '#087443',
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                +{card.xpGained} XP
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
              <div style={{ display: 'flex', color: '#0077b6', fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>
                {label}
              </div>
              <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, lineHeight: 1.15 }}>
                {card.username}
              </div>
              {card.activityTitle && (
                <div style={{ display: 'flex', fontSize: 22, lineHeight: 1.25, color: '#102a43', fontWeight: 700 }}>
                  {card.activityTitle}
                </div>
              )}
              {card.activityQuestion && (
                <div style={{ display: 'flex', fontSize: 19, lineHeight: 1.2, color: '#334e68', maxHeight: 56, overflow: 'hidden' }}>
                  {card.activityQuestion}
                </div>
              )}
              <div style={{ display: 'flex', fontSize: 26, lineHeight: 1.2, color: '#52606d', maxHeight: 96, overflow: 'hidden' }}>
                {card.articleTitle}
              </div>
              {(card.opinionText || card.activityAnswer) && (
                <div style={{ display: 'flex', fontSize: 19, lineHeight: 1.25, color: '#334e68', maxHeight: 72, overflow: 'hidden' }}>
                  “{card.opinionText || card.activityAnswer}”
                </div>
              )}
            </div>

            <div style={{ display: 'flex', fontSize: 17, color: '#52606d', lineHeight: 1.3 }}>
              {metadata.description}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
