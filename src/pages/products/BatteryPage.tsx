import { useState } from 'react';
import type { FormEvent } from 'react';
import { BatteryCharging, PlusCircle, Edit3, Trash2, X } from 'lucide-react';
import type { BatteryProduct, BatteryType } from '../../types/product';
import ImageUploadField from '../../components/ImageUploadField';
import UnitInput, { withUnit, stripUnit } from '../../components/UnitInput';

const BATTERY_TYPES: BatteryType[] = [
  'Lityum Demir Fosfat (LiFePO₄ / LFP)',
  'Lityum İyon (NMC/NCA)',
  'Kurşun-Asit (AGM / Jel / Sulu)',
  'Akış Bataryası (Flow Battery)',
];

interface BatteryPageProps {
  batteries: BatteryProduct[];
  onSaveBatteries: (list: BatteryProduct[]) => void;
}

export default function BatteryPage({ batteries, onSaveBatteries }: BatteryPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    photo: '',
    brand: '',
    model: '',
    batteryType: 'Lityum Demir Fosfat (LiFePO₄ / LFP)' as BatteryType,
    nominalVoltage: '',
    capacityAh: '',
    energyKwh: '',
    dischargeCurrent: '',
    chargeCurrent: '',
    dod: '',
    cycleLife: '',
    bms: '',
    priceUsd: '',
  });

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      photo: '',
      brand: '',
      model: '',
      batteryType: 'Lityum Demir Fosfat (LiFePO₄ / LFP)',
      nominalVoltage: '',
      capacityAh: '',
      energyKwh: '',
      dischargeCurrent: '',
      chargeCurrent: '',
      dod: '',
      cycleLife: '',
      bms: '',
      priceUsd: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: BatteryProduct) => {
    setEditingId(item.id);
    setForm({
      photo: item.photo,
      brand: item.brand === '-' ? '' : item.brand,
      model: item.model === '-' ? '' : item.model,
      batteryType: item.batteryType,
      nominalVoltage: stripUnit(item.nominalVoltage, 'V'),
      capacityAh: stripUnit(item.capacityAh, 'Ah'),
      energyKwh: stripUnit(item.energyKwh, 'kWh'),
      dischargeCurrent: stripUnit(item.dischargeCurrent, 'A'),
      chargeCurrent: stripUnit(item.chargeCurrent, 'A'),
      dod: stripUnit(item.dod, '%'),
      cycleLife: stripUnit(item.cycleLife, 'Çevrim'),
      bms: item.bms === '-' ? '' : item.bms,
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
      model: form.model.trim() || 'Batarya',
      batteryType: form.batteryType,
      nominalVoltage: withUnit(form.nominalVoltage, 'V'),
      capacityAh: withUnit(form.capacityAh, 'Ah'),
      energyKwh: withUnit(form.energyKwh, 'kWh'),
      dischargeCurrent: withUnit(form.dischargeCurrent, 'A'),
      chargeCurrent: withUnit(form.chargeCurrent, 'A'),
      dod: withUnit(form.dod, '%'),
      cycleLife: withUnit(form.cycleLife, 'Çevrim'),
      bms: form.bms.trim() || '-',
      priceUsd: parsedPrice,
    };

    if (editingId) {
      onSaveBatteries(
        batteries.map((item) =>
          item.id === editingId ? { ...item, ...formattedData } : item
        )
      );
    } else {
      onSaveBatteries([{ id: 'bat-' + Date.now(), ...formattedData }, ...batteries]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu bataryayı silmek istediğinize emin misiniz?')) {
      onSaveBatteries(batteries.filter((i) => i.id !== id));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161920] border border-[#262a34] rounded-2xl p-5">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Batarya Ürünleri</h2>
          <p className="text-sm text-[#8a8f9e] mt-0.5">Toplam {batteries.length} ürün kayıtlı</p>
        </div>

        <button
          onClick={openAddModal}
          className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#00b8e6] hover:bg-cyan-400 text-[#111318] font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg"
        >
          <PlusCircle className="w-5 h-5" />
          Yeni Batarya Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {batteries.map((bat) => (
          <div
            key={bat.id}
            className="bg-[#161920] border border-[#262a34] rounded-2xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-[#111318] border border-[#262a34] flex items-center justify-center overflow-hidden shrink-0">
                {bat.photo ? (
                  <img src={bat.photo} alt={bat.model} className="w-full h-full object-contain p-1" />
                ) : (
                  <BatteryCharging className="w-9 h-9 text-[#00b8e6]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-bold text-[#00b8e6] truncate">
                    {bat.batteryType}
                  </span>
                  <span className="px-3 py-1 rounded-lg text-sm font-extrabold bg-[#111318] text-amber-400 shrink-0">
                    {bat.energyKwh}
                  </span>
                </div>
                <h3 className="font-extrabold text-xl text-white mt-1 break-words">
                  {bat.brand} {bat.model}
                </h3>
                <p className="text-2xl font-black text-[#00b8e6] mt-2">
                  ${bat.priceUsd.toLocaleString('en-US')}
                </p>
              </div>
            </div>

            <div className="bg-[#111318] border border-[#262a34] rounded-xl p-3.5 space-y-1.5 text-sm sm:text-base">
              <div className="flex justify-between">
                <span className="text-[#8a8f9e]">Gerilim & Kapasite:</span>
                <span className="font-bold text-white">{bat.nominalVoltage} / {bat.capacityAh}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a8f9e]">Deşarj / Şarj Akımı:</span>
                <span className="font-bold text-white">{bat.dischargeCurrent} / {bat.chargeCurrent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a8f9e]">DoD & Çevrim:</span>
                <span className="font-bold text-white">{bat.dod} • {bat.cycleLife}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a8f9e]">BMS:</span>
                <span className="font-bold text-white">{bat.bms}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => openEditModal(bat)}
                className="py-3 rounded-xl bg-[#20242d] hover:bg-[#282d38] text-white text-base font-bold flex items-center justify-center gap-2"
              >
                <Edit3 className="w-4 h-4 text-[#00b8e6]" />
                Düzenle
              </button>
              <button
                onClick={() => handleDelete(bat.id)}
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
                {editingId ? 'Batarya Düzenle' : 'Yeni Batarya Ekle'}
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
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-[#00b8e6] mb-1.5">Ürün Çeşidi</label>
                  <select
                    value={form.batteryType}
                    onChange={(e) => setForm((p) => ({ ...p, batteryType: e.target.value as BatteryType }))}
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  >
                    {BATTERY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Marka</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                    placeholder="Örn: Dyness"
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                    placeholder="Örn: BX51100"
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                  />
                </div>

                <UnitInput
                  label="Nominal Gerilim"
                  unit="V"
                  placeholder="Örn: 51.2"
                  value={form.nominalVoltage}
                  onChange={(nominalVoltage) => setForm((p) => ({ ...p, nominalVoltage }))}
                />

                <UnitInput
                  label="Kapasite"
                  unit="Ah"
                  placeholder="Örn: 100"
                  value={form.capacityAh}
                  onChange={(capacityAh) => setForm((p) => ({ ...p, capacityAh }))}
                />

                <UnitInput
                  label="Enerji"
                  unit="kWh"
                  placeholder="Örn: 5.12"
                  value={form.energyKwh}
                  onChange={(energyKwh) => setForm((p) => ({ ...p, energyKwh }))}
                />

                <UnitInput
                  label="Fiyat"
                  unit="$"
                  type="number"
                  step="0.01"
                  highlight
                  placeholder="Örn: 1320"
                  value={form.priceUsd}
                  onChange={(priceUsd) => setForm((p) => ({ ...p, priceUsd }))}
                />

                <UnitInput
                  label="Deşarj Akımı"
                  unit="A"
                  placeholder="Örn: 100"
                  value={form.dischargeCurrent}
                  onChange={(dischargeCurrent) => setForm((p) => ({ ...p, dischargeCurrent }))}
                />

                <UnitInput
                  label="Şarj Akımı"
                  unit="A"
                  placeholder="Örn: 50"
                  value={form.chargeCurrent}
                  onChange={(chargeCurrent) => setForm((p) => ({ ...p, chargeCurrent }))}
                />

                <UnitInput
                  label="DoD"
                  unit="%"
                  placeholder="Örn: 90"
                  value={form.dod}
                  onChange={(dod) => setForm((p) => ({ ...p, dod }))}
                />

                <UnitInput
                  label="Çevrim Ömrü"
                  unit="Çevrim"
                  placeholder="Örn: 6000"
                  value={form.cycleLife}
                  onChange={(cycleLife) => setForm((p) => ({ ...p, cycleLife }))}
                />

                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-zinc-300 mb-1.5">BMS</label>
                  <input
                    type="text"
                    value={form.bms}
                    onChange={(e) => setForm((p) => ({ ...p, bms: e.target.value }))}
                    placeholder="Örn: Dahili Akıllı BMS"
                    className="w-full bg-[#111318] border border-[#2c303a] rounded-xl px-4 py-3.5 text-base font-semibold text-white"
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