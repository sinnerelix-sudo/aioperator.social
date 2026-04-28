import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen bg-ink-50 flex items-center justify-center px-6"
          data-testid="error-boundary"
        >
          <div className="max-w-md w-full bg-white rounded-2xl shadow-soft border border-ink-200 p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-5">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-xl font-display font-semibold text-ink-900 mb-2">
              Səhifə yüklənmədi · Sayfa yüklenemedi
            </h1>
            <p className="text-sm text-ink-500 mb-6">
              Texniki problem var. Yenidən cəhd et. · Teknik bir sorun var, lütfen tekrar dene.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full bg-brand-gradient text-white font-medium px-5 py-3 rounded-lg hover:opacity-90 transition-opacity"
              data-testid="error-boundary-retry"
            >
              Yenilə · Yenile
            </button>
            {this.state.error?.message ? (
              <pre className="mt-4 text-xs text-ink-500 break-words whitespace-pre-wrap text-left bg-ink-100 rounded p-3">
                {String(this.state.error.message)}
              </pre>
            ) : null}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
