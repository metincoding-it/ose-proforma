import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, Search, PencilLine, Trash2, FileSpreadsheet, Settings2, Percent, AlertTriangle, Package, Copy } from 'lucide-react';
import type { Category, Product } from '../../../shared/types';
import { productSummary, productTitle } from '../../../shared/catalog';
import { api, errMsg } from '../../lib/api';
import { useAuth, useData, useUi } from '../../lib/store';
import { fmtMoney, fmtNum, fmtRelative } from '../../lib/format';
import { PageHeader, Thumb, DynIcon, Empty, Modal, Field, NumberInput, Segmented } from '../../components/ui';
import ProductForm from './ProductForm';
import CategoryForm from './CategoryForm';
import ImportExport from './ImportExport';

export default function Products() {
  const { isAdmin } = useAuth();
  const { categories, products, reloadCatalog, setProducts, settings, categoryMap } = useData();
  const { toast, confirm } = useUi();
  const [params, setParams] = useSearchParams();
  const cat = params.get('kategori') || 'all';
  const staleOnly = params.get('eski') === '1';
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [catForm, setCatForm] = useState<{ open: boolean; cat: Category | null }>({ open: false, cat: null });
  const [io, setIo] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adjust, setAdjust] = useState(false);
  const [pct, setPct] = useState(5);
  const [target, setTarget] = useState<'sale' | 'cost' | 'both'>('sale');

  const staleBefore = Date.now() - settings.quote.stalePriceDays * 864e5;
  const isStale = (p: Product) => !p.priceUpdatedAt || new Date(p.priceUpdatedAt).getTime() < staleBefore;

  const list = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('tr');
    return products.filter((p) => {
      if (staleOnly && !isStale(p)) return false;
      if (!s && cat !== 'all' && p.categoryId !== cat) return false;
      if (!s) return true;
      return `${p.sku} ${p.brand} ${p.name} ${p.description} ${Object.values(p.specs).join(' ')}`.toLocaleLowerCase('tr').includes(s);
    });
  }, [products, q, cat, staleOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of products) m[p.categoryId] = (m[p.categoryId] || 0) + 1;
    return m;
  }, [products]);

  const openNew = () => {
    setEditing(activeCatFor(cat) ? (emptyFor(cat, settings.quote.defaultVatRate) as Product) : null);
    setFormOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setFormOpen(true);
  };
  const duplicate = (p: Product) => {
    setEditing({ ...p, id: '', sku: p.sku ? `${p.sku}-KOPYA` : '', name: `${p.name} (kopya)`, version: 0 });
    setFormOpen(true);
  };
  const del = async (p: Product) => {
    if (!(await confirm({ title: 'Ürün silinsin mi?', message: `${productTitle(p)} silinecek. Mevcut tekliflerdeki kalemler etkilenmez.`, danger: true, confirmText: 'Sil' }))) return;
    try {
      await api.del(`/products/${p.id}`);
      setProducts((ps) => ps.filter((x) => x.id !== p.id));
      toast('Ürün silindi.');
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };
  const onSaved = (p: Product) => setProducts((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [p, ...ps]));

  const runAdjust = async () => {
    try {
      await api.post('/products/adjust', { ids: [...selected], pct, target });
      await reloadCatalog();
      toast(`${selected.size} ürünün fiyatı %${pct} güncellendi.`);
      setSelected(new Set());
      setAdjust(false);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const activeCat = categoryMap.get(cat);
  function activeCatFor(id: string) {
    return categoryMap.get(id);
  }

  return (
    <div>
      <PageHeader
        title="Ürünler"
        subtitle={`${products.length} ürün • ${categories.length} kategori`}
        actions={
          isAdmin && (
            <>
              <button className="btn-secondary" onClick={() => setIo(true)}>
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
              <button className="btn-primary" onClick={openNew} disabled={!categories.length}>
                <Plus className="w-4 h-4" /> Yeni Ürün
              </button>
            </>
          )
        }
      />

      <div className="grid lg:grid-cols-[240px_minmax(0,1fr)] gap-5 items-start">
        {/* KATEGORİLER */}
        <aside className="lg:sticky lg:top-6">
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar lg:card lg:p-2">
            {[{ id: 'all', label: 'Tüm Ürünler', icon: 'Package' } as Category, ...categories].map((c) => (
              <div key={c.id} className="group flex items-center shrink-0">
                <button
                  onClick={() => setParams(c.id === 'all' ? {} : { kategori: c.id })}
                  className={`flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                    cat === c.id && !staleOnly ? 'bg-primary/12 text-primary' : 'text-muted hover:text-fg hover:bg-surface-2 bg-surface lg:bg-transparent border border-line lg:border-0'
                  }`}
                >
                  <DynIcon name={c.icon} className="w-[18px] h-[18px]" />
                  <span className="flex-1 text-left">{c.label}</span>
                  <span className="text-xs opacity-70">{c.id === 'all' ? products.length : counts[c.id] || 0}</span>
                </button>
                {isAdmin && c.id !== 'all' && (
                  <button className="hidden lg:flex btn-icon w-8 h-8 opacity-0 group-hover:opacity-100" onClick={() => setCatForm({ open: true, cat: c })} title="Kategoriyi düzenle">
                    <Settings2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {isAdmin && (
              <button onClick={() => setCatForm({ open: true, cat: null })} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-primary border border-dashed border-primary/40 hover:bg-primary/5">
                <Plus className="w-4 h-4" /> Kategori
              </button>
            )}
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input className="input pl-10" placeholder="Marka, model, stok kodu, özellik..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {isAdmin && activeCat && (
              <button className="btn-secondary lg:hidden" onClick={() => setCatForm({ open: true, cat: activeCat })}>
                <Settings2 className="w-4 h-4" /> Kategori ayarı
              </button>
            )}
          </div>
          {staleOnly && (
            <div className="card p-3 text-sm flex items-center gap-2 border-amber-500/40">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> {settings.quote.stalePriceDays} günden uzun süredir fiyatı güncellenmeyen ürünler gösteriliyor.
              <button className="ml-auto text-primary font-bold" onClick={() => setParams({})}>
                Filtreyi kaldır
              </button>
            </div>
          )}
          {isAdmin && selected.size > 0 && (
            <div className="card p-3 flex flex-wrap items-center gap-3 border-primary/40 bg-primary/5 sticky top-16 lg:top-2 z-20">
              <span className="text-sm font-bold">{selected.size} ürün seçildi</span>
              <button className="btn-primary btn-sm" onClick={() => setAdjust(true)}>
                <Percent className="w-4 h-4" /> Toplu fiyat güncelle
              </button>
              <button className="btn-ghost btn-sm" onClick={() => setSelected(new Set())}>
                Seçimi temizle
              </button>
            </div>
          )}

          {list.length === 0 ? (
            <Empty
              icon={Package}
              title={products.length ? 'Ürün bulunamadı' : 'Henüz ürün yok'}
              text={products.length ? 'Arama veya kategori filtresini değiştirin.' : 'Ürünleri tek tek ekleyebilir veya Excel ile toplu yükleyebilirsiniz.'}
              action={
                isAdmin && !products.length ? (
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={openNew}>
                      <Plus className="w-4 h-4" /> Ürün Ekle
                    </button>
                    <button className="btn-secondary" onClick={() => setIo(true)}>
                      <FileSpreadsheet className="w-4 h-4" /> Excel'den Yükle
                    </button>
                  </div>
                ) : undefined
              }
            />
          ) : (
            <div className="card overflow-hidden">
              {isAdmin && (
                <div className="hidden md:grid grid-cols-[28px_52px_minmax(0,1fr)_120px_130px_100px_100px] gap-3 px-4 py-2.5 border-b border-line table-head items-center">
                  <input type="checkbox" checked={list.length > 0 && list.every((p) => selected.has(p.id))} onChange={(e) => setSelected(e.target.checked ? new Set(list.map((p) => p.id)) : new Set())} />
                  <span />
                  <span>Ürün</span>
                  <span className="text-right">Alış</span>
                  <span className="text-right">Satış</span>
                  <span className="text-right">Marj</span>
                  <span />
                </div>
              )}
              <div className="divide-y divide-line">
                {list.map((p) => {
                  const c = categoryMap.get(p.categoryId);
                  const stale = isStale(p);
                  const marginPct =
                    p.costPrice && p.costCurrency === p.saleCurrency && p.salePrice ? ((p.salePrice - p.costPrice) / p.salePrice) * 100 : p.pricingMode === 'margin' && p.marginPct != null ? (p.marginPct / (100 + p.marginPct)) * 100 : null;
                  return (
                    <div
                      key={p.id}
                      className={`grid ${isAdmin ? 'grid-cols-[28px_52px_minmax(0,1fr)_auto] md:grid-cols-[28px_52px_minmax(0,1fr)_120px_130px_100px_100px]' : 'grid-cols-[52px_minmax(0,1fr)_auto]'} gap-3 px-4 py-3 items-center hover:bg-surface-2/60 ${!p.active ? 'opacity-50' : ''}`}
                    >
                      {isAdmin && <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />}
                      <Thumb src={p.photo} icon={c?.icon} className="w-12 h-12" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-primary uppercase truncate">
                          {c?.label}
                          {p.sku && <span className="text-muted"> • {p.sku}</span>}
                          {!p.active && <span className="text-muted"> • Pasif</span>}
                        </div>
                        <div className="font-bold truncate">{productTitle(p)}</div>
                        <div className="text-xs text-muted truncate">{productSummary(p, c) || '—'}</div>
                      </div>
                      {isAdmin ? (
                        <>
                          <div className="hidden md:block text-right text-sm tabular-nums text-muted">{p.costPrice != null ? fmtMoney(p.costPrice, p.costCurrency || 'USD') : '—'}</div>
                          <div className="text-right">
                            <div className="font-extrabold tabular-nums">{fmtMoney(p.salePrice, p.saleCurrency)}</div>
                            <div className={`text-[11px] ${stale ? 'text-amber-500 font-semibold' : 'text-muted'}`} title="Son fiyat güncellemesi">
                              {stale && <AlertTriangle className="w-3 h-3 inline -mt-0.5 mr-0.5" />}
                              {p.priceUpdatedAt ? fmtRelative(p.priceUpdatedAt) : 'tarih yok'}
                            </div>
                          </div>
                          <div className={`hidden md:block text-right text-sm font-bold ${marginPct == null ? 'text-muted' : marginPct < 10 ? 'text-rose-500' : marginPct < 20 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {marginPct == null ? '—' : `%${fmtNum(marginPct, 1)}`}
                          </div>
                          <div className="col-span-4 md:col-span-1 flex justify-end gap-1 -mt-1 md:mt-0">
                            <button className="btn-icon w-8 h-8" onClick={() => duplicate(p)} title="Kopyala">
                              <Copy className="w-4 h-4" />
                            </button>
                            <button className="btn-icon w-8 h-8" onClick={() => openEdit(p)} title="Düzenle">
                              <PencilLine className="w-4 h-4" />
                            </button>
                            <button className="btn-icon w-8 h-8 hover:text-rose-500" onClick={() => del(p)} title="Sil">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-right">
                          <div className="font-extrabold tabular-nums">{fmtMoney(p.salePrice, p.saleCurrency)}</div>
                          <div className="text-[11px] text-muted">KDV %{p.vatRate} hariç</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <>
          <ProductForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} categories={categories} onSaved={onSaved} />
          <CategoryForm open={catForm.open} initial={catForm.cat} onClose={() => setCatForm({ open: false, cat: null })} onSaved={reloadCatalog} />
          <ImportExport open={io} onClose={() => setIo(false)} products={products} categories={categories} onDone={reloadCatalog} />
          <Modal
            open={adjust}
            onClose={() => setAdjust(false)}
            title="Toplu Fiyat Güncelleme"
            size="sm"
            footer={
              <button className="btn-primary" onClick={runAdjust}>
                Uygula
              </button>
            }
          >
            <div className="space-y-4">
              <p className="text-sm text-muted">Seçili {selected.size} ürünün fiyatı yüzde olarak artırılır (zam) veya negatif değerle düşürülür.</p>
              <Field label="Oran">
                <NumberInput value={pct} onChange={setPct} suffix="%" />
              </Field>
              <Field label="Uygulanacak fiyat">
                <Segmented
                  size="sm"
                  value={target}
                  onChange={setTarget}
                  options={[
                    { value: 'sale', label: 'Satış' },
                    { value: 'cost', label: 'Alış' },
                    { value: 'both', label: 'İkisi de' },
                  ]}
                />
              </Field>
              <p className="text-xs text-muted">“Kâr % ile hesapla” modundaki ürünlerde alış fiyatı değişince satış fiyatı otomatik yeniden hesaplanır.</p>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

function emptyFor(categoryId: string, vatRate: number): Partial<Product> {
  return {
    id: '',
    categoryId,
    sku: '',
    brand: '',
    name: '',
    description: '',
    specs: {},
    unit: 'Adet',
    photo: '',
    costPrice: null,
    costCurrency: 'USD',
    pricingMode: 'fixed',
    marginPct: null,
    salePrice: 0,
    saleCurrency: 'USD',
    vatRate,
    active: true,
    priceUpdatedAt: null,
    updatedAt: null,
    version: 0,
  };
}
