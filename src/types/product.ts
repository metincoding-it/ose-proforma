export type MainTab = 'home' | 'products' | 'proforma';

export type BuiltInProductSubTab =
  | 'inverter'
  | 'pv'
  | 'batarya'
  | 'altyapi'
  | 'ekstralar';

// Hem yerleşik 5 kategori hem dinamik eklenecek kategoriler için
export type ProductSubTab = BuiltInProductSubTab | (string & {});

export type CategoryIconName =
  | 'Box'
  | 'Camera'
  | 'Wind'
  | 'Snowflake'
  | 'Zap'
  | 'Shield'
  | 'Wrench'
  | 'Plug'
  | 'Lightbulb'
  | 'Thermometer'
  | 'Layers'
  | 'Tag';

// Dinamik Kategori Modeli
export interface CustomCategory {
  id: string;
  label: string;
  iconName: CategoryIconName;
}

// Dinamik Kategori Ürün Modeli
export interface CustomProduct {
  id: string;
  categoryId: string;
  photo: string;
  brand: string;
  name: string;
  specs: string;
  unit: string;
  priceUsd: number;
}

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

// ================= BAŞLANGIÇ VERİLERİ (BOŞ) =================

export const INITIAL_INVERTERS: InverterProduct[] = [];
export const INITIAL_PVS: PvProduct[] = [];
export const INITIAL_BATTERIES: BatteryProduct[] = [];
export const INITIAL_INFRASTRUCTURE: InfrastructureProduct[] = [];
export const INITIAL_EXTRAS: ExtraProduct[] = [];
export const INITIAL_CUSTOM_CATEGORIES: CustomCategory[] = [];
export const INITIAL_CUSTOM_PRODUCTS: CustomProduct[] = [];
