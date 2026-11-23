import { useState } from 'react';
import type { FormEvent } from 'react';
import { PlusCircle, Edit3, Trash2, X, Settings } from 'lucide-react';
import type { CustomCategory, CustomProduct } from '../../types/product';
import ImageUploadField from '../../components/ImageUploadField';
import UnitInput from '../../components/UnitInput';
import { getCategoryIcon } from '../../components/Sidebar';

interface CustomCategoryPageProps {
  category: CustomCategory;
  products: CustomProduct[];
  onSaveCategoryProducts: (categoryId: string, updatedList: CustomProduct[]) => void;
  onEditCategory: (category: CustomCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
}

const DEFAULT_UNITS = ['Adet', 'Metre', 'Set', 'Takım', 'Hizmet', 'Kutu'];

export default function CustomCategoryPage({
  category,
  products,
  onSaveCategoryProducts,
  onEditCategory,
  onDeleteCategory,
}: CustomCategoryPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    photo: '',
    brand: '',
    name: '',
    specs: '',
    unit: 'Adet',
    priceUsd: '',
  });

  const CategoryIcon = getCategoryIcon(category.iconName);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      photo: '',
      brand: '',
      name: '',
      specs: '',
      unit: 'Adet',
      priceUsd: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: CustomProduct) => {
    setEditingId(item.id);
    setForm({
      photo: item.photo,
      brand: item.brand === '-' ? '' : item.brand,
      name: item.name === '-' ? '' : item.name,
      specs: item.specs === '-' ? '' : item.specs,
      unit: item.unit || 'Adet',
      priceUsd: item.priceUsd ? item.priceUsd.toString() : '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(form.priceUsd.replace(',', '.')) || 0;

    const formattedData = {
      categoryId: category.id,
      photo: form.photo,
      brand: form.brand.trim() || '-',
      name: form.name.trim() || category.label,
      specs: form.specs.trim() || '-',
      unit: form.unit.trim() || 'Adet',
      priceUsd: parsedPrice,
    };

    if (editingId) {
      onSaveCategoryProducts(
        category.id,
        products.map((item) =>
          item.id === editingId ? { ...item, ...formattedData } : item
        )
      );
    } else {
      onSaveCategoryProducts(category.id, [
        { id: 'cprod-' + Date.now(), ...formattedData },
        ...products,
      ]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      onSaveCategoryProducts(
        category.id,
        products.filter((item) => item.id !== id)
      );
    }
  };

  const handleDeleteCategoryClick = () => {
    if (
      window.confirm(
        `"${category.label}" kategorisini ve içindeki ${products.length} ürünü silmek istediğinize emin misiniz?`
      )
    ) {
      onDeleteCategory(category.id);
    }
  };

  return (
    <div className="space-y-5">
      {/* ÜST BAŞLIK VE AKSİYONLAR */}
      <div className="flex flex-col gap-4 bg-[#161920] border border-[#262a34] rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#00b8e6]/15 border border-[#00b8e6]/30 flex items-center justify-center text-[#00b8e6] shrink-0">
              <CategoryIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">{category.label}</h2>
              <p className="text-sm text-[#8a8f9e] mt-0.5">
                Toplam {products.length} ürün kayıtlı
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#00b8e6] hover:bg-cyan-400 text-[#111318] font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg"
          >
            <PlusCircle className="w-5 h-5" />
            Yeni Ürün Ekle
          </button>
        </div>

        {/* KATEGORİ YÖNETİMİ (AD DEĞİŞTİR / SİL) */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#262a34]">
          <button
            type="button"
            onClick={() => onEditCategory(category)}
            className="px-4 py-2.5 rounded-xl bg-[#20242d] hover:bg-[#282d38] text-zinc-200 text-sm font-bold flex items-center gap-2"
          >
            <Settings className="w-4 h-4 text-[#00b8e6]" />
            Kategoriyi Düzenle
          </button>
          <button
            type="button"
            onClick={handleDeleteCategoryClick}
            className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-sm font-bold flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Kategoriyi Sil
          </button>
        </div>
      </div>

      {/* ÜRÜN LİSTESİ */}
      {products.length === 0 ? (
        <div className="bg-[#161920] border border-[#262a34] border-dashed rounded-2xl p-10 text-center">
          <CategoryIcon className="w-12 h-12 text-[#8a8f9e] mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-white">
            Bu Kategoride Henüz Ürün Yok
          </h3>
          <p className="text-sm text-[#8a8f9e] max-w-md mx-auto mt-1">
            Yukarıdaki "Yeni Ürün Ekle" butonundan {category.label} kategorisine ürün ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((item) => (
            <div
              key={item.id}
              className="bg-[#161920] border border-[#262a34] rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-2xl bg-[#111318] border border-[#262a34] flex items-center justify-center overflow-hidden shrink-0">
                  {item.photo ? (
                    <img
                      src={item.photo}
                      alt={item.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <CategoryIcon className="w-9 h-9 text-[#00b8e6]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#00b8e6] uppercase truncate">
                      {item.brand}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-sm font-extrabold bg-[#111318] text-amber-400 shrink-0">
                      {item.unit}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-xl text-white mt-1 break-words">
                    {item.name}
                  </h3>
                  <p className="text-2xl font-black text-[#00b8e6] mt-2">
                    ${item.priceUsd.toLocaleString('en-US')}
                  </p>
                </div>
              </div>

              {item.specs && item.specs !== '-' && (
                <div className="bg-[#111318] border border-[#262a34] rounded-xl p-3.5 text-sm sm:text-base text-zinc-200 font-semibold">
                  {item.specs}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => openEditModal(item)}
                  className="py-3 rounded-xl bg-[#20242d] hover:bg-[#282d38] text-white text-base font-bold flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4 text-[#00b8e6]" />
                  Düzenle
                </button>
                <button
                  onClick={() => handleDeleteProduct(item.id)}
                  className="py-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-base font-bold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ÜRÜN EKLE / DÜZENLE MODALI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/80" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-[#161920] border-t sm:border border-[#262a34] rounded-t-3xl sm:rounded-3xl z-10 max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-[#262a34] flex items-center justify-between">
              <h3 className="font-extrabold text-xl text-white">
                {editingId ? 'Ürünü Düzenle' : `${category.label} - Yeni Ürün`}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-[#20242d] text-zinc-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
              <ImageUploadField
                photo={form.photo}
                onChange={(photo) => setForm((p) => ({ ...p, photo }))}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">
                    Marka
                  </label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                    placeholder="Örn: Hikvision, Daikin"
                    className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-xl px-4 py-3.5 text-base font-semibold text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">
                    Ürün Adı / Model
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Örn: 4MP ColorVu IP Kamera"
                    className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-xl px-4 py-3.5 text-base font-semibold text-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">
                    Teknik Özellik Özeti / Açıklama
                  </label>
                  <input
                    type="text"
                    value={form.specs}
                    onChange={(e) => setForm((p) => ({ ...p, specs: e.target.value }))}
                    placeholder="Örn: Gece Görüşlü, IP67, 2.8mm Lens"
                    className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-xl px-4 py-3.5 text-base font-semibold text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">
                    Birim
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-xl px-4 py-3.5 text-base font-semibold text-white focus:outline-none"
                  >
                    {DEFAULT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <UnitInput
                  label="Fiyat"
                  unit="$"
                  type="number"
                  step="0.01"
                  highlight
                  placeholder="Örn: 120"
                  value={form.priceUsd}
                  onChange={(priceUsd) => setForm((p) => ({ ...p, priceUsd }))}
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#00b8e6] hover:bg-cyan-400 text-[#111318] font-extrabold text-lg mt-2"
              >
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
