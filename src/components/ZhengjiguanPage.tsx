import { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getZhengjiguanArticles, type Speech } from '@/services/articleServiceEnhanced';
import { zhengjiguanLevels } from '@/data/speeches';
import { SpeechCard } from '@/components/SpeechCard';
import { levelConfig } from '@/config/constants';

interface ContentListProps {
  speeches: Speech[];
}

function ContentList({ speeches }: ContentListProps) {
  if (speeches.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">暂无相关内容</h3>
        <p className="text-gray-500 text-sm">政绩观专题文章正在整理中</p>
      </div>
    );
  }

  const sortedSpeeches = [...speeches].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // 按层级分组
  const grouped = sortedSpeeches.reduce((acc, speech) => {
    const level = speech.zhengjiguanLevel || 'central';
    if (!acc[level]) acc[level] = [];
    acc[level].push(speech);
    return acc;
  }, {} as Record<string, Speech[]>);

  const levelOrder = ['central', 'jiangsu', 'suzhou'];

  return (
    <div className="space-y-8">
      {levelOrder.map(level => {
        const levelSpeeches = grouped[level];
        if (!levelSpeeches || levelSpeeches.length === 0) return null;
        
        const levelCfg = levelConfig[level];
        const LevelIcon = levelCfg.icon;
        
        return (
          <div key={level}>
            <div className="flex items-center gap-2 mb-4">
              <LevelIcon className={`w-5 h-5 ${levelCfg.color}`} />
              <h2 className="text-xl font-bold text-gray-900">{levelCfg.label}文件</h2>
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                {levelSpeeches.length} 篇
              </Badge>
            </div>
            <div className="space-y-4">
              {levelSpeeches.map((speech) => (
                <SpeechCard
                  key={speech.id}
                  speech={speech}
                  detailUrl={`/speech-web/#/zhengjiguan/${speech.id}`}
                  onSaveScroll={() => sessionStorage.setItem('zhengjiguan_scrollPosition', window.scrollY.toString())}
                  showLevel
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ZhengjiguanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [articles, setArticles] = useState<Speech[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');

  // 滚动恢复
  const targetScrollRef = useRef<number | null>(null);
  const [isScrollRestoring, setIsScrollRestoring] = useState(
    () => sessionStorage.getItem('zhengjiguan_scrollPosition') !== null
  );

  // 禁用浏览器自动滚动恢复
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // 读取保存的滚动位置
  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem('zhengjiguan_scrollPosition');
    if (savedPosition) {
      targetScrollRef.current = parseInt(savedPosition, 10);
    }
  }, [location.key]);

  // 等数据加载完成后再恢复滚动位置
  useLayoutEffect(() => {
    if (targetScrollRef.current === null) return;
    if (articles.length === 0) return;

    const targetPosition = targetScrollRef.current;
    window.scrollTo(0, targetPosition);
    sessionStorage.removeItem('zhengjiguan_scrollPosition');
    targetScrollRef.current = null;
    setIsScrollRestoring(false);
  }, [articles]);

  // 安全超时
  useEffect(() => {
    if (!isScrollRestoring) return;
    const timer = setTimeout(() => {
      if (targetScrollRef.current !== null) {
        window.scrollTo(0, targetScrollRef.current);
        sessionStorage.removeItem('zhengjiguan_scrollPosition');
        targetScrollRef.current = null;
      }
      setIsScrollRestoring(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [isScrollRestoring]);

  useEffect(() => {
    // 如果没有保存的滚动位置，才滚动到顶部
    if (!sessionStorage.getItem('zhengjiguan_scrollPosition')) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    const loadArticles = async () => {
      const data = await getZhengjiguanArticles();
      setArticles(data);
    };
    loadArticles();
  }, []);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (selectedLevel !== 'all' && article.zhengjiguanLevel !== selectedLevel) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = article.title.toLowerCase().includes(query);
        const matchSummary = article.summary.toLowerCase().includes(query);
        return matchTitle || matchSummary;
      }
      return true;
    });
  }, [searchQuery, selectedLevel, articles]);

  const stats = useMemo(() => {
    return {
      total: articles.length,
      central: articles.filter(a => a.zhengjiguanLevel === 'central').length,
      jiangsu: articles.filter(a => a.zhengjiguanLevel === 'jiangsu').length,
      suzhou: articles.filter(a => a.zhengjiguanLevel === 'suzhou').length,
    };
  }, [articles]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-700 to-red-600 text-white py-6 shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-white/10 mb-4"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回首页
          </Button>
          <h1 className="text-3xl font-bold">政绩观专题学习</h1>
          <p className="text-red-100 mt-2">树立和践行正确政绩观学习教育</p>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">层级：</span>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setSelectedLevel('all')}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedLevel === 'all'
                      ? 'bg-gray-100 text-gray-700 border border-gray-300'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  全部
                </button>
                {zhengjiguanLevels.map((level) => {
                  const cfg = levelConfig[level.value];
                  const LevelIcon = cfg.icon;
                  const isActive = selectedLevel === level.value;
                  
                  return (
                    <button
                      key={level.value}
                      onClick={() => setSelectedLevel(level.value)}
                      className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? `${cfg.bgColor} ${cfg.color} border border-current`
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      <LevelIcon className="w-3.5 h-3.5" />
                      {level.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-red-50 text-red-600 px-2.5 py-1 text-xs font-medium">
                共 {filteredArticles.length} 条
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">总文章数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.central}</div>
              <div className="text-sm text-gray-500">中央文件</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.jiangsu}</div>
              <div className="text-sm text-gray-500">江苏省文件</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.suzhou}</div>
              <div className="text-sm text-gray-500">苏州市文件</div>
            </CardContent>
          </Card>
        </div>

        <ContentList speeches={filteredArticles} />
      </main>
    </div>
  );
}
