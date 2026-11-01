import { useState } from 'react';
import type { FormEvent } from 'react';
import { Sun, PlusCircle, Edit3, Trash2, X } from 'lucide-react';
import type { PvProduct, PvType } from '../../types/product';
import ImageUploadField from '../../components/ImageUploadField';
import UnitInput, { withUnit, stripUnit } from '../../components/UnitInput';

const PV_TYPES: PvType[] = ['Monokristal', 'Polikristal', 'Thin Film'];

interface PvPageProps {
  pvs: PvProduct[];
  onSavePvs: (list: PvProduct[]) => void;
}

export default function PvPage({ pvs, onSavePvs }: PvPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    photo: '',
    brand: '',
    model: '',
    pvType: 'Monokristal' as PvType,
    nominalPower: '',
    vmp: '',
    imp: '',
    voc: '',
    efficiency: '',
    cellCount: '',
    lifespan: '',
    priceUsd: '',
  });

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      photo: '',
      brand: '',
      model: '',
      pvType: 'Monokristal',
      nominalPower: '',
      vmp: '',
      imp: '',
      voc: '',
      efficiency: '',
      cellCount: '',
      lifespan: '',
      priceUsd: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: PvProduct) => {
    setEditingId(item.id);
    setForm({
      photo: item.photo,
      brand: item.brand === '-' ? '' : item.brand,
      model: item.model === '-' ? '' : item.model,
      pvType: item.pvType,
      nominalPower: stripUnit(item.nominalPower, 'W'),
      vmp: stripUnit(item.vmp, 'V DC'),
      imp: stripUnit(item.imp, 'A'),
      voc: stripUnit(item.voc, 'V'),
      efficiency: stripUnit(item.efficiency, '%'),
      cellCount: stripUnit(item.cellCount, 'Hücre'),
      lifespan: stripUnit(item.lifespan, 'Yıl'),
      priceUsd: item.priceUsd ? item.priceUsd.toString() : '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(form.priceUsd.replace(',', '.')) || 0;

    const formattedData = {
      photo: form.photo,
      brand: form.brand.trim() || '-',
      model: form.model.trim() || 'PV Panel',
      pvType: form.pvType,
      nominalPower: withUnit(form.nominalPower, 'W'),
      vmp: withUnit(form.vmp, 'V DC'),
      imp: withUnit(form.imp, 'A'),
      voc: withUnit(form.voc, 'V'),
      efficiency: withUnit(form.efficiency, '%'),
      cellCount: withUnit(form.cellCount, 'Hücre'),
      lifespan: withUnit(form.lifespan, 'Yıl'),
      priceUsd: parsedPrice,
    };

    if (editingId) {
      onSavePvs(
        pvs.map((item) =>
          item.id === editingId ? { ...item, ...formattedData } : item
        )
      );
    } else {
      onSavePvs([{ id: 'pv-' + Date.now(), ...formattedData }, ...pvs]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu güneş panelini silmek istediğinize emin misiniz?')) {
      onSavePvs(pvs.filter((i) => i.id !== id));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161920] border border-[#262a34] rounded-2xl p-5">
        <div>
          <h2 className="text-2xl font-extrabold text-white">PV Güneş Panelleri</h2>
          <p className="text-sm text-[#8a8f9e] mt-0.5">Toplam {pvs.length} ürün kayıtlı</p>
        </div>

        <button
          onClick={openAddModal}
          className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#00b8e6] hover:bg-cyan-400 text-[#111318] font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg"
        >
          <PlusCircle className="w-5 h-5" />
          Yeni PV Panel Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pvs.map((pv) => (
          <div
            key={pv.id}
            className="bg-[#161920] border border-[#262a34] rounded-2xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[#111318] border border-[#262a34] flex items-center justify-center overflow-hidden shrink-0">
                {pv.photo ? (
                  <img src={pv.photo} alt={pv.model} className="w-full h-full object-contain p-1" />
                ) : (
                  <Sun className="w-9 h-9 text-amber-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#00b8e6]">{pv.pvType}</span>
                  <span className="px-3 py-1 rounded-lg text-sm font-extrabold bg-[#111318] text-amber-400">
                    {pv.nominalPower}
                  </span>
                </div>
                <h3 className="font-extrabold text-xl text-white mt-1 break-words">
                  {pv.brand} {pv.model}
                </h3>
                <p className="text-2xl font-black text-[#00b8e6] mt-2">
                  ${pv.priceUsd.toLocaleString('en-US')}
                </p>
              </div>
            </div>

            <div className="bg-[#111318] border border-[#262a34] rounded-xl p-3.5 space-y-1.5 text-sm sm:text-base">
              <div className="flex justify-between">
                <span className="text-[#8a8f9e]">Vmp / Imp / Voc:</span>
                <span className="font-bold text-white">{pv.vmp} • {pv.imp} • {pv.voc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a8f9e]">Verim & Hücre:</span>
                <span className="font-bold text-white">{pv.efficiency} ({pv.cellCount})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a8f9e]">Kullanım Ömrü:</span>
                <span className="font-bold text-white">{pv.lifespan}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => openEditModal(pv)}
                className="py-3 rounded-xl bg-[#20242d] hover:bg-[#282d38] text-white text-base font-bold flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4 text-[#00b8e6]" />
                Düzenle
              </button>
              <button
                onClick={() => handleDelete(pv.id)}
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
                {editingId ? 'PV Panel Düzenle' : 'Yeni PV Panel Ekle'}
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
                  <label className="block text-sm font-bold text-[#00b8e6] mb-1.5">Ürün Çeşidi</label>
                  <select
                    value={form.pvType}
                    onChange={(e) => setForm((p) => ({ ...p, pvType: e.target.value as PvType }))}
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  >
                    {PV_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <UnitInput
                  label="Fiyat"
                  unit="$"
                  type="number"
                  step="0.01"
                  highlight
                  placeholder="Örn: 118"
                  value={form.priceUsd}
                  onChange={(priceUsd) => setForm((p) => ({ ...p, priceUsd }))}
                />

                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Marka</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                    placeholder="Örn: CW Enerji"
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                    placeholder="Örn: TOPCon Half-Cut"
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  />
                </div>

                <UnitInput
                  label="Nominal Güç (400-700)"
                  unit="W"
                  placeholder="Örn: 550"
                  value={form.nominalPower}
                  onChange={(nominalPower) => setForm((p) => ({ ...p, nominalPower }))}
                />

                <UnitInput
                  label="Çalışma Gerilimi (Vmp)"
                  unit="V DC"
                  placeholder="Örn: 41.9"
                  value={form.vmp}
                  onChange={(vmp) => setForm((p) => ({ ...p, vmp }))}
                />

                <UnitInput
                  label="Çalışma Akımı (Imp)"
                  unit="A"
                  placeholder="Örn: 13.1"
                  value={form.imp}
                  onChange={(imp) => setForm((p) => ({ ...p, imp }))}
                />

                <UnitInput
                  label="Açık Devre Gerilimi (Voc)"
                  unit="V"
                  placeholder="Örn: 49.8"
                  value={form.voc}
                  onChange={(voc) => setForm((p) => ({ ...p, voc }))}
                />

                <UnitInput
                  label="Panel Verimi (18-24)"
                  unit="%"
                  placeholder="Örn: 21.3"
                  value={form.efficiency}
                  onChange={(efficiency) => setForm((p) => ({ ...p, efficiency }))}
                />

                <UnitInput
                  label="Hücre Sayısı"
                  unit="Hücre"
                  placeholder="Örn: 144"
                  value={form.cellCount}
                  onChange={(cellCount) => setForm((p) => ({ ...p, cellCount }))}
                />

                <div className="sm:col-span-2">
                  <UnitInput
                    label="Kullanım Ömrü"
                    unit="Yıl"
                    placeholder="Örn: 25 - 30"
                    value={form.lifespan}
                    onChange={(lifespan) => setForm((p) => ({ ...p, lifespan }))}
                  />
                </div>
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