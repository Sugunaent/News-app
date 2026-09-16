import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Modal } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/lib/toast';
import {
  fetchCategories, createCategory, updateCategory, deleteCategory,
} from '@/lib/admin/api';
import type { AdminCategory } from '@/lib/admin/adminTypes';

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image_url: string;
}

const emptyForm: CategoryFormData = { name: '', slug: '', description: '', image_url: '' };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'category';
}

export function CategoriesSection() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);

  const load = () => {
    setLoading(true);
    fetchCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (cat: AdminCategory) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      image_url: cat.image_url ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    const slug = slugify(form.name);
    setSaving(true);
    const payload = {
      name: form.name,
      slug,
      description: form.description || null,
      image_url: form.image_url || null,
    };
    const op = editingId
      ? updateCategory(editingId, payload)
      : createCategory(payload);
    op
      .then(() => {
        showToast(editingId ? 'Category updated' : 'Category created', 'success');
        setModalOpen(false);
        load();
      })
      .catch(() => showToast('Operation failed', 'error'))
      .finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCategory(deleteTarget.id)
      .then(() => {
        showToast('Category deleted', 'success');
        setDeleteTarget(null);
        load();
      })
      .catch(() => showToast('Delete failed', 'error'));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>
          Categories
        </h2>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>No categories yet.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <GlassCard key={cat.id} hover={false} className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>
                      {cat.name}
                    </h3>
                    <span
                      className="font-body text-xs px-2 py-0.5 rounded"
                      style={{ background: 'var(--brand-accent)', color: 'var(--brand-primary)', opacity: 0.8 }}
                    >
                      {cat.slug}
                    </span>
                    {cat.article_count !== undefined && (
                      <span className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
                        {cat.article_count} articles
                      </span>
                    )}
                  </div>
                  <p className="font-body text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                    {cat.description || 'No description'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(cat)}>
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(cat)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <h3 className="font-display text-xl mb-6" style={{ color: 'var(--text-primary)' }}>
          {editingId ? 'Edit Category' : 'Add Category'}
        </h3>
        <div className="space-y-4">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Category name"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Short description"
            rows={3}
          />
          <Input
            label="Image URL"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {editingId ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <h3 className="font-display text-xl mb-3" style={{ color: 'var(--text-primary)' }}>
          Delete Category
        </h3>
        <p className="font-body text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
          Articles associated with this category may be affected.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDelete}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
