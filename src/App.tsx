import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import Navbar from './components/Navbar';
import Sidebar, { buildAllSubMenus } from './components/Sidebar';
import CategoryModal from './components/CategoryModal';
import HomePage from './pages/HomePage';
import ProformaPage from './pages/ProformaPage';
import InverterPage from './pages/products/InverterPage';
import PvPage from './pages/products/PvPage';
import BatteryPage from './pages/products/BatteryPage';
import InfrastructurePage from './pages/products/InfrastructurePage';
import ExtrasPage from './pages/products/ExtrasPage';
import CustomCategoryPage from './pages/products/CustomCategoryPage';

import {
  INITIAL_INVERTERS,
  INITIAL_PVS,
  INITIAL_BATTERIES,
  INITIAL_INFRASTRUCTURE,
  INITIAL_EXTRAS,
  INITIAL_CUSTOM_CATEGORIES,
  INITIAL_CUSTOM_PRODUCTS,
} from './types/product';
import type {
  MainTab,
  ProductSubTab,
  InverterProduct,
  PvProduct,
  BatteryProduct,
  InfrastructureProduct,
  ExtraProduct,
  CustomCategory,
  CustomProduct,
  CategoryIconName,
} from './types/product';

interface DatabaseState {
  inverters: InverterProduct[];
  pvs: PvProduct[];
  batteries: BatteryProduct[];
  infrastructure: InfrastructureProduct[];
  extras: ExtraProduct[];
  customCategories: CustomCategory[];
  customProducts: CustomProduct[];
}

type DbStatus = 'loading' | 'ready' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const EMPTY_DB: DatabaseState = {
  inverters: INITIAL_INVERTERS,
  pvs: INITIAL_PVS,
  batteries: INITIAL_BATTERIES,
  infrastructure: INITIAL_INFRASTRUCTURE,
  extras: INITIAL_EXTRAS,
  customCategories: INITIAL_CUSTOM_CATEGORIES,
  customProducts: INITIAL_CUSTOM_PRODUCTS,
};

