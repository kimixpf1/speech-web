import { useArticleFilter } from '@/hooks/admin/useArticleFilter';
import { useArticleEditor } from '@/hooks/admin/useArticleEditor';
import { useArticleCreationFlow } from '@/hooks/admin/useArticleCreationFlow';
import { useExtractionCredentialPrompt } from '@/hooks/admin/useExtractionCredentialPrompt';
import type { Speech } from '@/services/articleServiceEnhanced';

interface UseAdminArticleManagementOptions {
  articles: Speech[];
  loadData: (options?: { skipArticlesRefresh?: boolean }) => Promise<void>;
  onSuccess: (message: string, duration?: number) => void;
  setActiveTab: (tab: string) => void;
  setArticles: React.Dispatch<React.SetStateAction<Speech[]>>;
}

export function useAdminArticleManagement({
  articles,
  loadData,
  onSuccess,
  setActiveTab,
  setArticles,
}: UseAdminArticleManagementOptions) {
  const configPrompt = useExtractionCredentialPrompt({ onSuccess });

  const filter = useArticleFilter(articles);

  const editor = useArticleEditor({ loadData, onSuccess });

  const creation = useArticleCreationFlow({
    loadData,
    onSuccess,
    setActiveTab,
    setArticles,
    onMissingApiKey: () => configPrompt.setShowKimiKeyDialog(true),
  });

  return {
    filter,
    editor,
    creation,
    configPrompt,
  };
}

export type AdminArticleManagementReturn = ReturnType<typeof useAdminArticleManagement>;
