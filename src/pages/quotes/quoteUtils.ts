import type { AppSettings, Brochure, Category, Product, Quote, QuoteLine } from '../../../shared/types';
import { productSummary, productTitle } from '../../../shared/catalog';
import { addDaysIso, uid } from '../../lib/format';

export function emptyQuote(settings: AppSettings, brochures: Brochure[]): Quote {
  const s = settings.quote;
  return {
    id: '',
    number: '',
    baseNumber: '',
    revision: 1,
    status: 'draft',
    customerId: null,
    customer: { kind: 'company', name: '', company: '', phone: '', email: '', address: '', city: '', taxOffice: '', taxNo: '' },
    title: '',
    currency: s.defaultCurrency,
    rates: { TRY: 1, USD: 0, EUR: 0 },
    ratesSource: '',
    ratesDate: '',
    vatMode: s.defaultVatMode,
    generalDiscountType: 'pct',
    generalDiscountValue: 0,
    lines: [],
    terms: { paymentPlan: s.paymentPlan.map((p) => ({ ...p })), delivery: s.delivery, warranty: s.warranty, notes: s.notes },
    options: {
      showUnitPrices: s.showUnitPrices,
      showPhotos: s.showPhotos,
      showTryEquivalent: s.showTryEquivalent,
      brochureIds: brochures.filter((b) => b.defaultOn).map((b) => b.id),
    },
    ges: null,
    validUntil: addDaysIso(s.validityDays),
    publicToken: null,
    viewCount: 0,
    lastViewedAt: null,
    approvedAt: null,
    approvedName: null,
    customerNote: null,
    approvalRequired: false,
    discountApprovedBy: null,
    totals: {} as Quote['totals'],
    sentAt: null,
    supersededBy: null,
    createdBy: null,
    createdAt: '',
    updatedAt: '',
    version: 0,
  };
}

export function lineFromProduct(p: Product, cat: Category | undefined, qty = 1): QuoteLine {
  return {
    id: uid(),
    type: 'product',
    productId: p.id,
    sku: p.sku,
    title: productTitle(p),
    summary: productSummary(p, cat),
    category: cat?.label || '',
    unit: p.unit || 'Adet',
    photo: p.photo,
    qty,
    unitPrice: p.salePrice,
    currency: p.saleCurrency,
    listPrice: p.salePrice,
    discountType: 'pct',
    discountValue: 0,
    vatRate: p.vatRate,
    unitCost: p.costPrice ?? null,
    costCurrency: p.costPrice != null ? p.costCurrency : undefined,
  };
}

export function sectionLine(title: string): QuoteLine {
  return {
    id: uid(),
    type: 'section',
    title,
    unit: '',
    qty: 0,
    unitPrice: 0,
    currency: 'USD',
    discountType: 'pct',
    discountValue: 0,
    vatRate: 0,
  };
}

export function customLine(currency: Quote['currency'], vatRate: number): QuoteLine {
  return {
    id: uid(),
    type: 'custom',
    title: '',
    summary: '',
    unit: 'Adet',
    qty: 1,
    unitPrice: 0,
    currency,
    discountType: 'pct',
    discountValue: 0,
    vatRate,
    unitCost: null,
  };
}