function saveToLocalStorage(data: DatabaseState) {
  try {
    localStorage.setItem('ose_inverters', JSON.stringify(data.inverters));
    localStorage.setItem('ose_pvs', JSON.stringify(data.pvs));
    localStorage.setItem('ose_batteries', JSON.stringify(data.batteries));
    localStorage.setItem('ose_infrastructure', JSON.stringify(data.infrastructure));
    localStorage.setItem('ose_extras', JSON.stringify(data.extras));
    localStorage.setItem('ose_custom_categories', JSON.stringify(data.customCategories));
    localStorage.setItem('ose_custom_products', JSON.stringify(data.customProducts));
  } catch {
    // 5MB localStorage sınırı aşılırsa çökmesini engeller
  }
}

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('home');
  const [activeProductSubTab, setActiveProductSubTab] = useState<ProductSubTab>('inverter');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [dbStatus, setDbStatus] = useState<DbStatus>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);

  const [db, setDb] = useState<DatabaseState>(EMPTY_DB);
  const dbRef = useRef<DatabaseState>(EMPTY_DB);
  const saveTimerRef = useRef<number | null>(null);

  // 1. Buluttan sadece OKUMA yap (Asla otomatik POST atmaz)
  const fetchDatabase = useCallback(async () => {
    setDbStatus('loading');
    try {
      const res = await fetch(`/api/db?t=${Date.now()}`, { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';

      if (res.status === 404) {
        // Bulut veritabanı ilk kez kullanılıyor (gerçekten boş)
        dbRef.current = EMPTY_DB;
        setDb(EMPTY_DB);
        setDbStatus('ready');
        return;
      }

      if (!res.ok || !contentType.includes('application/json')) {
        throw new Error('Veritabanı yanıt vermedi');
      }

      const data = await res.json();
      const loaded: DatabaseState = {
        inverters: Array.isArray(data.inverters) ? data.inverters : [],
        pvs: Array.isArray(data.pvs) ? data.pvs : [],
        batteries: Array.isArray(data.batteries) ? data.batteries : [],
        infrastructure: Array.isArray(data.infrastructure) ? data.infrastructure : [],
        extras: Array.isArray(data.extras) ? data.extras : [],
        customCategories: Array.isArray(data.customCategories) ? data.customCategories : [],
        customProducts: Array.isArray(data.customProducts) ? data.customProducts : [],
      };

      dbRef.current = loaded;
      setDb(loaded);
      saveToLocalStorage(loaded);
      setDbStatus('ready');
    } catch {
      // Okuma başarısızsa veritabanını koru, boş veriyle üzerine yazma
      setDbStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchDatabase();
  }, [fetchDatabase]);

  // 2. SADECE kullanıcı bir değişiklik yaptığında buluta kaydet
  const commitDatabaseChange = useCallback(
    async (updater: (current: DatabaseState) => DatabaseState) => {
      if (dbStatus !== 'ready') {
        alert('Veritabanı bağlantısı hazır değil. Lütfen sayfayı yenileyip tekrar deneyin.');
        return;
      }

      const nextDb = updater(dbRef.current);
      dbRef.current = nextDb;
      setDb(nextDb);
      saveToLocalStorage(nextDb);

      setSaveStatus('saving');
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(nextDb),
        });

        if (!res.ok) {
          throw new Error('Buluta kaydedilemedi');
        }

        setSaveStatus('saved');
        saveTimerRef.current = window.setTimeout(() => {
          setSaveStatus('idle');
        }, 2500);
      } catch {
        setSaveStatus('error');
      }
    },
    [dbStatus]
  );

  // Alt sayfalar için kaydetme fonksiyonları
  const handleSaveInverters = (inverters: InverterProduct[]) =>
    commitDatabaseChange((prev) => ({ ...prev, inverters }));

  const handleSavePvs = (pvs: PvProduct[]) =>
    commitDatabaseChange((prev) => ({ ...prev, pvs }));

  const handleSaveBatteries = (batteries: BatteryProduct[]) =>
    commitDatabaseChange((prev) => ({ ...prev, batteries }));

  const handleSaveInfrastructure = (infrastructure: InfrastructureProduct[]) =>
    commitDatabaseChange((prev) => ({ ...prev, infrastructure }));

  const handleSaveExtras = (extras: ExtraProduct[]) =>
    commitDatabaseChange((prev) => ({ ...prev, extras }));

  const handleSaveCategory = (label: string, iconName: CategoryIconName) => {
    if (editingCategory) {
      commitDatabaseChange((prev) => ({
        ...prev,
        customCategories: prev.customCategories.map((c) =>
          c.id === editingCategory.id ? { ...c, label, iconName } : c
        ),
      }));
    } else {
      const newCategory: CustomCategory = {
        id: 'cat-' + Date.now(),
        label,
        iconName,
      };
      commitDatabaseChange((prev) => ({
        ...prev,
        customCategories: [...prev.customCategories, newCategory],
      }));
      setActiveMainTab('products');
      setActiveProductSubTab(newCategory.id);
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    commitDatabaseChange((prev) => ({
      ...prev,
      customCategories: prev.customCategories.filter((c) => c.id !== categoryId),
      customProducts: prev.customProducts.filter((p) => p.categoryId !== categoryId),
    }));
    setActiveProductSubTab('inverter');
  };

  const handleSaveCategoryProducts = (
    categoryId: string,
    updatedCategoryProducts: CustomProduct[]
  ) => {
    commitDatabaseChange((prev) => ({
      ...prev,
      customProducts: [
        ...prev.customProducts.filter((p) => p.categoryId !== categoryId),
        ...updatedCategoryProducts,
      ],
    }));
  };

  const {
    inverters,
    pvs,
    batteries,
    infrastructure,
    extras,
    customCategories,
    customProducts,
  } = db;

  const hasSidebar = activeMainTab === 'products';
  const allMenus = buildAllSubMenus(customCategories);

  const counts: Record<string, number> = {
    inverter: inverters.length,
    pv: pvs.length,
    batarya: batteries.length,
    altyapi: infrastructure.length,
    ekstralar: extras.length,
  };
  customCategories.forEach((cat) => {
    counts[cat.id] = customProducts.filter((p) => p.categoryId === cat.id).length;
  });

  const handleMainTabChange = (tab: MainTab) => {
    setActiveMainTab(tab);
    setIsMobileSidebarOpen(false);
  };

  const handleSubTabChange = (subTab: ProductSubTab) => {
    setActiveProductSubTab(subTab);
    setIsMobileSidebarOpen(false);
  };

  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: CustomCategory) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

  const activeCustomCategory = customCategories.find(
    (c) => c.id === activeProductSubTab
  );

  return (
    <div className="min-h-screen bg-[#111318] text-zinc-100 flex flex-col pb-24 md:pb-0">
      <Navbar
        activeMainTab={activeMainTab}
        hasSidebar={hasSidebar}
        onMainTabChange={handleMainTabChange}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* BULUT KAYIT DURUM BİLDİRİMİ */}
      {saveStatus !== 'idle' && (
        <div className="fixed bottom-24 md:bottom-6 right-4 z-50">
          {saveStatus === 'saving' && (
            <div className="px-4 py-2.5 rounded-xl bg-[#161920] border border-[#00b8e6]/40 text-[#00b8e6] text-sm font-bold flex items-center gap-2 shadow-xl">
              <Loader2 className="w-4 h-4 animate-spin" />
              Buluta kaydediliyor...
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="px-4 py-2.5 rounded-xl bg-[#161920] border border-emerald-500/40 text-emerald-400 text-sm font-bold flex items-center gap-2 shadow-xl">
              <CheckCircle2 className="w-4 h-4" />
              Buluta kaydedildi
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="px-4 py-2.5 rounded-xl bg-[#161920] border border-rose-500/50 text-rose-400 text-sm font-bold flex items-center gap-2 shadow-xl">
              <AlertTriangle className="w-4 h-4" />
              Buluta kayıt başarısız! İnterneti kontrol edin.
            </div>
          )}
        </div>
      )}

      {/* VERİTABANI YÜKLENİYOR VEYA BAĞLANTI HATASI EKRANI */}
      {dbStatus === 'loading' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 text-[#8a8f9e]">
          <Loader2 className="w-10 h-10 text-[#00b8e6] animate-spin" />
          <p className="text-base font-bold text-white">Ürün veritabanı yükleniyor...</p>
        </div>
      ) : dbStatus === 'error' ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#161920] border border-rose-500/40 rounded-3xl p-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
            <h2 className="text-xl font-extrabold text-white">
              Veritabanına Bağlanılamadı
            </h2>
            <p className="text-sm text-[#8a8f9e]">
              Mevcut ürünlerinizin silinmesini önlemek için işlem durduruldu. İnternet bağlantınızı kontrol edip tekrar deneyin.
            </p>
            <button
              type="button"
              onClick={fetchDatabase}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#00b8e6] hover:bg-cyan-400 text-[#111318] font-extrabold text-base flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Tekrar Dene
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* MOBİL YATAY KATEGORİ BARI */}
          {hasSidebar && (
            <div className="md:hidden sticky top-24 z-30 bg-[#161920] border-b border-[#232730] px-3 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {allMenus.map((item) => {
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

              <button
                type="button"
                onClick={openAddCategoryModal}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap bg-[#111318] text-[#00b8e6] border border-dashed border-[#00b8e6]/60"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni</span>
              </button>
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
                customCategories={customCategories}
                onOpenAddCategory={openAddCategoryModal}
              />
            )}

            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
              {activeMainTab === 'home' && (
                <HomePage
                  onNavigateMain={handleMainTabChange}
                  onNavigateProductSub={handleSubTabChange}
                  counts={counts}
                  customCategories={customCategories}
                  onOpenAddCategory={openAddCategoryModal}
                />
              )}

              {activeMainTab === 'products' && (
                <>
                  {activeProductSubTab === 'inverter' && (
                    <InverterPage
                      inverters={inverters}
                      onSaveInverters={handleSaveInverters}
                    />
                  )}
                  {activeProductSubTab === 'pv' && (
                    <PvPage pvs={pvs} onSavePvs={handleSavePvs} />
                  )}
                  {activeProductSubTab === 'batarya' && (
                    <BatteryPage
                      batteries={batteries}
                      onSaveBatteries={handleSaveBatteries}
                    />
                  )}
                  {activeProductSubTab === 'altyapi' && (
                    <InfrastructurePage
                      items={infrastructure}
                      onSaveItems={handleSaveInfrastructure}
                    />
                  )}
                  {activeProductSubTab === 'ekstralar' && (
                    <ExtrasPage extras={extras} onSaveExtras={handleSaveExtras} />
                  )}
                  {activeCustomCategory && (
                    <CustomCategoryPage
                      category={activeCustomCategory}
                      products={customProducts.filter(
                        (p) => p.categoryId === activeCustomCategory.id
                      )}
                      onSaveCategoryProducts={handleSaveCategoryProducts}
                      onEditCategory={openEditCategoryModal}
                      onDeleteCategory={handleDeleteCategory}
                    />
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
                  customCategories={customCategories}
                  customProducts={customProducts}
                />
              )}
            </main>
          </div>
        </>
      )}

      <CategoryModal
        isOpen={isCategoryModalOpen}
        editingCategory={editingCategory}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
      />
    </div>
  );
}
