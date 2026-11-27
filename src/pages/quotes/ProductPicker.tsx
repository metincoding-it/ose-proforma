import { useMemo, useState } from 'react';
import { Search, Plus, Layers, Check, Minus } from 'lucide-react';
import type { Kit, Product, QuoteLine } from '../../../shared/types';
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
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (lines: QuoteLine[]) => void;
  existing: QuoteLine[];
  initialTab?: 'products' | 'kits';
}) {
  const { categories, products, kits, categoryMap, productMap } = useData();
  const [tab, setTab] = useState<'products' | 'kits'>(initialTab);
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  const [kitQty, setKitQty] = useState<Record<string, number>>({});
  const [lastTab, setLastTab] = useState(initialTab);
  if (open && initialTab !== lastTab) {
    setLastTab(initialTab);
    setTab(initialTab);
  }

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of existing) if (l.productId) m.set(l.productId, (m.get(l.productId) || 0) + l.qty);
    return m;
  }, [existing]);

  const list = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('tr');
    return products.filter((p) => {
      if (!p.active) return false;
      if (!s && cat !== 'all' && p.categoryId !== cat) return false;
      if (!s) return true;
      const hay = `${p.sku} ${p.brand} ${p.name} ${p.description} ${Object.values(p.specs).join(' ')} ${categoryMap.get(p.categoryId)?.label || ''}`.toLocaleLowerCase('tr');
      return s.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [products, q, cat, categoryMap]);

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
            <input className="input pl-10" placeholder="Marka, model, stok kodu veya özellik ara..." value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          {!q && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
              {[{ id: 'all', label: 'Tümü', icon: 'Package' }, ...categories].map((c) => (
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
            <div className="grid sm:grid-cols-2 gap-2">
              {list.map((p) => {
                const n = counts.get(p.id);
                const cat2 = categoryMap.get(p.categoryId);
                return (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-3 transition ${n ? 'border-primary bg-primary/5' : 'border-line bg-surface-2 hover:border-primary/50'}`}
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
