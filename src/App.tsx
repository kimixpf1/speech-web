import { useState, useMemo, useEffect, useLayoutEffect, useRef, Suspense, lazy, memo } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SearchX, RefreshCcw } from 'lucide-react';
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

const PageLoader = memo(function PageLoader() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-4 mb-8">
        <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
      </div>
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
});

const ArticleListSkeleton = memo(function ArticleListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-3">
              <div className="h-6 bg-gray-200 rounded w-5/6 animate-pulse" />
              <div className="flex gap-2">
                <div className="h-5 bg-gray-200 rounded w-14 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-14 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-20 animate-pulse" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

// 获取上次的滚动位置以避免返回时白屏等待
function getInitialScrollPosition() {
  const saved = safeGetStorageItem('session', 'lastScrollY');
  return saved ? parseInt(saved, 10) : 0;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 500] as const;

const DOMAIN_LABELS: Record<string, string> = {
  economy: '经济',
  politics: '政治',
  culture: '文化',
  society: '社会',
  ecology: '生态',
  party: '党建',
  defense: '国防',
  diplomacy: '外交',
};

const CATEGORY_LABELS: Record<string, string> = {
  speech: '重要讲话',
  article: '发表文章',
  meeting: '重要会议',
  inspection: '考察调研',
  call: '致电',
};

function getActiveFilterLabels({
  searchQuery,
  selectedDomain,
  selectedCategory,
  selectedYear,
}: {
  searchQuery: string;
  selectedDomain: string;
  selectedCategory: string;
  selectedYear: string;
}) {
  const labels: string[] = [];

  if (searchQuery.trim()) {
    labels.push(`搜索：${searchQuery.trim()}`);
  }

  if (selectedDomain !== 'all') {
    labels.push(`领域：${DOMAIN_LABELS[selectedDomain] ?? selectedDomain}`);
  }

  if (selectedCategory !== 'all') {
    labels.push(`类型：${CATEGORY_LABELS[selectedCategory] ?? selectedCategory}`);
  }

  if (selectedYear !== 'all') {
    labels.push(`年份：${selectedYear}`);
  }

  return labels;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([currentPage]);
  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  if (currentPage <= 2) {
    pages.add(1);
    pages.add(2);
    pages.add(3);
  }

  if (currentPage >= totalPages - 1) {
    pages.add(totalPages);
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

function HomePage() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // 300ms 防抖延迟
  const cachedArticles = useMemo(() => getLocalArticlesSync(), []);
  const hasRestoredScrollRef = useRef(false);
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const pendingListScrollBehaviorRef = useRef<ScrollBehavior | null>(null);
  const pendingPageTargetRef = useRef<number | null>(null);

  const scrollToListTop = (behavior: ScrollBehavior = 'smooth') => {
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior, block: 'start' });

      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          const targetTop = listTopRef.current
            ? listTopRef.current.getBoundingClientRect().top + window.scrollY - 12
            : 0;
          window.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
        });
        return;
      }
    }

    const targetTop = listTopRef.current
      ? listTopRef.current.getBoundingClientRect().top + window.scrollY - 12
      : 0;
    window.scrollTo({ top: Math.max(0, targetTop), behavior });
  };

  const queueListTopScroll = (behavior: ScrollBehavior = 'smooth') => {
    pendingListScrollBehaviorRef.current = behavior;
  };

  // 记录滚动位置
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          safeSetStorageItem('session', 'lastScrollY', window.scrollY.toString());
          hasRestoredScrollRef.current = false;
          ticking = false;
        });
      }
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
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = safeGetStorageItem('session', 'homeCurrentPage');
    const page = saved ? parseInt(saved, 10) : 1;
    return Number.isFinite(page) && page > 0 ? page : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const saved = safeGetStorageItem('session', 'homePageSize');
    const parsed = saved ? parseInt(saved, 10) : 50;
    return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number]) ? parsed : 50;
  });
  const [pageJumpInput, setPageJumpInput] = useState('');

  // 使用 SWR 获取数据并处理缓存，替代手写的 useState 和 useEffect 获取逻辑
  const { data: articles = [], mutate, isLoading } = useSWR<Speech[]>('articles', getArticles, {
    fallbackData: cachedArticles,
    revalidateOnMount: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    revalidateIfStale: true,
    dedupingInterval: 60000,
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
    safeSetStorageItem('session', 'homeCurrentPage', currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    safeSetStorageItem('session', 'homePageSize', pageSize.toString());
  }, [pageSize]);

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

    // 全部领域按年月日倒序，保证最新文章稳定出现在第一页
    if (selectedDomain === 'all') {
      result.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        if (a.day !== b.day) return b.day - a.day;
        return b.id.localeCompare(a.id);
      });
    }

    return result;
  }, [debouncedSearchQuery, selectedDomain, selectedCategory, selectedYear, articles]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedDomain, selectedCategory, selectedYear]);

  const totalPages = Math.max(1, Math.ceil(filteredSpeeches.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedSpeeches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSpeeches.slice(start, start + pageSize);
  }, [filteredSpeeches, currentPage, pageSize]);

  const visiblePages = useMemo(() => getVisiblePages(currentPage, totalPages), [currentPage, totalPages]);
  const activeFilterLabels = useMemo(() => getActiveFilterLabels({
    searchQuery: debouncedSearchQuery,
    selectedDomain,
    selectedCategory,
    selectedYear,
  }), [debouncedSearchQuery, selectedDomain, selectedCategory, selectedYear]);
  const hasSearchQuery = debouncedSearchQuery.trim().length > 0;
  const hasActiveFilters = activeFilterLabels.length > 0;

  const handlePageChange = (page: number) => {
    if (page === currentPage || page < 1 || page > totalPages) {
      return;
    }
    pendingPageTargetRef.current = page;
    queueListTopScroll();
    setCurrentPage(page);
  };

  const handlePageJumpSubmit = () => {
    const targetPage = parseInt(pageJumpInput.trim(), 10);
    if (!Number.isFinite(targetPage)) {
      setPageJumpInput('');
      return;
    }

    const nextPage = Math.min(Math.max(targetPage, 1), totalPages);
    setPageJumpInput('');
    handlePageChange(nextPage);
  };

  const handleResetSearch = () => {
    setSearchQuery('');
  };

  const handleClearFilters = () => {
    setSelectedDomain('all');
    setSelectedCategory('all');
    setSelectedYear('all');
  };

  const handleClearSearchAndFilters = () => {
    handleResetSearch();
    handleClearFilters();
  };

  useLayoutEffect(() => {
    if (pendingPageTargetRef.current !== currentPage) {
      return;
    }

    const behavior = pendingListScrollBehaviorRef.current ?? 'smooth';
    pendingPageTargetRef.current = null;
    pendingListScrollBehaviorRef.current = null;
    scrollToListTop(behavior);
  }, [currentPage, pageSize]);

  useEffect(() => {
    if (!pendingListScrollBehaviorRef.current || pendingPageTargetRef.current !== null) {
      return;
    }

    const behavior = pendingListScrollBehaviorRef.current;
    pendingListScrollBehaviorRef.current = null;

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => scrollToListTop(behavior));
      });
      return;
    }

    window.setTimeout(() => scrollToListTop(behavior), 0);
  }, [currentPage, pageSize]);

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
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(restoreScroll);
      });
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
        <div ref={listTopRef} />
        {articles.length === 0 && isLoading ? (
          <ArticleListSkeleton />
        ) : articles.length === 0 ? (
          <div className="text-center py-20 text-gray-400">暂无可显示的文章数据</div>
        ) : filteredSpeeches.length === 0 ? (
          <div className="mx-auto max-w-3xl rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
              <SearchX className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-gray-900">当前筛选下暂无结果</h2>
            <p className="mt-3 text-sm leading-6 text-gray-500 sm:text-base">
              可以尝试放宽搜索词、切换年份，或恢复为全部领域与全部类型后再查看。
            </p>
            {hasActiveFilters ? (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {activeFilterLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 sm:text-sm"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
                onClick={handleClearSearchAndFilters}
              >
                <RefreshCcw className="h-4 w-4" />
                恢复全部筛选
              </button>
              {hasSearchQuery ? (
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 transition hover:border-red-200 hover:text-red-600"
                  onClick={handleResetSearch}
                >
                  仅清空搜索词
                </button>
              ) : null}
              {hasActiveFilters && !hasSearchQuery ? (
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 transition hover:border-red-200 hover:text-red-600"
                  onClick={handleClearFilters}
                >
                  仅清空筛选条件
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2">
                <div className="text-sm text-gray-500">
                  第 {currentPage} / {totalPages} 页，共 {filteredSpeeches.length} 条
                </div>
                {totalPages > 1 ? (
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <button
                      className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(1)}
                    >
                      首页
                    </button>
                    <button
                      className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                    >
                      上一页
                    </button>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {visiblePages.map((page, index) => {
                        const prevPage = visiblePages[index - 1];
                        const shouldShowEllipsis = prevPage && page - prevPage > 1;

                        return (
                          <div key={`top-${page}`} className="flex items-center gap-1.5 sm:gap-2">
                            {shouldShowEllipsis ? <span className="px-1 text-xs text-gray-400">...</span> : null}
                            <button
                              className={`h-8 min-w-8 rounded-md border px-2 text-xs ${page === currentPage
                                ? 'border-red-600 bg-red-600 text-white'
                                : 'border-gray-200 bg-white text-gray-600'}`}
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                    >
                      下一页
                    </button>
                    <button
                      className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(totalPages)}
                    >
                      末页
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-500">每页</span>
                <select
                  className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
                  value={pageSize}
                  onChange={(e) => {
                    const nextSize = parseInt(e.target.value, 10);
                    if (!PAGE_SIZE_OPTIONS.includes(nextSize as (typeof PAGE_SIZE_OPTIONS)[number])) {
                      return;
                    }
                    setPageSize(nextSize);
                    setCurrentPage(1);
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <span className="text-gray-500">条</span>
                {totalPages > 1 ? (
                  <>
                    <span className="ml-1 text-gray-300">|</span>
                    <span className="text-gray-500">跳至</span>
                    <input
                      className="h-9 w-16 rounded-md border border-gray-200 bg-white px-2 text-center text-sm outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={pageJumpInput}
                      onChange={(e) => setPageJumpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handlePageJumpSubmit();
                        }
                      }}
                      placeholder={`${currentPage}`}
                    />
                    <button
                      className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!pageJumpInput.trim()}
                      onClick={handlePageJumpSubmit}
                    >
                      跳转
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <ContentList speeches={pagedSpeeches} />

            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="flex w-full flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                <button
                  className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(1)}
                >
                  首页
                </button>
                <button
                  className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  上一页
                </button>

                {currentPage > 3 ? <span className="px-1 text-xs text-gray-400 sm:text-sm">...</span> : null}

                {visiblePages.map((page, index) => {
                  const prevPage = visiblePages[index - 1];
                  const shouldShowEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <div key={page} className="flex items-center gap-1.5 sm:gap-2">
                      {shouldShowEllipsis ? <span className="px-1 text-xs text-gray-400 sm:text-sm">...</span> : null}
                      <button
                        className={`h-9 min-w-9 rounded-md border px-2.5 text-xs sm:px-3 sm:text-sm ${page === currentPage
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-gray-200 bg-white text-gray-600'}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}

                {currentPage < totalPages - 2 ? <span className="px-1 text-xs text-gray-400 sm:text-sm">...</span> : null}

                <button
                  className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  下一页
                </button>
                <button
                  className="h-9 rounded-md border border-gray-200 bg-white px-2.5 text-xs text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:text-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(totalPages)}
                >
                  末页
                </button>
              </div>
              <div className="text-center text-sm text-gray-500">当前第 {currentPage} 页，共 {totalPages} 页</div>
            </div>
          </>
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
