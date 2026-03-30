import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Check, Trash2, CheckSquare, Square, MessageSquare } from 'lucide-react';
import type { Suggestion } from '@/services/suggestionService';

interface AdminSuggestionsTabProps {
  suggestions: Suggestion[];
  selectedSuggestions: Set<string>;
  onLoadData: () => void;
  onBatchMarkAsRead: () => void;
  onBatchDelete: () => void;
  onClearSuggestions: () => void;
  onToggleSelectAll: () => void;
  onToggleSelectSuggestion: (id: string) => void;
  onMarkSuggestionRead: (id: string) => void;
  onDeleteSuggestion: (id: string) => void;
}

export function AdminSuggestionsTab({
  suggestions,
  selectedSuggestions,
  onLoadData,
  onBatchMarkAsRead,
  onBatchDelete,
  onClearSuggestions,
  onToggleSelectAll,
  onToggleSelectSuggestion,
  onMarkSuggestionRead,
  onDeleteSuggestion,
}: AdminSuggestionsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">建议信箱</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onLoadData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
          {selectedSuggestions.size > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={onBatchMarkAsRead} className="text-blue-600">
                <Check className="w-4 h-4 mr-1" />
                标记已读 ({selectedSuggestions.size})
              </Button>
              <Button variant="outline" size="sm" onClick={onBatchDelete} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-1" />
                删除 ({selectedSuggestions.size})
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={onClearSuggestions} className="text-red-600">
            <Trash2 className="w-4 h-4 mr-1" />
            清空
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {suggestions.length > 0 ? (
          <>
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <button
                onClick={onToggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {selectedSuggestions.size === suggestions.length ? (
                  <CheckSquare className="w-5 h-5 text-red-600" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
                全选 ({selectedSuggestions.size}/{suggestions.length})
              </button>
            </div>

            {suggestions.map((suggestion) => (
              <Card
                key={suggestion.id}
                className={`${suggestion.status === 'unread' ? 'border-l-4 border-l-red-500' : ''} ${selectedSuggestions.has(suggestion.id) ? 'ring-2 ring-red-200' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => onToggleSelectSuggestion(suggestion.id)}
                        className="mt-1 flex-shrink-0"
                      >
                        {selectedSuggestions.has(suggestion.id) ? (
                          <CheckSquare className="w-5 h-5 text-red-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-medium text-gray-900">{suggestion.name}</span>
                          <span className="text-sm text-gray-400">
                            {suggestion.date} {suggestion.time}
                          </span>
                          {suggestion.status === 'unread' && (
                            <Badge variant="destructive">未读</Badge>
                          )}
                          {suggestion.status === 'read' && (
                            <Badge variant="outline" className="text-gray-500">已读</Badge>
                          )}
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{suggestion.content}</p>
                      </div>
                    </div>

                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      {suggestion.status === 'unread' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMarkSuggestionRead(suggestion.id)}
                          title="标记为已读"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteSuggestion(suggestion.id)}
                        className="text-red-600"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无建议</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
