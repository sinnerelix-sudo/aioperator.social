import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { SUPPORTED_LOCALES } from './i18n';
import LandingPage from './pages/LandingPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardLayout from './pages/dashboard/DashboardLayout.jsx';
import OverviewPage from './pages/dashboard/OverviewPage.jsx';
import BotsPage from './pages/dashboard/BotsPage.jsx';
import CreateBotPage from './pages/dashboard/CreateBotPage.jsx';
import TrainingPage from './pages/dashboard/TrainingPage.jsx';
import ProductsPage from './pages/dashboard/ProductsPage.jsx';
import InboxPage from './pages/dashboard/InboxPage.jsx';
import LeadsPage from './pages/dashboard/LeadsPage.jsx';
import OrdersPage from './pages/dashboard/OrdersPage.jsx';
import ActivityPage from './pages/dashboard/ActivityPage.jsx';
import SubscriptionPage from './pages/dashboard/SubscriptionPage.jsx';
import SettingsPage from './pages/dashboard/SettingsPage.jsx';
import { useAuth } from './context/AuthContext.jsx';
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import AdminDisabledPage from './pages/admin/AdminDisabledPage.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminOverviewPage from './pages/admin/AdminOverviewPage.jsx';
import AdminCustomersPage from './pages/admin/AdminCustomersPage.jsx';
import AdminCustomerDetailPage from './pages/admin/AdminCustomerDetailPage.jsx';
import AdminUsagePage from './pages/admin/AdminUsagePage.jsx';
import AdminPricingPage from './pages/admin/AdminPricingPage.jsx';
import AdminSecurityPage from './pages/admin/AdminSecurityPage.jsx';
import AdminAuditPage from './pages/admin/AdminAuditPage.jsx';
import { ADMIN_MOCK_ENABLED } from './lib/adminConfig';

function LocaleSync() {
  const { lng } = useParams();
  const { i18n } = useTranslation();
  useEffect(() => {
    if (lng && SUPPORTED_LOCALES.includes(lng) && i18n.language !== lng) {
      i18n.changeLanguage(lng);
      localStorage.setItem('locale', lng);
    }
    if (lng) document.documentElement.lang = lng;
  }, [lng, i18n]);
  return null;
}

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { lng = 'az' } = useParams();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50" data-testid="auth-loading">
        <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to={`/${lng}/login`} replace state={{ from: location }} />;
  }
  return children;
}

function LocalisedRoutes() {
  return (
    <>
      <LocaleSync />
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route
          path="dashboard"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="bots" element={<BotsPage />} />
          <Route path="bots/new" element={<CreateBotPage />} />
          <Route path="training" element={<TrainingPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </>
  );
}

function LocaleScope() {
  const { lng } = useParams();
  if (!SUPPORTED_LOCALES.includes(lng)) {
    return <Navigate to="/az" replace />;
  }
  return <LocalisedRoutes />;
}

export default function App() {
  return (
    <Routes>
      {/* Hidden admin path — closed unless VITE_ENABLE_ADMIN_MOCK=true */}
      {ADMIN_MOCK_ENABLED ? (
        <>
          <Route path="/control-center-aio-2026" element={<AdminLoginPage />} />
          <Route path="/control-center-aio-2026/dashboard" element={<AdminLayout />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
            <Route path="usage" element={<AdminUsagePage />} />
            <Route path="pricing" element={<AdminPricingPage />} />
            <Route path="security" element={<AdminSecurityPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
          </Route>
        </>
      ) : (
        <>
          <Route path="/control-center-aio-2026" element={<AdminDisabledPage />} />
          <Route path="/control-center-aio-2026/*" element={<AdminDisabledPage />} />
        </>
      )}

      {/* Locale-scoped public + seller dashboard */}
      <Route path="/:lng/*" element={<LocaleScope />} />
      <Route path="*" element={<Navigate to="/az" replace />} />
    </Routes>
  );
}
