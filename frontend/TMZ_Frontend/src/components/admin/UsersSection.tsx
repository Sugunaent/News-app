import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { AdminUser, UserStatus } from '@/lib/admin/adminTypes';
import { fetchUsers, updateUserStatus, updateUserRole } from '@/lib/admin/api';
import { useToast } from '@/lib/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const ROLES = ['Superadmin', 'User'];
const PAGE_SIZE = 10;

export function UsersSection(): JSX.Element {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    const requestId = ++requestRef.current;
    try {
      const res = await fetchUsers(page, PAGE_SIZE, search || undefined);
      if (requestId !== requestRef.current) return;
      setUsers(res.items);
      setTotal(res.total);
    } catch {
      showToast('Failed to load users', 'error');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [page, search, showToast]);

  useEffect(() => { void load(); }, [load]);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const toggleStatus = async (u: AdminUser) => {
    const next: UserStatus = u.status === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to ${next === 'active' ? 'activate' : 'suspend'} ${u.display_name}?`)) return;
    setUpdating(u.id);
    try {
      await updateUserStatus(u.id, next);
      setUsers((p) => p.map((x) => (x.id === u.id ? { ...x, status: next } : x)));
      showToast(`User ${next === 'active' ? 'activated' : 'suspended'}`, 'success');
    } catch {
      showToast('Failed to update status', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const changeRole = async (u: AdminUser, role: string) => {
    if (!window.confirm(`Change ${u.display_name}'s role to ${role}?`)) return;
    setUpdating(u.id);
    try {
      await updateUserRole(u.id, role);
      setUsers((p) => p.map((x) => (x.id === u.id ? { ...x, role } : x)));
      showToast('Role updated', 'success');
    } catch {
      showToast('Failed to update role', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>Users</h2>
        <div className="w-64">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      <GlassCard hover={false} className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand-primary)' }} />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center py-16 font-body" style={{ color: 'var(--text-muted)' }}>No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>User</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Role</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Level</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>XP</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: 'var(--border-default)' }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-display text-sm" style={{ background: 'var(--brand-accent)', color: 'var(--bg-card)' }}>
                            {u.display_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p style={{ color: 'var(--text-primary)' }}>{u.display_name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-md text-xs font-medium" style={{ background: 'var(--brand-primary)', color: 'var(--bg-card)' }}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{u.level}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{u.xp.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-md text-xs font-medium" style={{
                        background: u.status === 'active' ? 'var(--brand-accent)' : 'var(--border-default)',
                        color: u.status === 'active' ? 'var(--bg-card)' : 'var(--text-secondary)',
                      }}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => toggleStatus(u)} disabled={updating === u.id}>
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                        <select
                          value={u.role}
                          onChange={(e) => void changeRole(u, e.target.value)}
                          disabled={updating === u.id}
                          className="input-field text-xs py-1.5 px-2"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between font-body text-sm">
          <span style={{ color: 'var(--text-secondary)' }}>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <span style={{ color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
            <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
