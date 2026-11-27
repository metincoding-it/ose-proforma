import { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { Category, CategoryRole, SpecField } from '../../../shared/types';
import { FIELD_PRESETS } from '../../../shared/catalog';
import { api, ApiError, errMsg } from '../../lib/api';
import { useUi } from '../../lib/store';
import { Modal, Field, DynIcon, ICON_CHOICES, Spinner } from '../../components/ui';

const ROLES: { v: CategoryRole; label: string }[] = [
  { v: '', label: 'Genel' },
  { v: 'pv', label: 'PV Panel (GES asistanı)' },
  { v: 'inverter', label: 'Inverter (GES asistanı)' },
  { v: 'battery', label: 'Batarya (GES asistanı)' },
  { v: 'infra', label: 'Altyapı / Montaj (GES asistanı)' },
  { v: 'service', label: 'Hizmet / İşçilik (GES asistanı)' },
];

export default function CategoryForm({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial: Category | null; onSaved: () => void }) {
  const [c, setC] = useState<Category>(initial || { id: '', label: '', icon: 'Box', role: '', fields: [], sort: 0 });
  const [busy, setBusy] = useState(false);
  const { toast, confirm } = useUi();
  useEffect(() => {
    if (open) setC(initial || { id: '', label: '', icon: 'Box', role: '', fields: [], sort: 0 });
  }, [open, initial]);

  const setField = (i: number, patch: Partial<SpecField>) => setC((x) => ({ ...x, fields: x.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));
  const usePreset = (key: string) => {
    const p = FIELD_PRESETS[key];
    if (!p) return;
    setC((x) => ({ ...x, label: x.label || p.label, icon: p.icon, role: p.role, fields: p.fields.map((f) => ({ ...f })) }));
  };

  const save = async () => {
    setBusy(true);
    try {
      const fields = c.fields.map((f, i) => ({
        ...f,
        key:
          f.key ||
          f.label
            .toLocaleLowerCase('tr')
            .replace(/ı/g, 'i')
            .normalize('NFD')
            .replace(/[^a-z0-9]/g, '')
            .slice(0, 20) ||
          `f${i}`,
      }));
      if (c.id) await api.put(`/categories/${c.id}`, { ...c, fields });
      else await api.post('/categories', { ...c, fields });
      toast('Kategori kaydedildi.');
      onSaved();
      onClose();
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!(await confirm({ title: `"${c.label}" silinsin mi?`, danger: true, confirmText: 'Sil' }))) return;
    try {
      await api.del(`/categories/${c.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'HAS_PRODUCTS') {
        if (!(await confirm({ title: 'Kategoride ürün var', message: `${e.message}\nKategori, içindeki tüm ürünlerle birlikte silinsin mi?`, danger: true, confirmText: 'Hepsini sil' }))) return;
        await api.del(`/categories/${c.id}?force=1`);
      } else {
        toast(errMsg(e), 'error');
        return;
      }
    }
    toast('Kategori silindi.');
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={c.id ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
      size="lg"
      footer={
        <>
          {c.id && (
            <button className="btn-danger mr-auto" onClick={del}>
              <Trash2 className="w-4 h-4" /> Sil
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn-primary" onClick={save} disabled={busy || !c.label.trim()}>
            {busy && <Spinner className="w-4 h-4" />} Kaydet
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {!c.id && (
          <div>
            <label className="label">Hazır şablondan başla</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(FIELD_PRESETS).map(([k, p]) => (
                <button key={k} type="button" className="btn-secondary btn-sm" onClick={() => usePreset(k)}>
                  <DynIcon name={p.icon} className="w-4 h-4" /> {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Kategori adı">
            <input className="input" value={c.label} onChange={(e) => setC({ ...c, label: e.target.value })} placeholder="Örn: Güvenlik Kamerası" />
          </Field>
          <Field label="Rol" hint="GES asistanı hangi kategoriden ürün önereceğini buradan bilir">
            <select className="input" value={c.role} onChange={(e) => setC({ ...c, role: e.target.value as CategoryRole })}>
              {ROLES.map((r) => (
                <option key={r.v} value={r.v}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div>
          <label className="label">İkon</label>
          <div className="flex flex-wrap gap-1.5">
            {ICON_CHOICES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setC({ ...c, icon: n })}
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.icon === n ? 'bg-primary text-primary-fg border-primary' : 'bg-surface-2 border-line text-muted hover:text-fg'}`}
              >
                <DynIcon name={n} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Teknik alanlar</label>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setC({ ...c, fields: [...c.fields, { key: '', label: '', type: 'text' }] })}>
              <Plus className="w-4 h-4" /> Alan ekle
            </button>
          </div>
          {c.fields.length === 0 ? (
            <p className="text-sm text-muted p-4 rounded-xl border border-dashed border-line">Alan yok. Ürünler sadece açıklama ile tanımlanır.</p>
          ) : (
            <div className="space-y-2">
              {c.fields.map((f, i) => (
                <div key={i} className="grid grid-cols-[24px_1fr_80px_110px_32px] sm:grid-cols-[24px_1fr_90px_120px_1fr_90px_32px] gap-2 items-center p-2 rounded-xl bg-surface-2 border border-line">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={i === 0}
                      className="text-muted disabled:opacity-30"
                      onClick={() =>
                        setC((x) => {
                          const a = [...x.fields];
                          [a[i - 1], a[i]] = [a[i], a[i - 1]];
                          return { ...x, fields: a };
                        })
                      }
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={i === c.fields.length - 1}
                      className="text-muted disabled:opacity-30"
                      onClick={() =>
                        setC((x) => {
                          const a = [...x.fields];
                          [a[i + 1], a[i]] = [a[i], a[i + 1]];
                          return { ...x, fields: a };
                        })
                      }
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <input className="input-sm" placeholder="Alan adı (örn: Güç)" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                  <input className="input-sm" placeholder="Birim" value={f.unit || ''} onChange={(e) => setField(i, { unit: e.target.value })} />
                  <select className="input-sm" value={f.type || 'text'} onChange={(e) => setField(i, { type: e.target.value as SpecField['type'] })}>
                    <option value="text">Metin</option>
                    <option value="number">Sayı</option>
                    <option value="select">Liste</option>
                  </select>
                  <input
                    className={`input-sm col-span-3 sm:col-span-1 col-start-2 sm:col-start-auto ${f.type === 'select' ? '' : 'invisible hidden sm:block'}`}
                    placeholder="Seçenekler (virgülle)"
                    value={(f.options || []).join(', ')}
                    onChange={(e) => setField(i, { options: e.target.value.split(',').map((s) => s.trim()) })}
                  />
                  <label className="text-xs flex items-center gap-1 text-muted whitespace-nowrap col-start-2 sm:col-start-auto" title="Teknik özette etiketsiz, kısa gösterilir">
                    <input type="checkbox" checked={!!f.short} onChange={(e) => setField(i, { short: e.target.checked })} /> Özette
                  </label>
                  <button type="button" className="btn-icon w-8 h-8 row-start-1 col-start-5 sm:row-auto sm:col-auto" onClick={() => setC((x) => ({ ...x, fields: x.fields.filter((_, j) => j !== i) }))}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
