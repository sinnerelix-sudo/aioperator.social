import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  TrendingUp,
  Tags,
  Lock,
  ScrollText,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useToast } from '../../context/ToastContext';

export default function AdminLayout() {
  const { t } = useTranslation();
  const { isAdmin, loading, logout } = useAdmin();
  const navigate = useNavigate();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center" data-testid="admin-loading">
        <div className="h-8 w-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!isAdmin) {
    return <Navigate to="/control-center-aio-2026" replace />;
  }

  const base = '/control-center-aio-2026/dashboard';
  const items = [
    { to: base, end: true, icon: LayoutDashboard, label: t('admin.menu.overview'), id: 'admin-overview' },
    { to: `${base}/customers`, icon: Users, label: t('admin.menu.customers'), id: 'admin-customers' },
    { to: `${base}/usage`, icon: TrendingUp, label: t('admin.menu.usage'), id: 'admin-usage' },
    { to: `${base}/pricing`, icon: Tags, label: t('admin.menu.pricing'), id: 'admin-pricing' },
    { to: `${base}/security`, icon: Lock, label: t('admin.menu.security'), id: 'admin-security' },
    { to: `${base}/audit`, icon: ScrollText, label: t('admin.menu.audit'), id: 'admin-audit' },
  ];

  const onLogout = () => {
    logout();
    toast.info('Admin logout');
    navigate('/control-center-aio-2026', { replace: true });
  };

  return (
    <div className="min-h-screen bg-ink-900 text-white flex" data-testid="admin-layout">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-ink-900 border-r border-white/10 sticky top-0 h-screen">
        <div className="px-6 h-16 flex items-center gap-2 border-b border-white/10">
          <div className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Control Center</div>
            <div className="font-display font-semibold text-sm">AI Operator</div>
          </div>
        </div>
        <Items items={items} />
        <Footer onLogout={onLogout} t={t} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" data-testid="admin-mobile-sidebar">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-ink-900 border-r border-white/10 flex flex-col animate-slide-down">
            <div className="px-5 h-16 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Control Center</div>
                  <div className="font-display font-semibold text-sm">AI Operator</div>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="h-9 w-9 rounded-lg flex items-center justify-center text-white/70 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div onClick={() => setMobileOpen(false)} className="flex-1 overflow-y-auto">
              <Items items={items} />
            </div>
            <Footer onLogout={onLogout} t={t} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-ink-900/80 backdrop-blur border-b border-white/10">
          <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-16">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/10"
              data-testid="admin-mobile-toggle"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-brand-gradient flex items-center justify-center">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-display font-semibold text-sm">Control Center</span>
            </div>
            <div className="flex-1" />
            <span className="text-[11px] text-white/50 font-mono hidden sm:inline">admin@aioperator.social</span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto bg-ink-900 text-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Items({ items }) {
  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <NavLink
            key={it.id}
            to={it.to}
            end={it.end}
            data-testid={it.id}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function Footer({ onLogout, t }) {
  return (
    <div className="border-t border-white/10 p-4">
      <button
        onClick={onLogout}
        data-testid="admin-logout"
        className="flex items-center gap-2 w-full text-sm text-white/70 hover:text-red-400 transition-colors px-3 py-2"
      >
        <LogOut className="h-4 w-4" />
        {t('common.logout')}
      </button>
    </div>
  );
}
