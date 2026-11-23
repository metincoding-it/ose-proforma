import type { ElementType } from 'react';
import {
  Cpu,
  Sun,
  BatteryCharging,
  Network,
  PlusCircle,
  X,
  Plus,
  Box,
  Camera,
  Wind,
  Snowflake,
  Zap,
  Shield,
  Wrench,
  Plug,
  Lightbulb,
  Thermometer,
  Layers,
  Tag,
} from 'lucide-react';
import type {
  ProductSubTab,
  CustomCategory,
  CategoryIconName,
} from '../types/product';

export interface SubMenuItem {
  id: ProductSubTab;
  label: string;
  icon: ElementType;
  isCustom?: boolean;
}

export const CATEGORY_ICON_LIST: {
  name: CategoryIconName;
  title: string;
  icon: ElementType;
}[] = [
  { name: 'Box', title: 'Genel Ürün', icon: Box },
  { name: 'Camera', title: 'Güvenlik / Kamera', icon: Camera },
  { name: 'Wind', title: 'Klima / Havalandırma', icon: Wind },
  { name: 'Snowflake', title: 'Soğutma', icon: Snowflake },
  { name: 'Zap', title: 'Elektrik / Enerji', icon: Zap },
  { name: 'Shield', title: 'Güvenlik / Alarm', icon: Shield },
  { name: 'Wrench', title: 'Servis / Montaj', icon: Wrench },
  { name: 'Plug', title: 'Şarj / Bağlantı', icon: Plug },
  { name: 'Lightbulb', title: 'Aydınlatma', icon: Lightbulb },
  { name: 'Thermometer', title: 'Isı Pompası', icon: Thermometer },
  { name: 'Layers', title: 'Sistem / Paket', icon: Layers },
  { name: 'Tag', title: 'Diğer', icon: Tag },
];

export function getCategoryIcon(iconName?: CategoryIconName): ElementType {
  const found = CATEGORY_ICON_LIST.find((i) => i.name === iconName);
  return found ? found.icon : Box;
}

export const PRODUCT_SUB_MENUS: SubMenuItem[] = [
  { id: 'inverter', label: 'Inverter', icon: Cpu },
  { id: 'pv', label: 'PV Panel', icon: Sun },
  { id: 'batarya', label: 'Batarya', icon: BatteryCharging },
  { id: 'altyapi', label: 'Altyapı', icon: Network },
  { id: 'ekstralar', label: 'Ekstralar', icon: PlusCircle },
];

export function buildAllSubMenus(customCategories: CustomCategory[]): SubMenuItem[] {
  return [
    ...PRODUCT_SUB_MENUS,
    ...customCategories.map((cat) => ({
      id: cat.id,
      label: cat.label,
      icon: getCategoryIcon(cat.iconName),
      isCustom: true,
    })),
  ];
}

interface SidebarProps {
  activeSubTab: ProductSubTab;
  isMobileOpen: boolean;
  onSubTabChange: (subTab: ProductSubTab) => void;
  onCloseMobile: () => void;
  counts: Record<string, number>;
  customCategories: CustomCategory[];
  onOpenAddCategory: () => void;
}

export default function Sidebar({
  activeSubTab,
  isMobileOpen,
  onSubTabChange,
  onCloseMobile,
  counts,
  customCategories,
  onOpenAddCategory,
}: SidebarProps) {
  const allMenus = buildAllSubMenus(customCategories);

  return (
    <>
      {/* MASAÜSTÜ SIDEBAR */}
      <aside className="hidden md:flex flex-col w-72 bg-[#161920] border-r border-[#232730] p-4 shrink-0">
        <div className="mb-3 px-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8a8f9e]">
            Kategoriler
          </span>
          <span className="text-xs font-bold text-[#00b8e6]">
            {allMenus.length}
          </span>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
          {allMenus.map((item) => {
            const Icon = item.icon;
            const isActive = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSubTabChange(item.id)}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl text-base font-bold transition-all ${
                  isActive
                    ? 'bg-[#00b8e6] text-[#111318] shadow-lg'
                    : 'text-zinc-300 hover:bg-[#20242d]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Icon className="w-6 h-6 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                <span
                  className={`text-sm px-2.5 py-0.5 rounded-lg font-extrabold shrink-0 ${
                    isActive
                      ? 'bg-[#111318]/20 text-[#111318]'
                      : 'bg-[#232730] text-zinc-300'
                  }`}
                >
                  {counts[item.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* YENİ KATEGORİ EKLE BUTONU */}
        <div className="pt-4 mt-4 border-t border-[#232730]">
          <button
            type="button"
            onClick={onOpenAddCategory}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#111318] hover:bg-[#00b8e6]/15 text-[#00b8e6] border border-dashed border-[#00b8e6]/50 font-extrabold text-base flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            Yeni Kategori Ekle
          </button>
        </div>
      </aside>

      {/* MOBİL AÇILIR MENÜ (DRAWER) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/80" onClick={onCloseMobile} />
          <div className="relative w-80 max-w-[85vw] bg-[#161920] border-r border-[#232730] h-full flex flex-col p-5 z-10">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#232730]">
              <span className="font-extrabold text-lg text-white">Ürün Kategorileri</span>
              <button
                onClick={onCloseMobile}
                className="p-2.5 rounded-xl text-zinc-300 bg-[#232730]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {allMenus.map((item) => {
                const Icon = item.icon;
                const isActive = activeSubTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSubTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl text-base font-bold ${
                      isActive
                        ? 'bg-[#00b8e6] text-[#111318]'
                        : 'text-zinc-300 bg-[#111318]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Icon className="w-6 h-6 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span
                      className={`text-sm px-2.5 py-0.5 rounded-lg font-extrabold shrink-0 ${
                        isActive
                          ? 'bg-[#111318]/20 text-[#111318]'
                          : 'bg-[#232730] text-zinc-300'
                      }`}
                    >
                      {counts[item.id] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 mt-4 border-t border-[#232730]">
              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  onOpenAddCategory();
                }}
                className="w-full py-4 px-4 rounded-2xl bg-[#111318] text-[#00b8e6] border border-dashed border-[#00b8e6]/50 font-extrabold text-base flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Yeni Kategori Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
