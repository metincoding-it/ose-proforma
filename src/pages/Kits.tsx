import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Layers, PencilLine, Trash2, Search, Minus, X } from 'lucide-react';
import type { Currency, Kit, KitItem } from '../../shared/types';
import { productTitle } from '../../shared/catalog';
import { api, errMsg } from '../lib/api';
import { useAuth, useData, useUi } from '../lib/store';
import { fmtMoney } from '../lib/format';
import { PageHeader, Empty, Modal, Field, DynIcon, ICON_CHOICES, Thumb, NumberInput, Spinner } from '../components/ui';

function KitForm({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial: Kit | null; onSaved: () => void }) {
  const { products, categoryMap, productMap } = useData();
  const { toast } = useUi();
  const [k, setK] = useState<Kit>(initial || { id: '', name: '', description: '', icon: 'Layers', items: [] });
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastInit, setLastInit] = useState<Kit | null | undefined>(undefined);
  if (open && lastInit !== initial) {
    setLastInit(initial);
    setK(initial || { id: '', name: '', description: '', icon: 'Layers', items: [] });
    setQ('');
  }
  if (!open && lastInit !== undefined) setLastInit(undefined);

  const results = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('tr');
    if (!s) return [];
    return products.filter((p) => `${p.sku} ${p.brand} ${p.name}`.toLocaleLowerCase('tr').includes(s)).slice(0, 8);
  }, [q, products]);

  const add = (id: string) => {
    setK((x) => (x.items.some((i) => i.productId === id) ? { ...x, items: x.items.map((i) => (i.productId === id ? { ...i, qty: i.qty + 1 } : i)) } : { ...x, items: [...x.items, { productId: id, qty: 1 }] }));
    setQ('');
  };
  const setItem = (idx: number, patch: Partial<KitItem>) => setK((x) => ({ ...x, items: x.items.map((i, j) => (j === idx ? { ...i, ...patch } : i)) }));

  const save = async () => {
    setBusy(true);
    try {
      if (k.id) await api.put(`/kits/${k.id}`, k);
      else await api.post('/kits', k);
      toast('Paket kaydedildi.');
      onSaved();
      onClose();
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={k.id ? 'Paketi Düzenle' : 'Yeni Hazır Paket'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn-primary" onClick={save} disabled={busy || !k.name.trim() || !k.items.length}>
            {busy && <Spinner className="w-4 h-4" />} Kaydet
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Paket adı">
            <input className="input" value={k.name} onChange={(e) => setK({ ...k, name: e.target.value })} placeholder="Örn: 10 kW Hibrit Ev Tipi GES" />
          </Field>
          <Field label="Kısa açıklama">
            <input className="input" value={k.description} onChange={(e) => setK({ ...k, description: e.target.value })} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ICON_CHOICES.slice(0, 14).map((n) => (
            <button key={n} type="button" onClick={() => setK({ ...k, icon: n })} className={`w-9 h-9 rounded-lg flex items-center justify-center border ${k.icon === n ? 'bg-primary text-primary-fg border-primary' : 'bg-surface-2 border-line text-muted'}`}>
              <DynIcon name={n} className="w-4 h-4" />
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="input pl-10" placeholder="Pakete ürün eklemek için ara..." value={q} onChange={(e) => setQ(e.target.value)} />
          {results.length > 0 && (
            <div className="absolute z-20 mt-1 w-full card shadow-2xl overflow-hidden">
              {results.map((p) => (
                <button key={p.id} type="button" onClick={() => add(p.id)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-2 text-left">
                  <Thumb src={p.photo} icon={categoryMap.get(p.categoryId)?.icon} className="w-9 h-9" />
                  <span className="flex-1 text-sm font-semibold truncate">{productTitle(p)}</span>
                  <span className="text-xs text-muted">{fmtMoney(p.salePrice, p.saleCurrency)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {k.items.length === 0 ? (
          <p className="text-sm text-muted p-5 text-center border border-dashed border-line rounded-xl">Henüz ürün eklenmedi.</p>
        ) : (
          <div className="border border-line rounded-xl divide-y divide-line">
            {k.items.map((it, i) => {
              const p = productMap.get(it.productId);
              return (
                <div key={it.productId} className="flex items-center gap-3 px-3 py-2">
                  <Thumb src={p?.photo} className="w-9 h-9" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p ? productTitle(p) : <span className="text-rose-500">Silinmiş ürün</span>}</div>
                    {p && <div className="text-xs text-muted">{categoryMap.get(p.categoryId)?.label}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" className="btn-icon w-8 h-8" onClick={() => setItem(i, { qty: Math.max(1, it.qty - 1) })}>
                      <Minus className="w-4 h-4" />
                    </button>
                    <NumberInput className="input-sm w-16 text-center" value={it.qty} onChange={(v) => setItem(i, { qty: v })} />
                    <button type="button" className="btn-icon w-8 h-8" onClick={() => setItem(i, { qty: it.qty + 1 })}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-muted w-12">{p?.unit}</span>
                  <button type="button" className="btn-icon w-8 h-8" onClick={() => setK((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Kits() {
  const { kits, productMap, reloadKits } = useData();
  const { isAdmin } = useAuth();
  const { toast, confirm } = useUi();
  const navigate = useNavigate();
  const [form, setForm] = useState<{ open: boolean; kit: Kit | null }>({ open: false, kit: null });

  const totals = (k: Kit) => {
    const m: Partial<Record<Currency, number>> = {};
    for (const it of k.items) {
      const p = productMap.get(it.productId);
      if (p) m[p.saleCurrency] = (m[p.saleCurrency] || 0) + p.salePrice * it.qty;
    }
    return Object.entries(m)
      .map(([c, v]) => fmtMoney(v!, c as Currency))
      .join(' + ');
  };

  const del = async (k: Kit) => {
    if (!(await confirm({ title: `"${k.name}" silinsin mi?`, danger: true, confirmText: 'Sil' }))) return;
    try {
      await api.del(`/kits/${k.id}`);
      await reloadKits();
      toast('Paket silindi.');
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Hazır Paketler"
        subtitle="Sık verdiğiniz sistemleri tek tıkla teklife ekleyin"
        actions={
          isAdmin && (
            <button className="btn-primary" onClick={() => setForm({ open: true, kit: null })}>
              <Plus className="w-4 h-4" /> Yeni Paket
            </button>
          )
        }
      />
      {kits.length === 0 ? (
        <Empty
          icon={Layers}
          title="Henüz paket yok"
          text="Örn. “10 kW Hibrit Ev Tipi GES” veya “8 Kameralı 4K Güvenlik Seti” gibi paketler tanımlayın. Ayrıca herhangi bir teklifi menüden “Hazır paket olarak kaydet” diyerek pakete dönüştürebilirsiniz."
          action={
            isAdmin && (
              <button className="btn-primary" onClick={() => setForm({ open: true, kit: null })}>
                <Plus className="w-4 h-4" /> İlk Paketi Oluştur
              </button>
            )
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {kits.map((k) => (
            <div key={k.id} className="card p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <DynIcon name={k.icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold">{k.name}</div>
                  {k.description && <div className="text-xs text-muted">{k.description}</div>}
                </div>
              </div>
              <ul className="text-sm space-y-1 flex-1">
                {k.items.slice(0, 6).map((it) => {
                  const p = productMap.get(it.productId);
                  return (
                    <li key={it.productId} className="flex justify-between gap-2">
                      <span className={`truncate ${p ? '' : 'text-rose-500'}`}>{p ? productTitle(p) : 'Silinmiş ürün'}</span>
                      <span className="text-muted shrink-0">
                        {it.qty} {p?.unit}
                      </span>
                    </li>
                  );
                })}
                {k.items.length > 6 && <li className="text-xs text-muted">+{k.items.length - 6} kalem daha</li>}
              </ul>
              <div className="flex items-center justify-between pt-3 border-t border-line">
                <span className="font-extrabold text-primary">{totals(k) || '—'}</span>
                <div className="flex gap-1">
                  {isAdmin && (
                    <>
                      <button className="btn-icon w-8 h-8" onClick={() => setForm({ open: true, kit: k })}>
                        <PencilLine className="w-4 h-4" />
                      </button>
                      <button className="btn-icon w-8 h-8 hover:text-rose-500" onClick={() => del(k)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button className="btn-secondary btn-sm" onClick={() => navigate('/teklifler/yeni')}>
                    Teklif aç
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {isAdmin && <KitForm open={form.open} initial={form.kit} onClose={() => setForm({ open: false, kit: null })} onSaved={reloadKits} />}
    </div>
  );
}
