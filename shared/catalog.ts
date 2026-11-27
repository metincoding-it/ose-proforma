import type { Category, CategoryRole, Product, SpecField, AppSettings } from './types';

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

export const FIELD_PRESETS: Record<string, { label: string; role: CategoryRole; icon: string; fields: SpecField[] }> = {
  inverter: {
    label: 'Inverter',
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
    role: 'infra',
    icon: 'Network',
    fields: [
      { key: 'infraType', label: 'Malzeme Grubu', type: 'select', options: INFRA_TYPES, short: true },
      { key: 'applicationType', label: 'Uygulama Alanı', type: 'select', options: MOUNT_TYPES },
      { key: 'materialSpec', label: 'Malzeme / Kesit' },
      { key: 'warrantyStandard', label: 'Garanti / Standart' },
    ],
  },
  service: { label: 'Hizmet & Ekstra', role: 'service', icon: 'Wrench', fields: [] },
  camera: {
    label: 'Güvenlik Kamerası',
    role: '',
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
    role: '',
    icon: 'HardDrive',
    fields: [
      { key: 'channels', label: 'Kanal', unit: 'Kanal', type: 'number', short: true },
      { key: 'recType', label: 'Tip', type: 'select', options: ['NVR', 'DVR', 'XVR'], short: true },
      { key: 'poe', label: 'PoE Port', type: 'number' },
      { key: 'hdd', label: 'Disk Yuvası', type: 'number' },
    ],
  },
  generic: { label: 'Genel', role: '', icon: 'Box', fields: [] },
};

export const BUILTIN_CATEGORIES: Category[] = [
  { id: 'inverter', label: 'Inverter', icon: 'Cpu', role: 'inverter', fields: FIELD_PRESETS.inverter.fields, sort: 1 },
  { id: 'pv', label: 'PV Panel', icon: 'Sun', role: 'pv', fields: FIELD_PRESETS.pv.fields, sort: 2 },
  { id: 'batarya', label: 'Batarya', icon: 'BatteryCharging', role: 'battery', fields: FIELD_PRESETS.battery.fields, sort: 3 },
  { id: 'altyapi', label: 'Altyapı & Montaj', icon: 'Network', role: 'infra', fields: FIELD_PRESETS.infra.fields, sort: 4 },
  { id: 'ekstralar', label: 'Hizmet & Ekstra', icon: 'Wrench', role: 'service', fields: [], sort: 5 },
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
};

export function mergeSettings(partial: Partial<AppSettings> | null | undefined): AppSettings {
  const p = partial || {};
  return {
    company: { ...DEFAULT_SETTINGS.company, ...(p.company || {}) },
    quote: { ...DEFAULT_SETTINGS.quote, ...(p.quote || {}) },
    banks: Array.isArray(p.banks) ? p.banks : DEFAULT_SETTINGS.banks,
    notify: { ...DEFAULT_SETTINGS.notify, ...(p.notify || {}) },
    ges: { ...DEFAULT_SETTINGS.ges, ...(p.ges || {}) },
  };
}
