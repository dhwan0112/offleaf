import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('App crashed:', error, errorInfo);
  }

  handleRetry = (): void => {
    // Clear localStorage and reload
    try {
      localStorage.removeItem('offleaf_setup_complete');
      localStorage.removeItem('offleaf-editor-settings');
      localStorage.removeItem('offleaf-files');
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#1e1e1e] flex items-center justify-center p-4">
          <div className="bg-[#252526] rounded-lg p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              앱 실행 중 오류 발생
            </h2>
            <p className="text-gray-400 mb-4">
              예기치 않은 오류가 발생했습니다.
            </p>
            {this.state.error && (
              <div className="bg-[#1e1e1e] rounded p-3 mb-4 text-left">
                <pre className="text-xs text-red-400 whitespace-pre-wrap break-all font-mono">
                  {this.state.error.message}
                </pre>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                초기화 후 다시 시작
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#3c3c3c] text-white rounded hover:bg-[#4a4a4a] transition"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
