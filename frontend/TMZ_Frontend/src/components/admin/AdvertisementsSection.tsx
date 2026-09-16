import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import type { Advertisement, AdSlot, AdStatus } from '@/lib/admin/adminTypes';
import {
  fetchAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement,
  fetchAdSlots, createAdSlot, updateAdSlot, deleteAdSlot,
} from '@/lib/admin/api';
import { useToast } from '@/lib/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Modal } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Tab = 'ads' | 'slots';
const AD_STATUSES: AdStatus[] = ['ACTIVE', 'INACTIVE', 'SCHEDULED'];

export function AdvertisementsSection(): JSX.Element {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('ads');
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Advertisement | AdSlot | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const [a, s] = await Promise.all([fetchAdvertisements(), fetchAdSlots()]); setAds(a); setSlots(s); }
    catch { showToast('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(tab === 'ads' ? { title: '', description: '', image_url: '', target_url: '', ad_slot_id: '', status: 'ACTIVE', starts_at: '', ends_at: '' } : { name: '', slug: '', placement: '', description: '', is_active: true }); setModalOpen(true); };
  const openEdit = (item: Advertisement | AdSlot) => {
    setEditing(item);
    setForm(Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v === null ? '' : v])));
    setModalOpen(true);
  };

  const save = async () => {
    try {
      if (tab === 'ads') {
        const data = { title: String(form.title), description: String(form.description || form.title), image_url: String(form.image_url), target_url: String(form.target_url), ad_slot_id: form.ad_slot_id ? String(form.ad_slot_id) : null, status: String(form.status) as AdStatus, starts_at: form.starts_at ? String(form.starts_at) : null, ends_at: form.ends_at ? String(form.ends_at) : null };
        if (editing) { await updateAdvertisement(editing.id, data); setAds((p) => p.map((x) => x.id === editing.id ? { ...x, ...data } : x)); }
        else { const n = await createAdvertisement(data); setAds((p) => [...p, n]); }
      } else {
        const data = { name: String(form.name), slug: String(form.slug), placement: String(form.placement), description: form.description ? String(form.description) : null, is_active: Boolean(form.is_active) };
        if (editing) { await updateAdSlot(editing.id, data); setSlots((p) => p.map((x) => x.id === editing.id ? { ...x, ...data } : x)); }
        else { const n = await createAdSlot(data); setSlots((p) => [...p, n]); }
      }
      showToast('Saved', 'success'); setModalOpen(false);
    } catch { showToast('Failed to save', 'error'); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      if (tab === 'ads') { await deleteAdvertisement(deleteId); setAds((p) => p.filter((x) => x.id !== deleteId)); }
      else { await deleteAdSlot(deleteId); setSlots((p) => p.filter((x) => x.id !== deleteId)); }
      showToast('Deleted', 'success');
    } catch { showToast('Failed to delete', 'error'); }
    finally { setDeleteId(null); }
  };

  const slotName = (id: string | null) => slots.find((s) => s.id === id)?.name || '—';

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>Advertisements</h2>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {([['ads', 'Advertisements'], ['slots', 'Ad Slots']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className="px-4 py-2 rounded-lg text-sm font-body transition-colors"
              style={tab === k ? { background: 'var(--brand-primary)', color: 'var(--bg-card)' } : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>{l}</button>
          ))}
        </div>
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
                  {tab === 'ads' ? (
                    <><Th>Title</Th><Th>Status</Th><Th>Slot</Th><Th>Clicks</Th><Th>Impressions</Th><Th>Date Range</Th><Th>Actions</Th></>
                  ) : (
                    <><Th>Name</Th><Th>Slug</Th><Th>Placement</Th><Th>Active</Th><Th>Actions</Th></>
                  )}
                </tr>
              </thead>
              <tbody>
                {tab === 'ads' && ads.map((a) => (
                  <tr key={a.id} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <Td>{a.title}</Td>
                    <Td><span className="px-2 py-0.5 rounded-md text-xs" style={{ background: 'var(--brand-accent)', color: 'var(--bg-card)' }}>{a.status}</span></Td>
                    <Td>{slotName(a.ad_slot_id)}</Td><Td>{a.clicks}</Td><Td>{a.impressions}</Td>
                    <Td className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.starts_at ? new Date(a.starts_at).toLocaleDateString() : '—'} → {a.ends_at ? new Date(a.ends_at).toLocaleDateString() : '—'}</Td>
                    <Td><Actions onEdit={() => openEdit(a)} onDelete={() => setDeleteId(a.id)} /></Td>
                  </tr>
                ))}
                {tab === 'slots' && slots.map((s) => (
                  <tr key={s.id} className="border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <Td>{s.name}</Td><Td>{s.slug}</Td><Td>{s.placement}</Td>
                    <Td><span className="text-xs" style={{ color: s.is_active ? 'var(--brand-primary)' : 'var(--text-muted)' }}>{s.is_active ? 'Yes' : 'No'}</span></Td>
                    <Td><Actions onEdit={() => openEdit(s)} onDelete={() => setDeleteId(s.id)} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
            <h3 className="font-display text-lg sm:text-xl" style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Edit' : 'Add'} {tab === 'ads' ? 'Advertisement' : 'Ad Slot'}
            </h3>
            <button
              onClick={() => setModalOpen(false)}
              className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-brand-accent/10 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {tab === 'ads' ? (
            <div className="space-y-3.5 pt-1">
              <Input label="Title" value={String(form.title || '')} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              <Input label="Description" value={String(form.description || '')} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              <Input label="Image URL" value={String(form.image_url || '')} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} />
              <Input label="Target URL" value={String(form.target_url || '')} onChange={(e) => setForm((p) => ({ ...p, target_url: e.target.value }))} />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-body" style={{ color: 'var(--text-secondary)' }}>Ad Slot</label>
                  <select className="input-field" value={String(form.ad_slot_id || '')} onChange={(e) => setForm((p) => ({ ...p, ad_slot_id: e.target.value }))}>
                    <option value="">None</option>
                    {slots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-body" style={{ color: 'var(--text-secondary)' }}>Status</label>
                  <select className="input-field" value={String(form.status || 'ACTIVE')} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                    {AD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Starts At" type="datetime-local" value={String(form.starts_at || '')} onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))} />
                <Input label="Ends At" type="datetime-local" value={String(form.ends_at || '')} onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 pt-1">
              <Input label="Name" value={String(form.name || '')} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <Input label="Slug" value={String(form.slug || '')} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
              <Input label="Placement" value={String(form.placement || '')} onChange={(e) => setForm((p) => ({ ...p, placement: e.target.value }))} />
              <Input label="Description" value={String(form.description || '')} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              <label className="flex items-center gap-2 font-body text-sm pt-1" style={{ color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={Boolean(form.is_active)} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} /> Active
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)}>
        <div className="space-y-4">
          <h3 className="font-display text-lg sm:text-xl" style={{ color: 'var(--text-primary)' }}>Delete?</h3>
          <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>This action cannot be undone.</p>
          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button onClick={() => void confirmDelete()}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{children}</th>;
}
function Td({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <td className={`px-4 py-3 ${className ?? ''}`} style={{ color: 'var(--text-primary)', ...style }}>{children}</td>;
}
function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-2">
      <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--brand-primary)' }}><Pencil className="w-4 h-4" /></button>
      <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-white/10 transition-colors" style={{ color: 'var(--text-muted)' }}><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}
