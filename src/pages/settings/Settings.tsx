import { useEffect, useRef, useState } from 'react';
import { Building2, FileText, Landmark, BookImage, Bell, Sun, DatabaseBackup, Plus, Trash2, Upload, Download, Save, Send, FileUp, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import type { AppSettings, BankAccount, Brochure, Currency } from '../../../shared/types';
import { CURRENCIES, VAT_RATES } from '../../../shared/types';
import { mergeSettings } from '../../../shared/catalog';
import { api, errMsg } from '../../lib/api';
import { useData, useUi } from '../../lib/store';
import { fileSize, fmtDateTime } from '../../lib/format';
import { PageHeader, Field, ImageField, NumberInput, Segmented, Toggle, Spinner, compressImage } from '../../components/ui';

type Tab = 'company' | 'quote' | 'banks' | 'brochures' | 'notify' | 'ges' | 'data';
const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: 'company', label: 'Firma Bilgileri', icon: Building2 },
  { id: 'quote', label: 'Teklif & PDF', icon: FileText },
  { id: 'banks', label: 'Banka Hesapları', icon: Landmark },
  { id: 'brochures', label: 'Broşür Sayfaları', icon: BookImage },
  { id: 'notify', label: 'Bildirimler', icon: Bell },
  { id: 'ges', label: 'GES Hesaplama', icon: Sun },
  { id: 'data', label: 'Yedekleme', icon: DatabaseBackup },
];

