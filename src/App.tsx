import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
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

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
  } catch {
    // Hata durumunda varsayılana dön
  }
  return fallback;
}

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('home');
  const [activeProductSubTab, setActiveProductSubTab] = useState<ProductSubTab>('inverter');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Kategori Ekleme / Düzenleme Modalı State'leri
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);

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
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() =>
    loadFromStorage('ose_custom_categories', INITIAL_CUSTOM_CATEGORIES)
  );
  const [customProducts, setCustomProducts] = useState<CustomProduct[]>(() =>
    loadFromStorage('ose_custom_products', INITIAL_CUSTOM_PRODUCTS)
  );

  // 1. Açılışta ortak bulut veritabanından (/api/db) tüm verileri çek
  useEffect(() => {
    async function initDatabase() {
      try {
        const res = await fetch(`/api/db?t=${Date.now()}`, { cache: 'no-store' });
        const contentType = res.headers.get('content-type') || '';

        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data.inverters)) setInverters(data.inverters);
          if (Array.isArray(data.pvs)) setPvs(data.pvs);
          if (Array.isArray(data.batteries)) setBatteries(data.batteries);
          if (Array.isArray(data.infrastructure)) setInfrastructure(data.infrastructure);
          if (Array.isArray(data.extras)) setExtras(data.extras);
          if (Array.isArray(data.customCategories)) setCustomCategories(data.customCategories);
          if (Array.isArray(data.customProducts)) setCustomProducts(data.customProducts);
        }
      } catch {
        // Bulut veritabanı henüz boşsa mevcut veriler korunur
      } finally {
        setIsDbLoaded(true);
      }
    }

    initDatabase();
  }, []);

  // 2. Veriler değiştikçe hem /api/db'ye hem localStorage'a kaydet
  useEffect(() => {
    if (!isDbLoaded) return;

    const payload = {
      inverters,
      pvs,
      batteries,
      infrastructure,
      extras,
      customCategories,
      customProducts,
    };

    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    try {
      localStorage.setItem('ose_inverters', JSON.stringify(inverters));
      localStorage.setItem('ose_pvs', JSON.stringify(pvs));
      localStorage.setItem('ose_batteries', JSON.stringify(batteries));
      localStorage.setItem('ose_infrastructure', JSON.stringify(infrastructure));
      localStorage.setItem('ose_extras', JSON.stringify(extras));
      localStorage.setItem('ose_custom_categories', JSON.stringify(customCategories));
      localStorage.setItem('ose_custom_products', JSON.stringify(customProducts));
    } catch {
      // localStorage sınırı aşılırsa çökmesini engeller
    }
  }, [
    inverters,
    pvs,
    batteries,
    infrastructure,
    extras,
    customCategories,
    customProducts,
    isDbLoaded,
  ]);

  const hasSidebar = activeMainTab === 'products';
  const allMenus = buildAllSubMenus(customCategories);

  // Tüm kategorilerin ürün sayıları
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

  // Yeni Kategori Ekleme Modalını Aç
  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  // Mevcut Özel Kategoriyi Düzenleme Modalını Aç
  const openEditCategoryModal = (cat: CustomCategory) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

  // Kategori Kaydet (Yeni veya Düzenleme)
  const handleSaveCategory = (label: string, iconName: CategoryIconName) => {
    if (editingCategory) {
      setCustomCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id ? { ...c, label, iconName } : c
        )
      );
    } else {
      const newCategory: CustomCategory = {
        id: 'cat-' + Date.now(),
        label,
        iconName,
      };
      setCustomCategories((prev) => [...prev, newCategory]);
      // Yeni kategori oluşturulduğunda doğrudan o kategori sayfasına geç
      setActiveMainTab('products');
      setActiveProductSubTab(newCategory.id);
    }
  };

  // Özel Kategoriyi ve İçindeki Ürünleri Sil
  const handleDeleteCategory = (categoryId: string) => {
    setCustomCategories((prev) => prev.filter((c) => c.id !== categoryId));
    setCustomProducts((prev) => prev.filter((p) => p.categoryId !== categoryId));
    setActiveProductSubTab('inverter');
  };

  // Belirli Bir Özel Kategorinin Ürünlerini Güncelle
  const handleSaveCategoryProducts = (
    categoryId: string,
    updatedCategoryProducts: CustomProduct[]
  ) => {
    setCustomProducts((prev) => [
      ...prev.filter((p) => p.categoryId !== categoryId),
      ...updatedCategoryProducts,
    ]);
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

      {/* MOBİL YATAY KATEGORİ BARI + YENİ KATEGORİ BUTONU */}
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

      {/* YENİ KATEGORİ EKLE / DÜZENLE MODALI */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        editingCategory={editingCategory}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
      />
    </div>
  );
}
