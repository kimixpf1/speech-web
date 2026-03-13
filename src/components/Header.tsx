import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Menu, X, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  currentView: 'home' | 'about';
  onViewChange: (view: 'home' | 'about') => void;
}

export function Header({ currentView, onViewChange }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update currentView based on location
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') onViewChange('home');
    else if (path === '/about') onViewChange('about');
  }, [location.pathname, onViewChange]);

  const navItems = [
    { key: 'home', label: '首页', path: '/' },
    { key: 'about', label: '关于', path: '/about' }
  ];

  const handleNavClick = (key: string) => {
    // 如果点击首页且当前已经在首页，滚动到顶部（无动画）
    if (key === 'home' && currentView === 'home') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    onViewChange(key as 'home' | 'about');
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => handleNavClick('home')}
          >
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base lg:text-lg font-bold text-gray-900">
                经济工作重要讲话
              </span>
              <span className="text-xs text-gray-500 hidden sm:inline">
                习近平总书记关于经济工作重要讲话精神
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.key}
                variant="ghost"
                onClick={() => handleNavClick(item.key)}
                className={`px-3 py-2 rounded-lg font-medium transition-all ${
                  currentView === item.key
                    ? 'bg-red-50 text-red-600'
                    : isScrolled
                    ? 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                    : 'text-white/90 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Button>
            ))}
            {/* 建议信箱 */}
            <Button
              variant="ghost"
              onClick={() => navigate('/suggestion')}
              className={`px-3 py-2 rounded-lg font-medium transition-all ${
                isScrolled
                  ? 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <Mail className="w-4 h-4 mr-1" />
              建议信箱
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/admin/login')}
              className={`px-3 py-2 rounded-lg font-medium transition-all ${
                isScrolled
                  ? 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                  : 'text-white/90 hover:text-white hover:bg-white/10'
              }`}
              title="管理员登录"
            >
              <Lock className="w-4 h-4 mr-1" />
              管理员
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className={`md:hidden ${isScrolled ? 'text-gray-700' : 'text-white'}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 bg-white">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.key}
                  variant="ghost"
                  onClick={() => handleNavClick(item.key)}
                  className={`justify-start px-4 py-3 rounded-lg font-medium ${
                    currentView === item.key
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-700 hover:text-red-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Button>
              ))}
              {/* 移动端建议信箱 */}
              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/suggestion');
                  setIsMobileMenuOpen(false);
                }}
                className="justify-start px-4 py-3 rounded-lg font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
              >
                <Mail className="w-5 h-5 mr-2" />
                建议信箱
              </Button>
              {/* 移动端管理员入口 */}
              <Button
                variant="ghost"
                onClick={() => {
                  navigate('/admin/login');
                  setIsMobileMenuOpen(false);
                }}
                className="justify-start px-4 py-3 rounded-lg font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50"
              >
                <Lock className="w-5 h-5 mr-2" />
                管理员
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
