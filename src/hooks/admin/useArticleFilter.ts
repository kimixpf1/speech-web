import { useMemo, useState } from 'react';
import type { Speech } from '@/services/articleServiceEnhanced';

export function useArticleFilter(articles: Speech[]) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredArticles = useMemo(
    () =>
      articles.filter(
        (article) =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.summary.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [articles, searchTerm]
  );

  return { searchTerm, setSearchTerm, filteredArticles };
}
