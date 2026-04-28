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
import ProductsPage from './pages/dashboard/ProductsPage.jsx';
import ActivityPage from './pages/dashboard/ActivityPage.jsx';
import SubscriptionPage from './pages/dashboard/SubscriptionPage.jsx';
import SettingsPage from './pages/dashboard/SettingsPage.jsx';
import { useAuth } from './context/AuthContext.jsx';

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
          <Route path="products" element={<ProductsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/:lng/*" element={<LocaleScope />} />
      <Route path="*" element={<Navigate to="/az" replace />} />
    </Routes>
  );
}

function LocaleScope() {
  const { lng } = useParams();
  if (!SUPPORTED_LOCALES.includes(lng)) {
    return <Navigate to="/az" replace />;
  }
  return <LocalisedRoutes />;
}
