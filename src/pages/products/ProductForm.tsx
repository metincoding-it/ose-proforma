import { useEffect, useMemo, useState } from 'react';
import type { Category, CategoryGroup, Currency, PricingMode, Product } from '../../../shared/types';
import { CURRENCIES, CURRENCY_SYMBOL, GROUP_LABEL, MAIN_GROUPS, VAT_RATES } from '../../../shared/types';
import { UNIT_OPTIONS } from '../../../shared/catalog';
import { convert, priceFromMargin } from '../../../shared/calc';
import { api, ApiError, errMsg } from '../../lib/api';
import { useData, useUi } from '../../lib/store';
import { fmtMoney, fmtNum } from '../../lib/format';
import { Modal, Field, ImageField, NumberInput, Segmented, Toggle, Spinner } from '../../components/ui';

export function emptyProduct(categoryId: string, vatRate = 20): Product {
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

type PriceEntry = 'excluded' | 'included';
const PRICE_ENTRY_KEY = 'ose-price-entry';
const readEntry = (): PriceEntry => {
  try {
    return localStorage.getItem(PRICE_ENTRY_KEY) === 'included' ? 'included' : 'excluded';
  } catch {
    return 'excluded';
  }
};
const r4 = (n: number) => Math.round(n * 10000) / 10000;

function CurrencySelect({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <select className="input w-[92px] shrink-0 font-bold px-2" value={value} onChange={(e) => onChange(e.target.value as Currency)}>
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {CURRENCY_SYMBOL[c]} {c}
        </option>
      ))}
    </select>
  );
}

