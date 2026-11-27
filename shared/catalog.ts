import type { Category, CategoryGroup, CategoryRole, Product, SpecField, AppSettings, PdfTemplate, PdfTemplateKey, MainGroup } from './types';
import { PDF_TEMPLATE_KEYS } from './types';

export const UNIT_OPTIONS = ['Adet', 'Metre', 'Set', 'Takım', 'Boy', 'Paket', 'kWp', 'm²', 'Saat', 'Gün', 'Hizmet', 'Kalem'];

export const INFRA_TYPES = [
  'Konstrüksiyon & Montaj',
  'Solar Kablo (DC / AC)',
  'MC4 & Bağlantı',
  'GES Pano & Koruma',
  'Topraklama & Sabitleme',
  'Hazır Montaj Seti',
];

export const MOUNT_TYPES = [
  'Genel (Tüm Sahalar)',
  'Trapez Sac / Sandviç Panel',
  'Kiremit Çatı',
  'Betonarme / Teras',
  'Arazi Tipi',
  'Pano İçi / Elektrik',
];

/** Ana kategorilere göre gruplanmış roller (kategori formundaki "Rol" listesi) */
export const ROLE_OPTIONS: Record<MainGroup, { v: CategoryRole; label: string; hint?: string }[]> = {
  solar: [
    { v: 'pv', label: 'PV Panel', hint: 'GES asistanı' },
    { v: 'inverter', label: 'Inverter', hint: 'GES asistanı' },
    { v: 'battery', label: 'Batarya', hint: 'GES asistanı' },
    { v: 'infra', label: 'Altyapı / Montaj', hint: 'GES asistanı' },
    { v: 'service', label: 'Hizmet / İşçilik', hint: 'GES asistanı' },
  ],
  zayif: [
    { v: 'camera', label: 'Güvenlik Kamerası' },
    { v: 'recorder', label: 'Kayıt Cihazı (NVR/DVR)' },
    { v: 'network', label: 'Ağ / Switch / Wi-Fi' },
    { v: 'alarm', label: 'Alarm & Yangın' },
    { v: 'intercom', label: 'Diafon / İnterkom / Geçiş' },
    { v: 'ws-accessory', label: 'Kablo & Aksesuar' },
    { v: 'ws-service', label: 'Hizmet / İşçilik' },
  ],
  elektronik: [
    { v: 'appliance', label: 'Beyaz Eşya' },
    { v: 'tv', label: 'TV & Görüntü / Ses' },
    { v: 'climate', label: 'Klima & Isıtma' },
    { v: 'smarthome', label: 'Akıllı Ev' },
    { v: 'small-appliance', label: 'Küçük Ev Aletleri' },
    { v: 'el-accessory', label: 'Aksesuar' },
    { v: 'el-service', label: 'Hizmet / Kurulum' },
  ],
};

/** Rolden ana kategoriyi bulur ('' rolü için '') */
export function groupOfRole(role: CategoryRole | string): CategoryGroup {
  for (const [g, list] of Object.entries(ROLE_OPTIONS)) if (list.some((r) => r.v === role)) return g as MainGroup;
  return '';
}

export function roleLabel(role: CategoryRole | string): string {
  for (const list of Object.values(ROLE_OPTIONS)) {
    const r = list.find((x) => x.v === role);
    if (r) return r.label;
  }
  return 'Genel';
}

