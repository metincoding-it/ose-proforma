import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import './index.css';
import { AuthProvider, DataProvider, UiProvider, useAuth } from './lib/store';
import Layout from './components/Layout';
import { PageLoader } from './components/ui';
import LoginPage from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const QuotesList = lazy(() => import('./pages/quotes/QuotesList'));
const QuoteEditor = lazy(() => import('./pages/quotes/QuoteEditor'));
const Customers = lazy(() => import('./pages/customers/Customers'));
const CustomerDetail = lazy(() => import('./pages/customers/CustomerDetail'));
const Products = lazy(() => import('./pages/products/Products'));
const Kits = lazy(() => import('./pages/Kits'));
const SettingsPage = lazy(() => import('./pages/settings/Settings'));
const UsersPage = lazy(() => import('./pages/settings/Users'));
const AuditPage = lazy(() => import('./pages/settings/Audit'));
const PublicQuote = lazy(() => import('./pages/PublicQuote'));

function Protected() {
  const { loading, user, needsSetup, error } = useAuth();
  if (loading) return <PageLoader text="Sistem hazırlanıyor..." />;
  if (error) return <SetupError message={error} />;
  if (!user) return <LoginPage setup={needsSetup} />;
  return (
    <DataProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="teklifler" element={<QuotesList />} />
            <Route path="teklifler/:id" element={<QuoteEditor />} />
            <Route path="musteriler" element={<Customers />} />
            <Route path="musteriler/:id" element={<CustomerDetail />} />
            <Route path="urunler" element={<Products />} />
            <Route path="paketler" element={<Kits />} />
            {user.role === 'admin' && (
              <>
                <Route path="ayarlar" element={<SettingsPage />} />
                <Route path="kullanicilar" element={<UsersPage />} />
                <Route path="islem-kaydi" element={<AuditPage />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </DataProvider>
  );
}

function SetupError({ message }: { message: string }) {
  const d1 = /D1/.test(message);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 max-w-lg w-full space-y-4">
        <h1 className="text-xl font-black">{d1 ? 'Veritabanı bağlantısı bekleniyor' : 'Sunucuya ulaşılamadı'}</h1>
        <p className="text-sm text-muted">{message}</p>
        {d1 && (
          <ol className="text-sm list-decimal pl-5 space-y-1.5">
            <li>Cloudflare panelinde <b>Storage & Databases → D1</b> altından bir veritabanı oluşturun.</li>
            <li>
              Pages projenizde <b>Settings → Bindings</b> bölümüne <b>D1 database</b> ekleyin, değişken adı: <code className="text-primary">DB</code>
            </li>
            <li>Projeyi yeniden dağıtın (Deployments → Retry deployment).</li>
          </ol>
        )}
        <button className="btn-primary w-full" onClick={() => location.reload()}>
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <UiProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/t/:token" element={<PublicQuote />} />
            <Route
              path="*"
              element={
                <AuthProvider>
                  <Protected />
                </AuthProvider>
              }
            />
          </Routes>
        </Suspense>
      </UiProvider>
    </BrowserRouter>
  </StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => null));
}
