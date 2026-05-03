import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ErrorKind = 'render' | 'async';

interface Props {
  children?: ReactNode;
  resetKeys?: readonly unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorKind: ErrorKind;
  errorContext: {
    url: string;
    timestamp: string;
    userAgent: string;
  } | null;
}

function getErrorKind(error: Error): ErrorKind {
  const msg = error.message || '';
  if (
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('NetworkError') ||
    msg.includes('Failed to fetch')
  ) {
    return 'async';
  }
  return 'render';
}

function buildContext(): State['errorContext'] {
  return {
    url: typeof window !== 'undefined' ? window.location.href : '',
    timestamp: new Date().toLocaleString('zh-CN'),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorKind: 'render',
    errorContext: null,
  };

  private static listeners: Array<(error: Error) => void> = [];

  public static registerAsyncListener(listener: (error: Error) => void) {
    ErrorBoundary.listeners.push(listener);
    return () => {
      ErrorBoundary.listeners = ErrorBoundary.listeners.filter(l => l !== listener);
    };
  }

  public static notifyAsyncError(error: Error) {
    ErrorBoundary.listeners.forEach(l => l(error));
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorKind: getErrorKind(error),
      errorContext: buildContext(),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorKind: 'render', errorContext: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKeys) {
      if (this.props.resetKeys.some((key, i) => key !== prevProps.resetKeys?.[i])) {
        this.setState({ hasError: false, error: null, errorKind: 'render', errorContext: null });
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      const isAsync = this.state.errorKind === 'async';
      const ctx = this.state.errorContext;

      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
          <div className="bg-orange-50 p-6 rounded-full mb-6">
            <AlertTriangle className="w-12 h-12 text-orange-500" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">糟糕，出现了一些问题</h2>
          <p className="text-gray-500 mb-2 max-w-md">
            {isAsync
              ? '资源加载失败，可能是网络波动导致。请尝试重试。'
              : '页面在渲染时遇到了意外错误。这可能是由于网络波动或临时故障导致的。'}
          </p>
          <p className="text-xs text-gray-400 mb-6">
            {isAsync ? '错误类型：加载错误' : '错误类型：渲染错误'}
          </p>
          <div className="flex gap-4">
            <Button
              onClick={this.handleRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </Button>
            <Button
              onClick={this.handleReload}
              variant="outline"
              className="flex items-center gap-2"
            >
              刷新页面
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/speech-web/#/'}
              className="flex items-center gap-2"
            >
              返回首页
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 text-left bg-gray-100 p-4 rounded text-sm font-mono text-red-600 max-w-2xl overflow-auto">
              <p className="font-bold mb-2">{this.state.error.toString()}</p>
              {ctx && (
                <div className="text-gray-500 text-xs space-y-1 mt-2">
                  <p>URL: {ctx.url}</p>
                  <p>时间: {ctx.timestamp}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
