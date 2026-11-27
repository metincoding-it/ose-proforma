import type { AppSettings, Brochure, Category, CategoryGroup, Product, Quote, QuoteLine, QuoteTerms } from '../../../shared/types';
import { templateKey } from '../../../shared/types';
import { productSummary, productTitle } from '../../../shared/catalog';
import { addDaysIso, uid } from '../../lib/format';

/** Ana kategori şablonundan teklif şartlarını üretir */
export function termsFromTemplate(settings: AppSettings, group: CategoryGroup | undefined): QuoteTerms {
  const t = settings.pdf[templateKey(group)];
  return { intro: t.intro, paymentPlan: t.paymentPlan.map((p) => ({ ...p })), delivery: t.delivery, warranty: t.warranty, notes: t.notes };
}

/** Teklifin şartları seçili şablonla birebir aynı mı (kullanıcı elle değiştirmemiş mi)? */
export function termsUntouched(q: Quote, settings: AppSettings): boolean {
  const a = q.terms;
  const b = termsFromTemplate(settings, q.options.group);
  const plan = (x: QuoteTerms) => JSON.stringify(x.paymentPlan.map((p) => [p.label, Number(p.pct)]));
  return (a.intro || '') === (b.intro || '') && a.delivery === b.delivery && a.warranty === b.warranty && a.notes === b.notes && plan(a) === plan(b);
}

/** PDF/online sayfa için şablon başlıkları ve vurgu rengi */
export function templateHeader(settings: AppSettings, group: CategoryGroup | undefined) {
  const t = settings.pdf[templateKey(group)];
  return { template: { title: t.title, subtitle: t.subtitle, slogan: t.slogan }, accent: t.accentColor || settings.quote.accentColor };
}

export function emptyQuote(settings: AppSettings, brochures: Brochure[], group: CategoryGroup = ''): Quote {
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
    terms: termsFromTemplate(settings, group),
    options: {
      showUnitPrices: s.showUnitPrices,
      showPhotos: s.showPhotos,
      showTryEquivalent: s.showTryEquivalent,
      brochureIds: brochures.filter((b) => b.defaultOn).map((b) => b.id),
      group,
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
