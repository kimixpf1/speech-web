import { useState, useMemo, useEffect, useRef } from 'react';
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
import { getArticles, getLocalArticlesSync, setupRealtimeSubscription, type Speech } from '@/services/articleServiceEnhanced';
import { initAnalytics } from '@/services/analytics';
import { initSupabaseAnalytics } from '@/services/supabaseAnalytics';
import { isAdminLoggedIn } from '@/services/adminAuth';
import './App.css';

function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  // 用静态数据作为初始值，避免闪烁
  const [articles, setArticles] = useState<Speech[]>(() => getLocalArticlesSync());
  const scrollRestored = useRef(false);

  // 恢复滚动位置
  useEffect(() => {
    const savedPosition = localStorage.getItem('scrollPosition');
    if (savedPosition && !scrollRestored.current) {
      const position = parseInt(savedPosition, 10);
      localStorage.removeItem('scrollPosition');
      scrollRestored.current = true;
      
      // 禁用浏览器自动滚动恢复
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      
      // 立即滚动到保存的位置
      window.scrollTo(0, position);
    }
  }, []);

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