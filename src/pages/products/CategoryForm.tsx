import { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { Category, CategoryGroup, CategoryRole, SpecField } from '../../../shared/types';
import { GROUP_ICON, GROUP_LABEL, MAIN_GROUPS } from '../../../shared/types';
import { FIELD_PRESETS, ROLE_OPTIONS } from '../../../shared/catalog';
import { api, ApiError, errMsg } from '../../lib/api';
import { useUi } from '../../lib/store';
import { Modal, Field, DynIcon, ICON_CHOICES, Spinner } from '../../components/ui';

const blank = (group: CategoryGroup = ''): Category => ({ id: '', label: '', icon: 'Box', group, role: '', fields: [], sort: 0 });

export default function CategoryForm({
  open,
  onClose,
  initial,
  onSaved,
  defaultGroup = '',
}: {
  open: boolean;
  onClose: () => void;
  initial: Category | null;
  onSaved: () => void;
  defaultGroup?: CategoryGroup;
}) {
  const [c, setC] = useState<Category>(initial || blank(defaultGroup));
  const [busy, setBusy] = useState(false);
  const { toast, confirm } = useUi();
  useEffect(() => {
    if (open) setC(initial || blank(defaultGroup));
  }, [open, initial, defaultGroup]);

  const setGroup = (group: CategoryGroup) =>
    setC((x) => ({ ...x, group, role: group && ROLE_OPTIONS[group].some((r) => r.v === x.role) ? x.role : '' }));
  const presets = Object.entries(FIELD_PRESETS).filter(([, p]) => !c.group || p.group === c.group || p.group === '');

  const setField = (i: number, patch: Partial<SpecField>) => setC((x) => ({ ...x, fields: x.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) }));
  const usePreset = (key: string) => {
    const p = FIELD_PRESETS[key];
    if (!p) return;
    setC((x) => ({ ...x, label: x.label || p.label, icon: p.icon, group: p.group || x.group, role: p.role, fields: p.fields.map((f) => ({ ...f })) }));
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
            <button className="btn-danger sm:mr-auto" onClick={del}>
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
        <div>
          <label className="label">Ana kategori</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['', ...MAIN_GROUPS] as CategoryGroup[]).map((g) => (
              <button
                key={g || 'genel'}
                type="button"
                onClick={() => setGroup(g)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-sm font-bold transition ${
                  c.group === g ? 'bg-primary text-primary-fg border-primary shadow' : 'bg-surface-2 border-line text-muted hover:text-fg'
                }`}
              >
                <DynIcon name={GROUP_ICON[g]} className="w-[18px] h-[18px]" /> {GROUP_LABEL[g]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-1.5">Teklif türü ve PDF metin şablonu (ödeme, garanti, notlar) bu ana kategoriye göre seçilir.</p>
        </div>
        {!c.id && presets.length > 0 && (
          <div>
            <label className="label">Hazır şablondan başla</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
              {presets.map(([k, p]) => (
                <button key={k} type="button" className="btn-secondary btn-sm shrink-0" onClick={() => usePreset(k)}>
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
          <Field label="Rol" hint={c.group === 'solar' ? 'GES asistanı hangi kategoriden ürün önereceğini buradan bilir' : 'Ürünün ana kategori içindeki türü'}>
            <select
              className="input"
              value={c.role}
              onChange={(e) => {
                const role = e.target.value as CategoryRole;
                const g = MAIN_GROUPS.find((x) => ROLE_OPTIONS[x].some((r) => r.v === role));
                setC({ ...c, role, group: g || c.group });
              }}
            >
              <option value="">Genel (rol yok)</option>
              {(c.group ? [c.group] : MAIN_GROUPS).map((g) => (
                <optgroup key={g} label={GROUP_LABEL[g]}>
                  {ROLE_OPTIONS[g].map((r) => (
                    <option key={r.v} value={r.v}>
                      {r.label}
                      {r.hint ? ` (${r.hint})` : ''}
                    </option>
                  ))}
                </optgroup>
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
                <div key={i} className="p-2.5 rounded-xl bg-surface-2 border border-line space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[24px_1fr_90px_120px_1fr_90px_32px] sm:gap-2 sm:items-center">
                  <div className="flex items-center gap-2 sm:contents">
                    <div className="flex sm:flex-col">
                      <button
                        type="button"
                        disabled={i === 0}
                        className="p-1 sm:p-0 text-muted disabled:opacity-30"
                        aria-label="Yukarı"
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
                        className="p-1 sm:p-0 text-muted disabled:opacity-30"
                        aria-label="Aşağı"
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
                    <input className="input-sm flex-1 min-w-0" placeholder="Alan adı (örn: Güç)" value={f.label} onChange={(e) => setField(i, { label: e.target.value })} />
                    <button type="button" className="btn-icon w-9 h-9 shrink-0 sm:hidden" aria-label="Alanı sil" onClick={() => setC((x) => ({ ...x, fields: x.fields.filter((_, j) => j !== i) }))}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:contents">
                    <input className="input-sm" placeholder="Birim" value={f.unit || ''} onChange={(e) => setField(i, { unit: e.target.value })} />
                    <select className="input-sm" value={f.type || 'text'} onChange={(e) => setField(i, { type: e.target.value as SpecField['type'] })}>
                      <option value="text">Metin</option>
                      <option value="number">Sayı</option>
                      <option value="select">Liste</option>
                    </select>
                  </div>
                  <input
                    className={`input-sm ${f.type === 'select' ? '' : 'hidden sm:block sm:invisible'}`}
                    placeholder="Seçenekler (virgülle)"
                    value={(f.options || []).join(', ')}
                    onChange={(e) => setField(i, { options: e.target.value.split(',').map((s) => s.trim()) })}
                  />
                  <label className="text-xs flex items-center gap-1.5 text-muted whitespace-nowrap py-1" title="Teknik özette etiketsiz, kısa gösterilir">
                    <input type="checkbox" className="w-4 h-4" checked={!!f.short} onChange={(e) => setField(i, { short: e.target.checked })} /> <span className="sm:hidden">Teknik özette göster</span><span className="hidden sm:inline">Özette</span>
                  </label>
                  <button type="button" className="hidden sm:inline-flex btn-icon w-8 h-8" aria-label="Alanı sil" onClick={() => setC((x) => ({ ...x, fields: x.fields.filter((_, j) => j !== i) }))}>
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
