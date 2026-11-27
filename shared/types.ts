// Sunucu (Cloudflare Functions) ve istemci (React) tarafından ortak kullanılan tipler

export type Role = 'admin' | 'sales';
export type Currency = 'TRY' | 'USD' | 'EUR';
export const CURRENCIES: Currency[] = ['TRY', 'USD', 'EUR'];
export const CURRENCY_SYMBOL: Record<Currency, string> = { TRY: '₺', USD: '$', EUR: '€' };

/** 1 birim dövizin TL karşılığı. TRY her zaman 1'dir. */
export type Rates = Record<Currency, number>;

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'revision' | 'cancelled';
export const QUOTE_STATUSES: QuoteStatus[] = ['draft', 'sent', 'approved', 'revision', 'cancelled'];
export const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Taslak',
  sent: 'Gönderildi',
  approved: 'Onaylandı',
  revision: 'Revize İstendi',
  cancelled: 'İptal',
};

export type VatMode = 'excluded' | 'included';
export type DiscountType = 'pct' | 'amt';
export const VAT_RATES = [0, 1, 10, 20];

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  discountLimit: number | null;
  mustChangePassword?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
}

// ---------------- KATALOG ----------------

export type SpecFieldType = 'text' | 'number' | 'select';
export interface SpecField {
  key: string;
  label: string;
  unit?: string;
  type?: SpecFieldType;
  options?: string[];
  /** Teknik özet satırında etiketsiz, kısa biçimde gösterilir (ör. "20 kW") */
  short?: boolean;
}

export type CategoryRole = '' | 'inverter' | 'pv' | 'battery' | 'infra' | 'service';

export interface Category {
  id: string;
  label: string;
  icon: string;
  role: CategoryRole;
  fields: SpecField[];
  sort: number;
}

export type PricingMode = 'fixed' | 'margin';

export interface Product {
  id: string;
  categoryId: string;
  sku: string;
  brand: string;
  name: string;
  description: string;
  specs: Record<string, string>;
  unit: string;
  photo: string;
  /** Sadece admin rolüne gönderilir */
  costPrice?: number | null;
  costCurrency?: Currency;
  pricingMode?: PricingMode;
  marginPct?: number | null;
  salePrice: number;
  saleCurrency: Currency;
  vatRate: number;
  active: boolean;
  priceUpdatedAt: string | null;
  updatedAt: string | null;
  version: number;
}

export interface KitItem {
  productId: string;
  qty: number;
}
export interface Kit {
  id: string;
  name: string;
  description: string;
  icon: string;
  items: KitItem[];
  updatedAt?: string;
}

// ---------------- CRM ----------------

export interface Customer {
  id: string;
  kind: 'company' | 'person';
  name: string; // Yetkili / Ad Soyad
  company: string; // Firma unvanı
  phone: string;
  email: string;
  address: string;
  city: string;
  taxOffice: string;
  taxNo: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  quoteCount?: number;
  approvedTotalTry?: number;
  lastQuoteAt?: string | null;
}

export type CustomerSnapshot = Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'notes' | 'quoteCount' | 'approvedTotalTry' | 'lastQuoteAt'>;

// ---------------- TEKLİF ----------------

export type LineType = 'product' | 'custom' | 'section';

export interface QuoteLine {
  id: string;
  type: LineType;
  productId?: string | null;
  sku?: string;
  title: string;
  summary?: string;
  category?: string;
  unit: string;
  photo?: string;
  qty: number;
  unitPrice: number;
  currency: Currency;
  /** Ürünün teklife eklendiği andaki liste (satış) fiyatı – iskonto limiti kontrolü için */
  listPrice?: number | null;
  discountType: DiscountType;
  discountValue: number;
  vatRate: number;
  /** Sadece admin rolüne gönderilir */
  unitCost?: number | null;
  costCurrency?: Currency;
}

export interface PaymentPlanRow {
  label: string;
  pct: number;
  note?: string;
}

export interface QuoteTerms {
  paymentPlan: PaymentPlanRow[];
  delivery: string;
  warranty: string;
  notes: string;
}

export interface QuoteOptions {
  showUnitPrices: boolean;
  showPhotos: boolean;
  showTryEquivalent: boolean;
  brochureIds: string[];
}

export interface GesInfo {
  kwp: number;
  panelCount: number;
  panelW: number;
  inverterKw: number;
  yearlyKwh: number;
}

