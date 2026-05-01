import { useState } from 'react';
import {
  getArticleDetail,
  saveArticleDetail,
  type ArticleDetailContent,
} from '@/services/articleDetailService';
import {
  deleteArticle,
  updateArticle,
  type Speech,
} from '@/services/articleServiceEnhanced';

function createEmptyDetail(article: Speech): ArticleDetailContent {
  return {
    id: article.id,
    abstract: article.summary || '',
    fullText: '',
    analysis: '',
  };
}

export function useArticleEditor(options: {
  loadData: (opts?: { skipArticlesRefresh?: boolean }) => Promise<void>;
  onSuccess: (message: string, duration?: number) => void;
}) {
  const { loadData, onSuccess } = options;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Speech | null>(null);
  const [editingDetail, setEditingDetail] = useState<ArticleDetailContent | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState<Speech | null>(null);

  const handleEditArticle = async (article: Speech) => {
    const articleCopy = JSON.parse(JSON.stringify(article)) as Speech;
    setEditingArticle(articleCopy);
    setEditDialogOpen(true);
    setLoadingDetail(true);

    try {
      const detail = await getArticleDetail(article.id);
      setEditingDetail(detail || createEmptyDetail(article));
    } catch (error) {
      console.error('Error loading article detail:', error);
      setEditingDetail(createEmptyDetail(article));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveArticle = async () => {
    if (!editingArticle) return;

    try {
      const result = await updateArticle(editingArticle);
      if (!result.success) {
        alert('保存失败：' + (result.error || '请重试'));
        return;
      }

      if (editingDetail) {
        await saveArticleDetail(editingDetail);
      }

      setEditDialogOpen(false);
      setEditingArticle(null);
      setEditingDetail(null);
      await loadData();
      onSuccess('保存成功');
    } catch (error) {
      console.error('Save article error:', error);
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleDeleteArticle = (article: Speech) => {
    setDeletingArticle(JSON.parse(JSON.stringify(article)) as Speech);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteArticle = async () => {
    if (!deletingArticle) return;

    try {
      const success = await deleteArticle(deletingArticle.id);
      if (!success) {
        alert('删除失败，请重试。系统已阻止不完整删除，避免产生孤儿记录。');
        return;
      }

      setDeleteDialogOpen(false);
      setDeletingArticle(null);
      await loadData();
      onSuccess('删除成功');
    } catch (error) {
      console.error('Delete article error:', error);
      alert('删除失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  return {
    editDialogOpen,
    setEditDialogOpen,
    editingArticle,
    setEditingArticle,
    editingDetail,
    setEditingDetail,
    loadingDetail,
    handleEditArticle,
    handleSaveArticle,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deletingArticle,
    handleDeleteArticle,
    confirmDeleteArticle,
  };
}

export type ArticleEditorReturn = ReturnType<typeof useArticleEditor>;
