import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getAutoSearchStatus } from '@/services/autoSearchScheduler';

export function AutoSearchStatus() {
  const [status, setStatus] = useState<ReturnType<typeof getAutoSearchStatus> | null>(null);

  useEffect(() => {
    // 初始加载
    setStatus(getAutoSearchStatus());

    // 每30秒更新一次状态
    const interval = setInterval(() => {
      setStatus(getAutoSearchStatus());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const getSlotLabel = (slot: string | null) => {
    if (slot === 'morning') return '早间';
    if (slot === 'evening') return '晚间';
    return '非搜索时段';
  };

  const getSlotColor = (slot: string | null) => {
    if (slot === 'morning') return 'bg-orange-100 text-orange-700 border-orange-200';
    if (slot === 'evening') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-gray-600">自动搜索:</span>
          <Badge variant="outline" className="text-xs">
            早8点搜昨日 / 晚8点搜今日
          </Badge>
        </div>
        
        {status.currentSlot && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500">|</span>
            <Badge className={`text-xs ${getSlotColor(status.currentSlot)}`}>
              当前: {getSlotLabel(status.currentSlot)}时段
            </Badge>
            {status.lastSearchSlot === status.currentSlot ? (
              <span className="flex items-center gap-1 text-green-600 text-xs">
                <CheckCircle className="w-3 h-3" />
                本时段已搜索
              </span>
            ) : (
              <span className="flex items-center gap-1 text-blue-600 text-xs">
                <AlertCircle className="w-3 h-3" />
                等待自动搜索
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="text-gray-500 text-xs">
        下次搜索: {status.nextSearchTime}
      </div>
    </div>
  );
}