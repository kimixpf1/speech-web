import { useState, useMemo, useEffect } from 'react';
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
import { getLocalArticlesSync, type Speech } from '@/services/articleServiceEnhanced';
import { initAnalytics } from '@/services/analytics';
import { initSupabaseAnalytics } from '@/services/supabaseAnalytics';
import { isAdminLoggedIn } from '@/services/adminAuth';
import './App.css';

function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [articles, setArticles] = useState<Speech[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 恢复滚动位置（从详情页返回时）
  useEffect(() => {
    const savedPosition = localStorage.getItem('scrollPosition');
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      localStorage.removeItem('scrollPosition');
      
      // 使用 requestAnimationFrame 确保在渲染后滚动
      requestAnimationFrame(() => {
        window.scrollTo(0, position);
      });
    }
  }, []);

  // 初始化访问统计并加载文章
  useEffect(() => {
    initAnalytics();
    initSupabaseAnalytics();

    // 从本地加载所有文章（静态数据 + 用户添加的文章）
    const allArticles = getLocalArticlesSync();
    setArticles(allArticles);
    setIsLoading(false);

    // 定期刷新文章列表（每30秒）
    const interval = setInterval(() => {
      const refreshedArticles = getLocalArticlesSync();
      setArticles(refreshedArticles);
    }, 30000);

    return () => {
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

  // Filter speeches
  const filteredSpeeches = useMemo(() => {
    return articles.filter((speech) => {
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
  }, [searchQuery, selectedCategory, selectedYear, articles]);

  return (
    <>
      <Hero 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery}
        stats={stats}
      />
      <FilterBar
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        resultCount={filteredSpeeches.length}
      />
      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
        <ContentList speeches={filteredSpeeches} />
      </main>
    </>
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
    if (isAdminLoggedIn()) {
      navigate('/admin/dashboard');
    }
  }, [navigate]);

  return <AdminLogin onLoginSuccess={() => navigate('/admin/dashboard')} />;
}

function AdminDashboardWrapper() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // 如果未登录，跳转到登录页
    if (!isAdminLoggedIn()) {
      navigate('/admin/login');
    }
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
