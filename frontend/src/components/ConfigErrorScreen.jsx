import { AlertTriangle } from 'lucide-react';

export default function ConfigErrorScreen({ title, message, hint }) {
  return (
    <div
      className="min-h-screen bg-ink-900 text-white flex items-center justify-center px-6"
      data-testid="config-error-screen"
    >
      <div className="max-w-md w-full bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-5">
          <AlertTriangle className="h-6 w-6 text-red-300" />
        </div>
        <h1 className="text-xl font-semibold mb-2" data-testid="config-error-title">
          {title}
        </h1>
        <p className="text-sm text-white/70" data-testid="config-error-message">
          {message}
        </p>
        {hint ? (
          <pre className="mt-4 text-[11px] text-white/50 break-words whitespace-pre-wrap text-left bg-black/30 rounded p-3">
            {hint}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
