import { useCallback, useEffect, useState } from 'react';
import {
  Briefcase, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { BusinessEnquiry } from '@/lib/admin/adminTypes';
import { fetchBusinessEnquiries } from '@/lib/admin/api';
import { useToast } from '@/lib/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

const PAGE_SIZE = 10;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function BusinessEnquiriesSection(): JSX.Element {
  const { showToast } = useToast();
  const [items, setItems] = useState<BusinessEnquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetchBusinessEnquiries(p, PAGE_SIZE);
      setItems(res.items);
      setTotal(res.total);
    } catch {
      showToast('Failed to load enquiries', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(page); }, [page, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Briefcase className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
        <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>Business Enquiries</h2>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
          <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>Loading enquiries...</p>
        </div>
      ) : items.length === 0 ? (
        <GlassCard hover={false} className="p-8 text-center">
          <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>No enquiries found.</p>
        </GlassCard>
      ) : (
        <>
          <GlassCard hover={false} className="p-0 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {['Name', 'Company', 'Purpose', 'Phone', 'Email', 'Date'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-display uppercase tracking-wide"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((enq) => (
                    <tr key={enq.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-3 text-sm font-body" style={{ color: 'var(--text-primary)' }}>{enq.name}</td>
                      <td className="px-4 py-3 text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{enq.company}</td>
                      <td className="px-4 py-3 text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{enq.purpose}</td>
                      <td className="px-4 py-3 text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{enq.phone}</td>
                      <td className="px-4 py-3 text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{enq.email}</td>
                      <td className="px-4 py-3 text-sm font-body whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatDate(enq.created_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </GlassCard>

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
