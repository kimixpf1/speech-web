import { useState, useMemo, useEffect, useLayoutEffect, useRef, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { FilterBar } from '@/components/FilterBar';
import { ContentList } from '@/components/ContentList';
import { About } from '@/components/About';
import { Footer } from '@/components/Footer';
import { ZhengjiguanPage } from '@/components/ZhengjiguanPage';
import useSWR from 'swr';
import { getArticles, getLocalArticlesSync, getZhengjiguanArticles, setupRealtimeSubscription, type Speech } from '@/services/articleServiceEnhanced';
import { initAnalytics } from '@/services/analytics';
import { isAdminLoggedInSync, isAdminLoggedIn } from '@/services/adminAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { NotFoundPage } from '@/components/NotFoundPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { safeGetStorageItem, safeSetStorageItem } from '@/lib/utils';
import './App.css';


// 懒加载页面组件
const loadDetailPage = () => import('@/components/DetailPage');
const DetailPage = lazy(() => loadDetailPage().then(m => ({ default: m.DetailPage })));
const AdminLogin = lazy(() => import('@/components/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import('@/components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const SuggestionBox = lazy(() => import('@/components/SuggestionBox').then(m => ({ default: m.SuggestionBox })));

// 全局加载指示器 (骨架屏)
function PageLoader() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* 顶部标题骨架 */}
      <div className="space-y-4 mb-8">
        <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      </div>
      
      {/* 内容卡片骨架 */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-5/6 animate-pulse"></div>
              <div className="flex gap-2">
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 获取上次的滚动位置以避免返回时白屏等待
function getInitialScrollPosition() {
  const saved = safeGetStorageItem('session', 'lastScrollY');
  return saved ? parseInt(saved, 10) : 0;
}

function HomePage() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms 防抖延迟
  const cachedArticles = useMemo(() => getLocalArticlesSync(), []);
  const hasRestoredScrollRef = useRef(false);

  // 记录滚动位置
  useEffect(() => {
    const handleScroll = () => {
      safeSetStorageItem('session', 'lastScrollY', window.scrollY.toString());
      hasRestoredScrollRef.current = false;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [selectedDomain, setSelectedDomain] = useState(
    () => safeGetStorageItem('session', 'selectedDomain') || 'economy'
  );
  const [selectedCategory, setSelectedCategory] = useState(
    () => safeGetStorageItem('session', 'selectedCategory') || 'all'
  );
  const [selectedYear, setSelectedYear] = useState(
    () => safeGetStorageItem('session', 'selectedYear') || 'all'
  );

  // 使用 SWR 获取数据并处理缓存，替代手写的 useState 和 useEffect 获取逻辑
  const { data: articles = [], mutate, isLoading } = useSWR<Speech[]>('articles', getArticles, {
    fallbackData: cachedArticles,
    revalidateOnFocus: false, // 避免切换标签页时频繁拉取
  });
  const { data: zhengjiguanArticles = [], mutate: mutateZhengjiguan } = useSWR<Speech[]>('zhengjiguan-articles', getZhengjiguanArticles, {
    fallbackData: [],
    revalidateOnFocus: false,
  });

  // 持久化筛选状态到sessionStorage（返回时恢复，关闭标签页后重置为economy默认）
  useEffect(() => {
    safeSetStorageItem('session', 'selectedDomain', selectedDomain);
  }, [selectedDomain]);

  useEffect(() => {
    safeSetStorageItem('session', 'selectedCategory', selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    safeSetStorageItem('session', 'selectedYear', selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    const preload = () => {
      void loadDetailPage();
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => preload(), { timeout: 1200 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(preload, 300);
    return () => window.clearTimeout(timeoutId);
  }, []);

  // 初始化访问统计并设置实时订阅
  useEffect(() => {
    initAnalytics();

    // 设置实时订阅，通过 SWR 的 mutate 方法更新本地缓存
    const unsubscribe = setupRealtimeSubscription(
      (updatedArticle) => {
        mutate((prevArticles = []) => {
          const index = prevArticles.findIndex(a => a.id === updatedArticle.id);
          if (index !== -1) {
            const updated = [...prevArticles];
            updated[index] = updatedArticle;
            return updated;
          }
          return [updatedArticle, ...prevArticles];
        }, false); // 设置为 false 避免不必要的重新验证请求
        if (updatedArticle.isZhengjiguan) {
          void mutateZhengjiguan();
        }
      },
      (deletedId) => {
        mutate((prevArticles = []) => prevArticles.filter(a => a.id !== deletedId), false);
        void mutateZhengjiguan();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [mutate, mutateZhengjiguan]);

  // Calculate stats
  const stats = useMemo(() => {
    const zhengjiguanCount = zhengjiguanArticles.length;
    return {
      total: articles.length + zhengjiguanCount,
      speech: articles.filter(s => s.category === 'speech').length,
      article: articles.filter(s => s.category === 'article').length,
      meeting: articles.filter(s => s.category === 'meeting').length,
      inspection: articles.filter(s => s.category === 'inspection').length,
    };
  }, [articles, zhengjiguanArticles]);

  // Filter and sort speeches
  const filteredSpeeches = useMemo(() => {
    let result = articles.filter((speech) => {
      // Domain filter
      if (selectedDomain !== 'all' && speech.domain !== selectedDomain) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && speech.category !== selectedCategory) {
        return false;
      }

      // Year filter
      if (selectedYear !== 'all' && speech.year.toString() !== selectedYear) {
        return false;
      }

      // Search filter using debounced query
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase().trim();
        const matchTitle = speech.title.toLowerCase().includes(query);
        const matchSummary = speech.summary.toLowerCase().includes(query);
        const matchLocation = speech.location?.toLowerCase().includes(query) || false;
        return matchTitle || matchSummary || matchLocation;
      }

      return true;
    });

    // 当显示"全部"领域时，经济领域文章置顶，其他按日期排序
    if (selectedDomain === 'all') {
      result.sort((a, b) => {
        const aIsEcon = a.domain === 'economy' ? 0 : 1;
        const bIsEcon = b.domain === 'economy' ? 0 : 1;
        if (aIsEcon !== bIsEcon) return aIsEcon - bIsEcon;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }

    return result;
  }, [debouncedSearchQuery, selectedDomain, selectedCategory, selectedYear, articles]);

  // 当文章列表加载完成后，恢复滚动位置
  useLayoutEffect(() => {
    if (hasRestoredScrollRef.current || articles.length === 0) {
      return;
    }

    const savedScrollY = getInitialScrollPosition();
    if (savedScrollY <= 0) {
      hasRestoredScrollRef.current = true;
      return;
    }

    const restoreScroll = () => {
      window.scrollTo(0, savedScrollY);
      hasRestoredScrollRef.current = true;
    };

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(restoreScroll);
      return;
    }

    window.setTimeout(restoreScroll, 0);
  }, [articles.length]);

  return (
    <div>
      <Hero
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        stats={stats}
      />
      <FilterBar
        selectedDomain={selectedDomain}
        onDomainChange={setSelectedDomain}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        resultCount={filteredSpeeches.length}
      />
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
        {articles.length === 0 && isLoading ? (
          <div className="text-center py-20 text-gray-400">加载文章中...</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">暂无可显示的文章数据</div>
        ) : (
          <ContentList speeches={filteredSpeeches} />
        )}
      </main>
    </div>
  );
}

function AboutPage() {
  useEffect(() => {
    // 进入关于页面时直接跳转到顶部（无动画）
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);
  
  return (
    <>
      <div className="bg-gradient-to-br from-red-700 to-red-800 py-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 text-center">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">关于平台</h1>
          <p className="text-base text-white/80 max-w-xl mx-auto">
            了解本平台的建设初衷、功能特点和数据来源
          </p>
        </div>
      </div>
      <About />
    </>
  );
}

function AdminLoginWrapper() {
  const navigate = useNavigate();

  useEffect(() => {
    // 如果已经登录，直接跳转到后台
    isAdminLoggedIn().then((isLoggedIn) => {
      if (isLoggedIn) {
        navigate('/admin/dashboard');
      }
    });
  }, [navigate]);

  return <AdminLogin onLoginSuccess={() => navigate('/admin/dashboard')} />;
}

function AdminDashboardWrapper() {
  const navigate = useNavigate();

  useEffect(() => {
    // 如果未登录，跳转到登录页
    isAdminLoggedIn().then((isLoggedIn) => {
      if (!isLoggedIn) {
        navigate('/admin/login');
      }
    });
  }, [navigate]);

  return <AdminDashboard onLogout={() => navigate('/admin/login')} />;
}

function SuggestionWrapper() {
  return <SuggestionBox />;
}

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState<'home' | 'about'>('home');

  const isDetailPage = location.pathname.startsWith('/detail/');
  const isAdminPage = location.pathname.startsWith('/admin/');
  const isSuggestionPage = location.pathname === '/suggestion';
  const hideHeaderFooter = isDetailPage || isAdminPage || isSuggestionPage;

  const handleViewChange = (view: 'home' | 'about') => {
    setCurrentView(view);
    const path = view === 'home' ? '/' : `/${view}`;
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!hideHeaderFooter && <Header currentView={currentView} onViewChange={handleViewChange} />}
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/suggestion" element={<SuggestionWrapper />} />
            <Route path="/admin/login" element={<AdminLoginWrapper />} />
            <Route path="/admin/dashboard" element={<AdminDashboardWrapper />} />
            <Route path="/detail/:id" element={<DetailPage />} />
            <Route path="/zhengjiguan" element={<ZhengjiguanPage />} />
            <Route path="/zhengjiguan/:id" element={<DetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      {!hideHeaderFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <MainLayout />
    </HashRouter>
  );
}

export default App;
