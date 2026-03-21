import { Search, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface HeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  stats: {
    total: number;
    speech: number;
    article: number;
    meeting: number;
    inspection: number;
  };
}

export function Hero({ searchQuery, onSearchChange, stats }: HeroProps) {
  return (
    <div className="relative min-h-[400px] lg:min-h-[450px] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-red-600 to-red-800">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-yellow-300 rounded-full blur-3xl" />
        </div>
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <TrendingUp className="w-4 h-4 text-yellow-300" />
            <span className="text-sm text-white/90">持续更新 · 权威来源 · 共 {stats.total} 篇</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            习近平总书记
            <span className="block text-yellow-300 mt-3">重要讲话学习平台</span>
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
            汇集人民日报、新华社、求是杂志等权威媒体发布的重要讲话、发表文章、重要会议和考察调研动态
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索标题、内容关键词..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-12 pr-4 py-3 h-12 rounded-xl bg-white/95 backdrop-blur-sm border-0 text-gray-900 placeholder:text-gray-400 shadow-xl text-base"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
