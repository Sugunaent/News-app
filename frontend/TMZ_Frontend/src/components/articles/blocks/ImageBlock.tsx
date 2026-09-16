export function ImageBlock({ imageUrl, caption }: { imageUrl: string | null; caption: string | null }) {
  if (!imageUrl) return null;
  return (
    <figure className="my-8">
      <div className="rounded-xl overflow-hidden">
        <img src={imageUrl} alt={caption || ''} className="w-full h-auto" loading="lazy" />
      </div>
      {caption && (
        <figcaption className="text-sm text-center mt-3" style={{ color: 'var(--article-muted)' }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
