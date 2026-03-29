import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="bg-red-50 p-6 rounded-full mb-6">
        <AlertCircle className="w-16 h-16 text-red-600" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">页面未找到</h2>
      <p className="text-gray-500 mb-8 max-w-md">
        抱歉，您访问的页面不存在或已被移除。请检查网址是否正确，或返回首页继续浏览。
      </p>
      <Button asChild className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
        <Link to="/">
          <Home className="w-4 h-4" />
          返回首页
        </Link>
      </Button>
    </div>
  );
}