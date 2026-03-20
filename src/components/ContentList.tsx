import { useState } from 'react';
import { Calendar, MapPin, ExternalLink, ChevronDown, ChevronUp, Mic, FileText, Users, MapPin as MapPinIcon, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Speech } from '@/data/speeches';

interface ContentListProps {
  speeches: Speech[];
}

const categoryConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  speech: { icon: Mic, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
  article: { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-100' },
  meeting: { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-100' },
  inspection: { icon: MapPinIcon, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-100' },
};

// 领域配置
const domainConfig: Record<string, { color: string; bgColor: string }> = {
  economy: { color: 'text-blue-600', bgColor: 'bg-blue-50' },
  politics: { color: 'text-red-600', bgColor: 'bg-red-50' },
  culture: { color: 'text-purple-600', bgColor: 'bg-purple-50' },
  society: { color: 'text-green-600', bgColor: 'bg-green-50' },
  ecology: { color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  party: { color: 'text-orange-600', bgColor: 'bg-orange-50' },
  defense: { color: 'text-slate-600', bgColor: 'bg-slate-50' },
  diplomacy: { color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
};

function SpeechCard({ speech }: { speech: Speech }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = categoryConfig[speech.category];
  const Icon = config.icon;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-gray-100 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Category Icon */}
          <div className={`w-12 h-12 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title - Clickable using <a> tag for reliable mobile navigation */}
            <a 
              href={`/speech-web/#/detail/${speech.id}`}
              onClick={() => {
                // 保存当前滚动位置
                localStorage.setItem('scrollPosition', window.scrollY.toString());
              }}
              className="block text-lg font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 mb-3 cursor-pointer"
            >
              {speech.title}
            </a>

            {/* Meta Info */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 flex-wrap">
              {/* 领域标签 */}
              {speech.domain && speech.domainName && (
                <Badge variant="outline" className={`${domainConfig[speech.domain]?.color || 'text-gray-600'} border-current text-xs px-2 py-0.5`}>
                  {speech.domainName}
                </Badge>
              )}
              {/* 类型标签 */}
              <Badge variant="outline" className={`${config.color} border-current text-xs px-2 py-0.5`}>
                {speech.categoryName}
              </Badge>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {speech.date}
              </span>
              {speech.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {speech.location}
                </span>
              )}
              <span className="text-gray-400">{speech.source}</span>
            </div>

            {/* Summary */}
            <div className={`text-gray-600 text-base leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
              {speech.summary}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    收起
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    展开
                  </>
                )}
              </button>

              <a
                href={`/speech-web/#/detail/${speech.id}`}
                onClick={() => {
                  // 保存当前滚动位置
                  localStorage.setItem('scrollPosition', window.scrollY.toString());
                }}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors ml-auto"
              >
                <BookOpen className="w-4 h-4" />
                查看详情
              </a>

              {speech.url && (
                <a
                  href={speech.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  原文
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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

  // Sort speeches by date descending (newest first)
  const sortedSpeeches = [...speeches].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Group by year and month
  const grouped = sortedSpeeches.reduce((acc, speech) => {
    const key = `${speech.year}年${speech.month}月`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(speech);
    return acc;
  }, {} as Record<string, Speech[]>);

  // Sort keys in descending order (newest first)
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
              <SpeechCard key={speech.id} speech={speech} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
