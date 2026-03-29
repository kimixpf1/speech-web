import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
          <div className="bg-orange-50 p-6 rounded-full mb-6">
            <AlertTriangle className="w-12 h-12 text-orange-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">糟糕，出现了一些问题</h2>
          <p className="text-gray-500 mb-6 max-w-md">
            页面在加载时遇到了意外错误。这可能是由于网络波动或临时故障导致的。
          </p>
          <div className="flex gap-4">
            <Button 
              onClick={this.handleReload}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新页面
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2"
            >
              返回首页
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 text-left bg-gray-100 p-4 rounded text-sm font-mono text-red-600 max-w-2xl overflow-auto">
              <p className="font-bold mb-2">{this.state.error.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}