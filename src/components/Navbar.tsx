import { useState } from 'react';
import { Home, Package, FileSpreadsheet, Menu } from 'lucide-react';
import type { MainTab } from '../types/product';

interface NavbarProps {
  activeMainTab: MainTab;
  hasSidebar: boolean;
  onMainTabChange: (tab: MainTab) => void;
  onOpenMobileSidebar: () => void;
}

export default function Navbar({
  activeMainTab,
  hasSidebar,
  onMainTabChange,
  onOpenMobileSidebar,
}: NavbarProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <>
      {/* ÜST BAR */}
      <header className="sticky top-0 z-40 h-24 bg-[#111318]/95 backdrop-blur-md border-b border-[#232730] px-4 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          {hasSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="md:hidden p-3 -ml-2 rounded-xl text-zinc-300 hover:text-[#00b8e6] bg-[#161920] border border-[#2c303a]"
              aria-label="Kategoriler"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          {/* Görseldeki OSE TEKNOLOJİ Logo ve Başlık Yapısı */}
          <div
            onClick={() => onMainTabChange('home')}
            className="flex items-center gap-4 cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#14161c] border-2 border-[#383c47] group-hover:border-[#00b8e6] flex items-center justify-center p-1.5 transition-colors shrink-0">
              <div className="w-full h-full bg-[#090a0d] rounded-xl flex items-center justify-center overflow-hidden">
                {!imgError ? (
                  <img
                    src="/logo.png"
                    alt="Ose Teknoloji"
                    className="w-9 h-9 object-contain"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <svg
                    viewBox="0 0 100 100"
                    className="w-8 h-8 text-white fill-none stroke-current"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M 35 22 A 38 38 0 1 1 20 75 C 12 62 18 40 35 42" />
                    <path
                      d="M 36 42 C 44 34 55 36 62 43 L 43 62 C 36 55 34 44 36 42 Z"
                      fill="currentColor"
                    />
                    <line x1="56" y1="49" x2="64" y2="57" strokeWidth="6" />
                    <line x1="49" y1="56" x2="57" y2="64" strokeWidth="6" />
                  </svg>
                )}
              </div>
            </div>

            <div>
              <h1 className="font-black text-2xl sm:text-3xl tracking-wide text-white leading-none">
                OSE <span className="text-[#00b8e6]">TEKNOLOJİ</span>
              </h1>
              <p className="text-sm sm:text-base text-[#8a8f9e] font-medium tracking-wide mt-1">
                0544 462 11 22
              </p>
            </div>
          </div>
        </div>

        {/* MASAÜSTÜ MENÜ */}
        <nav className="hidden md:flex items-center gap-2 bg-[#161920] p-1.5 rounded-2xl border border-[#262a34]">
          <button
            onClick={() => onMainTabChange('home')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-base font-bold transition-all ${
              activeMainTab === 'home'
                ? 'bg-[#00b8e6] text-[#111318] shadow-[0_0_15px_rgba(0,184,230,0.3)]'
                : 'text-[#8a8f9e] hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            Ana Sayfa
          </button>

          <button
            onClick={() => onMainTabChange('products')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-base font-bold transition-all ${
              activeMainTab === 'products'
                ? 'bg-[#00b8e6] text-[#111318] shadow-[0_0_15px_rgba(0,184,230,0.3)]'
                : 'text-[#8a8f9e] hover:text-white'
            }`}
          >
            <Package className="w-5 h-5" />
            Ürünler
          </button>

          <button
            onClick={() => onMainTabChange('proforma')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-base font-bold transition-all ${
              activeMainTab === 'proforma'
                ? 'bg-[#00b8e6] text-[#111318] shadow-[0_0_15px_rgba(0,184,230,0.3)]'
                : 'text-[#8a8f9e] hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            Proforma Hazırla
          </button>
        </nav>
      </header>

      {/* MOBİL ALT MENÜ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111318] border-t border-[#232730] grid grid-cols-3 h-20 px-2">
        <button
          onClick={() => onMainTabChange('home')}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl m-1 font-bold text-sm ${
            activeMainTab === 'home'
              ? 'bg-[#00b8e6]/15 text-[#00b8e6]'
              : 'text-[#8a8f9e]'
          }`}
        >
          <Home className="w-6 h-6" />
          <span>Ana Sayfa</span>
        </button>

        <button
          onClick={() => onMainTabChange('products')}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl m-1 font-bold text-sm ${
            activeMainTab === 'products'
              ? 'bg-[#00b8e6]/15 text-[#00b8e6]'
              : 'text-[#8a8f9e]'
          }`}
        >
          <Package className="w-6 h-6" />
          <span>Ürünler</span>
        </button>

        <button
          onClick={() => onMainTabChange('proforma')}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl m-1 font-bold text-sm ${
            activeMainTab === 'proforma'
              ? 'bg-[#00b8e6]/15 text-[#00b8e6]'
              : 'text-[#8a8f9e]'
          }`}
        >
          <FileSpreadsheet className="w-6 h-6" />
          <span>Proforma</span>
        </button>
      </nav>
    </>
  );
}
