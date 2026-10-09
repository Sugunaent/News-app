import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, HelpCircle, Award } from 'lucide-react';
import type { Quiz } from '@/types';
import { useAuth } from '@/lib/useAuth';
import { submitQuizAttempt, hasUserAttemptedQuiz } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuthPrompt } from '@/lib/authPromptContext';
import { CompletionCard } from '@/components/articles/CompletionCard';

export function QuizBlock({
  quiz,
  articleId,
  onResult,
}: {
  quiz: Quiz;
  articleId?: string;
  onResult?: (xp: number) => void;
}) {
  const { user, profile } = useAuth();
  const { requestLogin } = useAuthPrompt();
  const { showToast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [showShareCard, setShowShareCard] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    hasUserAttemptedQuiz(user.id, quiz.id).then((res) => {
      if (active && res.attempted) {
        setAnswered(true);
        if (res.selectedOptionId) {
          setSelectedOption(res.selectedOptionId);
        }
      }
    }).catch((error: unknown) => {
      console.error(`[QuizBlock] Could not check prior attempt for quiz "${quiz.id}":`, error);
    });
    return () => {
      active = false;
    };
  }, [user, quiz.id]);

  useEffect(() => {
    if (!showShareCard) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowShareCard(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showShareCard]);

  const handleSelect = async (optionId: string) => {
    if (answered || loading) return;
    setSelectedOption(optionId);
    setLoading(true);
    const option = quiz.options.find((o) => o.id === optionId);
    const isCorrect = option?.is_correct ?? false;
    const xp = isCorrect ? quiz.xp_reward : 0;

    try {
      if (!user && isCorrect) requestLogin('gamification');
      if (user) {
        const result = await submitQuizAttempt(quiz.id, user.id, optionId, isCorrect, xp);
        if (result.xp_earned > 0) {
          setXpEarned(result.xp_earned);
          showToast(`+${result.xp_earned} XP earned!`, 'success');
          onResult?.(result.xp_earned);
        }
      }
      setAnswered(true);
    } catch (error) {
      console.error(`[QuizBlock] Could not submit attempt for quiz "${quiz.id}":`, error);
      showToast('Could not submit quiz attempt', 'error');
      setSelectedOption(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="article-surface p-6 md:p-8 my-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-brand-primary" />
        </div>
        <div>
          <p className="text-xs text-muted uppercase tracking-wider">Quiz</p>
          <h3 className="font-display text-lg" style={{ color: 'var(--article-text)' }}>{quiz.title}</h3>
        </div>
      </div>

      <p className="text-base mb-5" style={{ color: 'var(--article-text)' }}>{quiz.question}</p>

      <div className="space-y-3">
        {quiz.options.map((option) => {
          const isSelected = selectedOption === option.id;
          const showCorrect = answered && option.is_correct;
          const showWrong = answered && isSelected && !option.is_correct;

          let bg = 'transparent';
          let border = 'var(--border-default)';
          let textColor = 'var(--article-text)';

          if (showCorrect) {
            bg = 'var(--quiz-correct)';
            border = 'var(--quiz-correct-border)';
            textColor = 'var(--quiz-correct-text)';
          } else if (showWrong) {
            bg = 'var(--quiz-wrong)';
            border = 'var(--quiz-wrong-border)';
            textColor = 'var(--quiz-wrong-text)';
          } else if (isSelected && !answered) {
            border = 'var(--brand-primary)';
          }

          return (
            <div key={option.id}>
              <button
                onClick={() => handleSelect(option.id)}
                disabled={answered || loading}
                aria-busy={loading}
                className="w-full text-left p-4 rounded-xl transition-all disabled:cursor-default"
                style={{ background: bg, border: `1px solid ${border}` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: textColor }}>{option.label}</span>
                  {showCorrect && <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--quiz-correct-text)' }} />}
                  {showWrong && <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--quiz-wrong-text)' }} />}
                </div>
              </button>

              {answered && isSelected && (
                <div className="mt-3 animate-fade-in">
                  {option.is_correct ? (
                    <div className="p-4 rounded-xl" style={{ background: 'var(--quiz-correct)', border: '1px solid var(--quiz-correct-border)' }}>
                      <p className="text-sm font-bold mb-1" style={{ color: 'var(--quiz-correct-text)' }}>Why this is correct</p>
                      <p className="text-sm" style={{ color: 'var(--quiz-correct-text)' }}>{option.explanation || 'Correct answer!'}</p>
                      {xpEarned > 0 && (
                        <p className="flex items-center gap-1 mt-2 text-sm" style={{ color: 'var(--quiz-correct-text)' }}>
                          <Award className="w-4 h-4" /> +{xpEarned} XP
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl" style={{ background: 'var(--quiz-wrong)', border: '1px solid var(--quiz-wrong-border)' }}>
                      <p className="text-sm font-bold mb-1" style={{ color: 'var(--quiz-wrong-text)' }}>Why this is wrong</p>
                      <p className="text-sm" style={{ color: 'var(--quiz-wrong-text)' }}>{option.explanation || 'This answer is incorrect.'}</p>
                      {quiz.options.find((candidate) => candidate.is_correct) && (
                        <p className="text-sm mt-2" style={{ color: 'var(--quiz-wrong-text)' }}>
                          <strong>Correct answer:</strong> {quiz.options.find((candidate) => candidate.is_correct)?.label}
                          {quiz.options.find((candidate) => candidate.is_correct)?.explanation && ` — ${quiz.options.find((candidate) => candidate.is_correct)?.explanation}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {answered && (
        <button
          type="button"
          onClick={() => setShowShareCard(true)}
          className="btn-secondary mt-5 inline-flex items-center gap-2 rounded-xl border border-default px-4 py-2.5 text-sm font-medium"
        >
          <Award className="h-4 w-4" />
          Create quiz share card
        </button>
      )}

      {showShareCard && (
        <div
          className="fixed inset-0 z-[350] flex items-center justify-center overflow-y-auto p-4"
          role="presentation"
          onClick={() => setShowShareCard(false)}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'var(--modal-overlay)', backdropFilter: 'blur(10px)' }}
          />
          <div
            className="relative z-10 w-full max-w-lg py-4"
            role="dialog"
            aria-modal="true"
            aria-label="Quiz completion share card"
            onClick={(event) => event.stopPropagation()}
          >
            <CompletionCard
              username={profile?.display_name || user?.email || 'Reader'}
              articleTitle={quiz.title || quiz.question}
              articleId={articleId}
              xpGained={xpEarned}
              cardType="quiz"
              onClose={() => setShowShareCard(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
