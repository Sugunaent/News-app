import { useEffect, useState, useCallback, useRef } from 'react';
import {
  FileText, Plus, Edit3, Trash2, Send, Globe, GlobeLock, Calendar,
  Archive, Star, ArrowLeft, Save, Loader2, GripVertical,
  Type, Image as ImageIcon, HelpCircle, MessageSquare, Mic, X,
  Check, ChevronUp, ChevronDown, AlertCircle, Copy,
} from 'lucide-react';
import { useToast } from '@/lib/toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { Modal } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextFormattingBar } from '@/components/admin/TextFormattingBar';
import {
  fetchArticles, fetchCategories, createArticle, updateArticle, deleteArticle,
  fetchArticleBlocks, createArticleBlock, updateArticleBlock, deleteArticleBlock,
  reorderArticleBlocks, fetchQuizzes, fetchOpinions, createQuiz, updateQuiz, createOpinion, updateOpinion, createOpinionOption, replaceOpinionOptions,
  type ArticleFilters,
} from '@/lib/admin/api';
import type {
  AdminArticle, AdminCategory, ArticleStatus, BlockType,
} from '@/lib/admin/adminTypes';

interface ArticlesSectionProps {
  editorArticleId: string | null;
  setEditorArticleId: (id: string | null) => void;
}

type StatusTab = ArticleStatus | 'ALL';

const statusTabs: { key: StatusTab; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'UNPUBLISHED', label: 'Unpublished' },
];

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-500/10 text-gray-500',
  PUBLISHED: 'bg-green-500/10 text-green-500',
  SCHEDULED: 'bg-blue-500/10 text-blue-500',
  UNPUBLISHED: 'bg-orange-500/10 text-orange-500',
};

