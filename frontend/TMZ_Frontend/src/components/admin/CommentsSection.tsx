import { useEffect, useState, useCallback } from 'react';
import { Trash2, Loader2, Eye, EyeOff, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Modal } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/toast';
import {
  fetchComments, updateCommentStatus, deleteComment,
} from '@/lib/admin/api';
import type { AdminComment, CommentStatus } from '@/lib/admin/adminTypes';

const PAGE_SIZE = 10;

function statusBadge(status: CommentStatus) {
  const styles: Record<CommentStatus, { bg: string; color: string }> = {
    visible: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
    hidden: { bg: 'rgba(234,179,8,0.12)', color: '#eab308' },
    deleted: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  };
  const s = styles[status];
  return (
    <span className="font-body text-xs px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CommentsSection() {
  const { showToast } = useToast();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<AdminComment | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchComments(page, PAGE_SIZE)
      .then((res) => {
        setComments(res.items);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(load, [load]);

  const toggleVisibility = (comment: AdminComment) => {
    const next: CommentStatus = comment.status === 'visible' ? 'hidden' : 'visible';
    updateCommentStatus(comment.id, next)
      .then(() => {
        showToast(`Comment ${next === 'visible' ? 'shown' : 'hidden'}`, 'success');
        load();
      })
      .catch(() => showToast('Update failed', 'error'));
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteComment(deleteTarget.id)
      .then(() => {
        showToast('Comment deleted', 'success');
        setDeleteTarget(null);
        load();
      })
      .catch(() => showToast('Delete failed', 'error'));
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>
          Comments
        </h2>
        <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
          {total} total
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>No comments found.</p>
        </GlassCard>
      ) : (
        <>
          <GlassCard hover={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    {['User', 'Article', 'Comment', 'Status', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-body text-xs uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comments.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <td className="px-4 py-3">
                        <span className="font-body text-sm" style={{ color: 'var(--text-primary)' }}>
                          {c.display_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {c.article_title || c.article_id}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-body text-sm truncate" style={{ color: 'var(--text-secondary)' }}
                          title={c.content}>
                          {c.content}
                        </p>
                      </td>
                      <td className="px-4 py-3">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3">
                        <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(c.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" size="sm"
                            onClick={() => toggleVisibility(c)}>
                            {c.status === 'visible'
                              ? <EyeOff className="w-3.5 h-3.5" />
                              : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(c)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <div className="flex items-center justify-between">
            <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}>
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <h3 className="font-display text-xl mb-3" style={{ color: 'var(--text-primary)' }}>Delete Comment</h3>
        <p className="font-body text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete this comment by <strong>{deleteTarget?.display_name}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDelete}><Trash2 className="w-4 h-4" /> Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
