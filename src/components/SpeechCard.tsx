import { useState, useCallback, memo } from 'react';
import { Calendar, MapPin, ExternalLink, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Speech } from '@/data/speeches';
import { normalizeArticleUrl, openExternalUrl } from '@/lib/utils';
import { categoryConfig, domainConfig, levelConfig } from '@/config/constants';

interface SpeechCardProps {
  speech: Speech;
  detailUrl: string;
  onSaveScroll?: () => void;
  showDomain?: boolean;
  showLevel?: boolean;
  onMouseEnter?: () => void;
}

export const SpeechCard = memo(function SpeechCard({
  speech,
  detailUrl,
  onSaveScroll,
  showDomain = false,
  showLevel = false,
  onMouseEnter,
}: SpeechCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = categoryConfig[speech.category] || categoryConfig.speech;
  const Icon = config.icon;
  const originalUrl = normalizeArticleUrl(speech.url);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onSaveScroll?.();
    window.location.hash = detailUrl.replace(/^[^#]*#/, '');
  }, [detailUrl, onSaveScroll]);

  return (
    <Card
      className="group hover:shadow-lg transition-all duration-200 border-gray-100 overflow-hidden"
      onMouseEnter={onMouseEnter}
      onFocus={onMouseEnter}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            <a
              href={detailUrl}
              onClick={handleClick}
              className="block text-lg font-semibold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 mb-3 cursor-pointer"
            >
              {speech.title}
            </a>

            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 flex-wrap">
              {showLevel && speech.zhengjiguanLevel && levelConfig[speech.zhengjiguanLevel] && (
                <Badge variant="outline" className={`${levelConfig[speech.zhengjiguanLevel].color} border-current text-xs px-2 py-0.5`}>
                  {levelConfig[speech.zhengjiguanLevel].label}
                </Badge>
              )}
              {showDomain && speech.domain && speech.domainName && (
                <Badge variant="outline" className={`${domainConfig[speech.domain]?.color || 'text-gray-600'} border-current text-xs px-2 py-0.5`}>
                  {speech.domainName}
                </Badge>
              )}
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

            <div className={`text-gray-600 text-base leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
              {speech.summary}
            </div>

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
                href={detailUrl}
                onClick={handleClick}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors ml-auto"
              >
                <BookOpen className="w-4 h-4" />
                查看详情
              </a>

              {originalUrl && (
                <a
                  href={originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openExternalUrl(originalUrl);
                  }}
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
});
