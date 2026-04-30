import { ShieldOff } from 'lucide-react';

export default function AdminDisabledPage() {
  return (
    <div
      className="min-h-screen bg-ink-900 text-white flex items-center justify-center px-6"
      data-testid="admin-disabled-page"
    >
      <div className="max-w-md w-full bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-5">
          <ShieldOff className="h-6 w-6 text-white/70" />
        </div>
        <h1 className="text-xl font-semibold mb-2" data-testid="admin-disabled-title">
          Admin panel bağlıdır
        </h1>
        <p className="text-sm text-white/70" data-testid="admin-disabled-message">
          Admin panel production backend security aktiv edilənə qədər bağlıdır.
        </p>
      </div>
    </div>
  );
}
