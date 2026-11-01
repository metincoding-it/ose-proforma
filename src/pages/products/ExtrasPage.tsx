import { useState } from 'react';
import type { FormEvent } from 'react';
import { PlusCircle, Edit3, Trash2, X } from 'lucide-react';
import type { ExtraProduct } from '../../types/product';
import UnitInput from '../../components/UnitInput';

interface ExtrasPageProps {
  extras?: ExtraProduct[];
  onSaveExtras?: (list: ExtraProduct[]) => void;
}

export default function ExtrasPage({ extras = [], onSaveExtras }: ExtrasPageProps) {
  const safeExtras = Array.isArray(extras) ? extras : [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    unit: 'Hizmet',
    priceUsd: '',
  });

  const openAddModal = () => {
    setEditingId(null);
    setForm({ name: '', description: '', unit: 'Hizmet', priceUsd: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (item: ExtraProduct) => {
    setEditingId(item.id);
    setForm({
      name: item.name === '-' ? '' : item.name,
      description: item.description === '-' ? '' : item.description,
      unit: item.unit,
      priceUsd: item.priceUsd ? item.priceUsd.toString() : '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!onSaveExtras) return;

    const parsedPrice = parseFloat(form.priceUsd.replace(',', '.')) || 0;

    if (editingId) {
      onSaveExtras(
        safeExtras.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name: form.name.trim() || 'Ekstra Hizmet',
                description: form.description.trim() || '-',
                unit: form.unit.trim() || 'Hizmet',
                priceUsd: parsedPrice,
              }
            : item
        )
      );
    } else {
      onSaveExtras([
        {
          id: 'ext-' + Date.now(),
          name: form.name.trim() || 'Ekstra Hizmet',
          description: form.description.trim() || '-',
          unit: form.unit.trim() || 'Hizmet',
          priceUsd: parsedPrice,
        },
        ...safeExtras,
      ]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!onSaveExtras) return;
    if (window.confirm('Bu ekstra kalemi silmek istediğinize emin misiniz?')) {
      onSaveExtras(safeExtras.filter((i) => i.id !== id));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161920] border border-[#262a34] rounded-2xl p-5">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Ekstralar & Hizmetler</h2>
          <p className="text-sm text-[#8a8f9e] mt-0.5">
            Kurulum, işçilik, nakliye ve mühendislik kalemleri ({safeExtras.length} kayıtlı)
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#00b8e6] hover:bg-cyan-400 text-[#111318] font-extrabold text-base flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,184,230,0.3)] transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          Yeni Ekstra Ekle
        </button>
      </div>

      {safeExtras.length === 0 ? (
        <div className="bg-[#161920] border border-[#262a34] border-dashed rounded-2xl p-10 text-center">
          <PlusCircle className="w-12 h-12 text-[#8a8f9e] mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-white">Henüz Ekstra Kalem Eklenmedi</h3>
          <p className="text-sm text-[#8a8f9e] max-w-md mx-auto mt-1">
            Sağ üstteki Yeni Ekstra Ekle butonundan kurulum, işçilik veya nakliye kalemi ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeExtras.map((ext) => (
            <div
              key={ext.id}
              className="bg-[#161920] border border-[#262a34] rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-[#111318] text-[#00b8e6] border border-[#262a34] uppercase">
                    {ext.unit}
                  </span>
                  <span className="text-2xl font-black text-[#00b8e6]">
                    ${Number(ext.priceUsd || 0).toLocaleString('en-US')}
                  </span>
                </div>
                <h3 className="font-extrabold text-xl text-white mt-3">{ext.name}</h3>
                <p className="text-base text-[#8a8f9e] mt-1.5">{ext.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#262a34]">
                <button
                  onClick={() => openEditModal(ext)}
                  className="py-3 rounded-xl bg-[#20242d] hover:bg-[#282d38] text-white text-base font-bold flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4 text-[#00b8e6]" />
                  Düzenle
                </button>
                <button
                  onClick={() => handleDelete(ext.id)}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/80" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-xl bg-[#161920] border-t sm:border border-[#262a34] rounded-t-3xl sm:rounded-3xl z-10 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#262a34] pb-4">
              <h3 className="font-extrabold text-xl text-white">
                {editingId ? 'Ekstra Kalemi Düzenle' : 'Yeni Ekstra Ekle'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-[#20242d] text-zinc-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-300 mb-1.5">
                  Kalem / Hizmet Adı
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Örn: Anahtar Teslim Kurulum ve İşçilik"
                  className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-xl px-4 py-3.5 text-base font-semibold text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-300 mb-1.5">
                  Kısa Açıklama
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Örn: Montaj, devreye alma ve nakliye dahil"
                  className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-xl px-4 py-3.5 text-base font-semibold text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">
                    Birim
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-xl px-4 py-3.5 text-base font-semibold text-white focus:outline-none"
                  >
                    <option value="Hizmet">Hizmet</option>
                    <option value="Set">Set</option>
                    <option value="Adet">Adet</option>
                    <option value="Sefer">Sefer (Nakliye/Vinç)</option>
                  </select>
                </div>

                <UnitInput
                  label="Fiyat"
                  unit="$"
                  type="number"
                  step="0.01"
                  highlight
                  placeholder="Örn: 500"
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