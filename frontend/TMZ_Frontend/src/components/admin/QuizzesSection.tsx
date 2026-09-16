import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, HelpCircle, Check, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Modal } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/lib/toast';
import {
  fetchQuizzes, createQuiz, updateQuiz, deleteQuiz,
} from '@/lib/admin/api';
import type { AdminQuiz, AdminQuizOption } from '@/lib/admin/adminTypes';

interface QuizOptionDraft {
  id: string;
  label: string;
  is_correct: boolean;
  explanation: string;
}

interface QuizFormData {
  title: string;
  question: string;
  article_id: string;
  options: QuizOptionDraft[];
}

const emptyForm: QuizFormData = {
  title: '', question: '', article_id: '', options: [{ id: '', label: '', is_correct: true, explanation: '' }],
};

const newOption = (): QuizOptionDraft => ({
  id: '', label: '', is_correct: false, explanation: '',
});

export function QuizzesSection() {
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuizFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminQuiz | null>(null);
  const [articles, setArticles] = useState<{ id: string; title: string }[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchQuizzes(),
      fetch('/api/placeholder').catch(() => null),
    ]).then(([quizzesResult]) => {
      setQuizzes(quizzesResult);
      const articleList = Array.from(new Set(quizzesResult.map((quiz) => quiz.article_id))).map((articleId) => ({
        id: articleId,
        title: quizzesResult.find((quiz) => quiz.article_id === articleId)?.article_title || articleId,
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

  const openEdit = (quiz: AdminQuiz) => {
    setEditingId(quiz.id);
    setForm({
      title: quiz.title,
      question: quiz.question,
      article_id: quiz.article_id,
      options: quiz.options.map((o) => ({
        id: o.id, label: o.label, is_correct: o.is_correct, explanation: o.explanation ?? '',
      })),
    });
    setModalOpen(true);
  };

  const updateOption = (i: number, patch: Partial<QuizOptionDraft>) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)),
    }));
  };

  const setCorrect = (i: number) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, idx) => ({ ...o, is_correct: idx === i })),
    }));
  };

  const addOption = () => setForm((f) => ({ ...f, options: [...f.options, newOption()] }));
  const removeOption = (i: number) =>
    setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));

  const handleSave = () => {
    if (!form.title.trim() || !form.question.trim()) {
      showToast('Title and question are required', 'error');
      return;
    }
    if (form.options.length < 2) {
      showToast('At least 2 options are required', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      question: form.question,
      article_id: form.article_id,
      options: form.options.map((o, i) => ({
        id: o.id, label: o.label, is_correct: o.is_correct,
        explanation: o.explanation || null, order_index: i,
      })) as AdminQuizOption[],
    };
    const op = editingId ? updateQuiz(editingId, payload) : createQuiz(payload);
    op.then(() => {
      showToast(editingId ? 'Quiz updated' : 'Quiz created', 'success');
      setModalOpen(false);
      load();
    }).catch(() => showToast('Operation failed', 'error')).finally(() => setSaving(false));
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteQuiz(deleteTarget.id).then(() => {
      showToast('Quiz deleted', 'success');
      setDeleteTarget(null);
      load();
    }).catch(() => showToast('Delete failed', 'error'));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-primary)' }} />
        <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>Loading quizzes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl md:text-3xl" style={{ color: 'var(--text-primary)' }}>
          Quizzes
        </h2>
        <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Quiz</Button>
      </div>

      {quizzes.length === 0 ? (
        <GlassCard hover={false} className="p-12 text-center">
          <HelpCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>No quizzes yet.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz) => (
            <GlassCard key={quiz.id} hover={false} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
                    {quiz.title}
                  </h3>
                  <p className="font-body text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                    {quiz.question}
                  </p>
                  <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
                    {quiz.article_title || quiz.article_id}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(quiz)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(quiz)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {quiz.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{
                      background: opt.is_correct ? 'rgba(34,197,94,0.1)' : 'var(--bg-card)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    {opt.is_correct ? (
                      <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
                    ) : (
                      <X className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    )}
                    <span className="font-body text-sm" style={{ color: 'var(--text-primary)' }}>
                      {opt.label}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <h3 className="font-display text-xl mb-6" style={{ color: 'var(--text-primary)' }}>
          {editingId ? 'Edit Quiz' : 'Add Quiz'}
        </h3>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <Input label="Title" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Quiz title" />
          <Textarea label="Question" value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Question text" rows={2} />
          <div>
            <label className="block text-sm text-secondary font-body mb-1.5">Article</label>
            {editingId ? (
              <Input value={quizzes.find((quiz) => quiz.id === editingId)?.article_title || form.article_id} readOnly />
            ) : (
              <select className="input-field" value={form.article_id} onChange={(e) => setForm({ ...form, article_id: e.target.value })}>
                <option value="">Select article</option>
                {articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}
              </select>
            )}
          </div>
          <div>
            <p className="font-body text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Options</p>
            <div className="space-y-3">
              {form.options.map((opt, i) => (
                <div key={i} className="p-3 rounded-lg space-y-2"
                  style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCorrect(i)}
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: opt.is_correct ? 'rgba(34,197,94,0.15)' : 'transparent',
                        border: opt.is_correct ? '1px solid #22c55e' : '1px solid var(--border-default)',
                      }}>
                    <Check className="w-4 h-4" style={{ color: opt.is_correct ? '#22c55e' : 'var(--text-muted)' }} />
                    </button>
                    <Input value={opt.label}
                      onChange={(e) => updateOption(i, { label: e.target.value })}
                      placeholder={`Option ${i + 1}`} className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => removeOption(i)}
                      disabled={form.options.length <= 2}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Input value={opt.explanation}
                    onChange={(e) => updateOption(i, { explanation: e.target.value })}
                    placeholder="Explanation (optional)" />
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
        <h3 className="font-display text-xl mb-3" style={{ color: 'var(--text-primary)' }}>Delete Quiz</h3>
        <p className="font-body text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete <strong>{deleteTarget?.title}</strong>?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDelete}><Trash2 className="w-4 h-4" /> Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
