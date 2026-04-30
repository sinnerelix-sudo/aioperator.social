import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './i18n';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import ConfigErrorScreen from './components/ConfigErrorScreen.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AdminProvider } from './context/AdminContext.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Production fail-loud guard: if VITE_API_URL is missing in a production build,
// every API call would silently 404. Show an explicit configuration screen
// instead of letting the user stare at a half-broken app.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  root.render(
    <React.StrictMode>
      <ConfigErrorScreen
        title="Konfiqurasiya xətası · Configuration error"
        message="Backend API URL konfiqurasiya edilməyib. VITE_API_URL əlavə edin."
        hint={'Vercel → Project → Settings → Environment Variables\nVITE_API_URL=https://<your-render-backend>.onrender.com'}
      />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <AdminProvider>
                <App />
              </AdminProvider>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
