import { FileSpreadsheet, Package } from 'lucide-react';
import { PRODUCT_SUB_MENUS } from '../components/Sidebar';
import type { MainTab, ProductSubTab } from '../types/product';

interface HomePageProps {
  onNavigateMain: (tab: MainTab) => void;
  onNavigateProductSub: (sub: ProductSubTab) => void;
  counts: Record<ProductSubTab, number>;
}

export default function HomePage({ onNavigateMain, onNavigateProductSub, counts }: HomePageProps) {
  return (
    <div className="space-y-6">
      <div className="bg-[#161920] border border-[#262a34] rounded-3xl p-6 sm:p-8 space-y-5">
        <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
          OSE <span className="text-[#00b8e6]">TEKNOLOJİ</span> PROFORMA
        </h2>
        <p className="text-[#8a8f9e] text-base sm:text-lg max-w-2xl font-medium">
          Ürünlerinizi yönetin ve müşterileriniz için saniyeler içinde PDF fiyat teklifi hazırlayın.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          <button
            onClick={() => onNavigateMain('proforma')}
            className="w-full py-4 px-6 rounded-2xl bg-[#00b8e6] hover:bg-cyan-400 text-[#111318] font-extrabold text-lg flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,184,230,0.3)] transition-all"
          >
            <FileSpreadsheet className="w-6 h-6" />
            Proforma PDF Hazırla
          </button>
          <button
            onClick={() => onNavigateMain('products')}
            className="w-full py-4 px-6 rounded-2xl bg-[#20242d] hover:bg-[#282d38] text-white font-bold text-lg flex items-center justify-center gap-3 border border-[#323744] transition-all"
          >
            <Package className="w-6 h-6 text-[#00b8e6]" />
            Ürünleri Yönet
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-[#8a8f9e] mb-3 px-1">Ürün Kategorileri</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCT_SUB_MENUS.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onNavigateMain('products');
                  onNavigateProductSub(cat.id);
                }}
                className="bg-[#161920] border border-[#262a34] hover:border-[#00b8e6]/60 rounded-2xl p-5 flex items-center justify-between text-left transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#00b8e6]/10 border border-[#00b8e6]/30 flex items-center justify-center text-[#00b8e6] shrink-0">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-lg text-white">{cat.label}</h4>
                    <span className="text-sm text-[#8a8f9e]">Yönetmek için dokunun</span>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 rounded-xl bg-[#111318] border border-[#262a34] text-[#00b8e6] font-extrabold text-base">
                  {counts[cat.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
