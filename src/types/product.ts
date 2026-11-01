export type MainTab = 'home' | 'products' | 'proforma';
export type ProductSubTab = 'inverter' | 'pv' | 'batarya' | 'altyapi' | 'ekstralar';

// 1. INVERTER MODELİ
export interface InverterProduct {
  id: string;
  photo: string;
  brand: string;
  model: string;
  kw: string;
  maxDcPower: string;
  maxDcVoltage: string;
  mpptRange: string;
  mpptCount: string;
  priceUsd: number;
}

// 2. PV (GÜNEŞ PANELİ) MODELİ
export type PvType = 'Monokristal' | 'Polikristal' | 'Thin Film';

export interface PvProduct {
  id: string;
  photo: string;
  brand: string;
  model: string;
  pvType: PvType;
  nominalPower: string;
  vmp: string;
  imp: string;
  voc: string;
  efficiency: string;
  cellCount: string;
  lifespan: string;
  priceUsd: number;
}

// 3. BATARYA MODELİ
export type BatteryType =
  | 'Lityum Demir Fosfat (LiFePO₄ / LFP)'
  | 'Lityum İyon (NMC/NCA)'
  | 'Kurşun-Asit (AGM / Jel / Sulu)'
  | 'Akış Bataryası (Flow Battery)';

export interface BatteryProduct {
  id: string;
  photo: string;
  brand: string;
  model: string;
  batteryType: BatteryType;
  nominalVoltage: string;
  capacityAh: string;
  energyKwh: string;
  dischargeCurrent: string;
  chargeCurrent: string;
  dod: string;
  cycleLife: string;
  bms: string;
  priceUsd: number;
}

// 4. ALTYAPI & MONTAJ MODELİ
export type InfraCategory =
  | 'Konstrüksiyon & Montaj'
  | 'Solar Kablo (DC / AC)'
  | 'MC4 & Bağlantı'
  | 'GES Pano & Koruma'
  | 'Topraklama & Sabitleme'
  | 'Hazır Montaj Seti'
  | 'Konstrüksiyon & Montaj (Ray / Profil / Kelepçe)'
  | 'Solar Kablo (DC / AC Kablo)'
  | 'Konnektör & Bağlantı (MC4 / Branşman)'
  | 'GES Pano & Koruma (Sigorta / Parafudr / Şalter)'
  | 'Topraklama & Sabitleme Elemanları'
  | 'Hazır Paket Montaj Seti';

export type RoofMountType =
  | 'Genel (Tüm Sahalar)'
  | 'Trapez Sac / Sandviç Panel'
  | 'Kiremit Çatı'
  | 'Betonarme / Teras'
  | 'Arazi Tipi'
  | 'Pano İçi / Elektrik'
  | 'Tüm Çatı ve Sahalar (Genel)'
  | 'Trapez Sac / Sandviç Panel Çatı'
  | 'Betonarme / Teras (Üçgen Ayak)'
  | 'Arazi / Açık Saha'
  | 'Pano İçi / Elektrik Altyapısı';

export type InfraUnit =
  | 'Adet'
  | 'Metre'
  | 'Set'
  | 'Takım'
  | 'Boy'
  | 'Set / Paket'
  | 'Boy (4.4m / 6m)';

export interface InfrastructureProduct {
  id: string;
  photo: string;
  category: InfraCategory;
  name: string;
  brand: string;
  applicationType: RoofMountType;
  materialSpec: string;
  unit: InfraUnit;
  warrantyStandard: string;
  priceUsd: number;
}

// 5. EKSTRALAR & HİZMETLER MODELİ
export interface ExtraProduct {
  id: string;
  name: string;
  description: string;
  unit: string;
  priceUsd: number;
}

// ================= VARSAYILAN BAŞLANGIÇ VERİLERİ =================

export const INITIAL_INVERTERS: InverterProduct[] = [
  {
    id: 'inv-1',
    photo: '',
    brand: 'Deye',
    model: 'SUN-10K-SG04LP3 Hibrit',
    kw: '10 kW',
    maxDcPower: '13000 W',
    maxDcVoltage: '800 V',
    mpptRange: '200 - 650 V',
    mpptCount: '2 Adet',
    priceUsd: 2150,
  },
];

export const INITIAL_PVS: PvProduct[] = [
  {
    id: 'pv-1',
    photo: '',
    brand: 'CW Enerji',
    model: 'TOPCon 550W Half-Cut',
    pvType: 'Monokristal',
    nominalPower: '550 W',
    vmp: '41.9 V DC',
    imp: '13.1 A',
    voc: '49.8 V',
    efficiency: '%21.3',
    cellCount: '144 Hücre',
    lifespan: '25 - 30 Yıl',
    priceUsd: 118,
  },
];

export const INITIAL_BATTERIES: BatteryProduct[] = [
  {
    id: 'bat-1',
    photo: '',
    brand: 'Dyness',
    model: 'BX51100 5.12 kWh',
    batteryType: 'Lityum Demir Fosfat (LiFePO₄ / LFP)',
    nominalVoltage: '51.2 V',
    capacityAh: '100 Ah',
    energyKwh: '5.12 kWh',
    dischargeCurrent: '100 A',
    chargeCurrent: '50 A',
    dod: '%90',
    cycleLife: '6000 Çevrim',
    bms: 'Dahili Akıllı BMS',
    priceUsd: 1320,
  },
];

export const INITIAL_INFRASTRUCTURE: InfrastructureProduct[] = [
  {
    id: 'inf-1',
    photo: '',
    category: 'Konstrüksiyon & Montaj',
    name: 'Alüminyum Montaj Rayı ve Kelepçe Seti',
    brand: 'PMT Solar',
    applicationType: 'Kiremit Çatı',
    materialSpec: '6063-T6 Alüminyum + Paslanmaz Kanca',
    unit: 'Set',
    warrantyStandard: '12 Yıl Garanti',
    priceUsd: 320,
  },
  {
    id: 'inf-2',
    photo: '',
    category: 'Solar Kablo (DC / AC)',
    name: '6 mm² H1Z2Z2-K Solar DC Kablo',
    brand: 'Prysmian',
    applicationType: 'Genel (Tüm Sahalar)',
    materialSpec: '6 mm² Kalaylı Bakır 1500V DC',
    unit: 'Metre',
    warrantyStandard: '25 Yıl UV Dayanımlı',
    priceUsd: 1.4,
  },
  {
    id: 'inf-3',
    photo: '',
    category: 'GES Pano & Koruma',
    name: 'DC / AC GES Koruma ve Sigorta Panosu',
    brand: 'Schneider',
    applicationType: 'Pano İçi / Elektrik',
    materialSpec: '1000V Parafudr + DC Sigorta + Kaçak Akım',
    unit: 'Set',
    warrantyStandard: 'IP65 Koruma',
    priceUsd: 185,
  },
];

export const INITIAL_EXTRAS: ExtraProduct[] = [
  {
    id: 'ext-1',
    name: 'Anahtar Teslim Montaj, Kurulum ve Devreye Alma',
    description: 'Saha kurulumu, kablolama, pano bağlantıları ve sistem testleri',
    unit: 'Hizmet',
    priceUsd: 500,
  },
];