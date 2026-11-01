import { useState } from 'react';
import type { FormEvent } from 'react';
import { Cpu, PlusCircle, Edit3, Trash2, X } from 'lucide-react';
import type { InverterProduct } from '../../types/product';
import ImageUploadField from '../../components/ImageUploadField';
import UnitInput, { withUnit, stripUnit } from '../../components/UnitInput';

interface InverterPageProps {
  inverters: InverterProduct[];
  onSaveInverters: (list: InverterProduct[]) => void;
}

export default function InverterPage({ inverters, onSaveInverters }: InverterPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    photo: '',
    brand: '',
    model: '',
    kw: '',
    maxDcPower: '',
    maxDcVoltage: '',
    mpptRange: '',
    mpptCount: '',
    priceUsd: '',
  });

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      photo: '',
      brand: '',
      model: '',
      kw: '',
      maxDcPower: '',
      maxDcVoltage: '',
      mpptRange: '',
      mpptCount: '',
      priceUsd: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: InverterProduct) => {
    setEditingId(item.id);
    setForm({
      photo: item.photo,
      brand: item.brand === '-' ? '' : item.brand,
      model: item.model === '-' ? '' : item.model,
      kw: stripUnit(item.kw, 'kW'),
      maxDcPower: stripUnit(item.maxDcPower, 'W'),
      maxDcVoltage: stripUnit(item.maxDcVoltage, 'V'),
      mpptRange: stripUnit(item.mpptRange, 'V'),
      mpptCount: stripUnit(item.mpptCount, 'Adet'),
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
      model: form.model.trim() || 'Inverter',
      kw: withUnit(form.kw, 'kW'),
      maxDcPower: withUnit(form.maxDcPower, 'W'),
      maxDcVoltage: withUnit(form.maxDcVoltage, 'V'),
      mpptRange: withUnit(form.mpptRange, 'V'),
      mpptCount: withUnit(form.mpptCount, 'Adet'),
      priceUsd: parsedPrice,
    };

    if (editingId) {
      onSaveInverters(
        inverters.map((item) =>
          item.id === editingId ? { ...item, ...formattedData } : item
        )
      );
    } else {
      onSaveInverters([{ id: 'inv-' + Date.now(), ...formattedData }, ...inverters]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu inverteri silmek istediğinize emin misiniz?')) {
      onSaveInverters(inverters.filter((i) => i.id !== id));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161920] border border-[#262a34] rounded-2xl p-5">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Inverter Ürünleri</h2>
          <p className="text-sm text-[#8a8f9e] mt-0.5">Toplam {inverters.length} ürün kayıtlı</p>
        </div>

        <button
          onClick={openAddModal}
          className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#00b8e6] hover:bg-cyan-400 text-[#111318] font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg"
        >
          <PlusCircle className="w-5 h-5" />
          Yeni Inverter Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inverters.map((inv) => (
          <div
            key={inv.id}
            className="bg-[#161920] border border-[#262a34] rounded-2xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[#111318] border border-[#262a34] flex items-center justify-center overflow-hidden shrink-0">
                {inv.photo ? (
                  <img src={inv.photo} alt={inv.model} className="w-full h-full object-contain p-1" />
                ) : (
                  <Cpu className="w-9 h-9 text-[#00b8e6]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#00b8e6] uppercase">{inv.brand}</span>
                  <span className="px-3 py-1 rounded-lg text-sm font-extrabold bg-[#111318] text-amber-400">
                    {inv.kw}
                  </span>
                </div>
                <h3 className="font-extrabold text-xl text-white mt-1 break-words">{inv.model}</h3>
                <p className="text-2xl font-black text-[#00b8e6] mt-2">
                  ${inv.priceUsd.toLocaleString('en-US')}
                </p>
              </div>
            </div>

            <div className="bg-[#111318] border border-[#262a34] rounded-xl p-3.5 space-y-1.5 text-sm sm:text-base">
              <div className="flex justify-between">
                <span className="text-[#8a8f9e]">Maks. DC Güç / Voltaj:</span>
                <span className="font-bold text-white">{inv.maxDcPower} / {inv.maxDcVoltage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a8f9e]">MPPT Aralığı / Sayısı:</span>
                <span className="font-bold text-white">{inv.mpptRange} ({inv.mpptCount})</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => openEditModal(inv)}
                className="py-3 rounded-xl bg-[#20242d] hover:bg-[#282d38] text-white text-base font-bold flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4 text-[#00b8e6]" />
                Düzenle
              </button>
              <button
                onClick={() => handleDelete(inv.id)}
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
                {editingId ? 'Inverter Düzenle' : 'Yeni Inverter Ekle'}
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
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Marka</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                    placeholder="Örn: Deye"
                    className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-xl px-4 py-3.5 text-base font-semibold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                    placeholder="Örn: SUN-10K"
                    className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-xl px-4 py-3.5 text-base font-semibold text-white focus:outline-none"
                  />
                </div>

                <UnitInput
                  label="Güç"
                  unit="kW"
                  placeholder="Örn: 10"
                  value={form.kw}
                  onChange={(kw) => setForm((p) => ({ ...p, kw }))}
                />

                <UnitInput
                  label="Fiyat"
                  unit="$"
                  type="number"
                  step="0.01"
                  highlight
                  placeholder="Örn: 2150"
                  value={form.priceUsd}
                  onChange={(priceUsd) => setForm((p) => ({ ...p, priceUsd }))}
                />

                <UnitInput
                  label="Maks. DC Giriş Gücü"
                  unit="W"
                  placeholder="Örn: 13000"
                  value={form.maxDcPower}
                  onChange={(maxDcPower) => setForm((p) => ({ ...p, maxDcPower }))}
                />

                <UnitInput
                  label="Maks. DC Giriş Voltajı"
                  unit="V"
                  placeholder="Örn: 800"
                  value={form.maxDcVoltage}
                  onChange={(maxDcVoltage) => setForm((p) => ({ ...p, maxDcVoltage }))}
                />

                <UnitInput
                  label="MPPT Çalışma Aralığı"
                  unit="V"
                  placeholder="Örn: 200 - 650"
                  value={form.mpptRange}
                  onChange={(mpptRange) => setForm((p) => ({ ...p, mpptRange }))}
                />

                <UnitInput
                  label="MPPT Sayısı"
                  unit="Adet"
                  placeholder="Örn: 2"
                  value={form.mpptCount}
                  onChange={(mpptCount) => setForm((p) => ({ ...p, mpptCount }))}
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