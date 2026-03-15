import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, errorInfo);
  }

  handleRetry() {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) this.props.onRetry();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full w-full bg-[#050505] p-10">
          <div className="max-w-md w-full p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-3xl shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Rendering Error</h1>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
            </p>
            <button
              onClick={this.handleRetry}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-semibold shadow-lg shadow-red-600/20"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
