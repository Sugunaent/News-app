export function ImageBlock({ imageUrl, caption }: { imageUrl: string | null; caption: string | null }) {
  if (!imageUrl) return null;
  return (
    <figure className="my-8">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-secondary">
        <img
          src={imageUrl}
          alt={caption || ''}
          className="absolute inset-0 h-full w-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => console.warn('Failed to load article image block', { src: imageUrl })}
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
