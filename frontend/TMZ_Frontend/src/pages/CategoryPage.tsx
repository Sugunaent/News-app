import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Category, Article } from '@/types';
import { fetchCategoryBySlug, fetchArticlesByCategory } from '@/lib/api';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
        const arts = await fetchArticlesByCategory(cat.id);
        setArticles(arts);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return <LoadingState message="Loading category..." />;
  if (error || !category) return <ErrorState message="Category not found." />;

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl md:text-5xl text-primary mb-4">{category.name}</h1>
        {category.description && (
          <p className="text-lg text-secondary max-w-2xl mx-auto leading-relaxed">{category.description}</p>
        )}
      </div>

      {articles.length === 0 ? (
        <EmptyState message="No articles in this category yet." />
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
