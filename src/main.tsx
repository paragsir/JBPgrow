import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('GrowJBP runtime error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="font-display text-2xl font-extrabold tracking-tight text-slate-900">
              Grow<span className="text-emerald-600">JBP</span>
            </div>
            <h1 className="mt-4 font-display text-lg font-bold text-slate-900">
              Page load hone me dikkat aayi
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Neeche button par click karke Home page dobara kholein.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = window.location.pathname;
              }}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Home Page Kholein
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
