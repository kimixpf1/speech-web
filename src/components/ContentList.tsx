import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import type { Speech } from '@/data/speeches';
import { SpeechCard } from '@/components/SpeechCard';

const INITIAL_GROUPS = 3;
const LOAD_MORE_GROUPS = 3;

interface ContentListProps {
  speeches: Speech[];
}

export function ContentList({ speeches }: ContentListProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_GROUPS);
  const sentinelRef = useRef<HTMLDivElement>(null);

  if (speeches.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">暂无相关内容</h3>
        <p className="text-gray-500 text-sm">请尝试调整筛选条件或搜索关键词</p>
      </div>
    );
  }

  const { grouped, sortedKeys } = useMemo(() => {
    const grouped = speeches.reduce((acc, speech) => {
      const key = `${speech.year}年${String(speech.month).padStart(2, '0')}月`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(speech);
      return acc;
    }, {} as Record<string, Speech[]>);

    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return { grouped, sortedKeys };
  }, [speeches]);

  useEffect(() => {
    setVisibleCount(INITIAL_GROUPS);
  }, [speeches]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE_GROUPS, sortedKeys.length));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sortedKeys.length]);

  const handleSaveScroll = useCallback(() => {
    sessionStorage.setItem('lastScrollY', window.scrollY.toString());
  }, []);

  const visibleKeys = sortedKeys.slice(0, visibleCount);
  const hasMore = visibleCount < sortedKeys.length;

  return (
    <div className="space-y-6">
      {visibleKeys.map((key) => (
        <div key={key}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-900">{key}</h2>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {grouped[key].length} 条
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {grouped[key].map((speech) => (
              <SpeechCard
                key={speech.id}
                speech={speech}
                detailUrl={`#/detail/${speech.id}`}
                onSaveScroll={handleSaveScroll}
                showDomain
              />
            ))}
          </div>
        </div>
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          <span className="text-sm text-gray-400">加载更多...</span>
        </div>
      )}
    </div>
  );
}
