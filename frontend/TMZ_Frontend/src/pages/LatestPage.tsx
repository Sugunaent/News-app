import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Article } from '@/types';
import { fetchLatestArticles } from '@/lib/api';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { Input } from '@/components/ui/Input';
import { useLanguage } from '@/lib/language';

export function LatestPage() {
  const { currentLang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    setSearchQuery(urlQuery);
  }, [urlQuery]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (debouncedQuery.trim()) next.set('q', debouncedQuery.trim());
    else next.delete('q');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [debouncedQuery, searchParams, setSearchParams]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const arts = await fetchLatestArticles(50, debouncedQuery, currentLang);
        setArticles(arts);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [debouncedQuery, currentLang]);

  if (loading && articles.length === 0) return <LoadingState message="Loading latest articles..." />;
  if (error && articles.length === 0) return <ErrorState message="Could not load latest articles." />;

  return (
    <div className="relative z-10 mx-auto w-full max-w-[100vw] min-w-0 px-4 sm:px-6 lg:px-8 xl:max-w-[1440px] xl:px-10 2xl:max-w-[1536px]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
        <div className="flex-1">
          <h1 className="font-display text-4xl md:text-5xl text-primary mb-3">Latest Articles</h1>
          <p className="text-lg text-secondary max-w-2xl leading-relaxed">
            Stay up to date with our most recently published stories across all categories.
          </p>
        </div>
        <div className="w-full md:w-72 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              type="text"
              placeholder="Search latest articles..."
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
        <EmptyState message={debouncedQuery ? "No articles match your search." : "No latest articles found."} />
      ) : (
        <div className="grid w-full max-w-full min-w-0 grid-cols-1 gap-6 p-3 pt-2 pb-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
