import { useEffect } from 'react';

interface InstagramEmbedProps {
  url: string;
}

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}

export function InstagramEmbed({ url }: InstagramEmbedProps) {
  useEffect(() => {
    const processEmbeds = () => window.instgrm?.Embeds?.process();

    if (window.instgrm?.Embeds) {
      processEmbeds();
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.instagram.com/embed.js"]',
    );
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener('load', processEmbeds, { once: true });
    return () => script?.removeEventListener('load', processEmbeds);
  }, [url]);

  return (
    <div className="my-6 flex min-h-[400px] w-full justify-center">
      <blockquote
        className="instagram-media w-full max-w-[540px] rounded-md border border-slate-200 dark:border-slate-800"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
      />
    </div>
  );
}

export default InstagramEmbed;
