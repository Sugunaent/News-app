import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { canonicalUrl, removeJsonLd, upsertJsonLd } from '@/lib/seo';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const itemsJson = JSON.stringify(items);

  useEffect(() => {
    const stableItems = JSON.parse(itemsJson) as BreadcrumbItem[];
    upsertJsonLd('breadcrumb-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: stableItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: canonicalUrl(item.href || window.location.pathname),
      })),
    });
    return () => removeJsonLd('breadcrumb-jsonld');
  }, [itemsJson]);

  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {index < items.length - 1 && item.href ? (
              <Link to={item.href} className="hover:text-brand-primary hover:underline">{item.label}</Link>
            ) : (
              <span aria-current="page" className="text-secondary">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
