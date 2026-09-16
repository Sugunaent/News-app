import React from 'react';
import {
  Heading2, Heading3, Bold, Italic, Underline, Strikethrough,
  Quote, List, ListOrdered, Link2, Code,
} from 'lucide-react';

interface TextFormattingBarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  content: string;
  onChange: (newContent: string) => void;
}

export function TextFormattingBar({
  textareaRef,
  content,
  onChange,
}: TextFormattingBarProps) {
  const insertFormatting = (type: 'h2' | 'h3' | 'bold' | 'italic' | 'underline' | 'strike' | 'quote' | 'bullet' | 'number' | 'link' | 'code') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selectedText = content.substring(start, end);
    let replacement = '';
    let cursorOffset = 0;

    switch (type) {
      case 'h2':
        if (selectedText) {
          replacement = `\n## ${selectedText}\n`;
          cursorOffset = replacement.length;
        } else {
          replacement = '\n## Subheading\n';
          cursorOffset = replacement.length - 1;
        }
        break;
      case 'h3':
        if (selectedText) {
          replacement = `\n### ${selectedText}\n`;
          cursorOffset = replacement.length;
        } else {
          replacement = '\n### Small Subheading\n';
          cursorOffset = replacement.length - 1;
        }
        break;
      case 'bold':
        if (selectedText) {
          replacement = `**${selectedText}**`;
          cursorOffset = replacement.length;
        } else {
          replacement = '**bold text**';
          cursorOffset = 11; // inside the asterisks
        }
        break;
      case 'italic':
        if (selectedText) {
          replacement = `*${selectedText}*`;
          cursorOffset = replacement.length;
        } else {
          replacement = '*italic text*';
          cursorOffset = 12;
        }
        break;
      case 'underline':
        if (selectedText) {
          replacement = `<u>${selectedText}</u>`;
          cursorOffset = replacement.length;
        } else {
          replacement = '<u>underlined text</u>';
          cursorOffset = 18;
        }
        break;
      case 'strike':
        if (selectedText) {
          replacement = `~~${selectedText}~~`;
          cursorOffset = replacement.length;
        } else {
          replacement = '~~strikethrough text~~';
          cursorOffset = 20;
        }
        break;
      case 'quote':
        if (selectedText) {
          replacement = `\n> ${selectedText}\n`;
          cursorOffset = replacement.length;
        } else {
          replacement = '\n> Blockquote text here\n';
          cursorOffset = replacement.length - 1;
        }
        break;
      case 'bullet':
        if (selectedText) {
          const lines = selectedText.split('\n').map((l) => `- ${l}`).join('\n');
          replacement = `\n${lines}\n`;
          cursorOffset = replacement.length;
        } else {
          replacement = '\n- Bullet point item\n';
          cursorOffset = replacement.length - 1;
        }
        break;
      case 'number':
        if (selectedText) {
          const lines = selectedText.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n');
          replacement = `\n${lines}\n`;
          cursorOffset = replacement.length;
        } else {
          replacement = '\n1. First item\n2. Second item\n';
          cursorOffset = replacement.length - 1;
        }
        break;
      case 'link':
        if (selectedText) {
          replacement = `[${selectedText}](https://example.com)`;
          cursorOffset = replacement.length - 1;
        } else {
          replacement = '[Link text](https://example.com)';
          cursorOffset = replacement.length - 1;
        }
        break;
      case 'code':
        if (selectedText) {
          replacement = `\`${selectedText}\``;
          cursorOffset = replacement.length;
        } else {
          replacement = '`code`';
          cursorOffset = 5;
        }
        break;
      default:
        break;
    }

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-1 p-1.5 mb-2 rounded-lg bg-surface-secondary/70 border border-border">
      <div className="flex items-center flex-wrap gap-0.5">
        {/* H2 Heading Button */}
        <button
          type="button"
          onClick={() => insertFormatting('h2')}
          title="Insert H2 Subheading"
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded hover:bg-brand-primary/10 text-primary hover:text-brand-primary transition-colors border border-transparent hover:border-brand-primary/30"
        >
          <Heading2 className="w-3.5 h-3.5 text-brand-primary" />
          <span>H2 Subheading</span>
        </button>

        {/* H3 Heading */}
        <button
          type="button"
          onClick={() => insertFormatting('h3')}
          title="Insert H3 Small Subheading"
          className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded hover:bg-brand-primary/10 text-secondary hover:text-brand-primary transition-colors"
        >
          <Heading3 className="w-3.5 h-3.5" />
          <span>H3</span>
        </button>

        <span className="w-px h-4 bg-border mx-1" />

        {/* Bold */}
        <button
          type="button"
          onClick={() => insertFormatting('bold')}
          title="Bold (Ctrl+B / **text**)"
          className="p-1.5 rounded hover:bg-brand-primary/10 text-secondary hover:text-primary transition-colors"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => insertFormatting('italic')}
          title="Italic (*text*)"
          className="p-1.5 rounded hover:bg-brand-primary/10 text-secondary hover:text-primary transition-colors"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        {/* Underline */}
        <button
          type="button"
          onClick={() => insertFormatting('underline')}
          title="Underline (<u>text</u>)"
          className="p-1.5 rounded hover:bg-brand-primary/10 text-secondary hover:text-primary transition-colors"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onClick={() => insertFormatting('strike')}
          title="Strikethrough (~~text~~)"
          className="p-1.5 rounded hover:bg-brand-primary/10 text-secondary hover:text-primary transition-colors"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <span className="w-px h-4 bg-border mx-1" />

        {/* Quote */}
        <button
          type="button"
          onClick={() => insertFormatting('quote')}
          title="Blockquote (> quote)"
          className="p-1.5 rounded hover:bg-brand-primary/10 text-secondary hover:text-primary transition-colors"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        {/* Bullet List */}
        <button
          type="button"
          onClick={() => insertFormatting('bullet')}
          title="Bullet List (- item)"
          className="p-1.5 rounded hover:bg-brand-primary/10 text-secondary hover:text-primary transition-colors"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        {/* Numbered List */}
        <button
          type="button"
          onClick={() => insertFormatting('number')}
          title="Numbered List (1. item)"
          className="p-1.5 rounded hover:bg-brand-primary/10 text-secondary hover:text-primary transition-colors"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        {/* Link */}
        <button
          type="button"
          onClick={() => insertFormatting('link')}
          title="Insert Link ([label](url))"
          className="p-1.5 rounded hover:bg-brand-primary/10 text-secondary hover:text-primary transition-colors"
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>

        {/* Code */}
        <button
          type="button"
          onClick={() => insertFormatting('code')}
          title="Inline Code (`code`)"
          className="p-1.5 rounded hover:bg-brand-primary/10 text-secondary hover:text-primary transition-colors"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