export const FIELD_PRESETS: Record<string, { label: string; group: CategoryGroup; role: CategoryRole; icon: string; fields: SpecField[] }> = {
  inverter: {
    label: 'Inverter',
    group: 'solar',
    role: 'inverter',
    icon: 'Cpu',
    fields: [
      { key: 'kw', label: 'Güç', unit: 'kW', type: 'number', short: true },
      { key: 'type', label: 'Tip', type: 'select', options: ['On-Grid', 'Hibrit', 'Off-Grid', 'Mikro Inverter'], short: true },
      { key: 'phase', label: 'Faz', type: 'select', options: ['Monofaze', 'Trifaze'], short: true },
      { key: 'maxDcPower', label: 'Maks. DC Güç', unit: 'kWp', type: 'number' },
      { key: 'maxDcVoltage', label: 'Maks. DC Gerilim', unit: 'V', type: 'number' },
      { key: 'mpptCount', label: 'MPPT Sayısı', type: 'number' },
      { key: 'mpptRange', label: 'MPPT Aralığı', unit: 'V' },
      { key: 'warranty', label: 'Garanti', unit: 'Yıl', type: 'number' },
    ],
  },
  pv: {
    label: 'PV Panel',
    group: 'solar',
    role: 'pv',
    icon: 'Sun',
    fields: [
      { key: 'power', label: 'Güç', unit: 'W', type: 'number', short: true },
      { key: 'pvType', label: 'Hücre Tipi', type: 'select', options: ['Monokristal', 'N-Type TOPCon', 'HJT', 'Bifacial', 'Polikristal', 'Thin Film'], short: true },
      { key: 'efficiency', label: 'Verim', unit: '%', type: 'number' },
      { key: 'cellCount', label: 'Hücre Sayısı', type: 'number' },
      { key: 'vmp', label: 'Vmp', unit: 'V', type: 'number' },
      { key: 'imp', label: 'Imp', unit: 'A', type: 'number' },
      { key: 'voc', label: 'Voc', unit: 'V', type: 'number' },
      { key: 'lifespan', label: 'Performans Garantisi', unit: 'Yıl', type: 'number' },
    ],
  },
  battery: {
    label: 'Batarya',
    group: 'solar',
    role: 'battery',
    icon: 'BatteryCharging',
    fields: [
      { key: 'energyKwh', label: 'Enerji', unit: 'kWh', type: 'number', short: true },
      {
        key: 'batteryType',
        label: 'Kimya',
        type: 'select',
        options: ['LiFePO₄ (LFP)', 'Lityum İyon (NMC)', 'Kurşun-Asit (AGM/Jel)', 'Akış Bataryası'],
        short: true,
      },
      { key: 'nominalVoltage', label: 'Nominal Gerilim', unit: 'V', type: 'number' },
      { key: 'capacityAh', label: 'Kapasite', unit: 'Ah', type: 'number' },
      { key: 'dischargeCurrent', label: 'Deşarj Akımı', unit: 'A', type: 'number' },
      { key: 'chargeCurrent', label: 'Şarj Akımı', unit: 'A', type: 'number' },
      { key: 'dod', label: 'DoD', unit: '%', type: 'number' },
      { key: 'cycleLife', label: 'Çevrim Ömrü', unit: 'Çevrim', type: 'number' },
      { key: 'bms', label: 'BMS' },
    ],
  },
  infra: {
    label: 'Altyapı & Montaj',
    group: 'solar',
    role: 'infra',
    icon: 'Network',
    fields: [
      { key: 'infraType', label: 'Malzeme Grubu', type: 'select', options: INFRA_TYPES, short: true },
      { key: 'applicationType', label: 'Uygulama Alanı', type: 'select', options: MOUNT_TYPES },
      { key: 'materialSpec', label: 'Malzeme / Kesit' },
      { key: 'warrantyStandard', label: 'Garanti / Standart' },
    ],
  },
  service: { label: 'Hizmet & Ekstra', group: 'solar', role: 'service', icon: 'Wrench', fields: [] },
  camera: {
    label: 'Güvenlik Kamerası',
    group: 'zayif',
    role: 'camera',
    icon: 'Camera',
    fields: [
      { key: 'resolution', label: 'Çözünürlük', unit: 'MP', type: 'number', short: true },
      { key: 'camType', label: 'Tip', type: 'select', options: ['Dome', 'Bullet', 'PTZ', 'Fisheye', 'Wi-Fi'], short: true },
      { key: 'lens', label: 'Lens', unit: 'mm' },
      { key: 'ir', label: 'Gece Görüş', unit: 'm', type: 'number' },
      { key: 'protection', label: 'Koruma', type: 'select', options: ['IP66', 'IP67', 'IK10', 'İç Mekan'] },
      { key: 'tech', label: 'Teknoloji', type: 'select', options: ['IP', 'AHD/HD-TVI', 'Wi-Fi'] },
    ],
  },
  recorder: {
    label: 'Kayıt Cihazı (NVR/DVR)',
    group: 'zayif',
    role: 'recorder',
    icon: 'HardDrive',
    fields: [
      { key: 'channels', label: 'Kanal', unit: 'Kanal', type: 'number', short: true },
      { key: 'recType', label: 'Tip', type: 'select', options: ['NVR', 'DVR', 'XVR'], short: true },
      { key: 'poe', label: 'PoE Port', type: 'number' },
      { key: 'hdd', label: 'Disk Yuvası', type: 'number' },
    ],
  },
  network: {
    label: 'Ağ / Switch',
    group: 'zayif',
    role: 'network',
    icon: 'Router',
    fields: [
      { key: 'ports', label: 'Port', type: 'number', short: true },
      { key: 'poe', label: 'PoE', type: 'select', options: ['PoE', 'PoE+', 'Yok'], short: true },
      { key: 'speed', label: 'Hız', type: 'select', options: ['10/100', 'Gigabit', '10G'] },
      { key: 'managed', label: 'Yönetim', type: 'select', options: ['Yönetilemez', 'Akıllı', 'Yönetilebilir'] },
    ],
  },
  alarm: {
    label: 'Alarm & Yangın',
    group: 'zayif',
    role: 'alarm',
    icon: 'Siren',
    fields: [
      { key: 'alarmType', label: 'Tip', type: 'select', options: ['Panel', 'PIR Dedektör', 'Manyetik Kontak', 'Siren', 'Duman Dedektörü', 'Tuş Takımı'], short: true },
      { key: 'connection', label: 'Bağlantı', type: 'select', options: ['Kablolu', 'Kablosuz', 'Hibrit'], short: true },
      { key: 'zones', label: 'Zon', type: 'number' },
    ],
  },
  appliance: {
    label: 'Beyaz Eşya',
    group: 'elektronik',
    role: 'appliance',
    icon: 'Refrigerator',
    fields: [
      { key: 'applianceType', label: 'Tip', type: 'select', options: ['Buzdolabı', 'Çamaşır Makinesi', 'Bulaşık Makinesi', 'Kurutma Makinesi', 'Fırın', 'Ocak', 'Derin Dondurucu'], short: true },
      { key: 'energyClass', label: 'Enerji Sınıfı', type: 'select', options: ['A', 'B', 'C', 'D', 'E', 'F'], short: true },
      { key: 'capacity', label: 'Kapasite' },
      { key: 'color', label: 'Renk' },
      { key: 'warranty', label: 'Garanti', unit: 'Yıl', type: 'number' },
    ],
  },
  tv: {
    label: 'TV & Görüntü',
    group: 'elektronik',
    role: 'tv',
    icon: 'Tv',
    fields: [
      { key: 'screen', label: 'Ekran', unit: '"', type: 'number', short: true },
      { key: 'panel', label: 'Panel', type: 'select', options: ['LED', 'QLED', 'OLED', 'Mini LED'], short: true },
      { key: 'resolution', label: 'Çözünürlük', type: 'select', options: ['HD', 'Full HD', '4K UHD', '8K'] },
      { key: 'smart', label: 'Akıllı TV', type: 'select', options: ['Evet', 'Hayır'] },
    ],
  },
  climate: {
    label: 'Klima',
    group: 'elektronik',
    role: 'climate',
    icon: 'AirVent',
    fields: [
      { key: 'btu', label: 'Kapasite', unit: 'BTU', type: 'number', short: true },
      { key: 'climateType', label: 'Tip', type: 'select', options: ['Duvar Tipi', 'Salon Tipi', 'Kaset', 'Kanal', 'Multi'], short: true },
      { key: 'inverterTech', label: 'Inverter', type: 'select', options: ['Evet', 'Hayır'] },
      { key: 'energyClass', label: 'Enerji Sınıfı', type: 'select', options: ['A+++', 'A++', 'A+', 'A'] },
    ],
  },
  generic: { label: 'Genel', group: '', role: '', icon: 'Box', fields: [] },
};