function Brochures() {
  const { brochures, setBrochures } = useData();
  const { toast, confirm } = useUi();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
        let blob: Blob = f;
        if (!isPdf) {
          if (!f.type.startsWith('image/')) throw new Error(`${f.name}: sadece PDF veya görsel yüklenebilir.`);
          blob = await compressImage(f, 2480, 0.9, 'image/jpeg');
        }
        if (blob.size > 20 * 1024 * 1024) throw new Error(`${f.name} 20 MB sınırını aşıyor.`);
        const { url, size } = await api.upload(isPdf ? new Blob([await f.arrayBuffer()], { type: 'application/pdf' }) : blob, f.name);
        const r = await api.post<{ brochures: Brochure[] }>('/brochures', { title: f.name.replace(/\.[^.]+$/, ''), kind: isPdf ? 'pdf' : 'image', fileKey: url, size, defaultOn: true });
        setBrochures(r.brochures);
      }
      toast('Broşür yüklendi.');
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  const updateB = async (b: Brochure, patch: Partial<Brochure>) => {
    try {
      const r = await api.put<{ brochures: Brochure[] }>(`/brochures/${b.id}`, { ...b, ...patch });
      setBrochures(r.brochures);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };
  const move = async (i: number, d: -1 | 1) => {
    const a = [...brochures];
    const j = i + d;
    [a[i], a[j]] = [a[j], a[i]];
    for (let k = 0; k < a.length; k++) if (a[k].sort !== k + 1) await api.put(`/brochures/${a[k].id}`, { ...a[k], sort: k + 1 });
    const r = await api.get<{ brochures: Brochure[] }>('/settings');
    setBrochures(r.brochures);
  };
  const del = async (b: Brochure) => {
    if (!(await confirm({ title: `"${b.title}" silinsin mi?`, danger: true, confirmText: 'Sil' }))) return;
    const r = await api.del<{ brochures: Brochure[] }>(`/brochures/${b.id}`);
    setBrochures(r.brochures);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Firma tanıtım broşürleri, referans sayfaları veya ürün katalogları teklif PDF'inin <b>2., 3. ... sayfaları</b> olarak eklenir. A4 boyutunda PDF veya görsel (JPG/PNG) yükleyin. “Varsayılan” işaretli olanlar her yeni teklifte otomatik seçilir; teklif ekranından teklif bazında açıp kapatabilirsiniz.
      </p>
      <input ref={ref} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      <button className="btn-primary" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Spinner className="w-4 h-4" /> : <FileUp className="w-4 h-4" />} Broşür yükle (PDF / görsel)
      </button>
      {brochures.length > 0 && (
        <div className="border border-line rounded-xl divide-y divide-line">
          {brochures.map((b, i) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
              <div className="flex flex-col">
                <button disabled={i === 0} onClick={() => move(i, -1)} className="text-muted disabled:opacity-30">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button disabled={i === brochures.length - 1} onClick={() => move(i, 1)} className="text-muted disabled:opacity-30">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="w-12 h-16 rounded-md border border-line bg-white overflow-hidden flex items-center justify-center shrink-0">
                {b.kind === 'image' ? <img src={b.fileKey} className="w-full h-full object-cover" alt="" /> : <span className="text-[10px] font-black text-rose-500">PDF</span>}
              </div>
              <input className="input-sm flex-1 min-w-[160px]" defaultValue={b.title} onBlur={(e) => e.target.value !== b.title && updateB(b, { title: e.target.value })} />
              <span className="text-xs text-muted">{fileSize(b.size)}</span>
              <Toggle checked={b.defaultOn} onChange={(v) => updateB(b, { defaultOn: v })} label="Varsayılan" />
              <a className="btn-icon" href={b.fileKey} target="_blank" rel="noreferrer" title="Görüntüle">
                <Eye className="w-4 h-4" />
              </a>
              <button className="btn-icon hover:text-rose-500" onClick={() => del(b)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DataTab() {
  const { toast, confirm } = useUi();
  const [busy, setBusy] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  const backup = async () => {
    setBusy('backup');
    try {
      const data = await api.get<unknown>('/admin/backup');
      const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `OSE_Proforma_Yedek_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`;
      a.click();
      toast('Yedek indirildi.');
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy('');
    }
  };

  const restore = async (f?: File) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text()) as { app?: string; exportedAt?: string; tables?: Record<string, Record<string, unknown>[]> };
      if (data.app !== 'ose-proforma' || !data.tables) throw new Error('Bu dosya OSE Proforma yedeği değil.');
      const ok = await confirm({
        title: 'Yedekten geri yüklensin mi?',
        message: `${fmtDateTime(data.exportedAt)} tarihli yedek yüklenecek. Mevcut TÜM veriler (ürünler, teklifler, müşteriler, kullanıcılar, ayarlar) bu yedekteki verilerle DEĞİŞTİRİLECEK.`,
        danger: true,
        confirmText: 'Evet, geri yükle',
      });
      if (!ok) return;
      setBusy('restore');
      for (const [table, rows] of Object.entries(data.tables)) {
        if (!rows.length) {
          await api.post('/admin/restore', { table, rows: [], truncate: true });
          continue;
        }
        for (let i = 0; i < rows.length; i += 30) await api.post('/admin/restore', { table, rows: rows.slice(i, i + 30), truncate: i === 0 });
      }
      toast('Yedek geri yüklendi. Sayfa yenileniyor...');
      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy('');
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-line bg-surface-2 space-y-3">
        <div className="font-extrabold flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" /> Tam yedek al
        </div>
        <p className="text-sm text-muted">Tüm ürünler, kategoriler, müşteriler, teklifler, paketler, ayarlar ve kullanıcılar tek bir JSON dosyasına aktarılır. Görsel ve broşür dosyaları depoda kalır, yedek bunlara bağlantı içerir. Ayda bir yedek almanızı öneririz.</p>
        <button className="btn-primary" onClick={backup} disabled={!!busy}>
          {busy === 'backup' ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />} Yedeği indir
        </button>
      </div>
      <div className="p-5 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3">
        <div className="font-extrabold flex items-center gap-2">
          <Upload className="w-5 h-5 text-rose-500" /> Yedekten geri yükle
        </div>
        <p className="text-sm text-muted">Dikkat: mevcut verilerin yerine yedekteki veriler yazılır. Ek güvenlik olarak Cloudflare D1, veritabanını son 7 gün içindeki herhangi bir ana geri alabilen “Time Travel” özelliğine sahiptir.</p>
        <input ref={ref} type="file" accept="application/json,.json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
        <button className="btn-danger" onClick={() => ref.current?.click()} disabled={!!busy}>
          {busy === 'restore' ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />} Yedek dosyası seç
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, setSettings, emailEnabled } = useData();
  const { toast } = useUi();
  const [tab, setTab] = useState<Tab>('company');
  const [s, setS] = useState<AppSettings>(settings);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!dirty) setS(settings);
  }, [settings, dirty]);

  const up = <K extends keyof AppSettings>(k: K, v: Partial<AppSettings[K]> | AppSettings[K]) => {
    setS((x) => ({ ...x, [k]: Array.isArray(v) ? v : { ...(x[k] as object), ...(v as object) } }));
    setDirty(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await api.put<{ settings: AppSettings }>('/settings', s);
      setSettings(mergeSettings(r.settings));
      setS(mergeSettings(r.settings));
      setDirty(false);
      toast('Ayarlar kaydedildi.');
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const testMail = async () => {
    try {
      if (dirty) await save();
      await api.post('/admin/test-mail');
      toast('Test e-postası gönderildi.');
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const c = s.company;
  const qs = s.quote;
  const setBank = (i: number, patch: Partial<BankAccount>) => up('banks', s.banks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const saveBar = !['brochures', 'data'].includes(tab);

  return (
    <div>
      <PageHeader
        title="Ayarlar"
        subtitle="Firma bilgileri, teklif varsayılanları ve sistem yönetimi"
        actions={
          saveBar && (
            <button className="btn-primary" onClick={save} disabled={busy || !dirty}>
              {busy ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Kaydet
            </button>
          )
        }
      />
      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-5 items-start">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar lg:card lg:p-2 lg:sticky lg:top-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 ${tab === t.id ? 'bg-primary/12 text-primary' : 'text-muted hover:text-fg hover:bg-surface-2'}`}
            >
              <t.icon className="w-[18px] h-[18px]" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="card p-5 sm:p-6">
          {tab === 'company' && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <ImageField label="Logo (PDF antetinde)" value={c.logo} onChange={(v) => up('company', { logo: v })} keepPng maxSize={600} allowUrl={false} />
                <ImageField label="Kaşe / imza (şeffaf PNG önerilir)" value={c.stamp} onChange={(v) => up('company', { stamp: v })} keepPng maxSize={800} allowUrl={false} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Kısa ad (antet başlığı)">
                  <input className="input" value={c.name} onChange={(e) => up('company', { name: e.target.value })} />
                </Field>
                <Field label="Ticari unvan">
                  <input className="input" value={c.title} onChange={(e) => up('company', { title: e.target.value })} placeholder="OSE Teknoloji Enerji San. Tic. Ltd. Şti." />
                </Field>
                <Field label="Slogan / faaliyet alanı" className="sm:col-span-2">
                  <input className="input" value={c.slogan} onChange={(e) => up('company', { slogan: e.target.value })} />
                </Field>
                <Field label="Telefon">
                  <input className="input" value={c.phone} onChange={(e) => up('company', { phone: e.target.value })} />
                </Field>
                <Field label="Telefon 2">
                  <input className="input" value={c.phone2} onChange={(e) => up('company', { phone2: e.target.value })} />
                </Field>
                <Field label="E-posta">
                  <input className="input" value={c.email} onChange={(e) => up('company', { email: e.target.value })} />
                </Field>
                <Field label="Web sitesi">
                  <input className="input" value={c.website} onChange={(e) => up('company', { website: e.target.value })} />
                </Field>
                <Field label="Adres" className="sm:col-span-2">
                  <input className="input" value={c.address} onChange={(e) => up('company', { address: e.target.value })} />
                </Field>
                <Field label="İl / İlçe">
                  <input className="input" value={c.city} onChange={(e) => up('company', { city: e.target.value })} />
                </Field>
                <Field label="Vergi dairesi">
                  <input className="input" value={c.taxOffice} onChange={(e) => up('company', { taxOffice: e.target.value })} />
                </Field>
                <Field label="Vergi no">
                  <input className="input" value={c.taxNo} onChange={(e) => up('company', { taxNo: e.target.value })} />
                </Field>
                <Field label="MERSİS no">
                  <input className="input" value={c.mersis} onChange={(e) => up('company', { mersis: e.target.value })} />
                </Field>
              </div>
            </div>
          )}

          {tab === 'quote' && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Teklif no öneki" hint={`Örn: ${qs.prefix || 'OSE'}-${new Date().getFullYear()}-0042`}>
                  <input className="input uppercase" value={qs.prefix} onChange={(e) => up('quote', { prefix: e.target.value.toUpperCase() })} maxLength={8} />
                </Field>
                <Field label="Geçerlilik süresi">
                  <NumberInput value={qs.validityDays} onChange={(v) => up('quote', { validityDays: Math.round(v) })} suffix="gün" />
                </Field>
                <Field label="Vurgu rengi (PDF)">
                  <div className="flex gap-2">
                    <input type="color" className="h-[46px] w-14 rounded-xl border border-line bg-surface-2 p-1" value={qs.accentColor} onChange={(e) => up('quote', { accentColor: e.target.value })} />
                    <input className="input" value={qs.accentColor} onChange={(e) => up('quote', { accentColor: e.target.value })} />
                  </div>
                </Field>
                <Field label="Varsayılan para birimi">
                  <Segmented<Currency> size="sm" value={qs.defaultCurrency} onChange={(v) => up('quote', { defaultCurrency: v })} options={CURRENCIES.map((x) => ({ value: x, label: x }))} />
                </Field>
                <Field label="Varsayılan KDV">
                  <select className="input" value={qs.defaultVatRate} onChange={(e) => up('quote', { defaultVatRate: Number(e.target.value) })}>
                    {VAT_RATES.map((r) => (
                      <option key={r} value={r}>
                        %{r}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="KDV gösterimi">
                  <Segmented
                    size="sm"
                    value={qs.defaultVatMode}
                    onChange={(v) => up('quote', { defaultVatMode: v })}
                    options={[
                      { value: 'excluded', label: 'Hariç' },
                      { value: 'included', label: 'Dahil' },
                    ]}
                  />
                </Field>
                <Field label="Satış personeli iskonto limiti" hint="Aşılırsa teklif yönetici onayına düşer. Boş = limitsiz">
                  <NumberInput value={qs.salesDiscountLimit} onChange={(v) => up('quote', { salesDiscountLimit: v })} suffix="%" />
                </Field>
                <Field label="Eski fiyat uyarısı" hint="Bu süredir güncellenmeyen fiyatlar işaretlenir">
                  <NumberInput value={qs.stalePriceDays} onChange={(v) => up('quote', { stalePriceDays: Math.round(v) })} suffix="gün" />
                </Field>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <Toggle checked={qs.showUnitPrices} onChange={(v) => up('quote', { showUnitPrices: v })} label="Birim fiyatları göster" hint="Yeni teklif varsayılanı" />
                <Toggle checked={qs.showPhotos} onChange={(v) => up('quote', { showPhotos: v })} label="Ürün görselleri" hint="Yeni teklif varsayılanı" />
                <Toggle checked={qs.showTryEquivalent} onChange={(v) => up('quote', { showTryEquivalent: v })} label="TL karşılığı" hint="Yeni teklif varsayılanı" />
              </div>
              <div>
                <label className="label">Varsayılan ödeme planı</label>
                <div className="space-y-2">
                  {qs.paymentPlan.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_100px_32px] gap-2">
                      <input className="input-sm" value={p.label} onChange={(e) => up('quote', { paymentPlan: qs.paymentPlan.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                      <NumberInput className="input-sm" value={p.pct} suffix="%" onChange={(v) => up('quote', { paymentPlan: qs.paymentPlan.map((x, j) => (j === i ? { ...x, pct: v } : x)) })} />
                      <button className="btn-icon w-8 h-8" onClick={() => up('quote', { paymentPlan: qs.paymentPlan.filter((_, j) => j !== i) })}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button className="btn-ghost btn-sm" onClick={() => up('quote', { paymentPlan: [...qs.paymentPlan, { label: '', pct: 0 }] })}>
                    <Plus className="w-4 h-4" /> Aşama ekle
                  </button>
                </div>
              </div>
              <Field label="Teslimat & kurulum metni">
                <textarea className="input min-h-[70px]" value={qs.delivery} onChange={(e) => up('quote', { delivery: e.target.value })} />
              </Field>
              <Field label="Garanti şartları">
                <textarea className="input min-h-[90px]" value={qs.warranty} onChange={(e) => up('quote', { warranty: e.target.value })} />
              </Field>
              <Field label="Notlar & genel şartlar">
                <textarea className="input min-h-[90px]" value={qs.notes} onChange={(e) => up('quote', { notes: e.target.value })} />
              </Field>
            </div>
          )}

          {tab === 'banks' && (
            <div className="space-y-4">
              <p className="text-sm text-muted">Hesaplar PDF'te ve müşteri teklif sayfasında listelenir.</p>
              {s.banks.map((b, i) => (
                <div key={i} className="p-4 rounded-xl border border-line bg-surface-2 grid sm:grid-cols-[1fr_1fr_120px_32px] gap-3 items-end">
                  <Field label="Banka">
                    <input className="input-sm" value={b.bank} onChange={(e) => setBank(i, { bank: e.target.value })} />
                  </Field>
                  <Field label="Şube">
                    <input className="input-sm" value={b.branch} onChange={(e) => setBank(i, { branch: e.target.value })} />
                  </Field>
                  <Field label="Döviz">
                    <select className="input-sm" value={b.currency} onChange={(e) => setBank(i, { currency: e.target.value as Currency })}>
                      {CURRENCIES.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>
                  <button className="btn-icon w-8 h-8 mb-0.5" onClick={() => up('banks', s.banks.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <Field label="Hesap sahibi" className="sm:col-span-1">
                    <input className="input-sm" value={b.holder} onChange={(e) => setBank(i, { holder: e.target.value })} placeholder={c.title} />
                  </Field>
                  <Field label="IBAN" className="sm:col-span-3">
                    <input
                      className="input-sm font-mono"
                      value={b.iban}
                      onChange={(e) =>
                        setBank(i, {
                          iban: e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, '')
                            .replace(/(.{4})/g, '$1 ')
                            .trim(),
                        })
                      }
                      placeholder="TR00 0000 0000 0000 0000 0000 00"
                    />
                  </Field>
                </div>
              ))}
              <button className="btn-secondary" onClick={() => up('banks', [...s.banks, { bank: '', branch: '', holder: '', iban: '', currency: 'TRY' }])}>
                <Plus className="w-4 h-4" /> Hesap ekle
              </button>
            </div>
          )}

          {tab === 'brochures' && <Brochures />}

          {tab === 'notify' && (
            <div className="space-y-5">
              {!emailEnabled && (
                <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 text-sm space-y-1.5">
                  <div className="font-bold">E-posta servisi henüz bağlı değil</div>
                  <ol className="list-decimal pl-5 text-muted space-y-1">
                    <li>
                      <a className="text-primary font-semibold" href="https://resend.com" target="_blank" rel="noreferrer">
                        resend.com
                      </a>{' '}
                      üzerinde ücretsiz hesap açın (ayda 3.000 e-posta) ve bir API anahtarı oluşturun.
                    </li>
                    <li>
                      Cloudflare Pages → projeniz → <b>Settings → Variables and Secrets</b> bölümüne <code className="text-primary">RESEND_API_KEY</code> adıyla ekleyin (tür: Secret).
                    </li>
                    <li>Projeyi yeniden dağıtın.</li>
                  </ol>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Bildirimlerin gideceği e-posta" hint="Birden fazla adres için virgül kullanın">
                  <input className="input" value={s.notify.email} onChange={(e) => up('notify', { email: e.target.value })} placeholder="metin@oseteknoloji.com" />
                </Field>
                <Field label="Gönderen adresi" hint="Kendi alan adınızı Resend'de doğrulayana kadar onboarding@resend.dev kalabilir">
                  <input className="input" value={s.notify.fromEmail} onChange={(e) => up('notify', { fromEmail: e.target.value })} />
                </Field>
              </div>
              <div className="space-y-3">
                <Toggle checked={s.notify.onApprove} onChange={(v) => up('notify', { onApprove: v })} label="Müşteri teklifi onayladığında" />
                <Toggle checked={s.notify.onRevision} onChange={(v) => up('notify', { onRevision: v })} label="Müşteri revize istediğinde" />
                <Toggle checked={s.notify.onView} onChange={(v) => up('notify', { onView: v })} label="Müşteri teklifi ilk kez açtığında" />
              </div>
              <button className="btn-secondary" onClick={testMail} disabled={!emailEnabled || !s.notify.email}>
                <Send className="w-4 h-4" /> Test e-postası gönder
              </button>
            </div>
          )}

          {tab === 'ges' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Özgül verim" hint="Türkiye ortalaması ~1.350–1.600 kWh/kWp/yıl (bölgenize göre ayarlayın)">
                <NumberInput value={s.ges.specificYield} onChange={(v) => up('ges', { specificYield: v })} suffix="kWh/kWp" />
              </Field>
              <Field label="Maksimum DC/AC oranı" hint="Inverter önerisinde kullanılır (genelde 1,2–1,3)">
                <NumberInput value={s.ges.dcAcMax} onChange={(v) => up('ges', { dcAcMax: v })} />
              </Field>
            </div>
          )}

          {tab === 'data' && <DataTab />}
        </div>
      </div>
    </div>
  );
}
