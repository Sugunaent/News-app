import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ExternalImageProps {
  src: string | null | undefined;
  alt: string;
  className: string;
  fallbackSrc?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
}

export function ExternalImage({
  src,
  alt,
  className,
  fallbackSrc,
  loading = 'lazy',
  fetchPriority = 'auto',
}: ExternalImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = src?.trim() || '';
  const fallback = fallbackSrc?.trim() || '';
  const displaySource = failedSource === source && fallback && fallback !== source ? fallback : source;

  if (!source || failedSource === displaySource) {
    return (
      <span
        className={`flex items-center justify-center bg-surface-secondary text-muted ${className}`}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        <ImageOff className="h-7 w-7 opacity-60" aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      src={displaySource}
      alt={alt}
      className={className}
      loading={loading}
      ref={(image) => {
        if (image) image.setAttribute('fetchpriority', fetchPriority);
      }}
      decoding="async"
      onError={() => setFailedSource(displaySource)}
    />
  );
}