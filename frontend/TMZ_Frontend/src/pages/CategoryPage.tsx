import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Category, Article } from '@/types';
import { fetchCategoryBySlug, fetchArticlesByCategory } from '@/lib/api';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { Input } from '@/components/ui/Input';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const cat = await fetchCategoryBySlug(slug);
        if (!cat) {
          setError(true);
          return;
        }
        setCategory(cat);
        const arts = await fetchArticlesByCategory(cat.id, debouncedQuery);
        setArticles(arts);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, debouncedQuery]);

  if (loading && !category) return <LoadingState message="Loading category..." />;
  if (error || !category) return <ErrorState message="Category not found." />;

  return (
    <div className="relative z-10 max-w-[1440px] 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="flex-1">
          <h1 className="font-display text-4xl md:text-5xl text-primary mb-4">{category.name}</h1>
          {category.description && (
            <p className="text-lg text-secondary max-w-2xl leading-relaxed">{category.description}</p>
          )}
        </div>
        <div className="w-full md:w-72 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              type="text"
              placeholder={`Search in ${category.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Searching..." />
      ) : articles.length === 0 ? (
        <EmptyState message={debouncedQuery ? "No articles match your search." : "No articles in this category yet."} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
