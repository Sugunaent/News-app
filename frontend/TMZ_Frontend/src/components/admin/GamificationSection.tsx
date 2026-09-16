import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import type { XPRule, AdminLevel, AdminBadge } from '@/lib/admin/adminTypes';
import {
  fetchXPRules, createXPRule, updateXPRule, deleteXPRule,
  fetchLevels, createLevel, updateLevel, deleteLevel,
  fetchBadges, createBadge, updateBadge, deleteBadge,
} from '@/lib/admin/api';
import { useToast } from '@/lib/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Modal } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Tab = 'xp' | 'levels' | 'badges';

export function GamificationSection(): JSX.Element {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('xp');
  const [xpRules, setXpRules] = useState<XPRule[]>([]);
  const [levels, setLevels] = useState<AdminLevel[]>([]);
  const [badges, setBadges] = useState<AdminBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<XPRule | AdminLevel | AdminBadge | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, l, b] = await Promise.all([fetchXPRules(), fetchLevels(), fetchBadges()]);
      setXpRules(r); setLevels(l); setBadges(b);
    } catch { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const openAdd = () => { setEditing(null); setForm({}); setModalOpen(true); };
  const openEdit = (item: XPRule | AdminLevel | AdminBadge) => {
    setEditing(item);
    setForm(Object.fromEntries(Object.entries(item).filter(([, v]) => typeof v !== 'boolean')));
    setModalOpen(true);
  };

  const save = async () => {
    try {
      if (tab === 'xp') {
        const data = { action: form.action || '', xp_amount: Number(form.xp_amount) || 0, description: form.description || null };
        if (editing) { await updateXPRule(editing.id, data); setXpRules((p) => p.map((x) => x.id === editing.id ? { ...x, ...data } : x)); }
        else { const n = await createXPRule(data); setXpRules((p) => [...p, n]); }
      } else if (tab === 'levels') {
        const data = { level_number: Number(form.level_number) || 1, name: form.name || '', xp_threshold: Number(form.xp_threshold) || 0, image_url: form.image_url || null };
        if (editing) { await updateLevel(editing.id, data); setLevels((p) => p.map((x) => x.id === editing.id ? { ...x, ...data } : x)); }
        else { const n = await createLevel(data); setLevels((p) => [...p, n]); }
      } else {
        const data = { name: form.name || '', description: form.description || '', image_url: form.image_url || null };
        if (editing) { await updateBadge(editing.id, data); setBadges((p) => p.map((x) => x.id === editing.id ? { ...x, ...data } : x)); }
        else { const n = await createBadge(data); setBadges((p) => [...p, n]); }
      }
      showToast('Saved successfully', 'success');
      setModalOpen(false);
    } catch { showToast('Failed to save', 'error'); }
  };

  const remove = async (id: string) => {
    try {
      if (tab === 'xp') { await deleteXPRule(id); setXpRules((p) => p.filter((x) => x.id !== id)); }
      else if (tab === 'levels') { await deleteLevel(id); setLevels((p) => p.filter((x) => x.id !== id)); }
      else { await deleteBadge(id); setBadges((p) => p.filter((x) => x.id !== id)); }
      showToast('Deleted', 'success');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const tabs: { key: Tab; label: string }[] = [{ key: 'xp', label: 'XP Rules' }, { key: 'levels', label: 'Levels' }, { key: 'badges', label: 'Badges' }];

  const fields: { key: string; label: string; type?: string }[] = tab === 'xp'
    ? [{ key: 'action', label: 'Action' }, { key: 'xp_amount', label: 'XP Amount', type: 'number' }, { key: 'description', label: 'Description' }]
    : tab === 'levels'
    ? [{ key: 'level_number', label: 'Level Number', type: 'number' }, { key: 'name', label: 'Name' }, { key: 'xp_threshold', label: 'XP Threshold', type: 'number' }, { key: 'image_url', label: 'Image URL' }]
    : [{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }, { key: 'image_url', label: 'Image URL' }];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>Gamification</h2>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-sm font-body transition-colors"
            style={tab === t.key ? { background: 'var(--brand-primary)', color: 'var(--bg-card)' } : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4" /> Add</Button>
      </div>

      <GlassCard hover={false} className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand-primary)' }} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                  {tab === 'xp' ? (
                    <><Th>Action</Th><Th>XP</Th><Th>Description</Th></>
                  ) : tab === 'levels' ? (
                    <><Th>#</Th><Th>Name</Th><Th>Threshold</Th><Th>Image</Th></>
                  ) : (
                    <><Th>Name</Th><Th>Description</Th><Th>Image</Th></>
                  )}
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {tab === 'xp' && xpRules.map((r) => (
                  <tr key={r.id} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <Td>{r.action}</Td><Td>{r.xp_amount}</Td><Td>{r.description || '—'}</Td>
                    <Td><RowActions onEdit={() => openEdit(r)} onDelete={() => void remove(r.id)} /></Td>
                  </tr>
                ))}
                {tab === 'levels' && levels.map((l) => (
                  <tr key={l.id} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <Td>{l.level_number}</Td><Td>{l.name}</Td><Td>{l.xp_threshold}</Td>
                    <Td>{l.image_url ? <img src={l.image_url} alt="" className="w-8 h-8 rounded" /> : '—'}</Td>
                    <Td><RowActions onEdit={() => openEdit(l)} onDelete={() => void remove(l.id)} /></Td>
                  </tr>
                ))}
                {tab === 'badges' && badges.map((b) => (
                  <tr key={b.id} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <Td>{b.name}</Td><Td>{b.description}</Td>
                    <Td>{b.image_url ? <img src={b.image_url} alt="" className="w-8 h-8 rounded" /> : '—'}</Td>
                    <Td><RowActions onEdit={() => openEdit(b)} onDelete={() => void remove(b.id)} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <h3 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>{editing ? 'Edit' : 'Add'} {tabs.find((t) => t.key === tab)?.label.slice(0, -1)}</h3>
          {fields.map((f) => (
            <Input key={f.key} label={f.label} type={f.type || 'text'} value={form[f.key] || ''} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} />
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{children}</td>;
}
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onEdit} className="p-1.5 rounded-md transition-colors hover:bg-white/10" style={{ color: 'var(--brand-primary)' }}><Pencil className="w-4 h-4" /></button>
      <button onClick={onDelete} className="p-1.5 rounded-md transition-colors hover:bg-white/10" style={{ color: 'var(--text-muted)' }}><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}
