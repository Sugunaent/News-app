import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Share2, Copy, X, Quote, Check, ExternalLink, Download } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { useToast } from '@/lib/toast';
import { TMSLogo } from '@/components/brand/TMSLogo';
import { buildCardShareUrl, buildCardRelativePath } from '@/lib/cardShare';

export interface CompletionCardProps {
  username: string;
  articleTitle: string;
  articleId?: string;
  xpGained: number;
  cardType?: 'completion' | 'opinion';
  opinionText?: string;
  className?: string;
  onClose?: () => void;
  interactive?: boolean;
}

export function CompletionCard({
  username,
  articleTitle,
  articleId = '',
  xpGained,
  cardType = 'completion',
  opinionText,
  className = '',
  onClose,
  interactive = true,
}: CompletionCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const isOpinionCard = cardType === 'opinion';
  const isAlreadyOnCardPage = location.pathname === '/card';

  const cardPayload = {
    username,
    articleTitle,
    articleId,
    xpGained,
    cardType,
    opinionText,
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Gentle 3D tilt: max 6 degrees
    const tiltX = -((y - centerY) / centerY) * 6;
    const tiltY = ((x - centerX) / centerX) * 6;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseEnter = () => {
    if (interactive) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setIsHovered(false);
      setTilt({ x: 0, y: 0 });
    }
  };

  const getShareUrl = () => {
    return buildCardShareUrl(cardPayload);
  };

  const getRelativePath = () => {
    return buildCardRelativePath(cardPayload);
  };

  const cardRef = useRef<HTMLDivElement>(null);

  const generateBlob = async () => {
    if (!cardRef.current) return null;
    try {
      return await toBlob(cardRef.current, {
        filter: (node) => {
          if (node instanceof HTMLElement && node.dataset?.excludeFromExport === 'true') {
            return false;
          }
          return true;
        },
        cacheBust: true,
      });
    } catch (err) {
      console.error('Failed to generate image blob', err);
      return null;
    }
  };

  const handleDownload = async () => {
    const blob = await generateBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tms-share-card-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Image downloaded!', 'success');
    } else {
      showToast('Failed to generate image', 'error');
    }
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    const shareText = isOpinionCard
      ? `${username} voiced their opinion on "${articleTitle}" on The Modern Stories: "${opinionText || ''}"`
      : `${username} completed reading "${articleTitle}" on The Modern Stories and earned +${xpGained} XP!`;

    if (navigator.share) {
      try {
        const blob = await generateBlob();
        const files = blob ? [new File([blob], 'share-card.png', { type: 'image/png' })] : undefined;
        
        const shareData: ShareData = {
          title: 'The Modern Stories',
          text: shareText,
          url: shareUrl,
        };

        if (files && navigator.canShare && navigator.canShare({ files })) {
          shareData.files = files;
        }

        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setCopied(true);
        showToast('Card link copied to clipboard!', 'success');
        setTimeout(() => setCopied(false), 2500);
      } catch {
        showToast('Could not copy to clipboard', 'error');
      }
    }
  };

  const handleCopy = async () => {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('Card link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: interactive
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isHovered ? 'scale3d(1.015, 1.015, 1.015)' : 'scale3d(1, 1, 1)'}`
          : undefined,
        transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transformStyle: 'preserve-3d',
      }}
      className={`relative rounded-[28px] p-[2px] max-w-lg w-full mx-auto select-none transition-shadow duration-300 ${className}`}
    >
      {/* Subtle animated gradient border */}
      <div
        className="absolute inset-0 rounded-[28px] pointer-events-none transition-opacity duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(0,119,182,0.45), rgba(0,189,72,0.4), rgba(144,224,239,0.45), rgba(0,119,182,0.45))',
          backgroundSize: '250% 250%',
          animation: 'cardGradientShift 8s ease infinite',
          opacity: isHovered ? 1 : 0.65,
          boxShadow: isHovered ? '0 12px 36px rgba(0, 119, 182, 0.16)' : '0 6px 20px rgba(0, 0, 0, 0.05)',
        }}
      />

      {/* Main card body */}
      <div
        className="relative rounded-[26px] p-6 sm:p-8 md:p-10 z-10 overflow-hidden"
        style={{
          background: 'var(--article-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Close button if inside modal */}
        {onClose && (
          <button
            onClick={onClose}
            data-exclude-from-export="true"
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-primary transition-colors z-30 active:scale-95"
            style={{ background: 'var(--btn-secondary)' }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Top bar: Logo + Site name on left, Total XP pill on right */}
        <div className={`flex items-center justify-between mb-8 ${onClose ? 'pr-8' : ''}`}>
          <TMSLogo size="sm" />

          <div className="px-3.5 py-1.5 rounded-full bg-brand-secondary/10 border border-brand-secondary/20 flex items-center gap-1.5 shadow-sm">
            <span className="font-display font-bold text-base text-brand-secondary">+{xpGained}</span>
            <span className="text-xs font-semibold text-brand-secondary tracking-wider">XP</span>
          </div>
        </div>

        {/* Center: USERNAME in bold first, then subtitle, then article title, then opinion quote if applicable */}
        <div className="text-center py-4 sm:py-6">
          <h3 className="font-display font-bold text-2xl sm:text-3xl text-primary mb-1 tracking-tight">
            {username}
          </h3>

          <p className="text-xs sm:text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            {isOpinionCard ? 'voiced their opinion on' : 'Completed Reading'}
          </p>

          <div className="w-12 h-0.5 mx-auto mb-4 rounded-full" style={{ background: 'var(--brand-accent)' }} />

          <h4 className="font-display font-bold text-lg sm:text-xl text-primary leading-snug px-2">
            {articleTitle}
          </h4>

          {/* Opinion quote box */}
          {isOpinionCard && opinionText && (
            <div
              className="mt-6 p-4 sm:p-5 rounded-2xl text-left relative overflow-hidden transition-all"
              style={{
                background: 'var(--btn-secondary)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div className="flex items-start gap-3">
                <Quote className="w-5 h-5 text-brand-primary shrink-0 mt-0.5 opacity-80" />
                <p className="text-sm sm:text-base font-body text-primary italic leading-relaxed">
                  &ldquo;{opinionText}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer: Share, Copy Link, Download, and in-app Preview */}
        <div data-exclude-from-export="true" className="flex flex-col items-center justify-center gap-3 mt-4 pt-6 border-t border-subtle">
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            <button
              type="button"
              onClick={handleShare}
              className="btn-primary text-sm px-4 py-2.5 flex-1 min-w-[110px] max-w-[140px] flex items-center justify-center gap-2 rounded-xl transition-transform active:scale-95 shadow-sm cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="btn-secondary text-sm px-4 py-2.5 flex-1 min-w-[110px] max-w-[140px] flex items-center justify-center gap-2 rounded-xl transition-transform active:scale-95 border border-default cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="btn-secondary text-sm px-4 py-2.5 flex-1 min-w-[110px] max-w-[140px] flex items-center justify-center gap-2 rounded-xl transition-transform active:scale-95 border border-default cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-brand-secondary" />
                  <span className="text-brand-secondary font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Link</span>
                </>
              )}
            </button>
          </div>

          {!isAlreadyOnCardPage && (
            <button
              type="button"
              onClick={() => {
                if (onClose) onClose();
                navigate(getRelativePath());
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors mt-0.5 group cursor-pointer"
            >
              <span>View card page</span>
              <ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
