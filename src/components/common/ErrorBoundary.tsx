import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors anywhere below it so a single faulty component can
 * never blank the whole application. This is why the learner "Ranks" tab could
 * previously take down the entire demo.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled UI error:', error, info?.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[var(--background)] px-6 text-[var(--text-strong)]">
        <div className="w-full max-w-md rounded-3xl border border-[var(--primary)]/10 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 ring-1 ring-orange-200">
            <AlertTriangle size={22} className="text-orange-500" strokeWidth={2} />
          </div>
          <h2 className="mb-2 text-lg font-bold">Something went wrong on this screen</h2>
          <p className="mb-6 text-[13px] leading-relaxed text-[var(--text-strong)]/70">
            The rest of SORT is unaffected. You can retry this screen, or reload the app.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-xl border border-[var(--primary)]/15 px-5 py-2.5 text-sm font-bold text-[var(--text-strong)] transition-colors hover:bg-[var(--primary)]/5"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[var(--accent)]/20 transition-colors hover:bg-[var(--accent-dark)]"
            >
              <RotateCcw size={15} strokeWidth={2.5} />
              Reload app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
