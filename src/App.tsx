import { useState, useMemo, useEffect, useLayoutEffect, useRef, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, ScrollRestoration } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { FilterBar } from '@/components/FilterBar';
import { ContentList } from '@/components/ContentList';
import { About } from '@/components/About';
import { Footer } from '@/components/Footer';
import { ZhengjiguanPage } from '@/components/ZhengjiguanPage';
import useSWR from 'swr';
import { getArticles, setupRealtimeSubscription, type Speech } from '@/services/articleServiceEnhanced';
import { initAnalytics } from '@/services/analytics';
import { isAdminLoggedInSync, isAdminLoggedIn } from '@/services/adminAuth';
import { useDebounce } from '@/hooks/useDebounce';
import './App.css';

// 懒加载页面组件
const DetailPage = lazy(() => import('@/components/DetailPage').then(m => ({ default: m.DetailPage })));
const AdminLogin = lazy(() => import('@/components/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminDashboard = lazy(() => import('@/components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const SuggestionBox = lazy(() => import('@/components/SuggestionBox').then(m => ({ default: m.SuggestionBox })));

// 全局加载指示器
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
    </div>
  );
}

function HomePage() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms 防抖延迟

  const [selectedDomain, setSelectedDomain] = useState(
    () => sessionStorage.getItem('selectedDomain') || 'economy'
  );
  const [selectedCategory, setSelectedCategory] = useState(
    () => sessionStorage.getItem('selectedCategory') || 'all'
  );
  const [selectedYear, setSelectedYear] = useState(
    () => sessionStorage.getItem('selectedYear') || 'all'
  );

  // 使用 SWR 获取数据并处理缓存，替代手写的 useState 和 useEffect 获取逻辑
  const { data: articles = [], mutate } = useSWR<Speech[]>('articles', getArticles, {
    fallbackData: [],
    revalidateOnFocus: false, // 避免切换标签页时频繁拉取
  });

  // 持久化筛选状态到sessionStorage（返回时恢复，关闭标签页后重置为economy默认）
  useEffect(() => {
    sessionStorage.setItem('selectedDomain', selectedDomain);
  }, [selectedDomain]);

  useEffect(() => {
    sessionStorage.setItem('selectedCategory', selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    sessionStorage.setItem('selectedYear', selectedYear);
  }, [selectedYear]);

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
      },
      (deletedId) => {
        mutate((prevArticles = []) => prevArticles.filter(a => a.id !== deletedId), false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [mutate]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: articles.length,
      speech: articles.filter(s => s.category === 'speech').length,
      article: articles.filter(s => s.category === 'article').length,
      meeting: articles.filter(s => s.category === 'meeting').length,
      inspection: articles.filter(s => s.category === 'inspection').length,
    };
  }, [articles]);

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
        {articles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">加载文章中...</div>
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
      <ScrollRestoration />
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
        </Routes>
      </Suspense>
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