export const BUILTIN_CATEGORIES: Category[] = [
  { id: 'inverter', label: 'Inverter', icon: 'Cpu', group: 'solar', role: 'inverter', fields: FIELD_PRESETS.inverter.fields, sort: 1 },
  { id: 'pv', label: 'PV Panel', icon: 'Sun', group: 'solar', role: 'pv', fields: FIELD_PRESETS.pv.fields, sort: 2 },
  { id: 'batarya', label: 'Batarya', icon: 'BatteryCharging', group: 'solar', role: 'battery', fields: FIELD_PRESETS.battery.fields, sort: 3 },
  { id: 'altyapi', label: 'Altyapı & Montaj', icon: 'Network', group: 'solar', role: 'infra', fields: FIELD_PRESETS.infra.fields, sort: 4 },
  { id: 'ekstralar', label: 'Hizmet & Ekstra', icon: 'Wrench', group: 'solar', role: 'service', fields: [], sort: 5 },
];

const isValue = (v?: string) => !!v && v.trim() !== '' && v.trim() !== '-';

export function productTitle(p: Pick<Product, 'brand' | 'name'>): string {
  return [p.brand, p.name].filter(isValue).map((s) => s.trim()).join(' ') || 'Ürün';
}

export function productSummary(p: Pick<Product, 'specs' | 'description'>, cat?: Pick<Category, 'fields'>): string {
  const parts: string[] = [];
  for (const f of cat?.fields || []) {
    const v = p.specs?.[f.key];
    if (!isValue(v)) continue;
    const val = f.unit && !String(v).endsWith(f.unit) ? `${v} ${f.unit}` : String(v);
    parts.push(f.short ? val : `${f.label}: ${val}`);
  }
  const specText = parts.join(' • ');
  if (specText && isValue(p.description)) return `${specText} • ${p.description.trim()}`;
  return specText || (isValue(p.description) ? p.description.trim() : '');
}

