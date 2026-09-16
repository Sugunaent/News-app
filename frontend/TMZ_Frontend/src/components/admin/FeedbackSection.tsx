import { useCallback, useEffect, useState } from 'react';
import { MessageSquare, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { FeedbackItem } from '@/lib/admin/adminTypes';
import { fetchFeedback } from '@/lib/admin/api';
import { useToast } from '@/lib/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

const PAGE_SIZE = 10;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function FeedbackSection(): JSX.Element {
  const { showToast } = useToast();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetchFeedback(p, PAGE_SIZE);
      setItems(res.items);
      setTotal(res.total);
    } catch {
      showToast('Failed to load feedback', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(page); }, [page, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
        <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>Feedback</h2>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
          <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>Loading feedback...</p>
        </div>
      ) : items.length === 0 ? (
        <GlassCard hover={false} className="p-8 text-center">
          <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>No feedback found.</p>
        </GlassCard>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((item) => (
              <GlassCard key={item.id} hover={false} className="p-5">
                <div className="mb-3">
                  <p className="text-sm font-body leading-relaxed flex-1" style={{ color: 'var(--text-primary)' }}>
                    {item.content}
                  </p>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                    <span>{item.user_email ?? 'Anonymous'}</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                Page {page} of {totalPages} ({total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
