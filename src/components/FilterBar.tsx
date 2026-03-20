import { Calendar, X, Mic, FileText, Users, MapPin, LayoutGrid, TrendingUp, Landmark, BookOpen, Leaf, Flag, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categoryOptions, yearOptions, domainOptions } from '@/data/speeches';

interface FilterBarProps {
  selectedDomain: string;
  onDomainChange: (domain: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedYear: string;
  onYearChange: (year: string) => void;
  resultCount: number;
}

const categoryIconMap: Record<string, React.ElementType> = {
  LayoutGrid,
  Mic,
  FileText,
  Users,
  MapPin,
};

const domainIconMap: Record<string, React.ElementType> = {
  LayoutGrid,
  TrendingUp,
  Landmark,
  BookOpen,
  Users,
  Leaf,
  Flag,
  Shield,
  Globe,
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  all: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  speech: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  article: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  meeting: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  inspection: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
};

const domainColors: Record<string, { bg: string; text: string; border: string }> = {
  all: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  economy: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  politics: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  culture: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  society: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  ecology: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  party: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  defense: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  diplomacy: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
};

export function FilterBar({
  selectedDomain,
  onDomainChange,
  selectedCategory,
  onCategoryChange,
  selectedYear,
  onYearChange,
  resultCount,
}: FilterBarProps) {
  const hasActiveFilters = selectedDomain !== 'all' || selectedCategory !== 'all' || selectedYear !== 'all';

  const clearFilters = () => {
    onDomainChange('all');
    onCategoryChange('all');
    onYearChange('all');
  };

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-3">
        <div className="flex flex-col gap-3">
          {/* 领域筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium shrink-0">领域：</span>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {domainOptions.map((domain) => {
                const Icon = domainIconMap[domain.icon] || LayoutGrid;
                const isActive = selectedDomain === domain.value;
                const colors = domainColors[domain.value];
                
                return (
                  <button
                    key={domain.value}
                    onClick={() => onDomainChange(domain.value)}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? `${colors.bg} ${colors.text} border ${colors.border}`
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {domain.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 类型筛选和右侧控制 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* 类型筛选 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium shrink-0">类型：</span>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {categoryOptions.map((cat) => {
                  const Icon = categoryIconMap[cat.icon] || LayoutGrid;
                  const isActive = selectedCategory === cat.value;
                  const colors = categoryColors[cat.value];
                  
                  return (
                    <button
                      key={cat.value}
                      onClick={() => onCategoryChange(cat.value)}
                      className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? `${colors.bg} ${colors.text} border ${colors.border}`
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 右侧控制 */}
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={onYearChange}>
                <SelectTrigger className="w-[110px] h-8 text-sm rounded-lg border-gray-200">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                  <SelectValue placeholder="年份" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year.value} value={year.value} className="text-sm">
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="secondary" className="bg-red-50 text-red-600 px-2.5 py-1 text-xs font-medium">
                {resultCount} 条
              </Badge>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-red-600 h-8 px-2 text-xs"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  清除
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}