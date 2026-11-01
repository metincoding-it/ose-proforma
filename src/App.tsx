import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar, { PRODUCT_SUB_MENUS } from './components/Sidebar';
import HomePage from './pages/HomePage';
import ProformaPage from './pages/ProformaPage';
import InverterPage from './pages/products/InverterPage';
import PvPage from './pages/products/PvPage';
import BatteryPage from './pages/products/BatteryPage';
import InfrastructurePage from './pages/products/InfrastructurePage';
import ExtrasPage from './pages/products/ExtrasPage';

import {
  INITIAL_INVERTERS,
  INITIAL_PVS,
  INITIAL_BATTERIES,
  INITIAL_INFRASTRUCTURE,
  INITIAL_EXTRAS,
} from './types/product';
import type {
  MainTab,
  ProductSubTab,
  InverterProduct,
  PvProduct,
  BatteryProduct,
  InfrastructureProduct,
  ExtraProduct,
} from './types/product';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
  } catch {
    // localStorage okuma hatası olursa varsayılana dön
  }
  return fallback;
}

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('home');
  const [activeProductSubTab, setActiveProductSubTab] = useState<ProductSubTab>('inverter');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  const [inverters, setInverters] = useState<InverterProduct[]>(() =>
    loadFromStorage('ose_inverters', INITIAL_INVERTERS)
  );
  const [pvs, setPvs] = useState<PvProduct[]>(() =>
    loadFromStorage('ose_pvs', INITIAL_PVS)
  );
  const [batteries, setBatteries] = useState<BatteryProduct[]>(() =>
    loadFromStorage('ose_batteries', INITIAL_BATTERIES)
  );
  const [infrastructure, setInfrastructure] = useState<InfrastructureProduct[]>(() =>
    loadFromStorage('ose_infrastructure', INITIAL_INFRASTRUCTURE)
  );
  const [extras, setExtras] = useState<ExtraProduct[]>(() =>
    loadFromStorage('ose_extras', INITIAL_EXTRAS)
  );

  // 1. Açılışta ürünleri public/db.json dosyasından yükle
  useEffect(() => {
    async function initDatabase() {
      try {
        // Önce yerel geliştirme sunucusundan (/api/db), olmazsa statik dosyadan (/db.json) oku
        let res = await fetch('/api/db');
        if (!res.ok) {
          res = await fetch(`/db.json?t=${Date.now()}`);
        }

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.inverters)) setInverters(data.inverters);
          if (Array.isArray(data.pvs)) setPvs(data.pvs);
          if (Array.isArray(data.batteries)) setBatteries(data.batteries);
          if (Array.isArray(data.infrastructure)) setInfrastructure(data.infrastructure);
          if (Array.isArray(data.extras)) setExtras(data.extras);
        }
      } catch {
        // İlk kurulumda dosya henüz yoksa mevcut state kullanılır ve birazdan oluşturulur
      } finally {
        setIsDbLoaded(true);
      }
    }

    initDatabase();
  }, []);

  // 2. Ürünler her değiştiğinde hem public/db.json dosyasına hem localStorage'a kaydet
  useEffect(() => {
    if (!isDbLoaded) return;

    const payload = {
      inverters,
      pvs,
      batteries,
      infrastructure,
      extras,
    };

    // Bilgisayar diskine (public/db.json) kalıcı olarak yaz
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload, null, 2),
    }).catch(() => {
      // Statik Cloudflare ortamında sadece localStorage kullanılır
    });

    // Tarayıcı yedeği
    try {
      localStorage.setItem('ose_inverters', JSON.stringify(inverters));
      localStorage.setItem('ose_pvs', JSON.stringify(pvs));
      localStorage.setItem('ose_batteries', JSON.stringify(batteries));
      localStorage.setItem('ose_infrastructure', JSON.stringify(infrastructure));
      localStorage.setItem('ose_extras', JSON.stringify(extras));
    } catch {
      // Fotoğraf boyutu 5MB localStorage sınırını aşarsa çökmesini engeller
    }
  }, [inverters, pvs, batteries, infrastructure, extras, isDbLoaded]);

  const hasSidebar = activeMainTab === 'products';

  const counts: Record<ProductSubTab, number> = {
    inverter: inverters.length,
    pv: pvs.length,
    batarya: batteries.length,
    altyapi: infrastructure.length,
    ekstralar: extras.length,
  };

  const handleMainTabChange = (tab: MainTab) => {
    setActiveMainTab(tab);
    setIsMobileSidebarOpen(false);
  };

  const handleSubTabChange = (subTab: ProductSubTab) => {
    setActiveProductSubTab(subTab);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#111318] text-zinc-100 flex flex-col pb-24 md:pb-0">
      <Navbar
        activeMainTab={activeMainTab}
        hasSidebar={hasSidebar}
        onMainTabChange={handleMainTabChange}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* MOBİL YATAY KATEGORİ BARI */}
      {hasSidebar && (
        <div className="md:hidden sticky top-24 z-30 bg-[#161920] border-b border-[#232730] px-3 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {PRODUCT_SUB_MENUS.map((item) => {
            const Icon = item.icon;
            const isActive = activeProductSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSubTabChange(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#00b8e6] text-[#111318]'
                    : 'bg-[#111318] text-zinc-300 border border-[#262a34]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 flex relative">
        {hasSidebar && (
          <Sidebar
            activeSubTab={activeProductSubTab}
            isMobileOpen={isMobileSidebarOpen}
            onSubTabChange={handleSubTabChange}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            counts={counts}
          />
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
          {activeMainTab === 'home' && (
            <HomePage
              onNavigateMain={handleMainTabChange}
              onNavigateProductSub={handleSubTabChange}
              counts={counts}
            />
          )}

          {activeMainTab === 'products' && (
            <>
              {activeProductSubTab === 'inverter' && (
                <InverterPage inverters={inverters} onSaveInverters={setInverters} />
              )}
              {activeProductSubTab === 'pv' && (
                <PvPage pvs={pvs} onSavePvs={setPvs} />
              )}
              {activeProductSubTab === 'batarya' && (
                <BatteryPage batteries={batteries} onSaveBatteries={setBatteries} />
              )}
              {activeProductSubTab === 'altyapi' && (
                <InfrastructurePage items={infrastructure} onSaveItems={setInfrastructure} />
              )}
              {activeProductSubTab === 'ekstralar' && (
                <ExtrasPage extras={extras} onSaveExtras={setExtras} />
              )}
            </>
          )}

          {activeMainTab === 'proforma' && (
            <ProformaPage
              inverters={inverters}
              pvs={pvs}
              batteries={batteries}
              infrastructure={infrastructure}
              extras={extras}
            />
          )}
        </main>
      </div>
    </div>
  );
}