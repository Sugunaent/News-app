import React from 'react';

/**
 * Safely parses inline markdown syntax into React elements:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - <u>underline</u>
 * - ~~strikethrough~~
 * - `code`
 * - [label](url)
 */
function formatInlineText(text: string): React.ReactNode {
  // Regex tokenizing our supported inline elements
  const tokenRegex = /(<b>[\s\S]*?<\/b>|<strong>[\s\S]*?<\/strong>|<u>[\s\S]*?<\/u>|<i>[\s\S]*?<\/i>|<em>[\s\S]*?<\/em>|\*\*[\s\S]+?\*\*|__[\s\S]+?__|~~[\s\S]+?~~|\*[\s\S]+?\*|_[\s\S]+?_|`[^`]+`|\[[\s\S]+?\]\([^)]+\))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // <u>...</u> HTML underline tag
    if (part.startsWith('<u>') && part.endsWith('</u>')) {
      const inner = part.slice(3, -4);
      return (
        <span key={index} className="underline decoration-brand-primary/70 underline-offset-4 font-medium">
          {formatInlineText(inner)}
        </span>
      );
    }

    // <b> or <strong>
    if ((part.startsWith('<b>') && part.endsWith('</b>')) || (part.startsWith('<strong>') && part.endsWith('</strong>'))) {
      const inner = part.startsWith('<b>') ? part.slice(3, -4) : part.slice(8, -9);
      return <strong key={index} className="font-bold text-primary">{formatInlineText(inner)}</strong>;
    }

    // <i> or <em>
    if ((part.startsWith('<i>') && part.endsWith('</i>')) || (part.startsWith('<em>') && part.endsWith('</em>'))) {
      const inner = part.startsWith('<i>') ? part.slice(3, -4) : part.slice(4, -5);
      return <em key={index} className="italic text-secondary">{formatInlineText(inner)}</em>;
    }

    // **bold** or __bold__
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      const inner = part.slice(2, -2);
      return <strong key={index} className="font-bold text-primary">{formatInlineText(inner)}</strong>;
    }

    // ~~strikethrough~~
    if (part.startsWith('~~') && part.endsWith('~~')) {
      const inner = part.slice(2, -2);
      return <del key={index} className="line-through text-muted">{formatInlineText(inner)}</del>;
    }

    // *italic* or _italic_
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      const inner = part.slice(1, -1);
      return <em key={index} className="italic text-secondary">{formatInlineText(inner)}</em>;
    }

    // `code`
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-surface-secondary text-brand-primary font-mono text-xs border border-border">
          {inner}
        </code>
      );
    }

    // [label](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[([\s\S]+?)\]\(([^)]+)\)$/);
      if (match) {
        const [, label, url] = match;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary hover:text-brand-accent underline underline-offset-2 transition-colors font-medium"
          >
            {label}
          </a>
        );
      }
    }

    return part;
  });
}

export function TextBlock({ content }: { content: string | null }) {
  if (!content) return null;
  const lines = content.split('\n');

  return (
    <div className="reading-content space-y-4 text-secondary leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }

        // H2 Subheading
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={i}
              className="font-display text-2xl sm:text-3xl text-primary font-bold mt-8 mb-3 pt-2 tracking-tight"
            >
              {formatInlineText(trimmed.slice(3))}
            </h2>
          );
        }

        // H3 Subheading
        if (trimmed.startsWith('### ')) {
          return (
            <h3
              key={i}
              className="font-display text-xl sm:text-2xl text-primary font-semibold mt-6 mb-2 tracking-tight"
            >
              {formatInlineText(trimmed.slice(4))}
            </h3>
          );
        }

        // Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={i}
              className="border-l-4 border-brand-primary pl-4 py-1.5 my-4 italic text-primary/90 bg-brand-primary/5 rounded-r-lg"
            >
              {formatInlineText(trimmed.slice(2))}
            </blockquote>
          );
        }

        // Unordered list item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2 ml-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-2 shrink-0" />
              <span>{formatInlineText(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list item
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={i} className="flex items-start gap-2 ml-4">
              <span className="font-semibold text-brand-primary text-sm min-w-[1.25rem]">{numMatch[1]}.</span>
              <span>{formatInlineText(numMatch[2])}</span>
            </div>
          );
        }

        return (
          <p key={i} className="text-base md:text-[17px] leading-relaxed">
            {formatInlineText(line)}
          </p>
        );
      })}
    </div>
  );
}