export function ArticlesSection({ editorArticleId, setEditorArticleId }: ArticlesSectionProps) {
  const { showToast } = useToast();
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const copyArticleId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast('Article ID copied', 'success');
    } catch {
      showToast('Copy failed', 'error');
    }
  };
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<AdminArticle | null>(null);
  const [editingArticle, setEditingArticle] = useState<AdminArticle | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const requestRef = useRef(0);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    const requestId = ++requestRef.current;
    try {
      const filters: ArticleFilters = {
        status: activeTab === 'ALL' ? undefined : activeTab,
        search: search || undefined,
        category: categoryFilter,
      };
      const data = await fetchArticles(filters);
      if (requestId !== requestRef.current) return;
      setArticles(data);
    } catch {
      /* ignore */
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [activeTab, search, categoryFilter]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    if (editorArticleId) {
      fetchArticles().then((all) => {
        const art = all.find((a) => a.id === editorArticleId);
        if (art) {
          setEditingArticle(art);
          setShowEditor(true);
        }
      });
      setEditorArticleId(null);
    }
  }, [editorArticleId, setEditorArticleId]);

  const handleOpenEditor = (article?: AdminArticle) => {
    setEditingArticle(article ?? null);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingArticle(null);
    loadArticles();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteArticle(deleteTarget.id);
      setDeleteTarget(null);
      loadArticles();
    } catch { /* ignore */ }
  };

  if (showEditor) {
    return <ArticleEditor article={editingArticle} categories={categories} onClose={handleCloseEditor} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl text-primary">Articles</h1>
        <Button onClick={() => handleOpenEditor()} size="sm">
          <Plus className="w-4 h-4" /> New Article
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-body whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'text-white'
                : 'text-secondary hover:text-primary'
            }`}
            style={activeTab === tab.key ? { background: 'var(--brand-primary)' } : { background: 'var(--btn-secondary)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          type="text"
          placeholder="Search articles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
        </div>
      ) : articles.length === 0 ? (
        <GlassCard hover={false} className="p-10 text-center">
          <FileText className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">No articles found. Try adjusting filters or create a new article.</p>
        </GlassCard>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <th className="text-left text-xs text-muted font-body px-3 py-2">Title</th>
                  <th className="text-left text-xs text-muted font-body px-3 py-2">Category</th>
                  <th className="text-left text-xs text-muted font-body px-3 py-2">Type</th>
                  <th className="text-left text-xs text-muted font-body px-3 py-2">Status</th>
                  <th className="text-left text-xs text-muted font-body px-3 py-2">ID</th>
                  <th className="text-left text-xs text-muted font-body px-3 py-2">Pick</th>
                  <th className="text-left text-xs text-muted font-body px-3 py-2">Date</th>
                  <th className="text-right text-xs text-muted font-body px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((art) => (
                  <tr key={art.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="hover:bg-brand-accent/5">
                    <td className="px-3 py-3">
                      <p className="text-sm text-primary font-body line-clamp-1">{art.title}</p>
                      <p className="text-xs text-muted line-clamp-1">{art.subtitle}</p>
                    </td>
                    <td className="px-3 py-3 text-sm text-secondary">{art.category_name ?? '—'}</td>
                    <td className="px-3 py-3 text-sm text-secondary">{art.article_type}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-body ${statusColors[art.status] ?? ''}`}>
                        {art.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-secondary">
                      <div className="flex items-center gap-2">
                        <span>{`${art.id.slice(0, 8)}...${art.id.slice(-6)}`}</span>
                        <button onClick={() => void copyArticleId(art.id)} className="text-muted hover:text-primary" title="Copy full UUID">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {art.is_authors_pick && <Star className="w-4 h-4 text-amber-500" />}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">
                      {art.published_at ? new Date(art.published_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenEditor(art)} className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-brand-accent/10" title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(art)} className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-red-500 hover:bg-red-500/10" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {articles.map((art) => (
              <GlassCard key={art.id} hover={false} className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm text-primary font-body line-clamp-1">{art.title}</p>
                    <p className="text-xs text-muted line-clamp-1">{art.subtitle}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-body shrink-0 ${statusColors[art.status] ?? ''}`}>
                    {art.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted mb-3">
                  <span>{art.category_name ?? '—'}</span>
                  <span>{art.article_type}</span>
                  {art.is_authors_pick && <Star className="w-3 h-3 text-amber-500" />}
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => handleOpenEditor(art)} variant="secondary" size="sm">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button onClick={() => setDeleteTarget(art)} variant="ghost" size="sm" className="text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-display text-xl text-primary mb-2">Delete Article</h3>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to delete "{deleteTarget.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button fullWidth onClick={handleDelete} className="!bg-red-500 hover:!bg-red-600">Delete</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ===== Article Editor (Unified Block-Based) ===== */

interface EditorBlock {
  id: string;
  block_type: BlockType;
  order_index: number;
  content: string;
  image_url: string;
  image_caption: string;
  quiz_title: string;
  quiz_question: string;
  quiz_xp: number;
  quiz_options: { id: string; label: string; is_correct: boolean; explanation: string }[];
  opinion_question: string;
  opinion_options: string[];
  opinion_xp: number;
  podcast_title: string;
  podcast_audio_url: string;
  podcast_description: string;
}

function createEmptyBlock(type: BlockType, order: number): EditorBlock {
  return {
    id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    block_type: type,
    order_index: order,
    content: '',
    image_url: '',
    image_caption: '',
    quiz_title: '',
    quiz_question: '',
    quiz_xp: 10,
    quiz_options: [
      { id: `opt-${Date.now()}-0`, label: '', is_correct: true, explanation: '' },
      { id: `opt-${Date.now()}-1`, label: '', is_correct: false, explanation: '' },
    ],
    opinion_question: '',
    opinion_options: ['', ''],
    opinion_xp: 5,
    podcast_title: '',
    podcast_audio_url: '',
    podcast_description: '',
  };
}

const blockTypes: { type: BlockType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'TEXT', label: 'Text', icon: Type },
  { type: 'IMAGE', label: 'Image', icon: ImageIcon },
  { type: 'QUIZ', label: 'Quiz', icon: HelpCircle },
  { type: 'OPINION', label: 'Opinion', icon: MessageSquare },
  { type: 'PODCAST', label: 'Podcast', icon: Mic },
];

function ArticleEditor({
  article, categories, onClose,
}: {
  article: AdminArticle | null;
  categories: AdminCategory[];
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(article?.title ?? '');
  const [subtitle, setSubtitle] = useState(article?.subtitle ?? '');
  const [summary, setSummary] = useState(article?.summary ?? '');
  const [categoryId, setCategoryId] = useState(article?.category_id ?? '');
  const [articleType, setArticleType] = useState(article?.article_type ?? 'ARTICLE');
  const [isAuthorsPick, setIsAuthorsPick] = useState(article?.is_authors_pick ?? false);
  const [coverImage, setCoverImage] = useState(article?.cover_image_url ?? '');
  const [articleId] = useState(article?.id ?? crypto.randomUUID());
  const [status] = useState<ArticleStatus>(article?.status ?? 'DRAFT');
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(article?.scheduled_at?.slice(0, 16) ?? '');

  useEffect(() => {
    if (!article) return;
    let cancelled = false;
    const loadBlocks = async () => {
      try {
        const serverBlocks = await fetchArticleBlocks(article.id);
        const [quizResult, opinionResult] = await Promise.allSettled([
          fetchQuizzes(),
          fetchOpinions(),
        ]);
        const quizzes = quizResult.status === 'fulfilled' ? quizResult.value : [];
        const opinions = opinionResult.status === 'fulfilled' ? opinionResult.value : [];
        if (quizResult.status === 'rejected') console.error('[CMS] Failed loading quizzes for article blocks', quizResult.reason);
        if (opinionResult.status === 'rejected') console.error('[CMS] Failed loading opinions for article blocks', opinionResult.reason);
        if (cancelled) return;
        const articleQuiz = quizzes.find((item) => item.article_id === article.id);
        const hasQuizBlock = serverBlocks.some((serverBlock) => (
          serverBlock.block_type === 'QUIZ' || serverBlock.quiz_id === articleQuiz?.id
        ));
        const hydratedBlocks = serverBlocks.map((serverBlock) => {
          const quiz = serverBlock.quiz_id ? quizzes.find((item) => item.id === serverBlock.quiz_id) : undefined;
          const opinion = serverBlock.opinion_id ? opinions.find((item) => item.id === serverBlock.opinion_id) : undefined;
          return {
            id: serverBlock.id,
            block_type: serverBlock.block_type,
            order_index: serverBlock.order_index,
            content: serverBlock.content ?? '',
            image_url: serverBlock.image_url ?? '',
            image_caption: serverBlock.image_caption ?? '',
            quiz_title: quiz?.title ?? '',
            quiz_question: quiz?.question ?? '',
            quiz_xp: quiz?.xp_reward ?? 10,
            quiz_options: quiz?.options.map((option) => ({
              id: option.id,
              label: option.label,
              is_correct: option.is_correct,
              explanation: option.explanation ?? '',
            })) ?? createEmptyBlock('QUIZ', serverBlock.order_index).quiz_options,
            opinion_question: opinion?.question ?? '',
            opinion_options: opinion?.options ?? ['', ''],
            opinion_xp: opinion?.allow_custom_text ? 1 : 0,
            podcast_title: serverBlock.title ?? '',
            podcast_audio_url: serverBlock.external_url ?? serverBlock.media_url ?? '',
            podcast_description: serverBlock.content ?? '',
          };
        });

        // Older saves could create the quiz row before the block link was
        // persisted. Keep that quiz visible and let the next save repair the
        // missing article_blocks.quiz_id reference.
        if (articleQuiz && !hasQuizBlock) {
          const recovered = createEmptyBlock('QUIZ', hydratedBlocks.length);
          recovered.quiz_title = articleQuiz.title;
          recovered.quiz_question = articleQuiz.question;
          recovered.quiz_xp = articleQuiz.xp_reward ?? 10;
          recovered.quiz_options = articleQuiz.options.map((option) => ({
            id: option.id,
            label: option.label,
            is_correct: option.is_correct,
            explanation: option.explanation ?? '',
          }));
          hydratedBlocks.push(recovered);
        }

        setBlocks(hydratedBlocks);
      } catch {
        showToast('Failed to load article blocks', 'error');
      }
    };
    void loadBlocks();
    return () => { cancelled = true; };
  }, [article, showToast]);

  const addBlock = (type: BlockType) => {
    setBlocks((prev) => [...prev, createEmptyBlock(type, prev.length)]);
    setShowBlockPicker(false);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id).map((b, i) => ({ ...b, order_index: i })));
  };

  const moveBlock = (index: number, dir: 'up' | 'down') => {
    setBlocks((prev) => {
      const next = [...prev];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((b, i) => ({ ...b, order_index: i }));
    });
  };

  const updateBlock = (id: string, updates: Partial<EditorBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const handleSave = async (newStatus?: ArticleStatus) => {
    if (newStatus === 'SCHEDULED' && !scheduleAt) {
      showToast('Choose a scheduled publish date and time', 'error');
      return;
    }
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }
    if (!categoryId) {
      showToast('Category is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const data: Partial<AdminArticle> = {
        id: articleId,
        title, subtitle, summary,
        category_id: categoryId || null,
        category_name: categories.find((c) => c.id === categoryId)?.name,
        article_type: articleType as AdminArticle['article_type'],
        author_name: null,
        is_featured: false,
        is_authors_pick: isAuthorsPick,
        reading_time_minutes: null,
        cover_image_url: coverImage || null,
        status: 'DRAFT',
      };
      for (const [index, block] of blocks.entries()) {
        if (block.block_type === 'TEXT' && !block.content.trim()) {
          throw new Error(`Text block ${index + 1} is empty`);
        }
        if (block.block_type === 'IMAGE' && !block.image_url.trim()) {
          throw new Error(`Image block ${index + 1} needs an image URL`);
        }
        if (block.block_type === 'PODCAST' && (!block.podcast_audio_url.trim() || !block.podcast_description.trim())) {
          throw new Error(`Podcast block ${index + 1} needs an audio URL and description`);
        }
        if (block.block_type === 'QUIZ' && (!block.quiz_question.trim() || block.quiz_options.filter((option) => option.label.trim()).length < 2)) {
          throw new Error(`Quiz block ${index + 1} needs a question and at least two options`);
        }
        if (block.block_type === 'OPINION' && (!block.opinion_question.trim() || block.opinion_options.filter((option) => option.trim()).length < 2)) {
          throw new Error(`Opinion block ${index + 1} needs a question and at least two options`);
        }
      }
      let savedArticle: AdminArticle;
      if (article) {
        await updateArticle(article.id, data);
        savedArticle = { ...article, ...data } as AdminArticle;
      } else {
        savedArticle = await createArticle(data);
      }

      const existingBlocks = article ? await fetchArticleBlocks(savedArticle.id) : [];
      const existingQuizzes = await fetchQuizzes();
      const existingIds = new Set(existingBlocks.map((block) => block.id));
      const retainedIds = new Set<string>();

      for (const [index, block] of blocks.entries()) {
        const existingBlock = existingBlocks.find((item) => item.id === block.id);
        let reference: { quiz_id?: string; opinion_id?: string } = {};
        if (block.block_type === 'QUIZ') {
          const quizData = {
            article_id: savedArticle.id,
            title: block.quiz_title || 'Quiz',
            question: block.quiz_question || 'Quiz question',
            options: block.quiz_options.map((option, optionIndex) => ({
              id: option.id.startsWith('opt-') ? '' : option.id,
              label: option.label,
              is_correct: option.is_correct,
              explanation: option.explanation || null,
              order_index: optionIndex,
            })),
          };
          const existingQuizId = existingBlock?.quiz_id
            ?? existingQuizzes.find((item) => item.article_id === savedArticle.id)?.id;
          const quiz = existingQuizId
            ? { id: existingQuizId }
            : await createQuiz(quizData);
          if (existingQuizId) await updateQuiz(existingQuizId, quizData);
          reference.quiz_id = quiz.id;
        } else if (block.block_type === 'OPINION') {
          const opinionData = {
            article_id: savedArticle.id,
            question: block.opinion_question || 'Opinion question',
            allow_custom_text: Boolean(block.opinion_xp),
            options: block.opinion_options.filter(Boolean),
          };
          const opinion = existingBlock?.opinion_id
            ? { id: existingBlock.opinion_id }
            : await createOpinion(opinionData);
          if (existingBlock?.opinion_id) {
            await updateOpinion(existingBlock.opinion_id, opinionData);
            await replaceOpinionOptions(existingBlock.opinion_id, opinionData.options);
          } else {
            for (const [optionIndex, option] of opinionData.options.entries()) {
              await createOpinionOption(opinion.id, option, optionIndex);
            }
          }
          reference.opinion_id = opinion.id;
        }

        const payload = {
          block_type: block.block_type,
          order_index: existingBlock ? undefined : 10000 + index,
          content: block.block_type === 'PODCAST' ? block.podcast_description : block.content,
          title: block.block_type === 'PODCAST' ? block.podcast_title : null,
          image_caption: block.image_caption || null,
          external_url: block.block_type === 'IMAGE' ? block.image_url || null : block.block_type === 'PODCAST' ? block.podcast_audio_url || null : null,
          media_id: block.block_type === 'PODCAST' ? undefined : undefined,
          ...reference,
        };

        if (block.block_type === 'IMAGE') {
          payload.content = '';
        } else if (block.block_type === 'QUIZ' || block.block_type === 'OPINION') {
          payload.content = '';
          payload.external_url = null;
        }

        if (existingIds.has(block.id)) {
          retainedIds.add(block.id);
          await updateArticleBlock(savedArticle.id, block.id, payload);
        } else {
          await createArticleBlock(savedArticle.id, payload);
        }
      }

      for (const existingBlock of existingBlocks) {
        if (!retainedIds.has(existingBlock.id)) {
          await deleteArticleBlock(savedArticle.id, existingBlock.id);
        }
      }

      const savedBlocks = await fetchArticleBlocks(savedArticle.id);
      if (savedBlocks.length > 0) {
        await reorderArticleBlocks(savedArticle.id, savedBlocks.map((block, index) => ({ id: block.id, order_index: index })));
      }
      if (newStatus && newStatus !== 'DRAFT') {
        await updateArticle(savedArticle.id, {
          status: newStatus,
          scheduled_at: newStatus === 'SCHEDULED' ? scheduleAt : null,
        });
      }
      showToast(article ? 'Article updated with content blocks' : 'Article created with content blocks', 'success');
      onClose();
    } catch (error) {
      console.error('[CMS] Failed to save article workflow', error);
      showToast(error instanceof Error ? error.message : 'Failed to save article', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    try {
      await deleteArticle(article.id);
      showToast('Article deleted', 'success');
      onClose();
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const availableActions = getAvailableActions(status);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-brand-accent/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl text-primary">
            {article ? 'Edit Article' : 'New Article'}
          </h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-body ${statusColors[status] ?? ''}`}>
            {status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {availableActions.map((action) => (
            <Button
              key={action.key}
              variant={action.variant}
              size="sm"
              onClick={() => {
                if (action.key === 'delete') setShowDeleteConfirm(true);
                else handleSave(action.status);
              }}
              disabled={saving}
            >
              {action.icon && <action.icon className="w-3.5 h-3.5" />}
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Article Metadata */}
      <GlassCard hover={false} className="p-5 space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title" />
        <Input label="Subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Article subtitle" />
        <div>
          <label className="block text-sm text-secondary font-body mb-1.5">Summary</label>
          <textarea
            className="input-field resize-none"
            rows={2}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief summary for cards and previews"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-secondary font-body mb-1.5">Category</label>
            <select className="input-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-secondary font-body mb-1.5">Type</label>
            <select className="input-field" value={articleType} onChange={(e) => setArticleType(e.target.value as AdminArticle['article_type'])}>
              <option value="ARTICLE">Article</option>
              <option value="PODCAST">Podcast</option>
              <option value="QUIZ">Quiz</option>
              <option value="OPINION">Opinion</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-secondary font-body mb-1.5">Article ID</label>
            <div className="flex items-center gap-2">
              <input className="input-field flex-1" value={articleId} readOnly />
              <button type="button" onClick={() => void navigator.clipboard.writeText(articleId)} className="btn-secondary px-3 py-2 text-xs flex items-center gap-1">
                <Copy className="w-3.5 h-3.5" /> Copy
              </button>
            </div>
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isAuthorsPick} onChange={(e) => setIsAuthorsPick(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm text-secondary">Author's Pick</span>
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <Input label="Cover Image URL" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." />
          <Input label="Scheduled Publish Date & Time" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
        </div>
      </GlassCard>

      {/* Content Blocks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg text-primary">Content Blocks</h2>
          <span className="text-xs text-muted">{blocks.length} block{blocks.length !== 1 ? 's' : ''}</span>
        </div>

        {blocks.length === 0 && (
          <GlassCard hover={false} className="p-8 text-center">
            <FileText className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted mb-4">No content blocks yet. Add your first block to start writing.</p>
          </GlassCard>
        )}

        <div className="space-y-3">
          {blocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              index={index}
              total={blocks.length}
              onUpdate={(updates) => updateBlock(block.id, updates)}
              onRemove={() => removeBlock(block.id)}
              onMove={(dir) => moveBlock(index, dir)}
            />
          ))}
        </div>

        {/* Add Block */}
        {showBlockPicker ? (
          <GlassCard hover={false} className="p-4 mt-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-secondary font-body">Add a block</span>
              <button onClick={() => setShowBlockPicker(false)} className="text-muted hover:text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {blockTypes.map((bt) => (
                <button
                  key={bt.type}
                  onClick={() => addBlock(bt.type)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-transparent hover:border-brand-primary transition-all"
                  style={{ background: 'var(--btn-secondary)' }}
                >
                  <bt.icon className="w-5 h-5 text-brand-primary" />
                  <span className="text-xs text-secondary">{bt.label}</span>
                </button>
              ))}
            </div>
          </GlassCard>
        ) : (
          <button
            onClick={() => setShowBlockPicker(true)}
            className="w-full mt-3 py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-secondary hover:text-primary transition-all"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-body">Add Block</span>
          </button>
        )}
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="font-display text-xl text-primary mb-2">Delete Article</h3>
            <p className="text-sm text-muted mb-6">This will permanently delete "{title}" and all its blocks. This cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
              <Button fullWidth onClick={handleDelete} className="!bg-red-500 hover:!bg-red-600">Delete Forever</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ===== Block Editor ===== */

function BlockEditor({
  block, index, total, onUpdate, onRemove, onMove,
}: {
  block: EditorBlock;
  index: number;
  total: number;
  onUpdate: (updates: Partial<EditorBlock>) => void;
  onRemove: () => void;
  onMove: (dir: 'up' | 'down') => void;
}) {
  const blockMeta = blockTypes.find((bt) => bt.type === block.block_type);
  const Icon = blockMeta?.icon ?? Type;

  return (
    <GlassCard hover={false} className="p-4">
      {/* Block Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted" />
          <div className="w-7 h-7 rounded-lg bg-brand-primary/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-brand-primary" />
          </div>
          <span className="text-sm text-primary font-body">{blockMeta?.label} Block</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove('up')} disabled={index === 0} className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary disabled:opacity-30">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={() => onMove('down')} disabled={index === total - 1} className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary disabled:opacity-30">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={onRemove} className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Block Content */}
      {block.block_type === 'TEXT' && (
        <TextBlockEditor
          content={block.content}
          onUpdate={(content) => onUpdate({ content })}
        />
      )}

      {block.block_type === 'IMAGE' && (
        <div className="space-y-3">
          <Input label="Image URL" value={block.image_url} onChange={(e) => onUpdate({ image_url: e.target.value })} placeholder="https://..." />
          <Input label="Caption" value={block.image_caption} onChange={(e) => onUpdate({ image_caption: e.target.value })} placeholder="Image caption (optional)" />
        </div>
      )}

      {block.block_type === 'QUIZ' && (
        <div className="space-y-3">
          <Input label="Quiz Title" value={block.quiz_title} onChange={(e) => onUpdate({ quiz_title: e.target.value })} placeholder="Quiz title" />
          <Input label="Question" value={block.quiz_question} onChange={(e) => onUpdate({ quiz_question: e.target.value })} placeholder="Quiz question" />
          <div>
            <label className="block text-sm text-secondary font-body mb-1.5">Options</label>
            <div className="space-y-2">
              {block.quiz_options.map((opt, i) => (
                <div key={opt.id} className="flex items-start gap-2">
                  <button
                    onClick={() => onUpdate({
                      quiz_options: block.quiz_options.map((o) => ({ ...o, is_correct: o.id === opt.id })),
                    })}
                    className={`mt-2 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                      opt.is_correct ? 'border-green-500 bg-green-500' : 'border-muted'
                    }`}
                  >
                    {opt.is_correct && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 space-y-1.5">
                    <input
                      className="input-field text-sm"
                      value={opt.label}
                      onChange={(e) => onUpdate({
                        quiz_options: block.quiz_options.map((o) => o.id === opt.id ? { ...o, label: e.target.value } : o),
                      })}
                      placeholder={`Option ${i + 1}`}
                    />
                    <input
                      className="input-field text-xs"
                      value={opt.explanation}
                      onChange={(e) => onUpdate({
                        quiz_options: block.quiz_options.map((o) => o.id === opt.id ? { ...o, explanation: e.target.value } : o),
                      })}
                      placeholder="Explanation (optional)"
                    />
                  </div>
                  <button
                    onClick={() => onUpdate({ quiz_options: block.quiz_options.filter((o) => o.id !== opt.id) })}
                    disabled={block.quiz_options.length <= 2}
                    className="mt-2 text-muted hover:text-red-500 disabled:opacity-30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => onUpdate({
                quiz_options: [...block.quiz_options, { id: `opt-${Date.now()}`, label: '', is_correct: false, explanation: '' }],
              })}
              className="mt-2 text-sm text-brand-primary hover:text-brand-accent flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Option
            </button>
          </div>
        </div>
      )}

      {block.block_type === 'OPINION' && (
        <div className="space-y-3">
          <Input label="Question" value={block.opinion_question} onChange={(e) => onUpdate({ opinion_question: e.target.value })} placeholder="Opinion question" />
          <label className="flex items-center gap-2 text-sm text-secondary font-body">
            <input type="checkbox" checked={Boolean(block.opinion_xp)} onChange={(e) => onUpdate({ opinion_xp: e.target.checked ? 1 : 0 })} />
            Allow custom text box
          </label>
          <div>
            <label className="block text-sm text-secondary font-body mb-1.5">Options</label>
            <div className="space-y-2">
              {block.opinion_options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="input-field text-sm"
                    value={opt}
                    onChange={(e) => onUpdate({
                      opinion_options: block.opinion_options.map((o, j) => j === i ? e.target.value : o),
                    })}
                    placeholder={`Option ${i + 1}`}
                  />
                  <button
                    onClick={() => onUpdate({ opinion_options: block.opinion_options.filter((_, j) => j !== i) })}
                    disabled={block.opinion_options.length <= 2}
                    className="text-muted hover:text-red-500 disabled:opacity-30"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => onUpdate({ opinion_options: [...block.opinion_options, ''] })}
              className="mt-2 text-sm text-brand-primary hover:text-brand-accent flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Option
            </button>
          </div>
        </div>
      )}

      {block.block_type === 'PODCAST' && (
        <div className="space-y-3">
          <Input label="Title" value={block.podcast_title} onChange={(e) => onUpdate({ podcast_title: e.target.value })} placeholder="Podcast title" />
          <Input label="Audio URL" value={block.podcast_audio_url} onChange={(e) => onUpdate({ podcast_audio_url: e.target.value })} placeholder="https://..." />
          <div>
            <label className="block text-sm text-secondary font-body mb-1.5">Description</label>
            <textarea
              className="input-field resize-none text-sm"
              rows={2}
              value={block.podcast_description}
              onChange={(e) => onUpdate({ podcast_description: e.target.value })}
              placeholder="Podcast description"
            />
          </div>
        </div>
      )}
    </GlassCard>
  );
}

/* ===== Text Block Editor with Formatting Bar ===== */

function TextBlockEditor({
  content,
  onUpdate,
}: {
  content: string;
  onUpdate: (content: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-2">
      <TextFormattingBar
        textareaRef={textareaRef}
        content={content}
        onChange={onUpdate}
      />

      <textarea
        ref={textareaRef}
        className="input-field resize-y font-mono text-sm leading-relaxed min-h-[140px]"
        rows={6}
        value={content}
        onChange={(e) => onUpdate(e.target.value)}
        placeholder="Write your text content here... Click 'H2 Subheading' or toolbar buttons above to format."
      />

      <div className="flex items-center justify-between text-[11px] text-muted px-1">
        <span>Click <strong>H2 Subheading</strong>, <strong>Bold</strong>, <strong>Italic</strong>, or <strong>Underline</strong> to format text</span>
        <span>{content.length} characters</span>
      </div>
    </div>
  );
}

/* ===== Available Actions by Status ===== */

interface ArticleAction {
  key: string;
  label: string;
  status?: ArticleStatus;
  variant: 'primary' | 'secondary' | 'ghost';
  icon?: React.ComponentType<{ className?: string }>;
}

function getAvailableActions(status: ArticleStatus): ArticleAction[] {
  const actions: ArticleAction[] = [
    { key: 'save', label: 'Save Draft', status: status, variant: 'secondary', icon: Save },
  ];

  if (status === 'DRAFT' || status === 'UNPUBLISHED') {
    actions.push({ key: 'publish', label: 'Publish', status: 'PUBLISHED', variant: 'primary', icon: Globe });
    actions.push({ key: 'schedule', label: 'Schedule', status: 'SCHEDULED', variant: 'secondary', icon: Calendar });
  }
  if (status === 'PUBLISHED') {
    actions.push({ key: 'unpublish', label: 'Unpublish', status: 'UNPUBLISHED', variant: 'secondary', icon: GlobeLock });
  }
  actions.push({ key: 'delete', label: 'Delete', variant: 'ghost', icon: Trash2 });

  return actions;
}
