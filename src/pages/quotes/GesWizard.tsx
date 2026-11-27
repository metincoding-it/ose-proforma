import { useMemo, useState } from 'react';
import { Sun, Zap, Info } from 'lucide-react';
import type { GesInfo, Product, QuoteLine } from '../../../shared/types';
import { numSpec, productTitle } from '../../../shared/catalog';
import { useData } from '../../lib/store';
import { fmtMoney, fmtNum } from '../../lib/format';
import { Modal, Field, NumberInput, Empty } from '../../components/ui';
import { lineFromProduct, sectionLine } from './quoteUtils';

type Opt = { productId: string; qty: number; enabled: boolean };

function ProductSelect({ value, onChange, list, placeholder, label }: { value: string; onChange: (v: string) => void; list: Product[]; placeholder: string; label: (p: Product) => string }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {list.map((p) => (
        <option key={p.id} value={p.id}>
          {label(p)}
        </option>
      ))}
    </select>
  );
}

export default function GesWizard({ open, onClose, onApply }: { open: boolean; onClose: () => void; onApply: (lines: QuoteLine[], ges: GesInfo, title: string) => void }) {
  const { products, categories, categoryMap, settings } = useData();
  const byRole = (role: string) => {
    const ids = new Set(categories.filter((c) => c.role === role).map((c) => c.id));
    return products.filter((p) => p.active && ids.has(p.categoryId));
  };
  const panels = useMemo(() => byRole('pv').sort((a, b) => numSpec(b, 'power') - numSpec(a, 'power')), [products, categories]); // eslint-disable-line react-hooks/exhaustive-deps
  const inverters = useMemo(() => byRole('inverter').sort((a, b) => numSpec(a, 'kw') - numSpec(b, 'kw')), [products, categories]); // eslint-disable-line react-hooks/exhaustive-deps
  const batteries = useMemo(() => byRole('battery'), [products, categories]); // eslint-disable-line react-hooks/exhaustive-deps
  const infra = useMemo(() => byRole('infra'), [products, categories]); // eslint-disable-line react-hooks/exhaustive-deps
  const services = useMemo(() => byRole('service'), [products, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  const [target, setTarget] = useState(10);
  const [panelId, setPanelId] = useState('');
  const [inverterId, setInverterId] = useState('');
  const [invQty, setInvQty] = useState(1);
  const [battery, setBattery] = useState<Opt>({ productId: '', qty: 1, enabled: false });
  const [mount, setMount] = useState<Opt>({ productId: '', qty: 0, enabled: false });
  const [cable, setCable] = useState<Opt>({ productId: '', qty: 0, enabled: false });
  const [labor, setLabor] = useState<Opt>({ productId: '', qty: 1, enabled: false });
  const [mountPerPanel, setMountPerPanel] = useState(1);
  const [cablePerKw, setCablePerKw] = useState(10);

  const panel = panels.find((p) => p.id === (panelId || panels[0]?.id));
  const panelW = panel ? numSpec(panel, 'power') : 0;
  const panelCount = panelW ? Math.ceil((target * 1000) / panelW) : 0;
  const kwp = (panelCount * panelW) / 1000;
  const dcAcMax = settings.ges.dcAcMax || 1.3;
  const suggested = inverters.filter((i) => {
    const kw = numSpec(i, 'kw');
    return kw > 0 && kwp / kw <= dcAcMax && kwp / kw >= 0.8;
  });
  const autoInverter = suggested[0] || inverters.find((i) => numSpec(i, 'kw') >= kwp / dcAcMax);
  const inverter = inverters.find((i) => i.id === inverterId) || autoInverter;
  const invKw = inverter ? numSpec(inverter, 'kw') * invQty : 0;
  const ratio = invKw ? kwp / invKw : 0;
  const yearly = kwp * (settings.ges.specificYield || 1450);
  const area = panelCount * 2.6;

  const mountQty = Math.ceil(panelCount * mountPerPanel);
  const cableQty = Math.ceil(kwp * cablePerKw);

  const apply = () => {
    if (!panel) return;
    const lines: QuoteLine[] = [sectionLine(`${fmtNum(kwp, 2)} kWp Güneş Enerji Sistemi`)];
    const add = (p: Product | undefined, qty: number) => p && qty > 0 && lines.push(lineFromProduct(p, categoryMap.get(p.categoryId), qty));
    add(panel, panelCount);
    add(inverter, invQty);
    if (battery.enabled) add(batteries.find((b) => b.id === battery.productId), battery.qty);
    if (mount.enabled) add(infra.find((b) => b.id === mount.productId), mountQty);
    if (cable.enabled) add(infra.find((b) => b.id === cable.productId), cableQty);
    if (labor.enabled) add(services.find((b) => b.id === labor.productId), labor.qty);
    onApply(
      lines,
      { kwp: Math.round(kwp * 100) / 100, panelCount, panelW, inverterKw: invKw, yearlyKwh: Math.round(yearly) },
      `${fmtNum(kwp, 2)} kWp ${inverter && /hibrit/i.test(inverter.specs.type || inverter.name) ? 'Hibrit ' : ''}GES Kurulumu`
    );
    onClose();
  };

  const guess = (title: string, list: Product[]) => {
    const kw = /kablo/i.test(title) ? /kablo/i : /konstr|montaj|ray|profil/i;
    return (list.find((p) => kw.test(`${p.specs.infraType || ''} ${p.name}`)) || list[0])?.id || '';
  };
  const opt = (title: string, state: Opt, set: (o: Opt) => void, list: Product[], qtyNode: React.ReactNode) => (
    <div className={`p-3 rounded-xl border ${state.enabled ? 'border-primary/50 bg-primary/5' : 'border-line bg-surface-2'}`}>
      <label className="flex items-center gap-2 font-bold text-sm cursor-pointer">
        <input type="checkbox" checked={state.enabled} onChange={(e) => set({ ...state, enabled: e.target.checked, productId: state.productId || guess(title, list) })} className="accent-[rgb(var(--primary))] w-4 h-4" />
        {title}
      </label>
      {state.enabled && (
        <div className="grid sm:grid-cols-[1fr_auto] gap-2 mt-2">
          <ProductSelect value={state.productId} onChange={(v) => set({ ...state, productId: v })} list={list} placeholder="Ürün seçin" label={(p) => `${productTitle(p)} – ${fmtMoney(p.salePrice, p.saleCurrency)}/${p.unit}`} />
          {qtyNode}
        </div>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-500" /> GES Boyutlandırma Asistanı
        </span>
      }
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn-primary" onClick={apply} disabled={!panel || !panelCount}>
            <Zap className="w-4 h-4" /> Teklife Ekle
          </button>
        </>
      }
    >
      {!panels.length ? (
        <Empty icon={Sun} title="PV panel bulunamadı" text="Asistanın çalışması için “PV Panel” rolündeki kategoride, güç (W) alanı dolu en az bir ürün olmalı." />
      ) : (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Hedef kurulu güç">
              <NumberInput value={target} onChange={setTarget} suffix="kWp" min={0} autoFocus />
            </Field>
            <Field label="PV panel" className="sm:col-span-2">
              <ProductSelect value={panelId || panel?.id || ''} onChange={setPanelId} list={panels} placeholder="Panel seçin" label={(p) => `${productTitle(p)} – ${numSpec(p, 'power')} W – ${fmtMoney(p.salePrice, p.saleCurrency)}`} />
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Panel adedi', `${panelCount} adet`],
              ['Gerçek DC güç', `${fmtNum(kwp, 2)} kWp`],
              ['Yıllık üretim (tahmini)', `${fmtNum(yearly, 0)} kWh`],
              ['Çatı alanı (yaklaşık)', `${fmtNum(area, 0)} m²`],
            ].map(([k, v]) => (
              <div key={k} className="p-3 rounded-xl bg-surface-2 border border-line">
                <div className="text-[11px] font-semibold text-muted">{k}</div>
                <div className="text-lg font-black tabular-nums">{v}</div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-[1fr_120px] gap-3">
            <Field
              label="Inverter"
              hint={
                inverter ? (
                  <span className={ratio > dcAcMax || ratio < 0.8 ? 'text-amber-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                    DC/AC oranı: {fmtNum(ratio, 2)} {ratio > dcAcMax ? '(inverter küçük kalıyor)' : ratio < 0.8 ? '(inverter gereğinden büyük)' : '(uygun)'}
                  </span>
                ) : (
                  'Inverter kategorisinde ürün yok'
                )
              }
            >
              <ProductSelect
                value={inverterId || inverter?.id || ''}
                onChange={setInverterId}
                list={inverters}
                placeholder="Inverter seçin"
                label={(p) => `${suggested.includes(p) ? '★ ' : ''}${productTitle(p)} – ${numSpec(p, 'kw')} kW – ${fmtMoney(p.salePrice, p.saleCurrency)}`}
              />
            </Field>
            <Field label="Adet">
              <NumberInput value={invQty} onChange={(v) => setInvQty(Math.max(1, Math.round(v)))} />
            </Field>
          </div>

          <div className="space-y-2">
            {batteries.length > 0 &&
              opt('Batarya (depolama)', battery, setBattery, batteries, <NumberInput className="input w-28" value={battery.qty} onChange={(v) => setBattery({ ...battery, qty: Math.max(1, Math.round(v)) })} suffix="adet" />)}
            {infra.length > 0 &&
              opt(
                'Konstrüksiyon / montaj',
                mount,
                setMount,
                infra,
                <div className="flex items-center gap-2 text-sm">
                  <NumberInput className="input w-24" value={mountPerPanel} onChange={setMountPerPanel} />
                  <span className="text-muted whitespace-nowrap">/panel = {mountQty}</span>
                </div>
              )}
            {infra.length > 0 &&
              opt(
                'Solar kablo',
                cable,
                setCable,
                infra,
                <div className="flex items-center gap-2 text-sm">
                  <NumberInput className="input w-24" value={cablePerKw} onChange={setCablePerKw} />
                  <span className="text-muted whitespace-nowrap">m/kWp = {cableQty} m</span>
                </div>
              )}
            {services.length > 0 && opt('Kurulum / işçilik', labor, setLabor, services, <NumberInput className="input w-28" value={labor.qty} onChange={(v) => setLabor({ ...labor, qty: v })} />)}
          </div>

          <p className="text-xs text-muted flex gap-2">
            <Info className="w-4 h-4 shrink-0" />
            Üretim tahmini {settings.ges.specificYield} kWh/kWp/yıl özgül verim ile hesaplanır (Ayarlar → GES). Eklenen kalemleri teklif ekranında dilediğiniz gibi düzenleyebilirsiniz.
          </p>
        </div>
      )}
    </Modal>
  );
}
