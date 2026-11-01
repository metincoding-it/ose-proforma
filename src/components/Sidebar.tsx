import type { ElementType } from 'react';
import { Cpu, Sun, BatteryCharging, Network, PlusCircle, X } from 'lucide-react';
import type { ProductSubTab } from '../types/product';

export interface SubMenuItem {
  id: ProductSubTab;
  label: string;
  icon: ElementType;
}

export const PRODUCT_SUB_MENUS: SubMenuItem[] = [
  { id: 'inverter', label: 'Inverter', icon: Cpu },
  { id: 'pv', label: 'PV Panel', icon: Sun },
  { id: 'batarya', label: 'Batarya', icon: BatteryCharging },
  { id: 'altyapi', label: 'Altyapı', icon: Network },
  { id: 'ekstralar', label: 'Ekstralar', icon: PlusCircle },
];

interface SidebarProps {
  activeSubTab: ProductSubTab;
  isMobileOpen: boolean;
  onSubTabChange: (subTab: ProductSubTab) => void;
  onCloseMobile: () => void;
  counts: Record<ProductSubTab, number>;
}

export default function Sidebar({
  activeSubTab,
  isMobileOpen,
  onSubTabChange,
  onCloseMobile,
  counts,
}: SidebarProps) {
  return (
    <>
      {/* MASAÜSTÜ SIDEBAR */}
      <aside className="hidden md:flex flex-col w-72 bg-[#161920] border-r border-[#232730] p-4 shrink-0">
        <div className="mb-3 px-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8a8f9e]">
            Kategoriler
          </span>
        </div>

        <div className="space-y-2">
          {PRODUCT_SUB_MENUS.map((item) => {
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
                <div className="flex items-center gap-3.5">
                  <Icon className="w-6 h-6" />
                  <span>{item.label}</span>
                </div>
                <span
                  className={`text-sm px-2.5 py-0.5 rounded-lg font-extrabold ${
                    isActive ? 'bg-[#111318]/20 text-[#111318]' : 'bg-[#232730] text-zinc-300'
                  }`}
                >
                  {counts[item.id]}
                </span>
              </button>
            );
          })}
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

            <div className="space-y-2.5">
              {PRODUCT_SUB_MENUS.map((item) => {
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
                    <div className="flex items-center gap-3.5">
                      <Icon className="w-6 h-6" />
                      <span>{item.label}</span>
                    </div>
                    <span
                      className={`text-sm px-2.5 py-0.5 rounded-lg font-extrabold ${
                        isActive ? 'bg-[#111318]/20 text-[#111318]' : 'bg-[#232730] text-zinc-300'
                      }`}
                    >
                      {counts[item.id]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