export function numSpec(p: Pick<Product, 'specs'>, key: string): number {
  const v = p.specs?.[key];
  if (!v) return 0;
  const n = parseFloat(String(v).replace(',', '.').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    name: 'OSE TEKNOLOJİ',
    title: 'OSE Teknoloji',
    slogan: 'Güneş Enerjisi & Güvenlik Sistemleri',
    phone: '0544 462 11 22',
    phone2: '',
    email: '',
    website: '',
    address: '',
    city: '',
    taxOffice: '',
    taxNo: '',
    mersis: '',
    logo: '/logo.png',
    stamp: '',
  },
  quote: {
    prefix: 'OSE',
    validityDays: 15,
    defaultCurrency: 'USD',
    defaultVatRate: 20,
    defaultVatMode: 'excluded',
    paymentPlan: [
      { label: 'Sipariş onayında peşin', pct: 50 },
      { label: 'Malzeme teslimatında', pct: 40 },
      { label: 'Kurulum ve devreye alma sonrası', pct: 10 },
    ],
    delivery: 'Sipariş onayından itibaren 7-15 iş günü içinde kurulum.',
    warranty:
      'Paneller 12 yıl ürün / 25-30 yıl performans, inverter 5-10 yıl, bataryalar 5-10 yıl üretici garantisi. İşçilik 2 yıl Ose Teknoloji garantisindedir.',
    notes: 'Döviz bazlı fiyatlar ödeme günündeki TCMB döviz satış kuru üzerinden TL\'ye çevrilir.',
    showUnitPrices: true,
    showPhotos: true,
    showTryEquivalent: true,
    salesDiscountLimit: 10,
    stalePriceDays: 60,
    accentColor: '#00b8e6',
  },
  banks: [],
  notify: { email: '', fromEmail: 'OSE Proforma <onboarding@resend.dev>', onApprove: true, onRevision: true, onView: false },
  ges: { specificYield: 1450, dcAcMax: 1.3 },
  pdf: {} as AppSettings['pdf'],
};

const tpl = (p: Partial<PdfTemplate>): PdfTemplate => ({
  title: 'FİYAT TEKLİFİ',
  subtitle: 'PROFORMA',
  slogan: '',
  intro: '',
  accentColor: '',
  paymentPlan: [],
  delivery: '',
  warranty: '',
  notes: '',
  ...p,
});

const TL_NOTE = "Döviz bazlı fiyatlar ödeme günündeki TCMB döviz satış kuru üzerinden TL'ye çevrilir.";

