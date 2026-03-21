import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { FilterBar } from '@/components/FilterBar';
import { ContentList } from '@/components/ContentList';
import { About } from '@/components/About';
import { Footer } from '@/components/Footer';
import { DetailPage } from '@/components/DetailPage';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminDashboard } from '@/components/AdminDashboard';
import { SuggestionBox } from '@/components/SuggestionBox';
import { ZhengjiguanPage } from '@/components/ZhengjiguanPage';
import { getArticles, setupRealtimeSubscription, type Speech } from '@/services/articleServiceEnhanced';
import { speechesData } from '@/data/speeches';
import { initAnalytics } from '@/services/analytics';
import { initSupabaseAnalytics } from '@/services/supabaseAnalytics';
import { isAdminLoggedInSync, isAdminLoggedIn } from '@/services/adminAuth';
import './App.css';

function HomePage() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(
    () => sessionStorage.getItem('selectedDomain') || 'economy'
  );
  const [selectedCategory, setSelectedCategory] = useState(
    () => sessionStorage.getItem('selectedCategory') || 'all'
  );
  const [selectedYear, setSelectedYear] = useState(
    () => sessionStorage.getItem('selectedYear') || 'all'
  );
  // 直接用静态数据初始化，确保首次渲染就有52篇文章，避免闪烁
  const [articles, setArticles] = useState<Speech[]>(speechesData);
  // 滚动恢复相关状态
  const scrollRestoredRef = useRef(false);
  const targetScrollPositionRef = useRef<number | null>(null);
  // 用于控制页面是否可见（滚动恢复期间隐藏，避免闪烁）
  const [isScrollRestoring, setIsScrollRestoring] = useState(false);

  // 禁用浏览器自动滚动恢复
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // 当路由变化时（从详情页返回），执行滚动恢复
  useLayoutEffect(() => {
    const savedPosition = localStorage.getItem('scrollPosition');
    if (savedPosition) {
      const targetPosition = parseInt(savedPosition, 10);
      localStorage.removeItem('scrollPosition');

      // 设置目标位置和隐藏页面
      targetScrollPositionRef.current = targetPosition;
      scrollRestoredRef.current = false;
      setIsScrollRestoring(true);

      // 立即尝试滚动
      window.scrollTo(0, targetPosition);
    }
  }, [location.key]);

  // 当页面渲染完成后，确保滚动位置正确
  useEffect(() => {
    if (targetScrollPositionRef.current === null || scrollRestoredRef.current) {
      return;
    }

    const targetPosition = targetScrollPositionRef.current;

    // 立即滚动
    window.scrollTo(0, targetPosition);

    // 使用一个持续监控确保位置正确
    let animationId: number;
    let checkCount = 0;
    const maxChecks = 30;

    const ensurePosition = () => {
      checkCount++;
      const currentY = window.scrollY;
      const diff = Math.abs(currentY - targetPosition);

      // 如果位置偏离，重新滚动
      if (diff > 5) {
        window.scrollTo(0, targetPosition);
      }

      // 继续检查直到稳定或超时
      if (checkCount < maxChecks) {
        animationId = requestAnimationFrame(ensurePosition);
      } else {
        // 完成，显示页面
        scrollRestoredRef.current = true;
        targetScrollPositionRef.current = null;
        setIsScrollRestoring(false);
      }
    };

    animationId = requestAnimationFrame(ensurePosition);

    return () => {
      cancelAnimationFrame(animationId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles]);

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

  // 初始化访问统计并加载文章
  useEffect(() => {
    initAnalytics();
    initSupabaseAnalytics();

    // 从云端获取最新数据
    const loadArticles = async () => {
      const fetchedArticles = await getArticles();
      if (fetchedArticles.length > 0) {
        setArticles(fetchedArticles);
      }
    };
    
    loadArticles();

    // 设置实时订阅
    const unsubscribe = setupRealtimeSubscription(
      (updatedArticle) => {
        setArticles(prev => {
          const index = prev.findIndex(a => a.id === updatedArticle.id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = updatedArticle;
            return updated;
          }
          return [updatedArticle, ...prev];
        });
      },
      (deletedId) => {
        setArticles(prev => prev.filter(a => a.id !== deletedId));
      }
    );

    // 定期刷新
    const interval = setInterval(() => {
      loadArticles();
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [])

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

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
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
  }, [searchQuery, selectedDomain, selectedCategory, selectedYear, articles]);

  return (
    <div style={{ visibility: isScrollRestoring ? 'hidden' : 'visible' }}>
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
        <ContentList speeches={filteredSpeeches} />
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
