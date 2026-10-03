import { ExternalImage } from '../ExternalImage';

export function ImageBlock({ imageUrl, caption }: { imageUrl: string | null; caption: string | null }) {
  if (!imageUrl) return null;
  return (
    <figure className="my-8">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-secondary">
        <ExternalImage
          src={imageUrl}
          alt={caption || ''}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>
      {caption && (
        <figcaption className="text-sm text-center mt-3" style={{ color: 'var(--article-muted)' }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