export default function ProductForm({
  open,
  onClose,
  initial,
  categories,
  onSaved,
  defaultGroup = '',
}: {
  open: boolean;
  onClose: () => void;
  initial: Product | null;
  categories: Category[];
  onSaved: (p: Product) => void;
  defaultGroup?: CategoryGroup;
}) {
  const { settings } = useData();
  const { toast } = useUi();
  const [p, setP] = useState<Product>(initial || emptyProduct(categories[0]?.id || ''));
  const [busy, setBusy] = useState(false);
  const [rates, setRates] = useState<Record<Currency, number>>({ TRY: 1, USD: 0, EUR: 0 });
  const [entry, setEntryState] = useState<PriceEntry>(readEntry);
  const setEntry = (v: PriceEntry) => {
    setEntryState(v);
    try {
      localStorage.setItem(PRICE_ENTRY_KEY, v);
    } catch {
      /* yok say */
    }
  };
  const firstCat = (categories.find((c) => defaultGroup && c.group === defaultGroup) || categories[0])?.id || '';

  useEffect(() => {
    if (open) setP(initial || emptyProduct(firstCat, settings.quote.defaultVatRate));
  }, [open, initial, firstCat, settings.quote.defaultVatRate]);
  useEffect(() => {
    if (open && !rates.USD) api.get<{ rates: Record<Currency, number> }>('/rates').then((r) => setRates(r.rates)).catch(() => null);
  }, [open, rates.USD]);

  const cat = categories.find((c) => c.id === p.categoryId);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const setSpec = (k: string, v: string) => setP((x) => ({ ...x, specs: { ...x.specs, [k]: v } }));

  const effectiveSale = p.pricingMode === 'margin' && p.costPrice != null && p.marginPct != null ? priceFromMargin(p.costPrice, p.marginPct) : p.salePrice;
  const effectiveSaleCur = p.pricingMode === 'margin' ? p.costCurrency || 'USD' : p.saleCurrency;
  const margin = useMemo(() => {
    if (p.costPrice == null || !p.costPrice) return null;
    const costInSale = rates.USD ? convert(p.costPrice, p.costCurrency || 'USD', effectiveSaleCur, rates) : p.costCurrency === effectiveSaleCur ? p.costPrice : 0;
    if (!costInSale) return null;
    return { markup: ((effectiveSale - costInSale) / costInSale) * 100, margin: effectiveSale ? ((effectiveSale - costInSale) / effectiveSale) * 100 : 0, profit: effectiveSale - costInSale };
  }, [p.costPrice, p.costCurrency, effectiveSale, effectiveSaleCur, rates]);

  const vatFactor = 1 + (p.vatRate || 0) / 100;
  const showIncl = entry === 'included' && p.vatRate > 0;
  const catGroups = (['', ...MAIN_GROUPS] as CategoryGroup[])
    .map((g) => ({ g, list: categories.filter((c) => (c.group || '') === g) }))
    .filter((x) => x.list.length);

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...p, salePrice: effectiveSale, saleCurrency: effectiveSaleCur };
      const r = p.id ? await api.put<{ product: Product }>(`/products/${p.id}`, body) : await api.post<{ product: Product }>('/products', body);
      toast(p.id ? 'Ürün güncellendi.' : 'Ürün eklendi.');
      onSaved(r.product);
      onClose();
    } catch (e) {
      toast(errMsg(e), 'error');
      if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={p.id ? 'Ürünü Düzenle' : 'Yeni Ürün'}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn-primary" onClick={save} disabled={busy || !p.name.trim() || !p.categoryId}>
            {busy && <Spinner className="w-4 h-4" />} Kaydet
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Kategori">
            <select className="input" value={p.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              {catGroups.map(({ g, list }) => (
                <optgroup key={g || 'genel'} label={GROUP_LABEL[g]}>
                  {list.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Stok kodu" hint="Excel ile fiyat güncellemede eşleştirme anahtarı">
            <input className="input" value={p.sku} onChange={(e) => set('sku', e.target.value)} placeholder="Örn: DEYE-SUN-10K" />
          </Field>
          <Field label="Marka">
            <input className="input" value={p.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Örn: Deye" />
          </Field>
          <Field label="Model / ürün adı">
            <input className="input" value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="Örn: SUN-10K-SG04LP3 Hibrit" />
          </Field>
        </div>

        <ImageField value={p.photo} onChange={(v) => set('photo', v)} label="Ürün fotoğrafı" />

        {cat && cat.fields.length > 0 && (
          <div>
            <div className="text-sm font-extrabold mb-3">Teknik Özellikler</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cat.fields.map((f) => (
                <Field key={f.key} label={`${f.label}${f.unit ? ` (${f.unit})` : ''}`}>
                  {f.type === 'select' ? (
                    <select className="input" value={p.specs[f.key] || ''} onChange={(e) => setSpec(f.key, e.target.value)}>
                      <option value="">—</option>
                      {[...new Set([...(f.options || []), ...(p.specs[f.key] ? [p.specs[f.key]] : [])])].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input className="input" inputMode={f.type === 'number' ? 'decimal' : undefined} value={p.specs[f.key] || ''} onChange={(e) => setSpec(f.key, e.target.value)} />
                  )}
                </Field>
              ))}
            </div>
          </div>
        )}

        <Field label="Açıklama (teklifte teknik özetin yanında görünür)">
          <textarea className="input min-h-[64px]" value={p.description} onChange={(e) => set('description', e.target.value)} />
        </Field>

        <div className="p-4 rounded-2xl border border-line bg-surface-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-extrabold">Fiyatlandırma</div>
            <div className="flex flex-wrap gap-2">
            {p.pricingMode !== 'margin' && p.vatRate > 0 && (
              <Segmented<PriceEntry>
                size="sm"
                value={entry}
                onChange={setEntry}
                options={[
                  { value: 'excluded', label: 'KDV hariç gir' },
                  { value: 'included', label: 'KDV dahil gir' },
                ]}
              />
            )}
            <Segmented<PricingMode>
              size="sm"
              value={p.pricingMode || 'fixed'}
              onChange={(v) => set('pricingMode', v)}
              options={[
                { value: 'fixed', label: 'Satış fiyatı gir' },
                { value: 'margin', label: 'Kâr % ile hesapla' },
              ]}
            />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Alış (tedarikçi) fiyatı" hint="Sadece yöneticiler görür">
              <div className="flex gap-2">
                <NumberInput value={p.costPrice ?? null} onChange={(v) => set('costPrice', v)} placeholder="Opsiyonel" min={0} />
                <CurrencySelect value={p.costCurrency || 'USD'} onChange={(c) => set('costCurrency', c)} />
              </div>
            </Field>
            {p.pricingMode === 'margin' ? (
              <Field label="Kâr oranı (maliyet üzerine)">
                <NumberInput value={p.marginPct ?? null} onChange={(v) => set('marginPct', v)} suffix="%" />
              </Field>
            ) : (
              <Field label={p.vatRate > 0 ? `Satış fiyatı (${showIncl ? 'KDV dahil' : 'KDV hariç'})` : 'Satış fiyatı'}>
                <div className="flex gap-2">
                  <NumberInput
                    value={showIncl ? r4(p.salePrice * vatFactor) : p.salePrice}
                    onChange={(v) => set('salePrice', showIncl ? r4(v / vatFactor) : v)}
                    min={0}
                  />
                  <CurrencySelect value={p.saleCurrency} onChange={(c) => set('saleCurrency', c)} />
                </div>
              </Field>
            )}
            <Field label="KDV" hint={p.vatRate > 0 ? 'Teklifte kalem bazında değiştirilebilir' : 'Bu ürüne KDV eklenmez'}>
              <select className="input" value={p.vatRate} onChange={(e) => set('vatRate', Number(e.target.value))}>
                {[...new Set([...VAT_RATES, p.vatRate])]
                  .sort((a, b) => b - a)
                  .map((r) => (
                    <option key={r} value={r}>
                      {r === 0 ? 'KDV yok / muaf (%0)' : `%${r}`}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Birim">
              <select className="input" value={p.unit} onChange={(e) => set('unit', e.target.value)}>
                {[...new Set([p.unit, ...UNIT_OPTIONS])].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm pt-1">
            <span>
              Satış{p.vatRate > 0 ? ' (KDV hariç)' : ''}: <b className="text-primary">{fmtMoney(effectiveSale, effectiveSaleCur)}</b>
              {p.vatRate > 0 && <span className="text-muted"> • KDV dahil {fmtMoney(effectiveSale * vatFactor, effectiveSaleCur)}</span>}
            </span>
            {margin && (
              <span className={margin.profit < 0 ? 'text-rose-500 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                Kâr: {fmtMoney(margin.profit, effectiveSaleCur)} • Marj %{fmtNum(margin.margin, 1)} • Maliyet üzeri %{fmtNum(margin.markup, 1)}
              </span>
            )}
          </div>
        </div>

        <Toggle checked={p.active} onChange={(v) => set('active', v)} label="Aktif" hint="Pasif ürünler teklif ekranında listelenmez" />
      </div>
    </Modal>
  );
}
