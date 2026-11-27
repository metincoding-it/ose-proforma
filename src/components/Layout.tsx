import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Layers,
  Settings,
  UserCog,
  History,
  Plus,
  Sun,
  Moon,
  Monitor,
  LogOut,
  KeyRound,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useAuth, useData, useTheme, useUi } from '../lib/store';
import type { ThemePref } from '../lib/store';
import { Modal, Field, DynIcon } from './ui';
import type { CategoryGroup } from '../../shared/types';
import { GROUP_ICON, GROUP_LABEL, MAIN_GROUPS } from '../../shared/types';
import { api, errMsg } from '../lib/api';

const NAV = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/teklifler', label: 'Teklifler', icon: FileText },
  { to: '/musteriler', label: 'Müşteriler', icon: Users },
  { to: '/urunler', label: 'Ürünler', icon: Package },
  { to: '/paketler', label: 'Hazır Paketler', icon: Layers },
];
const ADMIN_NAV = [
  { to: '/ayarlar', label: 'Ayarlar', icon: Settings },
  { to: '/kullanicilar', label: 'Kullanıcılar', icon: UserCog },
  { to: '/islem-kaydi', label: 'İşlem Kaydı', icon: History },
];

function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const [pref, setPref] = useTheme();
  const opts: { v: ThemePref; icon: typeof Sun; label: string }[] = [
    { v: 'light', icon: Sun, label: 'Açık' },
    { v: 'dark', icon: Moon, label: 'Koyu' },
    { v: 'system', icon: Monitor, label: 'Sistem' },
  ];
  return (
    <div className="inline-flex p-1 rounded-xl bg-surface-2 border border-line">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => setPref(o.v)}
          title={o.label}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${pref === o.v ? 'bg-primary text-primary-fg' : 'text-muted hover:text-fg'}`}
        >
          <o.icon className="w-4 h-4" />
          {!compact && o.label}
        </button>
      ))}
    </div>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useUi();
  const save = async () => {
    setBusy(true);
    try {
      await api.post('/auth/password', { current, next });
      toast('Şifreniz güncellendi.');
      setCurrent('');
      setNext('');
      onClose();
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Şifre Değiştir"
      size="sm"
      footer={
        <button className="btn-primary" onClick={save} disabled={busy || next.length < 8}>
          Kaydet
        </button>
      }
    >
      <div className="space-y-4">
        <Field label="Mevcut şifre">
          <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="Yeni şifre" hint="En az 8 karakter">
          <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </Field>
      </div>
    </Modal>
  );
}

function Brand({ onClick }: { onClick?: () => void }) {
  const { settings } = useData();
  const name = settings.company.name || 'OSE TEKNOLOJİ';
  const [first, ...rest] = name.split(' ');
  return (
    <button onClick={onClick} className="flex items-center gap-3 min-w-0 text-left">
      <img src={settings.company.logo || '/logo.png'} alt="" className="w-10 h-10 rounded-xl object-cover border border-line shrink-0" />
      <div className="min-w-0">
        <div className="font-black text-[17px] leading-tight tracking-wide truncate">
          {first} <span className="text-primary">{rest.join(' ')}</span>
        </div>
        <div className="text-[11px] font-semibold text-muted truncate">Teklif & Proforma Sistemi</div>
      </div>
    </button>
  );
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pwOpen, setPwOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const newQuote = (g: CategoryGroup) => {
    setNewOpen(false);
    navigate(g ? `/teklifler/yeni?tur=${g}` : '/teklifler/yeni');
  };
  const items = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;
  const isEditor = /^\/teklifler\/[^/]+$/.test(location.pathname);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition ${
      isActive ? 'bg-primary/12 text-primary' : 'text-muted hover:text-fg hover:bg-surface-2'
    }`;

  return (
    <div className="min-h-screen flex">
      {/* MASAÜSTÜ YAN MENÜ */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-line bg-surface sticky top-0 h-screen">
        <div className="px-5 h-[72px] flex items-center border-b border-line">
          <Brand onClick={() => navigate('/')} />
        </div>
        <div className="p-3">
          <button className="btn-primary w-full py-3 shadow-glow" onClick={() => navigate('/teklifler/yeni')}>
            <Plus className="w-5 h-5" /> Yeni Teklif
          </button>
        </div>
        <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>
              <n.icon className="w-5 h-5" /> {n.label}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="px-3 pt-5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted/70">Yönetim</div>
              {ADMIN_NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={linkCls}>
                  <n.icon className="w-5 h-5" /> {n.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="p-3 border-t border-line space-y-3">
          <ThemeSwitch compact />
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-primary/15 text-primary font-black flex items-center justify-center shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{user?.name}</div>
              <div className="text-[11px] text-muted">{isAdmin ? 'Yönetici' : 'Satış Personeli'}</div>
            </div>
            <button className="btn-icon" title="Şifre değiştir" onClick={() => setPwOpen(true)}>
              <KeyRound className="w-4 h-4" />
            </button>
            <button className="btn-icon" title="Çıkış yap" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* MOBİL ÜST BAR */}
        <header className="lg:hidden sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-line pt-[env(safe-area-inset-top)]">
          <div className="h-14 px-4 flex items-center justify-between gap-3">
            <Brand onClick={() => navigate('/')} />
            <button className="btn-icon w-10 h-10 shrink-0" onClick={() => setMoreOpen(true)} aria-label="Menü">
              <MoreHorizontal className="w-6 h-6" />
            </button>
          </div>
        </header>

        <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-8 ${isEditor ? 'max-w-[1400px]' : 'max-w-7xl'} pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-10`}>
          <Outlet />
        </main>
      </div>

      {/* MOBİL ALT MENÜ */}
      <nav className={`lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line safe-bottom ${isEditor ? 'hidden' : ''}`}>
        <div className="grid grid-cols-5 h-16">
          {[NAV[0], NAV[1]].map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${isActive ? 'text-primary' : 'text-muted'}`}>
              <n.icon className="w-[22px] h-[22px]" />
              {n.label}
            </NavLink>
          ))}
          <button onClick={() => setNewOpen(true)} className="flex items-center justify-center" aria-label="Yeni teklif">
            <span className="w-12 h-12 -mt-5 rounded-2xl bg-primary text-primary-fg flex items-center justify-center shadow-glow">
              <Plus className="w-6 h-6" />
            </span>
          </button>
          {[NAV[2], NAV[3]].map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${isActive ? 'text-primary' : 'text-muted'}`}>
              <n.icon className="w-[22px] h-[22px]" />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* YENİ TEKLİF – TÜR SEÇİMİ */}
      {newOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setNewOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-surface border-t border-line rounded-t-3xl p-4 pt-2.5 animate-in safe-bottom">
            <div className="mx-auto w-10 h-1.5 rounded-full bg-line mb-3" />
            <div className="font-extrabold text-lg mb-1">Yeni teklif</div>
            <p className="text-sm text-muted mb-4">Teklif türünü seçin; PDF metinleri ve ödeme planı buna göre gelir.</p>
            <div className="grid grid-cols-2 gap-2">
              {[...MAIN_GROUPS, ''].map((g) => (
                <button
                  key={g || 'genel'}
                  onClick={() => newQuote(g as CategoryGroup)}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-surface-2 px-3 py-5 font-bold active:scale-[0.98] transition"
                >
                  <span className="w-11 h-11 rounded-xl bg-primary/12 text-primary flex items-center justify-center">
                    <DynIcon name={GROUP_ICON[g as CategoryGroup]} className="w-6 h-6" />
                  </span>
                  {GROUP_LABEL[g as CategoryGroup]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MOBİL MENÜ (ALT SAYFA) */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] bg-surface border-t border-line rounded-t-3xl p-4 pt-2.5 flex flex-col animate-in safe-bottom">
            <div className="mx-auto w-10 h-1.5 rounded-full bg-line mb-3" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-primary/15 text-primary font-black flex items-center justify-center shrink-0">{user?.name?.[0]?.toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold truncate">{user?.name}</div>
                <div className="text-xs text-muted">{isAdmin ? 'Yönetici' : 'Satış Personeli'}</div>
              </div>
              <button className="btn-icon w-10 h-10" onClick={() => setMoreOpen(false)} aria-label="Kapat">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="grid grid-cols-3 gap-2 overflow-y-auto pb-1">
              {items.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={'end' in n ? Boolean(n.end) : undefined}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3.5 text-[12px] font-bold text-center leading-tight transition ${
                      isActive ? 'bg-primary/12 border-primary/40 text-primary' : 'bg-surface-2 border-line text-fg'
                    }`
                  }
                >
                  <n.icon className="w-6 h-6" /> {n.label}
                </NavLink>
              ))}
            </nav>
            <div className="space-y-3 pt-4 mt-3 border-t border-line">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-muted">Tema</span>
                <ThemeSwitch />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setMoreOpen(false);
                    setPwOpen(true);
                  }}
                >
                  <KeyRound className="w-4 h-4" /> Şifre
                </button>
                <button className="btn-danger" onClick={logout}>
                  <LogOut className="w-4 h-4" /> Çıkış
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
