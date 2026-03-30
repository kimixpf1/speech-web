import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ArticleDetailContent } from '@/services/articleDetailService';
import type { Speech } from '@/services/articleServiceEnhanced';

interface AdminEditArticleDialogProps {
  open: boolean;
  editingArticle: Speech | null;
  editingDetail: ArticleDetailContent | null;
  loadingDetail: boolean;
  onOpenChange: (open: boolean) => void;
  onEditingArticleChange: (article: Speech) => void;
  onEditingDetailChange: (detail: ArticleDetailContent) => void;
  onSave: () => void;
}

const CATEGORY_NAMES: Record<Speech['category'], string> = {
  speech: '重要讲话',
  article: '发表文章',
  meeting: '重要会议',
  inspection: '考察调研',
};

const DOMAIN_NAMES: Record<NonNullable<Speech['domain']>, string> = {
  economy: '经济',
  politics: '政治',
  culture: '文化',
  society: '社会',
  ecology: '生态',
  party: '党建',
  defense: '国防',
  diplomacy: '外交',
};

export function AdminEditArticleDialog({
  open,
  editingArticle,
  editingDetail,
  loadingDetail,
  onOpenChange,
  onEditingArticleChange,
  onEditingDetailChange,
  onSave,
}: AdminEditArticleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑文章</DialogTitle>
          <DialogDescription>修改文章信息</DialogDescription>
        </DialogHeader>
        {editingArticle && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">标题</label>
              <Input
                value={editingArticle.title}
                onChange={(e) => onEditingArticleChange({ ...editingArticle, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">日期</label>
              <Input
                value={editingArticle.date}
                onChange={(e) => onEditingArticleChange({ ...editingArticle, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">类型</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={editingArticle.category}
                  onChange={(e) => {
                    const category = e.target.value as Speech['category'];
                    onEditingArticleChange({
                      ...editingArticle,
                      category,
                      categoryName: CATEGORY_NAMES[category],
                    });
                  }}
                >
                  <option value="speech">重要讲话</option>
                  <option value="article">发表文章</option>
                  <option value="meeting">重要会议</option>
                  <option value="inspection">考察调研</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">领域</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={editingArticle.domain || 'economy'}
                  onChange={(e) => {
                    const domain = e.target.value as NonNullable<Speech['domain']>;
                    onEditingArticleChange({
                      ...editingArticle,
                      domain,
                      domainName: DOMAIN_NAMES[domain],
                    });
                  }}
                >
                  <option value="economy">经济</option>
                  <option value="politics">政治</option>
                  <option value="culture">文化</option>
                  <option value="society">社会</option>
                  <option value="ecology">生态</option>
                  <option value="party">党建</option>
                  <option value="defense">国防</option>
                  <option value="diplomacy">外交</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">来源</label>
              <Input
                value={editingArticle.source}
                onChange={(e) => onEditingArticleChange({ ...editingArticle, source: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">原文链接</label>
              <Input
                value={editingArticle.url || ''}
                onChange={(e) => onEditingArticleChange({ ...editingArticle, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">地点</label>
              <Input
                value={editingArticle.location || ''}
                onChange={(e) => onEditingArticleChange({ ...editingArticle, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">摘要</label>
              <Textarea
                value={editingArticle.summary}
                onChange={(e) => onEditingArticleChange({ ...editingArticle, summary: e.target.value })}
                rows={4}
              />
            </div>
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">详情页内容</h4>
              {loadingDetail ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                  <span className="ml-2 text-sm text-gray-500">加载详情中...</span>
                </div>
              ) : editingDetail && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">原文内容</label>
                    <Textarea
                      value={editingDetail.fullText}
                      onChange={(e) => onEditingDetailChange({ ...editingDetail, fullText: e.target.value })}
                      rows={8}
                      placeholder="输入或粘贴文章原文内容..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400">当前字数：{editingDetail.fullText.length}</p>
                  </div>
                  <div className="space-y-2 mt-4">
                    <label className="text-sm font-medium">解读</label>
                    <Textarea
                      value={editingDetail.analysis}
                      onChange={(e) => onEditingDetailChange({ ...editingDetail, analysis: e.target.value })}
                      rows={4}
                      placeholder="输入文章解读..."
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSave} className="bg-red-600 hover:bg-red-700">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
