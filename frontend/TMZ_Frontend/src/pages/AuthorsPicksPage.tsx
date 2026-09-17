import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { Article } from '@/types';
import { fetchAuthorsPicks } from '@/lib/api';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { Input } from '@/components/ui/Input';

export function AuthorsPicksPage() {
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
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const arts = await fetchAuthorsPicks(50, debouncedQuery);
        setArticles(arts);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [debouncedQuery]);

  if (loading && articles.length === 0) return <LoadingState message="Loading Author's Picks..." />;
  if (error && articles.length === 0) return <ErrorState message="Could not load Author's Picks." />;

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="flex-1">
          <h1 className="font-display text-4xl md:text-5xl text-primary mb-4">Author's Picks</h1>
          <p className="text-lg text-secondary max-w-2xl leading-relaxed">
            Hand-selected stories curated by our editorial team.
          </p>
        </div>
        <div className="w-full md:w-72 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <Input
              type="text"
              placeholder="Search author's picks..."
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
        <EmptyState message={debouncedQuery ? "No articles match your search." : "No author's picks found."} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