export const DEFAULT_PDF: Record<PdfTemplateKey, PdfTemplate> = {
  genel: tpl({
    paymentPlan: [
      { label: 'Sipariş onayında peşin', pct: 50 },
      { label: 'Teslimatta', pct: 50 },
    ],
    delivery: 'Sipariş onayından itibaren 7-15 iş günü içinde teslimat.',
    warranty: 'Ürünler üretici garantisi kapsamındadır. İşçilik 2 yıl Ose Teknoloji garantisindedir.',
    notes: TL_NOTE,
  }),
  solar: tpl({
    slogan: 'Güneş Enerjisi Sistemleri (GES)',
    intro: 'Talebiniz doğrultusunda hazırladığımız güneş enerjisi sistemi teklifimizi bilgilerinize sunarız.',
    paymentPlan: [
      { label: 'Sipariş onayında peşin', pct: 50 },
      { label: 'Malzeme teslimatında', pct: 40 },
      { label: 'Kurulum ve devreye alma sonrası', pct: 10 },
    ],
    delivery: 'Sipariş onayından itibaren 7-15 iş günü içinde kurulum.',
    warranty:
      'Paneller 12 yıl ürün / 25-30 yıl performans, inverter 5-10 yıl, bataryalar 5-10 yıl üretici garantisi. İşçilik 2 yıl Ose Teknoloji garantisindedir.',
    notes: TL_NOTE,
  }),
  zayif: tpl({
    slogan: 'Güvenlik Kamerası, Alarm & Zayıf Akım Sistemleri',
    intro: 'Talebiniz doğrultusunda hazırladığımız güvenlik / zayıf akım sistemi teklifimizi bilgilerinize sunarız.',
    paymentPlan: [
      { label: 'Sipariş onayında peşin', pct: 50 },
      { label: 'Kurulum tamamlandığında', pct: 50 },
    ],
    delivery: 'Sipariş onayından itibaren 3-7 iş günü içinde kurulum ve devreye alma.',
    warranty:
      'Kamera, kayıt cihazı ve aktif ürünler 2 yıl üretici garantisindedir. Hard diskler üretici garantisine tabidir. İşçilik 1 yıl Ose Teknoloji garantisindedir.',
    notes: `Kablo güzergâhı keşif sonrası netleşir; keşifte belirlenen metrajı aşan kablo ve kanal ayrıca faturalandırılır. ${TL_NOTE}`,
  }),
  elektronik: tpl({
    slogan: 'Ev Elektroniği & Beyaz Eşya',
    paymentPlan: [{ label: 'Sipariş onayında peşin', pct: 100 }],
    delivery: 'Stok durumuna göre 1-5 iş günü içinde teslimat.',
    warranty: 'Ürünler 2 yıl üretici / distribütör garantisi kapsamındadır. Garanti işlemleri yetkili servis üzerinden yürütülür.',
    notes: TL_NOTE,
  }),
};

DEFAULT_SETTINGS.pdf = DEFAULT_PDF;

/** Kalemlerin çoğunluğunun ait olduğu ana kategori (teklif türü tahmini) */
export function dominantGroup(groups: CategoryGroup[]): CategoryGroup {
  const m = new Map<CategoryGroup, number>();
  for (const g of groups) if (g) m.set(g, (m.get(g) || 0) + 1);
  let best: CategoryGroup = '';
  let n = 0;
  for (const [g, c] of m) if (c > n) [best, n] = [g, c];
  return best;
}

export function mergeSettings(partial: Partial<AppSettings> | null | undefined): AppSettings {
  const p = partial || {};
  const quote = { ...DEFAULT_SETTINGS.quote, ...(p.quote || {}) };
  const storedPdf = (p.pdf || {}) as Partial<Record<PdfTemplateKey, Partial<PdfTemplate>>>;
  // v2.0'dan gelen kurulumlar: teklif ayarlarındaki eski metinler Genel ve Solar şablonlarına taşınır
  const legacy: Partial<PdfTemplate> | null = p.quote
    ? { paymentPlan: quote.paymentPlan, delivery: quote.delivery, warranty: quote.warranty, notes: quote.notes }
    : null;
  const pdf = {} as Record<PdfTemplateKey, PdfTemplate>;
  for (const k of PDF_TEMPLATE_KEYS) {
    const base = { ...DEFAULT_PDF[k], ...(!p.pdf && legacy && (k === 'genel' || k === 'solar') ? legacy : {}) };
    const merged = { ...base, ...(storedPdf[k] || {}) };
    merged.paymentPlan = Array.isArray(merged.paymentPlan) ? merged.paymentPlan.map((x) => ({ ...x })) : [];
    pdf[k] = merged;
  }
  return {
    company: { ...DEFAULT_SETTINGS.company, ...(p.company || {}) },
    quote,
    banks: Array.isArray(p.banks) ? p.banks : DEFAULT_SETTINGS.banks,
    notify: { ...DEFAULT_SETTINGS.notify, ...(p.notify || {}) },
    ges: { ...DEFAULT_SETTINGS.ges, ...(p.ges || {}) },
    pdf,
  };
}