export interface VatBreakdownRow {
  rate: number;
  base: number;
  vat: number;
}

export interface QuoteTotals {
  gross: number;
  lineDiscount: number;
  generalDiscount: number;
  discountTotal: number;
  net: number;
  vatBreakdown: VatBreakdownRow[];
  vat: number;
  grand: number;
  listGross: number;
  effectiveDiscountPct: number;
  grandTry: number;
  netTry: number;
  // admin
  cost?: number;
  profit?: number;
  marginPct?: number;
  costMissing?: number;
  profitTry?: number;
}

export interface Quote {
  id: string;
  number: string;
  baseNumber: string;
  revision: number;
  status: QuoteStatus;
  customerId: string | null;
  customer: CustomerSnapshot;
  title: string;
  currency: Currency;
  rates: Rates;
  ratesSource: string;
  ratesDate: string;
  vatMode: VatMode;
  generalDiscountType: DiscountType;
  generalDiscountValue: number;
  lines: QuoteLine[];
  terms: QuoteTerms;
  options: QuoteOptions;
  ges: GesInfo | null;
  validUntil: string | null;
  publicToken: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  approvedAt: string | null;
  approvedName: string | null;
  customerNote: string | null;
  approvalRequired: boolean;
  discountApprovedBy: string | null;
  totals: QuoteTotals;
  sentAt: string | null;
  supersededBy: string | null;
  createdBy: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type QuoteSummary = Pick<
  Quote,
  | 'id'
  | 'number'
  | 'baseNumber'
  | 'revision'
  | 'status'
  | 'customerId'
  | 'title'
  | 'currency'
  | 'validUntil'
  | 'viewCount'
  | 'lastViewedAt'
  | 'approvalRequired'
  | 'supersededBy'
  | 'createdAt'
  | 'updatedAt'
  | 'createdByName'
> & {
  customerName: string;
  grand: number;
  net: number;
  grandTry: number;
  profitTry?: number;
};

export interface QuoteEvent {
  id: number;
  type: string;
  message: string;
  actor: string;
  createdAt: string;
}

// ---------------- AYARLAR ----------------

export interface BankAccount {
  bank: string;
  branch: string;
  holder: string;
  iban: string;
  currency: Currency;
}

export interface CompanySettings {
  name: string; // Kısa ad (OSE TEKNOLOJİ)
  title: string; // Ticari unvan
  slogan: string;
  phone: string;
  phone2: string;
  email: string;
  website: string;
  address: string;
  city: string;
  taxOffice: string;
  taxNo: string;
  mersis: string;
  logo: string;
  stamp: string;
}

export interface QuoteSettings {
  prefix: string;
  validityDays: number;
  defaultCurrency: Currency;
  defaultVatRate: number;
  defaultVatMode: VatMode;
  paymentPlan: PaymentPlanRow[];
  delivery: string;
  warranty: string;
  notes: string;
  showUnitPrices: boolean;
  showPhotos: boolean;
  showTryEquivalent: boolean;
  salesDiscountLimit: number | null;
  stalePriceDays: number;
  accentColor: string;
}

export interface NotifySettings {
  email: string;
  fromEmail: string;
  onApprove: boolean;
  onRevision: boolean;
  onView: boolean;
}

export interface GesSettings {
  specificYield: number; // kWh/kWp/yıl
  dcAcMax: number;
}

export interface AppSettings {
  company: CompanySettings;
  quote: QuoteSettings;
  banks: BankAccount[];
  notify: NotifySettings;
  ges: GesSettings;
}

export interface Brochure {
  id: string;
  title: string;
  kind: 'pdf' | 'image';
  fileKey: string;
  size: number;
  sort: number;
  defaultOn: boolean;
}

export interface RatesResponse {
  rates: Rates;
  source: string;
  date: string;
}

export interface DashboardData {
  period: { from: string; to: string; label: string };
  issued: { count: number; total: number };
  approved: { count: number; total: number; profit?: number };
  pending: { count: number; total: number };
  drafts: number;
  conversion: number;
  monthly: { month: string; issued: number; approved: number }[];
  recent: QuoteSummary[];
  expiring: QuoteSummary[];
  activity: (QuoteEvent & { quoteId: string; number: string; customerName: string })[];
  approvals: QuoteSummary[];
  stalePrices?: number;
  topCustomers: { id: string; name: string; total: number; count: number }[];
}
