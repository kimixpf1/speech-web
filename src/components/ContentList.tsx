import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import type { Speech } from '@/data/speeches';
import { SpeechCard } from '@/components/SpeechCard';

interface ContentListProps {
  speeches: Speech[];
}

export function ContentList({ speeches }: ContentListProps) {
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
    const sortedSpeeches = [...speeches].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const grouped = sortedSpeeches.reduce((acc, speech) => {
      const key = `${speech.year}年${speech.month}月`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(speech);
      return acc;
    }, {} as Record<string, Speech[]>);

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const matchA = a.match(/(\d+)年(\d+)月/);
      const matchB = b.match(/(\d+)年(\d+)月/);
      if (!matchA || !matchB) return 0;
      const yearA = parseInt(matchA[1]);
      const yearB = parseInt(matchB[1]);
      const monthA = parseInt(matchA[2]);
      const monthB = parseInt(matchB[2]);
      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    });

    return { grouped, sortedKeys };
  }, [speeches]);

  return (
    <div className="space-y-6">
      {sortedKeys.map((key) => (
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
                onSaveScroll={() => sessionStorage.setItem('lastScrollY', window.scrollY.toString())}
                showDomain
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
