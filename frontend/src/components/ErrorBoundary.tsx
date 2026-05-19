import React from 'react';

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: ''
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'APIAutopsy could not load this page.'
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('APIAutopsy render failed', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0c0c0c] px-6 text-[#e5e7eb]">
        <section className="max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">APIAutopsy</p>
          <h1 className="mt-3 text-3xl font-bold">We could not load this workspace.</h1>
          <p className="mt-3 text-slate-300">
            Refresh the page to reload the latest app version. If the issue continues, clear the site cache and sign in again.
          </p>
          {this.state.message ? (
            <pre className="mt-4 overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
              {this.state.message}
            </pre>
          ) : null}
          <button
            type="button"
            className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 font-semibold text-white transition hover:bg-indigo-400"
            onClick={() => window.location.reload()}
          >
            Reload APIAutopsy
          </button>
        </section>
      </main>
    );
  }
}
