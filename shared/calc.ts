import type { Currency, DiscountType, QuoteLine, QuoteTotals, Rates, VatBreakdownRow, VatMode } from './types';

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function convert(amount: number, from: Currency, to: Currency, rates: Rates): number {
  if (from === to) return amount;
  const f = from === 'TRY' ? 1 : rates[from];
  const t = to === 'TRY' ? 1 : rates[to];
  if (!f || !t) return 0;
  return (amount * f) / t;
}

export interface LineCalc {
  /** Teklif para birimine çevrilmiş birim fiyat (KDV hariç) */
  unitPrice: number;
  gross: number;
  lineDiscount: number;
  generalDiscount: number;
  net: number;
  vat: number;
  total: number;
  listGross: number;
  cost: number | null;
}

export interface CalcInput {
  lines: QuoteLine[];
  currency: Currency;
  rates: Rates;
  generalDiscountType: DiscountType;
  generalDiscountValue: number;
}

const ZERO: LineCalc = {
  unitPrice: 0,
  gross: 0,
  lineDiscount: 0,
  generalDiscount: 0,
  net: 0,
  vat: 0,
  total: 0,
  listGross: 0,
  cost: null,
};

export function calcQuote(q: CalcInput): { lines: LineCalc[]; totals: QuoteTotals } {
  const rates = { ...q.rates, TRY: 1 };
  const step1 = q.lines.map((l) => {
    if (l.type === 'section') return { ...ZERO };
    const qty = Number(l.qty) || 0;
    const unitPrice = convert(Number(l.unitPrice) || 0, l.currency, q.currency, rates);
    const gross = qty * unitPrice;
    const dv = Math.max(0, Number(l.discountValue) || 0);
    let lineDiscount = 0;
    if (dv > 0) {
      lineDiscount = l.discountType === 'amt' ? Math.min(dv, gross) : (gross * Math.min(dv, 100)) / 100;
    }
    const list = l.listPrice != null && l.listPrice > 0 ? l.listPrice : Number(l.unitPrice) || 0;
    const listGross = qty * convert(list, l.currency, q.currency, rates);
    let cost: number | null = null;
    if (l.unitCost != null && l.costCurrency) {
      cost = qty * convert(Number(l.unitCost) || 0, l.costCurrency, q.currency, rates);
    }
    return { ...ZERO, unitPrice, gross, lineDiscount, net: gross - lineDiscount, listGross, cost };
  });

  const netBeforeGeneral = step1.reduce((s, l) => s + l.net, 0);
  const gdv = Math.max(0, Number(q.generalDiscountValue) || 0);
  let generalTotal = 0;
  if (gdv > 0 && netBeforeGeneral > 0) {
    generalTotal =
      q.generalDiscountType === 'amt' ? Math.min(gdv, netBeforeGeneral) : (netBeforeGeneral * Math.min(gdv, 100)) / 100;
  }

  const vatMap = new Map<number, VatBreakdownRow>();
  const lines = step1.map((l, i) => {
    const src = q.lines[i];
    if (src.type === 'section') return l;
    const share = netBeforeGeneral > 0 ? (l.net / netBeforeGeneral) * generalTotal : 0;
    const net = l.net - share;
    const rate = Number(src.vatRate) || 0;
    const vat = (net * rate) / 100;
    const row = vatMap.get(rate) || { rate, base: 0, vat: 0 };
    row.base += net;
    row.vat += vat;
    vatMap.set(rate, row);
    return { ...l, generalDiscount: share, net, vat, total: net + vat };
  });

  const gross = lines.reduce((s, l) => s + l.gross, 0);
  const lineDiscount = lines.reduce((s, l) => s + l.lineDiscount, 0);
  const net = lines.reduce((s, l) => s + l.net, 0);
  const vat = lines.reduce((s, l) => s + l.vat, 0);
  const listGross = lines.reduce((s, l) => s + l.listGross, 0);
  const priced = q.lines.filter((l) => l.type !== 'section');
  const costMissing = priced.filter((l) => l.unitCost == null).length;
  const cost = lines.reduce((s, l) => s + (l.cost ?? 0), 0);
  const profit = net - cost;
  const grand = net + vat;
  const toTry = (v: number) => convert(v, q.currency, 'TRY', rates);

  const totals: QuoteTotals = {
    gross: round2(gross),
    lineDiscount: round2(lineDiscount),
    generalDiscount: round2(generalTotal),
    discountTotal: round2(lineDiscount + generalTotal),
    net: round2(net),
    vatBreakdown: [...vatMap.values()]
      .filter((r) => r.base !== 0)
      .sort((a, b) => b.rate - a.rate)
      .map((r) => ({ rate: r.rate, base: round2(r.base), vat: round2(r.vat) })),
    vat: round2(vat),
    grand: round2(grand),
    listGross: round2(listGross),
    effectiveDiscountPct: listGross > 0 ? round2(Math.max(0, ((listGross - net) / listGross) * 100)) : 0,
    grandTry: round2(toTry(grand)),
    netTry: round2(toTry(net)),
    cost: round2(cost),
    profit: round2(profit),
    marginPct: net > 0 ? round2((profit / net) * 100) : 0,
    costMissing,
    profitTry: round2(toTry(profit)),
  };
  return { lines, totals };
}

/** PDF/ekranda gösterilecek birim fiyat ve satır tutarı (KDV moduna göre) */
export function displayLine(l: LineCalc, qty: number, vatRate: number, mode: VatMode) {
  const factor = mode === 'included' ? 1 + vatRate / 100 : 1;
  const unitNet = qty > 0 ? l.net / qty : 0;
  return {
    unitList: l.unitPrice * factor,
    unitNet: unitNet * factor,
    lineTotal: l.net * factor,
    hasDiscount: l.lineDiscount + l.generalDiscount > 0.004,
  };
}

/** Ürün maliyet + kâr marjından satış fiyatı */
export function priceFromMargin(cost: number, marginPct: number): number {
  return round2(cost * (1 + marginPct / 100));
}

export function marginFromPrices(cost: number, sale: number, rates: Rates, costCur: Currency, saleCur: Currency): number | null {
  const c = convert(cost, costCur, saleCur, rates);
  if (!c) return null;
  return round2(((sale - c) / c) * 100);
}
