import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Bot,
  Plus,
  Package,
  Activity as ActivityIcon,
  CreditCard,
  Settings,
  Menu,
  X,
  Sparkles,
  LogOut,
  GraduationCap,
  MessageSquare,
  Target,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useToast } from '../../context/ToastContext';

export default function DashboardLayout() {
  const { t } = useTranslation();
  const { lng = 'az' } = useParams();
  const navigate = useNavigate();
  const { user, logout, subscription } = useAuth();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = `/${lng}/dashboard`;
  const items = [
    { to: base, end: true, icon: LayoutDashboard, label: t('dashboard.menu.overview'), id: 'overview' },
    { to: `${base}/bots`, icon: Bot, label: t('dashboard.menu.bots'), id: 'bots' },
    { to: `${base}/bots/new`, icon: Plus, label: t('dashboard.menu.createBot'), id: 'create-bot' },
    { to: `${base}/training`, icon: GraduationCap, label: t('dashboard.menu.training'), id: 'training' },
    { to: `${base}/products`, icon: Package, label: t('dashboard.menu.products'), id: 'products' },
    { to: `${base}/inbox`, icon: MessageSquare, label: t('dashboard.menu.inbox'), id: 'inbox' },
    { to: `${base}/leads`, icon: Target, label: t('dashboard.menu.leads'), id: 'leads' },
    { to: `${base}/orders`, icon: ShoppingBag, label: t('dashboard.menu.orders'), id: 'orders' },
    { to: `${base}/activity`, icon: ActivityIcon, label: t('dashboard.menu.activity'), id: 'activity' },
    { to: `${base}/subscription`, icon: CreditCard, label: t('dashboard.menu.subscription'), id: 'subscription' },
    { to: `${base}/settings`, icon: Settings, label: t('dashboard.menu.settings'), id: 'settings' },
  ];

  const onLogout = () => {
    logout();
    toast.info(t('common.logout'));
    navigate(`/${lng}`);
  };

  return (
    <div className="min-h-screen bg-ink-50 flex" data-testid="dashboard-layout">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-ink-200 sticky top-0 h-screen">
        <Link to={`/${lng}`} className="flex items-center gap-2 px-6 h-16 border-b border-ink-200">
          <span className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="font-display font-semibold text-ink-900">{t('common.appName')}</span>
        </Link>
        <SidebarItems items={items} />
        <SidebarFooter user={user} subscription={subscription} onLogout={onLogout} t={t} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" data-testid="mobile-sidebar">
          <div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col animate-slide-down">
            <div className="flex items-center justify-between px-5 h-16 border-b border-ink-200">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-lg bg-brand-gradient flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </span>
                <span className="font-display font-semibold text-ink-900">{t('common.appName')}</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="h-9 w-9 rounded-lg flex items-center justify-center text-ink-500 hover:bg-ink-100"
                data-testid="mobile-sidebar-close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div onClick={() => setMobileOpen(false)} className="flex-1 overflow-y-auto">
              <SidebarItems items={items} />
            </div>
            <SidebarFooter user={user} subscription={subscription} onLogout={onLogout} t={t} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-ink-200">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 h-16">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center text-ink-700 hover:bg-ink-100"
              data-testid="mobile-menu-toggle"
              aria-label="menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-brand-gradient flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </span>
              <span className="font-display font-semibold text-ink-900 text-sm">{t('common.appName')}</span>
            </div>
            <div className="flex-1" />
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarItems({ items }) {
  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.end}
            data-testid={`nav-${item.id}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-gradient-soft text-brand-600'
                  : 'text-ink-700 hover:bg-ink-100'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ user, subscription, onLogout, t }) {
  return (
    <div className="border-t border-ink-200 p-4 space-y-3">
      <div className="bg-ink-50 rounded-lg p-3">
        <div className="text-xs font-semibold text-ink-700 truncate">
          {user?.firstName} {user?.lastName}
        </div>
        <div className="text-[11px] text-ink-500 truncate">{user?.email}</div>
        {subscription && (
          <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-gradient text-white">
            {subscription.isTrial ? t('dashboard.subscription.trial') : (t(`pricing.plans.${subscription.plan}.name`) || subscription.plan)}
          </div>
        )}
      </div>
      <button
        onClick={onLogout}
        data-testid="logout-btn"
        className="flex items-center gap-2 w-full text-sm text-ink-700 hover:text-red-600 transition-colors px-3 py-2"
      >
        <LogOut className="h-4 w-4" />
        {t('common.logout')}
      </button>
    </div>
  );
}
