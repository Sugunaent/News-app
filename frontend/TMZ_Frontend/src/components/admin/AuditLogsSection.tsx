import { useCallback, useEffect, useState } from 'react';
import {
  ScrollText, Loader2, ChevronLeft, ChevronRight, Shield,
} from 'lucide-react';
import type { AuditLog } from '@/lib/admin/adminTypes';
import { fetchAuditLogs } from '@/lib/admin/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

const PAGE_SIZE = 10;

const ACTION_STYLES: Record<string, { bg: string; color: string }> = {
  create: { bg: 'rgba(0, 189, 72, 0.12)', color: 'var(--brand-secondary)' },
  update: { bg: 'rgba(0, 119, 182, 0.12)', color: 'var(--brand-primary)' },
  delete: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
  login: { bg: 'rgba(144, 224, 239, 0.15)', color: 'var(--brand-accent)' },
  logout: { bg: 'rgba(144, 224, 239, 0.15)', color: 'var(--brand-accent)' },
};

function getActionStyle(action: string) {
  const key = action.toLowerCase();
  return ACTION_STYLES[key] ?? { bg: 'var(--border-default)', color: 'var(--text-secondary)' };
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function AuditLogsSection(): JSX.Element {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetchAuditLogs(p, PAGE_SIZE);
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <ScrollText className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
        <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>Audit Logs</h2>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
          <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>Loading audit logs...</p>
        </div>
      ) : items.length === 0 ? (
        <GlassCard hover={false} className="p-8 text-center">
          <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>No audit logs found.</p>
        </GlassCard>
      ) : (
        <>
          <GlassCard hover={false} className="p-0 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  {['Timestamp', 'Actor', 'Action', 'Entity Type', 'Entity ID', 'Details'].map((h) => (
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
                {items.map((log) => {
                  const style = getActionStyle(log.action);
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-3 text-sm font-body whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                        {formatTimestamp(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm font-body" style={{ color: 'var(--text-primary)' }}>
                        <div className="flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                          {log.actor_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-body px-3 py-1 rounded-full whitespace-nowrap uppercase"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{log.entity_type}</td>
                      <td className="px-4 py-3 text-sm font-body font-mono" style={{ color: 'var(--text-muted)' }}>
                        {log.entity_id ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-body max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        {log.details?.summary ?? '—'}
                      </td>
                    </tr>
                  );
                })}
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
