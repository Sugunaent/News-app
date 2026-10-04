import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Category, Article } from '@/types';
import { fetchCategoryBySlug, fetchArticlesByCategory } from '@/lib/api';
import { ArticleCard } from '@/components/articles/ArticleCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/States';
import { Input } from '@/components/ui/Input';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { canonicalUrl, setPageMetadata, upsertJsonLd } from '@/lib/seo';
import { useLanguage } from '@/lib/language';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { currentLang } = useLanguage();
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
        const arts = await fetchArticlesByCategory(cat.id, debouncedQuery, currentLang);
        setArticles(arts);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, debouncedQuery, currentLang]);

  useEffect(() => {
    if (error && slug) {
      setPageMetadata({
        title: 'Category not found | The Modern Stories',
        description: 'This story category could not be found.',
        canonicalPath: `/category/${slug}`,
      });
      return;
    }
    if (!category || !slug) return;

    const title = `${category.name} Stories | The Modern Stories`;
    const description = category.description || `Explore published ${category.name.toLowerCase()} stories and interactive articles from The Modern Stories.`;
    const canonical = canonicalUrl(`/category/${category.slug}`);
    setPageMetadata({ title, description, canonicalPath: canonical });
    upsertJsonLd('page-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      isPartOf: { '@id': `${canonicalUrl('/')}#website` },
    });
  }, [category, error, slug]);

  if (loading && !category) return <LoadingState message="Loading category..." />;
  if (error || !category) return <ErrorState message="Category not found." />;

  return (
    <div className="relative z-10 mx-auto w-full max-w-[100vw] min-w-0 px-4 sm:px-6 lg:px-8 xl:max-w-[1440px] xl:px-10 2xl:max-w-[1536px]">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: category.name }]} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
        <div className="flex-1">
          <h1 className="font-display text-4xl md:text-5xl text-primary mb-3">{category.name}</h1>
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
        <div className="grid w-full max-w-full min-w-0 grid-cols-1 gap-6 p-3 pt-2 pb-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
