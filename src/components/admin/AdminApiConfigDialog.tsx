import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface AdminApiConfigDialogProps {
  open: boolean;
  kimiApiKey: string;
  kimiKeyInput: string;
  kimiKeyValidating: boolean;
  deepSeekApiKey: string;
  deepSeekKeyInput: string;
  deepSeekKeyValidating: boolean;
  githubToken: string;
  tokenInput: string;
  tokenValidating: boolean;
  preferredSearchApi: 'kimi' | 'deepseek';
  preferredExtractionApi: 'kimi' | 'deepseek';
  onOpenChange: (open: boolean) => void;
  onKimiKeyInputChange: (value: string) => void;
  onSaveKimiKey: () => void;
  onClearKimiKey: () => void;
  onDeepSeekKeyInputChange: (value: string) => void;
  onSaveDeepSeekKey: () => void;
  onClearDeepSeekKey: () => void;
  onTokenInputChange: (value: string) => void;
  onSaveToken: () => void;
  onClearToken: () => void;
  onSwitchPreferredSearchApi: (api: 'kimi' | 'deepseek') => void;
  onSwitchPreferredExtractionApi: (api: 'kimi' | 'deepseek') => void;
}

export function AdminApiConfigDialog({
  open,
  kimiApiKey,
  kimiKeyInput,
  kimiKeyValidating,
  deepSeekApiKey,
  deepSeekKeyInput,
  deepSeekKeyValidating,
  githubToken,
  tokenInput,
  tokenValidating,
  preferredSearchApi,
  preferredExtractionApi,
  onOpenChange,
  onKimiKeyInputChange,
  onSaveKimiKey,
  onClearKimiKey,
  onDeepSeekKeyInputChange,
  onSaveDeepSeekKey,
  onClearDeepSeekKey,
  onTokenInputChange,
  onSaveToken,
  onClearToken,
  onSwitchPreferredSearchApi,
  onSwitchPreferredExtractionApi,
}: AdminApiConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI API 配置</DialogTitle>
          <DialogDescription>
            配置 Kimi 或 DeepSeek API Key 以使用 AI 搜索功能
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Kimi API Key
              {kimiApiKey && <span className="text-xs text-green-600">已配置</span>}
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                value={kimiKeyInput}
                onChange={(e) => onKimiKeyInputChange(e.target.value)}
                className="flex-1"
              />
              {kimiApiKey ? (
                <Button variant="outline" size="sm" onClick={onClearKimiKey}>
                  清除
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onSaveKimiKey}
                  disabled={!kimiKeyInput.trim() || kimiKeyValidating}
                >
                  {kimiKeyValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              在 <a href="https://platform.moonshot.cn/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Kimi开放平台</a> 获取
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              DeepSeek API Key
              {deepSeekApiKey && <span className="text-xs text-green-600">已配置</span>}
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                value={deepSeekKeyInput}
                onChange={(e) => onDeepSeekKeyInputChange(e.target.value)}
                className="flex-1"
              />
              {deepSeekApiKey ? (
                <Button variant="outline" size="sm" onClick={onClearDeepSeekKey}>
                  清除
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onSaveDeepSeekKey}
                  disabled={!deepSeekKeyInput.trim() || deepSeekKeyValidating}
                >
                  {deepSeekKeyValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              在 <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">DeepSeek平台</a> 获取
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <label className="text-sm font-medium flex items-center gap-2">
              GitHub Token
              <span className="text-xs text-gray-500">(用于AI搜索)</span>
              {githubToken && <span className="text-xs text-green-600">已配置</span>}
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={tokenInput}
                onChange={(e) => onTokenInputChange(e.target.value)}
                className="flex-1"
              />
              {githubToken ? (
                <Button variant="outline" size="sm" onClick={onClearToken}>
                  清除
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onSaveToken}
                  disabled={!tokenInput.trim() || tokenValidating}
                >
                  {tokenValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              需要 <code>repo</code> 和 <code>workflow</code> 权限。
              在 <a href="https://github.com/settings/tokens/new?scopes=repo,workflow" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">GitHub</a> 创建
            </p>
          </div>

          {(kimiApiKey || deepSeekApiKey) && (
            <div className="space-y-2">
              <label className="text-sm font-medium">搜索时优先使用</label>
              <div className="flex gap-2">
                <Button
                  variant={preferredSearchApi === 'kimi' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSwitchPreferredSearchApi('kimi')}
                  disabled={!kimiApiKey}
                >
                  Kimi
                </Button>
                <Button
                  variant={preferredSearchApi === 'deepseek' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSwitchPreferredSearchApi('deepseek')}
                  disabled={!deepSeekApiKey}
                >
                  DeepSeek
                </Button>
              </div>
            </div>
          )}

          {(kimiApiKey || deepSeekApiKey) && (
            <div className="space-y-2">
              <label className="text-sm font-medium">URL新增文章识别时优先使用</label>
              <div className="flex gap-2">
                <Button
                  variant={preferredExtractionApi === 'kimi' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSwitchPreferredExtractionApi('kimi')}
                  disabled={!kimiApiKey}
                >
                  Kimi
                </Button>
                <Button
                  variant={preferredExtractionApi === 'deepseek' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSwitchPreferredExtractionApi('deepseek')}
                  disabled={!deepSeekApiKey}
                >
                  DeepSeek
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
