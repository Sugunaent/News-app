import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, ExternalLink, Calendar, X } from 'lucide-react';
import type { AdminPromotion } from '@/lib/admin/adminTypes';
import { fetchPromotions, createPromotion, updatePromotion, deletePromotion } from '@/lib/admin/api';
import { useToast } from '@/lib/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Modal } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const empty = { title: '', description: '', image_url: '', external_url: '', date_time: '', active: true };

export function PromotionsSection(): JSX.Element {
  const { showToast } = useToast();
  const [items, setItems] = useState<AdminPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPromotion | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await fetchPromotions()); }
    catch { showToast('Failed to load promotions', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (p: AdminPromotion) => {
    setEditing(p);
    setForm({ title: p.title, description: p.description, image_url: p.image_url, external_url: p.external_url, date_time: p.date_time || '', active: p.active });
    setModalOpen(true);
  };

  const save = async () => {
    const data = {
      title: String(form.title), description: String(form.description),
      image_url: String(form.image_url), external_url: String(form.external_url),
      date_time: form.date_time ? String(form.date_time) : null,
      active: Boolean(form.active),
    };
    try {
      if (editing) { await updatePromotion(editing.id, { ...data, image_media_id: editing.image_media_id }); setItems((p) => p.map((x) => x.id === editing.id ? { ...x, ...data } : x)); }
      else { const n = await createPromotion(data); setItems((p) => [...p, n]); }
      showToast('Promotion saved', 'success');
      setModalOpen(false);
    } catch { showToast('Failed to save', 'error'); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try { await deletePromotion(deleteId); setItems((p) => p.filter((x) => x.id !== deleteId)); showToast('Deleted', 'success'); }
    catch { showToast('Failed to delete', 'error'); }
    finally { setDeleteId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>Promotions</h2>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4" /> Add Promotion</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--brand-primary)' }} /></div>
      ) : items.length === 0 ? (
        <p className="text-center py-16 font-body" style={{ color: 'var(--text-muted)' }}>No promotions yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <GlassCard key={p.id} className="p-5 space-y-3">
              <div className="aspect-video rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'var(--border-default)' }}>
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                ) : (
                  <span className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>No image</span>
                )}
              </div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>{p.title}</h3>
                <span className="px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0" style={{
                  background: p.active ? 'var(--brand-accent)' : 'var(--border-default)',
                  color: p.active ? 'var(--bg-card)' : 'var(--text-secondary)',
                }}>{p.active ? 'Active' : 'Inactive'}</span>
              </div>
              <p className="font-body text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>
              {p.date_time && (
                <p className="font-body text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Calendar className="w-3.5 h-3.5" /> {new Date(p.date_time).toLocaleString()}
                </p>
              )}
              {p.external_url && (
                <a href={p.external_url} target="_blank" rel="noreferrer" className="font-body text-xs flex items-center gap-1.5 hover:underline" style={{ color: 'var(--brand-primary)' }}>
                  <ExternalLink className="w-3.5 h-3.5" /> Visit link
                </a>
              )}
              <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
                <Button size="sm" variant="secondary" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
                <Button size="sm" variant="secondary" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
            <h3 className="font-display text-lg sm:text-xl" style={{ color: 'var(--text-primary)' }}>
              {editing ? 'Edit' : 'Add'} Promotion
            </h3>
            <button
              onClick={() => setModalOpen(false)}
              className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-brand-accent/10 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3.5 pt-1">
            <Input label="Title" value={String(form.title)} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            <Input label="Description" value={String(form.description)} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <Input label="Image URL" value={String(form.image_url)} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} />
            <Input label="External URL" value={String(form.external_url)} onChange={(e) => setForm((p) => ({ ...p, external_url: e.target.value }))} />
            <Input label="Date & Time" type="datetime-local" value={String(form.date_time)} onChange={(e) => setForm((p) => ({ ...p, date_time: e.target.value }))} />
            <label className="flex items-center gap-2 font-body text-sm pt-1" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={Boolean(form.active)} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} />
              Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)}>
        <div className="space-y-4">
          <h3 className="font-display text-lg sm:text-xl" style={{ color: 'var(--text-primary)' }}>Delete Promotion?</h3>
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
