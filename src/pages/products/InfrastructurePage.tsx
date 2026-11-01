import { useState } from 'react';
import type { FormEvent } from 'react';
import { Network, PlusCircle, Edit3, Trash2, X } from 'lucide-react';
import type {
  InfrastructureProduct,
  InfraCategory,
  RoofMountType,
  InfraUnit,
} from '../../types/product';
import ImageUploadField from '../../components/ImageUploadField';
import UnitInput from '../../components/UnitInput';

const INFRA_CATEGORIES: InfraCategory[] = [
  'Konstrüksiyon & Montaj',
  'Solar Kablo (DC / AC)',
  'MC4 & Bağlantı',
  'GES Pano & Koruma',
  'Topraklama & Sabitleme',
  'Hazır Montaj Seti',
];

const ROOF_TYPES: RoofMountType[] = [
  'Genel (Tüm Sahalar)',
  'Trapez Sac / Sandviç Panel',
  'Kiremit Çatı',
  'Betonarme / Teras',
  'Arazi Tipi',
  'Pano İçi / Elektrik',
];

const INFRA_UNITS: InfraUnit[] = ['Adet', 'Metre', 'Set', 'Takım', 'Boy'];

interface InfrastructurePageProps {
  items: InfrastructureProduct[];
  onSaveItems: (list: InfrastructureProduct[]) => void;
}

export default function InfrastructurePage({ items, onSaveItems }: InfrastructurePageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    photo: '',
    category: 'Konstrüksiyon & Montaj' as InfraCategory,
    name: '',
    brand: '',
    applicationType: 'Genel (Tüm Sahalar)' as RoofMountType,
    materialSpec: '',
    unit: 'Set' as InfraUnit,
    warrantyStandard: '',
    priceUsd: '',
  });

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      photo: '',
      category: 'Konstrüksiyon & Montaj',
      name: '',
      brand: '',
      applicationType: 'Genel (Tüm Sahalar)',
      materialSpec: '',
      unit: 'Set',
      warrantyStandard: '',
      priceUsd: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: InfrastructureProduct) => {
    setEditingId(item.id);
    setForm({
      photo: item.photo,
      category: item.category,
      name: item.name === '-' ? '' : item.name,
      brand: item.brand === '-' ? '' : item.brand,
      applicationType: item.applicationType,
      materialSpec: item.materialSpec === '-' ? '' : item.materialSpec,
      unit: item.unit,
      warrantyStandard: item.warrantyStandard === '-' ? '' : item.warrantyStandard,
      priceUsd: item.priceUsd ? item.priceUsd.toString() : '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(form.priceUsd.replace(',', '.')) || 0;

    const formattedData = {
      photo: form.photo,
      category: form.category,
      name: form.name.trim() || 'Altyapı Malzemesi',
      brand: form.brand.trim() || '-',
      applicationType: form.applicationType,
      materialSpec: form.materialSpec.trim() || '-',
      unit: form.unit,
      warrantyStandard: form.warrantyStandard.trim() || '-',
      priceUsd: parsedPrice,
    };

    if (editingId) {
      onSaveItems(
        items.map((item) =>
          item.id === editingId ? { ...item, ...formattedData } : item
        )
      );
    } else {
      onSaveItems([{ id: 'inf-' + Date.now(), ...formattedData }, ...items]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu altyapı malzemesini silmek istediğinize emin misiniz?')) {
      onSaveItems(items.filter((i) => i.id !== id));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161920] border border-[#262a34] rounded-2xl p-5">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Altyapı & Montaj</h2>
          <p className="text-sm text-[#8a8f9e] mt-0.5">Toplam {items.length} malzeme kayıtlı</p>
        </div>

        <button
          onClick={openAddModal}
          className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#00b8e6] hover:bg-cyan-400 text-[#111318] font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg"
        >
          <PlusCircle className="w-5 h-5" />
          Yeni Altyapı Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((inf) => (
          <div
            key={inf.id}
            className="bg-[#161920] border border-[#262a34] rounded-2xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[#111318] border border-[#262a34] flex items-center justify-center overflow-hidden shrink-0">
                {inf.photo ? (
                  <img src={inf.photo} alt={inf.name} className="w-full h-full object-contain p-1" />
                ) : (
                  <Network className="w-9 h-9 text-[#00b8e6]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#00b8e6]">{inf.category}</span>
                  <span className="px-3 py-1 rounded-lg text-sm font-extrabold bg-[#111318] text-amber-400">
                    {inf.unit}
                  </span>
                </div>
                <h3 className="font-extrabold text-xl text-white mt-1 break-words">{inf.name}</h3>
                <p className="text-2xl font-black text-[#00b8e6] mt-2">
                  ${inf.priceUsd.toLocaleString('en-US')}
                </p>
              </div>
            </div>

            <div className="bg-[#111318] border border-[#262a34] rounded-xl p-3.5 space-y-1.5 text-sm sm:text-base">
              <div className="flex justify-between">
                <span className="text-[#8a8f9e]">Marka & Çatı Tipi:</span>
                <span className="font-bold text-white">{inf.brand} • {inf.applicationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a8f9e]">Özellik:</span>
                <span className="font-bold text-white">{inf.materialSpec}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => openEditModal(inf)}
                className="py-3 rounded-xl bg-[#20242d] hover:bg-[#282d38] text-white text-base font-bold flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4 text-[#00b8e6]" />
                Düzenle
              </button>
              <button
                onClick={() => handleDelete(inf.id)}
                className="py-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-base font-bold flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/80" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-[#161920] border-t sm:border border-[#262a34] rounded-t-3xl sm:rounded-3xl z-10 max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-[#262a34] flex items-center justify-between">
              <h3 className="font-extrabold text-xl text-white">
                {editingId ? 'Altyapı Düzenle' : 'Yeni Altyapı Ekle'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-[#20242d] text-zinc-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
              <ImageUploadField photo={form.photo} onChange={(photo) => setForm((p) => ({ ...p, photo }))} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#00b8e6] mb-1.5">Kategori</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as InfraCategory }))}
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  >
                    {INFRA_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Uygulama / Çatı Tipi</label>
                  <select
                    value={form.applicationType}
                    onChange={(e) => setForm((p) => ({ ...p, applicationType: e.target.value as RoofMountType }))}
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  >
                    {ROOF_TYPES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Malzeme Adı</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Örn: Alüminyum Montaj Rayı Seti"
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Marka</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                    placeholder="Örn: PMT / Prysmian"
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Birim</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value as InfraUnit }))}
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  >
                    {INFRA_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Teknik Özellik / Kesit</label>
                  <input
                    type="text"
                    value={form.materialSpec}
                    onChange={(e) => setForm((p) => ({ ...p, materialSpec: e.target.value }))}
                    placeholder="Örn: 6063-T6 Alüminyum + Paslanmaz Kanca"
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Garanti / Standart</label>
                  <input
                    type="text"
                    value={form.warrantyStandard}
                    onChange={(e) => setForm((p) => ({ ...p, warrantyStandard: e.target.value }))}
                    placeholder="Örn: 12 Yıl Garanti"
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  />
                </div>

                <UnitInput
                  label="Fiyat"
                  unit="$"
                  type="number"
                  step="0.01"
                  highlight
                  placeholder="Örn: 24"
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