import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Loader2, Settings, Sparkles } from 'lucide-react';
import type { Speech } from '@/services/articleServiceEnhanced';

interface AdminAddArticleDialogProps {
  open: boolean;
  newArticle: Partial<Speech>;
  fetchUrl: string;
  fetchingArticle: boolean;
  fetchError: string;
  fetchedContent: string;
  fetchedAnalysis: string;
  hasConfiguredExtractionProvider: boolean;
  preferredExtractionProvider: 'kimi' | 'deepseek' | null;
  showManualInput: boolean;
  manualUrl: string;
  manualContent: string;
  processingManual: boolean;
  onOpenChange: (open: boolean) => void;
  onNewArticleChange: (article: Partial<Speech>) => void;
  onFetchedAnalysisChange?: (value: string) => void;
  onFetchUrlChange: (value: string) => void;
  onFetchFromUrl: () => void;
  onOpenKimiKeyDialog: () => void;
  onToggleManualInput: () => void;
  onManualUrlChange: (value: string) => void;
  onManualContentChange: (value: string) => void;
  onProcessManualContent: () => void;
  onAddArticle: () => void;
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

export function AdminAddArticleDialog({
  open,
  newArticle,
  fetchUrl,
  fetchingArticle,
  fetchError,
  fetchedContent,
  fetchedAnalysis,
  hasConfiguredExtractionProvider,
  preferredExtractionProvider,
  showManualInput,
  manualUrl,
  manualContent,
  processingManual,
  onOpenChange,
  onNewArticleChange,
  onFetchedAnalysisChange,
  onFetchUrlChange,
  onFetchFromUrl,
  onOpenKimiKeyDialog,
  onToggleManualInput,
  onManualUrlChange,
  onManualContentChange,
  onProcessManualContent,
  onAddArticle,
}: AdminAddArticleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增文章</DialogTitle>
          <DialogDescription>添加新文章，或输入原文链接自动提取</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">AI智能提取</span>
                  {hasConfiguredExtractionProvider && (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      已配置{preferredExtractionProvider === 'deepseek' ? ' DeepSeek' : ' Kimi'}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={onOpenKimiKeyDialog} className="text-blue-600">
                  <Settings className="w-4 h-4 mr-1" />
                  {hasConfiguredExtractionProvider ? '管理 API' : '配置 AI API'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="粘贴原文链接，AI将精准提取标题、日期、摘要、全文、解读等内容"
                  value={fetchUrl}
                  onChange={(e) => onFetchUrlChange(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={onFetchFromUrl}
                  disabled={fetchingArticle || !fetchUrl.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {fetchingArticle ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      提取中
                    </>
                  ) : (
                    '提取'
                  )}
                </Button>
              </div>
              {fetchError && <p className="text-sm text-red-600 mt-2">{fetchError}</p>}
              {fetchedContent && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 font-medium mb-1">提取成功！已获取：</p>
                  <ul className="text-sm text-green-600 space-y-1">
                    <li>• 全文内容（{fetchedContent.length}字）</li>
                    {fetchedAnalysis && <li>• 解读分析（{fetchedAnalysis.length}字）</li>}
                  </ul>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-blue-200">
                <Button variant="link" size="sm" onClick={onToggleManualInput} className="text-blue-600 p-0">
                  {showManualInput ? '隐藏手动输入' : '自动提取失败？点击手动粘贴内容'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {showManualInput && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">手动粘贴内容</span>
                </div>
                <div className="space-y-3">
                  <Input
                    placeholder="原文链接（可选）"
                    value={manualUrl}
                    onChange={(e) => onManualUrlChange(e.target.value)}
                  />
                  <Textarea
                    placeholder="请从网页复制粘贴文章内容到这里，AI将自动提取标题、日期、摘要等信息..."
                    value={manualContent}
                    onChange={(e) => onManualContentChange(e.target.value)}
                    rows={8}
                  />
                  <Button
                    onClick={onProcessManualContent}
                    disabled={processingManual || !manualContent.trim()}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    {processingManual ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      'AI提取'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">或手动填写</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              标题 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="请输入文章标题"
              value={newArticle.title || ''}
              onChange={(e) => onNewArticleChange({ ...newArticle, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                日期 <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={newArticle.date || ''}
                onChange={(e) => onNewArticleChange({ ...newArticle, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                类型 <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={newArticle.category}
                onChange={(e) => {
                  const category = e.target.value as Speech['category'];
                  onNewArticleChange({
                    ...newArticle,
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                领域 <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={newArticle.domain || 'economy'}
                onChange={(e) => {
                  const domain = e.target.value as NonNullable<Speech['domain']>;
                  onNewArticleChange({
                    ...newArticle,
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
            <div className="space-y-2">
              <label className="text-sm font-medium">政绩观专题</label>
              <div className="flex items-center gap-4 h-10">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newArticle.isZhengjiguan || false}
                    onChange={(e) => onNewArticleChange({ ...newArticle, isZhengjiguan: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">是政绩观文章</span>
                </label>
                {newArticle.isZhengjiguan && (
                  <select
                    className="flex-1 h-8 px-2 rounded-md border border-input bg-background text-sm"
                    value={newArticle.zhengjiguanLevel || 'central'}
                    onChange={(e) =>
                      onNewArticleChange({
                        ...newArticle,
                        zhengjiguanLevel: e.target.value as 'central' | 'jiangsu' | 'suzhou',
                      })
                    }
                  >
                    <option value="central">中央</option>
                    <option value="jiangsu">江苏省</option>
                    <option value="suzhou">苏州市</option>
                  </select>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              来源 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="如：人民网、求是杂志等"
              value={newArticle.source || ''}
              onChange={(e) => onNewArticleChange({ ...newArticle, source: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">原文链接</label>
            <Input
              placeholder="请输入原文链接"
              value={newArticle.url || ''}
              onChange={(e) => onNewArticleChange({ ...newArticle, url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">地点（考察调研类请填写）</label>
            <Input
              placeholder="如：北京、上海等"
              value={newArticle.location || ''}
              onChange={(e) => onNewArticleChange({ ...newArticle, location: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              摘要 <span className="text-red-500">*</span>
              <span className="ml-2 text-xs font-normal text-gray-500">
                当前 {newArticle.summary?.trim().length || 0} 字
              </span>
            </label>
            <Textarea
              placeholder="请输入文章摘要"
              value={newArticle.summary || ''}
              onChange={(e) => onNewArticleChange({ ...newArticle, summary: e.target.value })}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">解读</label>
            <Textarea
              placeholder="AI 提取生成的解读会显示在这里，也可手动修改"
              value={fetchedAnalysis}
              onChange={(e) => onFetchedAnalysisChange?.(e.target.value)}
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onAddArticle} className="bg-red-600 hover:bg-red-700">
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
