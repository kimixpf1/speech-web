import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
import type { Speech } from '@/services/articleServiceEnhanced';

interface AdminArticlesTabProps {
  articles: Speech[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onAddArticle: () => void;
  onEditArticle: (article: Speech) => void;
  onDeleteArticle: (article: Speech) => void;
}

export function AdminArticlesTab({
  articles,
  searchTerm,
  onSearchTermChange,
  onAddArticle,
  onEditArticle,
  onDeleteArticle,
}: AdminArticlesTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">文章管理</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索文章..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button className="bg-red-600 hover:bg-red-700" onClick={onAddArticle}>
            <Plus className="w-4 h-4 mr-1" />
            新增文章
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">标题</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">日期</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">分类</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">来源</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium max-w-md truncate">{article.title}</td>
                    <td className="py-3 px-4 text-sm">{article.date}</td>
                    <td className="py-3 px-4 text-sm">{article.categoryName}</td>
                    <td className="py-3 px-4 text-sm">{article.source}</td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onEditArticle(article)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteArticle(article)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
