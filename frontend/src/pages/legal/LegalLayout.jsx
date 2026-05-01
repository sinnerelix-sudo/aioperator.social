import { Link } from 'react-router-dom';

/**
 * Minimal, dependency-free public legal layout. Used by /privacy,
 * /terms and /data-deletion. Public — no auth required, no app
 * shell, no sidebar — so Meta App Review crawlers can fetch these
 * pages reliably.
 */
export default function LegalLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-white text-ink-900">
      <header className="border-b border-ink-200">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="font-display font-semibold text-lg tracking-tight text-ink-900 hover:text-brand-700"
            data-testid="legal-home-link"
          >
            AI Operator
          </Link>
          <nav className="flex items-center gap-3 text-xs font-medium text-ink-600">
            <Link to="/privacy" className="hover:text-ink-900" data-testid="legal-nav-privacy">Privacy</Link>
            <Link to="/terms" className="hover:text-ink-900" data-testid="legal-nav-terms">Terms</Link>
            <Link to="/data-deletion" className="hover:text-ink-900" data-testid="legal-nav-data-deletion">Data Deletion</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-tight text-ink-900">
          {title}
        </h1>
        <div className="mt-6 prose prose-sm sm:prose-base text-ink-700 leading-relaxed [&_h2]:font-display [&_h2]:font-semibold [&_h2]:text-ink-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_a]:text-brand-700 [&_a]:underline">
          {children}
        </div>

        <hr className="mt-12 border-ink-200" />
        <footer className="mt-6 text-xs text-ink-500 space-y-1" data-testid="legal-footer">
          <div>
            Contact:{' '}
            <a href="mailto:social@aioperator.social" className="text-brand-700 underline">
              social@aioperator.social
            </a>
          </div>
          <div>
            Website:{' '}
            <a
              href="https://www.aioperator.social"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline"
            >
              https://www.aioperator.social
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
