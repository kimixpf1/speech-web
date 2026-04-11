import { useState } from 'react';
import { Calendar, MapPin, ExternalLink, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Speech } from '@/data/speeches';
import { categoryConfig } from '@/config/constants';

interface TimelineProps {
  speeches: Speech[];
}

export function Timeline({ speeches }: TimelineProps) {
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Filter speeches by year
  const filteredSpeeches = selectedYear === 'all' 
    ? speeches 
    : speeches.filter(s => s.year.toString() === selectedYear);

  // Group by year
  const yearGroups = filteredSpeeches.reduce((acc, speech) => {
    if (!acc[speech.year]) acc[speech.year] = [];
    acc[speech.year].push(speech);
    return acc;
  }, {} as Record<number, Speech[]>);

  const years = Object.keys(yearGroups).map(Number).sort((a, b) => b - a);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
      {/* Year Filter */}
      <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
        <Button
          variant={selectedYear === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedYear('all')}
          className={selectedYear === 'all' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          全部
        </Button>
        {['2026', '2025', '2024', '2023', '2022'].map((year) => (
          <Button
            key={year}
            variant={selectedYear === year ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedYear(year)}
            className={selectedYear === year ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {year}年
          </Button>
        ))}
      </div>

      {/* Timeline */}
      <div className="max-w-3xl mx-auto">
        {years.map((year) => (
          <div key={year} className="relative">
            {/* Year Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">{year}</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-red-200 to-transparent" />
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {yearGroups[year].length} 条
              </span>
            </div>

            {/* Timeline Items */}
            <div className="relative pl-8 md:pl-12 pb-10">
              {/* Vertical Line */}
              <div className="absolute left-4 md:left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-300 via-red-200 to-transparent" />

              {yearGroups[year]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((speech) => {
                  const config = categoryConfig[speech.category];
                  const Icon = config.icon;

                  return (
                    <div key={speech.id} className="relative mb-6 last:mb-0">
                      {/* Dot */}
                      <div className={`absolute -left-8 md:-left-12 top-0 w-8 h-8 rounded-full ${config.bgColor} border-2 border-white shadow-sm flex items-center justify-center z-10`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>

                      {/* Card */}
                      <div className={`bg-white rounded-lg p-4 shadow-sm border ${config.borderColor} hover:shadow-md transition-all`}>
                        {/* Date & Category */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">{speech.date}</span>
                          <Badge variant="outline" className={`${config.color} border-current text-xs`}>
                            {speech.categoryName}
                          </Badge>
                          <span className="text-xs text-gray-400">{speech.source}</span>
                        </div>

                        {/* Title - Clickable using <a> tag for reliable mobile navigation */}
                        <a 
                          href={`/#/detail/${speech.id}`}
                          onClick={() => {
                            // 保存当前滚动位置
                            localStorage.setItem('scrollPosition', window.scrollY.toString());
                          }}
                          className="block text-base font-semibold text-gray-900 mb-2 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          {speech.title}
                        </a>

                        {/* Location */}
                        {speech.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{speech.location}</span>
                          </div>
                        )}

                        {/* Summary */}
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">
                          {speech.summary}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          <a
                            href={`/#/detail/${speech.id}`}
                            onClick={() => {
                              // 保存当前滚动位置
                              localStorage.setItem('scrollPosition', window.scrollY.toString());
                            }}
                            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            查看详情
                          </a>

                          {speech.url && speech.url !== 'http://www.news.cn/' && speech.url !== 'https://www.qstheory.cn/' && (
                            <a
                              href={speech.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              原文
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {filteredSpeeches.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">暂无相关内容</h3>
          <p className="text-gray-500 text-sm">请尝试选择其他年份</p>
        </div>
      )}
    </div>
  );
}
