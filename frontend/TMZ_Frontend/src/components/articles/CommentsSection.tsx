import { useEffect, useState, useCallback } from 'react';
import { Send, Trash2, MessageSquare } from 'lucide-react';
import type { Comment } from '@/types';
import { useAuth } from '@/lib/auth';
import { fetchComments, addComment, deleteComment } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/States';

export function CommentsSection({ articleId, onReadyForCompletion }: { articleId: string; onReadyForCompletion?: (hasComments: boolean) => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadComments = useCallback(async (p: number) => {
    try {
      const newComments = await fetchComments(articleId, p);
      if (p === 1) {
        setComments(newComments);
        onReadyForCompletion?.(newComments.length > 0);
      } else {
        setComments((prev) => [...prev, ...newComments]);
      }
      setHasMore(newComments.length === 10);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [articleId, onReadyForCompletion]);

  useEffect(() => {
    loadComments(1);
  }, [loadComments]);

  const handleSubmit = async () => {
    if (!user) return;
    const content = input.trim();
    if (!content) return;
    if (content.length > 1000) {
      showToast('Comment is too long (max 1000 characters)', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const newComment = await addComment(articleId, user.id, content);
      setComments((prev) => [newComment, ...prev]);
      setInput('');
      showToast('Comment posted', 'success');
    } catch {
      showToast('Could not post comment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user) return;
    try {
      await deleteComment(commentId, user.id);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      showToast('Comment deleted', 'info');
    } catch {
      showToast('Could not delete comment', 'error');
    }
  };

  const fmtTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="mt-12">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-brand-primary" />
        <h2 className="font-display text-2xl" style={{ color: 'var(--article-text)' }}>Comments</h2>
      </div>

      {/* Input */}
      {user ? (
        <div className="flex gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(comments[0]?.display_name?.[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              maxLength={1000}
              className="input-field resize-none"
              style={{ color: 'var(--article-text)' }}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs" style={{ color: 'var(--article-muted)' }}>{input.length}/1000</span>
              <button
                onClick={handleSubmit}
                disabled={submitting || !input.trim()}
                className="btn-primary text-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm mb-8" style={{ color: 'var(--article-muted)' }}>Sign in to join the conversation.</p>
      )}

      {/* Comments */}
      {loading ? (
        <LoadingState message="Loading comments..." />
      ) : error ? (
        <ErrorState message="Could not load comments." onRetry={() => loadComments(1)} />
      ) : comments.length === 0 ? (
        <EmptyState message="No comments yet. Be the first to share your thoughts." />
      ) : (
        <>
          <div className="space-y-5">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center text-brand-primary text-sm font-bold flex-shrink-0 overflow-hidden">
                  {comment.avatar_url ? (
                    <img src={comment.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    comment.display_name?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className="flex-1">
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: 'var(--article-text)' }}>{comment.display_name}</span>
                        <span className="text-xs" style={{ color: 'var(--article-muted)' }}>{fmtTime(comment.created_at)}</span>
                      </div>
                      {user?.id === comment.user_id && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-muted hover:text-red-500 transition-colors"
                          aria-label="Delete comment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--article-text)' }}>{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="text-center mt-6">
              <button onClick={() => { setPage((p) => p + 1); loadComments(page + 1); }} className="btn-secondary text-sm">
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
