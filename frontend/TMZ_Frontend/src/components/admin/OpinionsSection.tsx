import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, MessageCircleQuestion } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Modal } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/lib/toast';
import {
  fetchOpinions, createOpinion, updateOpinion, deleteOpinion, replaceOpinionOptions,
} from '@/lib/admin/api';
import type { AdminOpinion } from '@/lib/admin/adminTypes';

interface OpinionFormData {
  question: string;
  article_id: string;
  options: string[];
  allow_custom_text: boolean;
}

const emptyForm: OpinionFormData = {
  question: '', article_id: '', options: ['', ''], allow_custom_text: false,
};

export function OpinionsSection() {
  const { showToast } = useToast();
  const [opinions, setOpinions] = useState<AdminOpinion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OpinionFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminOpinion | null>(null);
  const [articles, setArticles] = useState<{ id: string; title: string }[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchOpinions(),
      fetch('/api/placeholder').catch(() => null),
    ]).then(([opinionsResult]) => {
      setOpinions(opinionsResult);
      const articleList = Array.from(new Set(opinionsResult.map((op) => op.article_id))).map((articleId) => ({
        id: articleId,
        title: opinionsResult.find((op) => op.article_id === articleId)?.article_title || articleId,
      }));
      setArticles(articleList);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (op: AdminOpinion) => {
    setEditingId(op.id);
    setForm({
      question: op.question,
      article_id: op.article_id,
      options: [...op.options],
      allow_custom_text: Boolean(op.allow_custom_text),
    });
    setModalOpen(true);
  };

  const updateOption = (i: number, val: string) =>
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? val : o)) }));

  const addOption = () => setForm((f) => ({ ...f, options: [...f.options, ''] }));
  const removeOption = (i: number) =>
    setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));

  const handleSave = () => {
    if (!form.question.trim()) {
      showToast('Question is required', 'error');
      return;
    }
    const cleanOptions = form.options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      showToast('At least 2 options are required', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      question: form.question,
      article_id: form.article_id,
      options: cleanOptions,
      allow_custom_text: form.allow_custom_text,
    };
    const op = editingId
      ? updateOpinion(editingId, payload).then(async () => {
          await replaceOpinionOptions(editingId, cleanOptions);
        })
      : createOpinion(payload);
    op.then(() => {
      showToast(editingId ? 'Opinion updated' : 'Opinion created', 'success');
      setModalOpen(false);
      load();
    }).catch(() => showToast('Operation failed', 'error')).finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteOpinion(deleteTarget.id).then(() => {
      showToast('Opinion deleted', 'success');
      setDeleteTarget(null);
      load();
    }).catch(() => showToast('Delete failed', 'error'));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Loading opinions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>
          Opinions
        </h2>
        <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Opinion</Button>
      </div>

      {opinions.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <MessageCircleQuestion className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>No opinions yet.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {opinions.map((op) => (
            <GlassCard key={op.id} hover={false} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
                    {op.question}
                  </h3>
                  <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
                    {op.article_title || op.article_id}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(op)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(op)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {op.options.map((opt, i) => (
                  <div key={i} className="px-3 py-2 rounded-lg"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <span className="font-body text-sm" style={{ color: 'var(--text-primary)' }}>{opt}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <h3 className="font-display text-xl mb-6" style={{ color: 'var(--text-primary)' }}>
          {editingId ? 'Edit Opinion' : 'Add Opinion'}
        </h3>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <Textarea label="Question" value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            placeholder="Opinion question" rows={2} />
          <div>
            <label className="block text-sm text-secondary font-body mb-1.5">Article</label>
            {editingId ? (
              <Input value={opinions.find((opinion) => opinion.id === editingId)?.article_title || form.article_id} readOnly />
            ) : (
              <select className="input-field" value={form.article_id} onChange={(e) => setForm({ ...form, article_id: e.target.value })}>
                <option value="">Select article</option>
                {articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}
              </select>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-secondary font-body">
            <input type="checkbox" checked={form.allow_custom_text} onChange={(e) => setForm({ ...form, allow_custom_text: e.target.checked })} />
            Allow custom text box
          </label>
          <div>
            <p className="font-body text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Options</p>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`} className="flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => removeOption(i)}
                    disabled={form.options.length <= 2}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={addOption} className="mt-3">
              <Plus className="w-3.5 h-3.5" /> Add Option
            </Button>
          </div>
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
        <h3 className="font-display text-xl mb-3" style={{ color: 'var(--text-primary)' }}>Delete Opinion</h3>
        <p className="font-body text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete this opinion poll?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDelete}><Trash2 className="w-4 h-4" /> Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
