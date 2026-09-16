import { useEffect, useState } from 'react';
import { MessageCircleQuestion, Check, PenLine, Sparkles, Share2 } from 'lucide-react';
import type { Opinion } from '@/types';
import { useAuth } from '@/lib/auth';
import { submitOpinion, hasUserSubmittedOpinion } from '@/lib/api';
import { useToast } from '@/lib/toast';

export function OpinionBlock({
  opinion,
  onSubmit,
}: {
  opinion: Opinion;
  onSubmit?: (opinionText: string, xpEarned: number) => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittedXp, setSubmittedXp] = useState(0);

  const allowsCustom = opinion.allow_custom_text !== false;
  const maxChars = 200;

  useEffect(() => {
    if (!user) return;
    hasUserSubmittedOpinion(user.id, opinion.id)
      .then((isSub) => {
        setSubmitted(isSub);
      })
      .catch(() => {});
  }, [user, opinion.id]);

  const handleSubmit = async () => {
    const finalOpinion = isCustomMode ? customText.trim() : (selected || '').trim();
    if (!finalOpinion || loading || submitted) return;

    setLoading(true);
    try {
      const userId = user?.id || 'demo-reader';
      const selectedIndex = opinion.options.indexOf(finalOpinion);
      const selectedOptionId = selectedIndex >= 0 ? opinion.option_ids?.[selectedIndex] : undefined;
      const result = await submitOpinion(
        opinion.id,
        userId,
        finalOpinion,
        selectedOptionId,
        isCustomMode ? finalOpinion : undefined,
      );
      setSubmitted(true);
      setSubmittedText(finalOpinion);
      setSubmittedXp(result.xp_earned ?? 0);
      showToast(`Your opinion has been recorded${result.xp_earned ? ` (+${result.xp_earned} XP)` : ''}!`, 'success');
      onSubmit?.(finalOpinion, result.xp_earned ?? 0);
    } catch {
      showToast('Could not submit opinion', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="article-surface p-6 md:p-8 my-8 rounded-2xl border border-subtle shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-brand-secondary/10 flex items-center justify-center">
            <MessageCircleQuestion className="w-5 h-5 text-brand-secondary" />
          </div>
          <div>
            <p className="text-xs text-muted uppercase tracking-wider font-semibold">Reader Opinion Poll</p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-brand-secondary/10 border border-brand-secondary/20 text-xs font-semibold text-brand-secondary flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>+{opinion.xp_reward} XP</span>
        </div>
      </div>

      <p className="text-base font-semibold mb-5 leading-relaxed" style={{ color: 'var(--article-text)' }}>
        {opinion.question}
      </p>

      {/* Preset options */}
      <div className="space-y-3">
        {opinion.options.map((option) => {
          const isSelected = !isCustomMode && selected === option;
          const showSelected = submitted && (submittedText === option || isSelected);
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                if (!submitted) {
                  setIsCustomMode(false);
                  setSelected(option);
                }
              }}
              disabled={submitted || loading}
              className="w-full text-left p-4 rounded-xl transition-all disabled:cursor-default"
              style={{
                background: showSelected
                  ? 'var(--quiz-correct)'
                  : isSelected
                  ? 'var(--glow-primary)'
                  : 'transparent',
                border: `1px solid ${
                  showSelected
                    ? 'var(--quiz-correct-border)'
                    : isSelected
                    ? 'var(--brand-primary)'
                    : 'var(--border-default)'
                }`,
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium leading-normal" style={{ color: 'var(--article-text)' }}>
                  {option}
                </span>
                {showSelected && <Check className="w-5 h-5 shrink-0" style={{ color: 'var(--quiz-correct-text)' }} />}
              </div>
            </button>
          );
        })}

        {/* Custom opinion option (if superadmin has ticked allow_custom_text) */}
        {allowsCustom && !submitted && (
          <button
            type="button"
            onClick={() => {
              setIsCustomMode(true);
              setSelected(null);
            }}
            disabled={submitted || loading}
            className="w-full text-left p-4 rounded-xl transition-all border"
            style={{
              background: isCustomMode ? 'var(--glow-primary)' : 'transparent',
              borderColor: isCustomMode ? 'var(--brand-primary)' : 'var(--border-default)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <PenLine className="w-4 h-4 text-brand-primary shrink-0" />
              <span className="text-sm font-medium text-primary">Write your own custom opinion (up to 200 chars)...</span>
            </div>
          </button>
        )}

        {/* Custom text input */}
        {allowsCustom && isCustomMode && !submitted && (
          <div className="animate-fade-in pt-1 space-y-1.5">
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value.slice(0, maxChars))}
              placeholder="Type your opinion here (max 200 characters)..."
              maxLength={maxChars}
              rows={3}
              className="w-full p-3.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none font-body"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="flex justify-between items-center px-1 text-xs text-muted">
              <span>This custom opinion will be recorded and featured on your shareable card.</span>
              <span className={customText.length >= maxChars ? 'text-rose-500 font-semibold' : 'text-muted'}>
                {customText.length}/{maxChars}
              </span>
            </div>
          </div>
        )}
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={(!selected && (!isCustomMode || !customText.trim())) || loading}
          className="btn-primary mt-5 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? 'Submitting...' : `Submit Opinion & Earn Card (+${opinion.xp_reward} XP)`}
        </button>
      )}

      {submitted && (
        <div
          className="mt-5 p-5 rounded-2xl animate-fade-in space-y-3"
          style={{ background: 'var(--quiz-correct)', border: '1px solid var(--quiz-correct-border)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--quiz-correct-text)' }}>
                Thank you for sharing your opinion!
              </p>
              <p className="text-xs mt-0.5 opacity-90" style={{ color: 'var(--quiz-correct-text)' }}>
                Your response has been saved and your custom Opinion Sharable Card has been generated.
              </p>
            </div>
            {onSubmit && submittedText && (
              <button
                type="button"
                onClick={() => onSubmit(submittedText, submittedXp)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
                style={{ color: 'var(--quiz-correct-text)' }}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>View Card</span>
              </button>
            )}
          </div>
          {submittedText && (
            <div className="p-3 rounded-xl bg-black/10 text-xs italic font-body" style={{ color: 'var(--quiz-correct-text)' }}>
              &ldquo;{submittedText}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
