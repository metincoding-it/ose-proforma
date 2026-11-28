import { useMemo, useState } from 'react';
import { Search, Plus, Layers, Check, Minus } from 'lucide-react';
import type { CategoryGroup, Kit, Product, QuoteLine } from '../../../shared/types';
import { GROUP_LABEL, MAIN_GROUPS } from '../../../shared/types';
import { productSummary, productTitle } from '../../../shared/catalog';
import { useData } from '../../lib/store';
import { fmtMoney } from '../../lib/format';
import { Modal, Thumb, DynIcon, Empty } from '../../components/ui';
import { lineFromProduct, sectionLine } from './quoteUtils';

export default function ProductPicker({
  open,
  onClose,
  onAdd,
  existing,
  initialTab = 'products',
  group = '',
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (lines: QuoteLine[]) => void;
  existing: QuoteLine[];
  initialTab?: 'products' | 'kits';
  group?: CategoryGroup;
}) {
  const { categories, products, kits, categoryMap, productMap } = useData();
  const [tab, setTab] = useState<'products' | 'kits'>(initialTab);
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  const [kitQty, setKitQty] = useState<Record<string, number>>({});
  const [lastTab, setLastTab] = useState(initialTab);
  const [grp, setGrp] = useState<CategoryGroup | 'all'>(group || 'all');
  const [wasOpen, setWasOpen] = useState(false);
  if (open && initialTab !== lastTab) {
    setLastTab(initialTab);
    setTab(initialTab);
  }
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setGrp(group || 'all');
      setCat('all');
    }
  }
  const groupsInUse = useMemo(() => (['', ...MAIN_GROUPS] as CategoryGroup[]).filter((g) => categories.some((c) => c.group === g)), [categories]);
  const visibleCats = grp === 'all' ? categories : categories.filter((c) => c.group === grp);
  const finePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of existing) if (l.productId) m.set(l.productId, (m.get(l.productId) || 0) + l.qty);
    return m;
  }, [existing]);

  const list = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('tr');
    return products.filter((p) => {
      if (!p.active) return false;
      if (!s && grp !== 'all' && (categoryMap.get(p.categoryId)?.group || '') !== grp) return false;
      if (!s && cat !== 'all' && p.categoryId !== cat) return false;
      if (!s) return true;
      const hay = `${p.sku} ${p.brand} ${p.name} ${p.description} ${Object.values(p.specs).join(' ')} ${categoryMap.get(p.categoryId)?.label || ''}`.toLocaleLowerCase('tr');
      return s.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [products, q, cat, grp, categoryMap]);

  const addProduct = (p: Product) => onAdd([lineFromProduct(p, categoryMap.get(p.categoryId))]);

  const addKit = (k: Kit) => {
    const mult = kitQty[k.id] || 1;
    const lines: QuoteLine[] = [sectionLine(mult > 1 ? `${k.name} (×${mult})` : k.name)];
    for (const it of k.items) {
      const p = productMap.get(it.productId);
      if (p) lines.push(lineFromProduct(p, categoryMap.get(p.categoryId), it.qty * mult));
    }
    onAdd(lines);
    onClose();
  };

  const kitTotal = (k: Kit) => {
    const byCur: Record<string, number> = {};
    for (const it of k.items) {
      const p = productMap.get(it.productId);
      if (p) byCur[p.saleCurrency] = (byCur[p.saleCurrency] || 0) + p.salePrice * it.qty;
    }
    return Object.entries(byCur)
      .map(([c, v]) => fmtMoney(v, c as Product['saleCurrency']))
      .join(' + ');
  };

  return (
    <Modal open={open} onClose={onClose} title="Teklife Ekle" size="lg" footer={<button className="btn-primary" onClick={onClose}>Tamam</button>}>
      <div className="flex gap-2 mb-4">
        <button className={`btn-sm btn ${tab === 'products' ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-muted border border-line'}`} onClick={() => setTab('products')}>
          Ürünler ({products.filter((p) => p.active).length})
        </button>
        <button className={`btn-sm btn ${tab === 'kits' ? 'bg-primary text-primary-fg' : 'bg-surface-2 text-muted border border-line'}`} onClick={() => setTab('kits')}>
          <Layers className="w-4 h-4" /> Hazır Paketler ({kits.length})
        </button>
      </div>

      {tab === 'products' ? (
        <>
          <div className="relative mb-3">
            <Search className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input pl-10" type="search" enterKeyHint="search" placeholder="Marka, model, stok kodu veya özellik ara..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus={finePointer} />
          </div>
          {!q && groupsInUse.length > 1 && (
            <div className="flex gap-1 p-1 mb-2 rounded-xl bg-surface-2 border border-line overflow-x-auto no-scrollbar">
              {(['all', ...groupsInUse] as (CategoryGroup | 'all')[]).map((g) => (
                <button
                  key={g || 'genel'}
                  onClick={() => {
                    setGrp(g);
                    setCat('all');
                  }}
                  className={`flex-1 shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-bold whitespace-nowrap ${grp === g ? 'bg-primary text-primary-fg shadow' : 'text-muted'}`}
                >
                  {g === 'all' ? 'Tümü' : GROUP_LABEL[g]}
                </button>
              ))}
            </div>
          )}
          {!q && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
              {[{ id: 'all', label: 'Tümü', icon: 'Package' }, ...visibleCats].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.id)}
                  className={`btn-sm btn shrink-0 ${cat === c.id ? 'bg-primary/15 text-primary border border-primary/40' : 'bg-surface-2 text-muted border border-line'}`}
                >
                  <DynIcon name={c.icon} className="w-4 h-4" /> {c.label}
                </button>
              ))}
            </div>
          )}
          {list.length === 0 ? (
            <Empty title="Ürün bulunamadı" text={products.length ? 'Arama kriterini değiştirin.' : 'Önce Ürünler sayfasından ürün ekleyin.'} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {list.map((p) => {
                const n = counts.get(p.id);
                const cat2 = categoryMap.get(p.categoryId);
                return (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className={`w-full min-w-0 p-2.5 rounded-xl border text-left flex items-center gap-3 transition ${n ? 'border-primary bg-primary/5' : 'border-line bg-surface-2 hover:border-primary/50'}`}
                  >
                    <Thumb src={p.photo} icon={cat2?.icon} className="w-12 h-12" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-primary truncate uppercase">
                        {cat2?.label}
                        {p.sku ? ` • ${p.sku}` : ''}
                      </div>
                      <div className="text-sm font-bold truncate">{productTitle(p)}</div>
                      <div className="text-xs text-muted truncate">{productSummary(p, cat2) || '—'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold tabular-nums">{fmtMoney(p.salePrice, p.saleCurrency)}</div>
                      <div className={`mt-1 ml-auto w-8 h-8 rounded-lg flex items-center justify-center ${n ? 'bg-primary text-primary-fg text-xs font-black' : 'bg-primary/15 text-primary'}`}>
                        {n ? `+${n}` : <Plus className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : kits.length === 0 ? (
        <Empty icon={Layers} title="Henüz hazır paket yok" text="Hazır Paketler sayfasından “10 kW Hibrit GES” veya “8 Kameralı Set” gibi paketler tanımlayın." />
      ) : (
        <div className="space-y-2">
          {kits.map((k) => {
            const valid = k.items.filter((i) => productMap.has(i.productId));
            const mult = kitQty[k.id] || 1;
            return (
              <div key={k.id} className="p-3 rounded-xl border border-line bg-surface-2 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <DynIcon name={k.icon} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{k.name}</div>
                  <div className="text-xs text-muted truncate">
                    {valid.length} kalem • {kitTotal(k) || '—'}
                    {valid.length < k.items.length && <span className="text-amber-500"> • {k.items.length - valid.length} ürün katalogda yok</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-icon border border-line" onClick={() => setKitQty((s) => ({ ...s, [k.id]: Math.max(1, mult - 1) }))}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-black">{mult}</span>
                  <button className="btn-icon border border-line" onClick={() => setKitQty((s) => ({ ...s, [k.id]: mult + 1 }))}>
                    <Plus className="w-4 h-4" />
                  </button>
                  <button className="btn-primary btn-sm" onClick={() => addKit(k)} disabled={!valid.length}>
                    <Check className="w-4 h-4" /> Ekle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
