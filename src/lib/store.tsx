/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { api, setUnauthorizedHandler } from './api';
import type { AppSettings, Brochure, Category, Kit, Product, User } from '../../shared/types';
import { mergeSettings } from '../../shared/catalog';

// ================= AUTH =================

interface AuthState {
  loading: boolean;
  needsSetup: boolean;
  user: User | null;
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}
const AuthCtx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const s = await api.get<{ needsSetup: boolean; user: User | null }>('/auth/status');
      setNeedsSetup(s.needsSetup);
      setUser(s.user);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    setUnauthorizedHandler(() => setUser(null));
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => null);
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ loading, needsSetup, user, error, refresh, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthCtx.Provider>
  );
}
export const useAuth = () => useContext(AuthCtx);

// ================= KATALOG / AYARLAR =================

interface DataState {
  ready: boolean;
  categories: Category[];
  products: Product[];
  kits: Kit[];
  settings: AppSettings;
  brochures: Brochure[];
  emailEnabled: boolean;
  reloadCatalog: () => Promise<void>;
  reloadKits: () => Promise<void>;
  reloadSettings: () => Promise<void>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setBrochures: (b: Brochure[]) => void;
  setSettings: (s: AppSettings) => void;
  productMap: Map<string, Product>;
  categoryMap: Map<string, Category>;
}
const DataCtx = createContext<DataState>(null as unknown as DataState);

export function DataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [settings, setSettings] = useState<AppSettings>(mergeSettings(null));
  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [emailEnabled, setEmailEnabled] = useState(false);

  const reloadCatalog = useCallback(async () => {
    const d = await api.get<{ categories: Category[]; products: Product[] }>('/catalog');
    setCategories(d.categories);
    setProducts(d.products);
  }, []);
  const reloadKits = useCallback(async () => {
    const d = await api.get<{ kits: Kit[] }>('/kits');
    setKits(d.kits);
  }, []);
  const reloadSettings = useCallback(async () => {
    const d = await api.get<{ settings: AppSettings; brochures: Brochure[]; emailEnabled: boolean }>('/settings');
    setSettings(mergeSettings(d.settings));
    setBrochures(d.brochures);
    setEmailEnabled(d.emailEnabled);
  }, []);

  useEffect(() => {
    Promise.all([reloadCatalog(), reloadKits(), reloadSettings()])
      .catch(() => null)
      .finally(() => setReady(true));
  }, [reloadCatalog, reloadKits, reloadSettings]);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <DataCtx.Provider
      value={{
        ready,
        categories,
        products,
        kits,
        settings,
        brochures,
        emailEnabled,
        reloadCatalog,
        reloadKits,
        reloadSettings,
        setProducts,
        setBrochures,
        setSettings,
        productMap,
        categoryMap,
      }}
    >
      {children}
    </DataCtx.Provider>
  );
}
export const useData = () => useContext(DataCtx);

// ================= TEMA =================

export type ThemePref = 'dark' | 'light' | 'system';
export function applyTheme(pref: ThemePref) {
  const t = pref === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : pref;
  document.documentElement.className = t;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'light' ? '#f4f6fa' : '#0f1116');
}
export function useTheme(): [ThemePref, (p: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(() => (localStorage.getItem('ose-theme') as ThemePref) || 'dark');
  const set = (p: ThemePref) => {
    localStorage.setItem('ose-theme', p);
    setPref(p);
    applyTheme(p);
  };
  return [pref, set];
}

// ================= BİLDİRİM (TOAST) & ONAY =================

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}
interface ConfirmOpts {
  title: string;
  message?: string;
  confirmText?: string;
  danger?: boolean;
}
interface UiState {
  toast: (text: string, kind?: ToastKind) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
}
const UiCtx = createContext<UiState>(null as unknown as UiState);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const idRef = useRef(1);

  const toast = useCallback((text: string, kind: ToastKind = 'success') => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3200);
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), []);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <UiCtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="fixed z-[80] bottom-24 md:bottom-6 right-3 left-3 md:left-auto flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-in pointer-events-auto max-w-sm w-full md:w-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm font-semibold bg-surface ${
              t.kind === 'success' ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400' : t.kind === 'error' ? 'border-rose-500/50 text-rose-600 dark:text-rose-400' : 'border-primary/40 text-primary'
            }`}
          >
            {t.kind === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : t.kind === 'error' ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
            <span className="text-fg">{t.text}</span>
            <button className="ml-auto text-muted hover:text-fg" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      {dialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => close(false)} />
          <div className="relative card p-6 w-full max-w-md animate-in shadow-2xl">
            <h3 className="text-lg font-extrabold">{dialog.title}</h3>
            {dialog.message && <p className="text-sm text-muted mt-2 whitespace-pre-line">{dialog.message}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button className="btn-secondary" onClick={() => close(false)}>
                Vazgeç
              </button>
              <button className={dialog.danger ? 'btn bg-rose-600 text-white hover:bg-rose-500' : 'btn-primary'} onClick={() => close(true)} autoFocus>
                {dialog.confirmText || 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UiCtx.Provider>
  );
}
export const useUi = () => useContext(UiCtx);
