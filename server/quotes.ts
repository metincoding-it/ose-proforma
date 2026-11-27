import { Hono } from 'hono';
import type { AppEnv, Ctx } from './core';
import { fail, newId, nowIso, num, str, parseJson, requireAdmin, isAdmin, audit, auditStmt, loadSettings, randomToken } from './core';
import { requireAuth } from './auth';
import { getProductsByIds } from './catalog';
import { calcQuote, convert } from '../shared/calc';
import type {
  Currency,
  Customer,
  CustomerSnapshot,
  DiscountType,
  GesInfo,
  LineType,
  Quote,
  QuoteLine,
  QuoteOptions,
  QuoteStatus,
  QuoteSummary,
  QuoteTerms,
  QuoteTotals,
  Rates,
  VatMode,
} from '../shared/types';
import { CURRENCIES, MAIN_GROUPS, QUOTE_STATUSES, STATUS_LABEL } from '../shared/types';

const cur = (v: unknown, def: Currency = 'USD'): Currency => (CURRENCIES.includes(v as Currency) ? (v as Currency) : def);

export interface QuoteRow {
  id: string;
  number: string;
  base_number: string;
  revision: number;
  status: QuoteStatus;
  customer_id: string | null;
  customer: string;
  title: string | null;
  currency: string;
  rates: string;
  rates_source: string | null;
  rates_date: string | null;
  vat_mode: string;
  gd_type: string;
  gd_value: number;
  lines: string;
  terms: string;
  options: string;
  ges: string | null;
  valid_until: string | null;
  public_token: string | null;
  view_count: number;
  last_viewed_at: string | null;
  approved_at: string | null;
  approved_name: string | null;
  customer_note: string | null;
  approval_required: number;
  approved_discount_pct: number | null;
  discount_approved_by: string | null;
  totals: string;
  grand_try: number;
  net_try: number;
  profit_try: number;
  sent_at: string | null;
  superseded_by: string | null;
  created_by: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export function stripCosts(q: Quote): Quote {
  return {
    ...q,
    lines: q.lines.map((l) => {
      const { unitCost: _u, costCurrency: _c, ...rest } = l;
      void _u;
      void _c;
      return rest;
    }),
    totals: (() => {
      const { cost: _a, profit: _b, marginPct: _m, costMissing: _x, profitTry: _p, ...rest } = q.totals;
      void _a;
      void _b;
      void _m;
      void _x;
      void _p;
      return rest as QuoteTotals;
    })(),
  };
}

export function quoteOut(r: QuoteRow, admin: boolean): Quote {
  const q: Quote = {
    id: r.id,
    number: r.number,
    baseNumber: r.base_number,
    revision: r.revision,
    status: r.status,
    customerId: r.customer_id,
    customer: parseJson<CustomerSnapshot>(r.customer, emptySnapshot()),
    title: r.title || '',
    currency: cur(r.currency),
    rates: parseJson<Rates>(r.rates, { TRY: 1, USD: 0, EUR: 0 }),
    ratesSource: r.rates_source || '',
    ratesDate: r.rates_date || '',
    vatMode: (r.vat_mode as VatMode) || 'excluded',
    generalDiscountType: (r.gd_type as DiscountType) || 'pct',
    generalDiscountValue: r.gd_value || 0,
    lines: parseJson<QuoteLine[]>(r.lines, []),
    terms: parseJson<QuoteTerms>(r.terms, { paymentPlan: [], delivery: '', warranty: '', notes: '' }),
    options: parseJson<QuoteOptions>(r.options, { showUnitPrices: true, showPhotos: true, showTryEquivalent: true, brochureIds: [] }),
    ges: parseJson<GesInfo | null>(r.ges, null),
    validUntil: r.valid_until,
    publicToken: r.public_token,
    viewCount: r.view_count,
    lastViewedAt: r.last_viewed_at,
    approvedAt: r.approved_at,
    approvedName: r.approved_name,
    customerNote: r.customer_note,
    approvalRequired: !!r.approval_required,
    discountApprovedBy: r.discount_approved_by,
    totals: parseJson<QuoteTotals>(r.totals, {} as QuoteTotals),
    sentAt: r.sent_at,
    supersededBy: r.superseded_by,
    createdBy: r.created_by,
    createdByName: r.created_by_name ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    version: r.version,
  };
  return admin ? q : stripCosts(q);
}

export function summaryOut(r: QuoteRow & { customer_name?: string }, admin: boolean): QuoteSummary {
  const totals = parseJson<QuoteTotals>(r.totals, {} as QuoteTotals);
  const snap = parseJson<CustomerSnapshot>(r.customer, emptySnapshot());
  const s: QuoteSummary = {
    id: r.id,
    number: r.number,
    baseNumber: r.base_number,
    revision: r.revision,
    status: r.status,
    customerId: r.customer_id,
    customerName: snap.company || snap.name || 'Müşteri belirtilmedi',
    title: r.title || '',
    currency: cur(r.currency),
    validUntil: r.valid_until,
    viewCount: r.view_count,
    lastViewedAt: r.last_viewed_at,
    approvalRequired: !!r.approval_required,
    supersededBy: r.superseded_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdByName: r.created_by_name ?? null,
    grand: totals.grand ?? 0,
    net: totals.net ?? 0,
    grandTry: r.grand_try,
  };
  if (admin) s.profitTry = r.profit_try;
  return s;
}

export const emptySnapshot = (): CustomerSnapshot => ({
  kind: 'company',
  name: '',
  company: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  taxOffice: '',
  taxNo: '',
});

function sanitizeSnapshot(s: Partial<CustomerSnapshot> | undefined): CustomerSnapshot {
  const x = s || {};
  return {
    kind: x.kind === 'person' ? 'person' : 'company',
    name: str(x.name, 150),
    company: str(x.company, 250),
    phone: str(x.phone, 40),
    email: str(x.email, 150),
    address: str(x.address, 500),
    city: str(x.city, 80),
    taxOffice: str(x.taxOffice, 100),
    taxNo: str(x.taxNo, 30),
  };
}

function sanitizeLines(input: unknown): QuoteLine[] {
  if (!Array.isArray(input)) return [];
  if (input.length > 300) fail(400, 'Bir teklifte en fazla 300 satır olabilir.');
  return input.map((raw: Partial<QuoteLine>): QuoteLine => {
    const type: LineType = raw.type === 'section' ? 'section' : raw.type === 'custom' ? 'custom' : 'product';
    const title = str(raw.title, 300) || (type === 'section' ? 'Bölüm' : 'Kalem');
    return {
      id: str(raw.id, 40) || newId('ln'),
      type,
      productId: type === 'product' ? str(raw.productId, 60) || null : null,
      sku: str(raw.sku, 60),
      title,
      summary: str(raw.summary, 1000),
      category: str(raw.category, 80),
      unit: str(raw.unit, 30) || 'Adet',
      photo: str(raw.photo, 1000),
      qty: type === 'section' ? 0 : Math.max(0, num(raw.qty, 1)),
      unitPrice: type === 'section' ? 0 : Math.max(0, num(raw.unitPrice)),
      currency: cur(raw.currency),
      listPrice: raw.listPrice == null ? null : num(raw.listPrice),
      discountType: raw.discountType === 'amt' ? 'amt' : 'pct',
      discountValue: Math.max(0, num(raw.discountValue)),
      vatRate: Math.min(100, Math.max(0, num(raw.vatRate, 20))),
      unitCost: raw.unitCost == null || (raw.unitCost as unknown) === '' ? null : Math.max(0, num(raw.unitCost)),
      costCurrency: raw.costCurrency ? cur(raw.costCurrency) : undefined,
    };
  });
}

type QuoteInput = Partial<Quote>;

async function prepare(c: Ctx, input: QuoteInput, existing?: QuoteRow) {
  const user = c.get('user');
  const admin = user.role === 'admin';
  const settings = await loadSettings(c.env);
  const currency = cur(input.currency, settings.quote.defaultCurrency);
  const r = input.rates || ({} as Rates);
  const rates: Rates = { TRY: 1, USD: Math.max(0, num(r.USD)), EUR: Math.max(0, num(r.EUR)) };
  const lines = sanitizeLines(input.lines);
  for (const l of lines) {
    if (l.type === 'section') continue;
    if (l.currency !== 'TRY' && !rates[l.currency]) fail(400, `${l.currency} kuru girilmemiş. Lütfen kurları kontrol edin.`);
  }
  if (currency !== 'TRY' && !rates[currency]) fail(400, `${currency} kuru girilmemiş.`);

  // Maliyet ve liste fiyatını sunucu tarafında belirle (istemciye güvenme)
  const prevLines = new Map((existing ? parseJson<QuoteLine[]>(existing.lines, []) : []).map((l) => [l.id, l]));
  const needLookup = lines.filter((l) => {
    if (l.type !== 'product' || !l.productId) return false;
    const prev = prevLines.get(l.id);
    return !prev || prev.productId !== l.productId;
  });
  const products = await getProductsByIds(
    c,
    needLookup.map((l) => l.productId!)
  );
  for (const l of lines) {
    if (l.type === 'section') {
      l.unitCost = null;
      delete l.costCurrency;
      continue;
    }
    const prev = prevLines.get(l.id);
    if (l.type === 'product' && l.productId) {
      if (prev && prev.productId === l.productId) {
        l.unitCost = prev.unitCost ?? null;
        l.costCurrency = prev.costCurrency;
        l.listPrice = prev.listPrice ?? null;
      } else {
        const p = products.get(l.productId);
        if (p) {
          l.unitCost = p.cost_price;
          l.costCurrency = cur(p.cost_currency);
          l.listPrice = Math.round(convert(p.sale_price, cur(p.sale_currency), l.currency, rates) * 10000) / 10000;
        } else {
          l.unitCost = null;
          l.listPrice = null;
        }
      }
    } else {
      // Serbest kalem: maliyeti sadece admin girebilir
      if (!admin) {
        l.unitCost = prev?.unitCost ?? null;
        l.costCurrency = prev?.costCurrency;
      } else if (l.unitCost != null && !l.costCurrency) {
        l.costCurrency = l.currency;
      }
      l.listPrice = null;
    }
    if (l.unitCost == null) delete l.costCurrency;
  }

  const generalDiscountType: DiscountType = input.generalDiscountType === 'amt' ? 'amt' : 'pct';
  const generalDiscountValue = Math.max(0, num(input.generalDiscountValue));
  const { totals } = calcQuote({ lines, currency, rates, generalDiscountType, generalDiscountValue });

  // İskonto limiti kontrolü
  let approvalRequired = 0;
  let approvedDiscountPct = existing?.approved_discount_pct ?? null;
  let discountApprovedBy = existing?.discount_approved_by ?? null;
  if (admin) {
    approvedDiscountPct = Math.max(totals.effectiveDiscountPct, approvedDiscountPct ?? 0);
    if (existing?.approval_required) discountApprovedBy = user.name;
  } else {
    const limit = user.discountLimit ?? settings.quote.salesDiscountLimit;
    if (limit != null && (limit as unknown) !== '') {
      const allowed = Math.max(num(limit), approvedDiscountPct ?? 0);
      if (totals.effectiveDiscountPct > allowed + 0.01) {
        approvalRequired = 1;
        discountApprovedBy = null;
      }
    }
  }

  const terms: QuoteTerms = {
    intro: str(input.terms?.intro, 1500),
    paymentPlan: (Array.isArray(input.terms?.paymentPlan) ? input.terms!.paymentPlan : [])
      .slice(0, 12)
      .map((p) => ({ label: str(p.label, 200), pct: num(p.pct), note: str(p.note, 200) }))
      .filter((p) => p.label || p.pct),
    delivery: str(input.terms?.delivery, 1000),
    warranty: str(input.terms?.warranty, 3000),
    notes: str(input.terms?.notes, 3000),
  };
  const o = input.options || ({} as QuoteOptions);
  const options: QuoteOptions = {
    showUnitPrices: o.showUnitPrices !== false,
    showPhotos: o.showPhotos !== false,
    showTryEquivalent: o.showTryEquivalent !== false,
    brochureIds: Array.isArray(o.brochureIds) ? o.brochureIds.map((x) => str(x, 40)).slice(0, 20) : [],
    group: (MAIN_GROUPS as string[]).includes(String(o.group)) ? o.group : '',
  };
  const ges = input.ges
    ? {
        kwp: num(input.ges.kwp),
        panelCount: num(input.ges.panelCount),
        panelW: num(input.ges.panelW),
        inverterKw: num(input.ges.inverterKw),
        yearlyKwh: num(input.ges.yearlyKwh),
      }
    : null;
  const validUntil = str(input.validUntil, 10) || null;
  if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) fail(400, 'Geçerlilik tarihi hatalı.');

  return {
    customerId: str(input.customerId, 60) || null,
    customer: JSON.stringify(sanitizeSnapshot(input.customer)),
    title: str(input.title, 200),
    currency,
    rates: JSON.stringify(rates),
    ratesSource: str(input.ratesSource, 80),
    ratesDate: str(input.ratesDate, 30),
    vatMode: input.vatMode === 'included' ? 'included' : 'excluded',
    gdType: generalDiscountType,
    gdValue: generalDiscountValue,
    lines: JSON.stringify(lines),
    terms: JSON.stringify(terms),
    options: JSON.stringify(options),
    ges: ges ? JSON.stringify(ges) : null,
    validUntil,
    approvalRequired,
    approvedDiscountPct,
    discountApprovedBy,
    totals: JSON.stringify(totals),
    grandTry: totals.grandTry,
    netTry: totals.netTry,
    profitTry: totals.profitTry ?? 0,
  };
}

export async function nextNumber(c: Ctx): Promise<string> {
  const settings = await loadSettings(c.env);
  const year = new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul', year: 'numeric' });
  const row = await c.env.DB.prepare(
    'INSERT INTO counters (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1 RETURNING value'
  )
    .bind(`quote-${year}`)
    .first<{ value: number }>();
  return `${settings.quote.prefix}-${year}-${String(row!.value).padStart(4, '0')}`;
}

export function eventStmt(c: { env: AppEnv['Bindings'] }, quoteId: string, type: string, message: string, actor: string) {
  return c.env.DB.prepare('INSERT INTO quote_events (quote_id, type, message, actor, created_at) VALUES (?,?,?,?,?)').bind(
    quoteId,
    type,
    message.slice(0, 500),
    actor.slice(0, 120),
    nowIso()
  );
}

async function loadQuote(c: Ctx, id: string): Promise<QuoteRow> {
  const row = await c.env.DB.prepare('SELECT q.*, u.name AS created_by_name FROM quotes q LEFT JOIN users u ON u.id = q.created_by WHERE q.id = ?')
    .bind(id)
    .first<QuoteRow>();
  if (!row) fail(404, 'Teklif bulunamadı.');
  return row;
}

async function insertQuote(c: Ctx, p: Awaited<ReturnType<typeof prepare>>, number: string, baseNumber: string, revision: number) {
  const id = newId('q');
  const now = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO quotes (id, number, base_number, revision, status, customer_id, customer, title, currency, rates, rates_source, rates_date, vat_mode, gd_type, gd_value, lines, terms, options, ges, valid_until, approval_required, approved_discount_pct, discount_approved_by, totals, grand_try, net_try, profit_try, created_by, created_at, updated_at, version)
     VALUES (?,?,?,?,'draft',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`
  )
    .bind(
      id,
      number,
      baseNumber,
      revision,
      p.customerId,
      p.customer,
      p.title,
      p.currency,
      p.rates,
      p.ratesSource,
      p.ratesDate,
      p.vatMode,
      p.gdType,
      p.gdValue,
      p.lines,
      p.terms,
      p.options,
      p.ges,
      p.validUntil,
      p.approvalRequired,
      p.approvedDiscountPct,
      p.discountApprovedBy,
      p.totals,
      p.grandTry,
      p.netTry,
      p.profitTry,
      c.get('user').id,
      now,
      now
    )
    .run();
  return id;
}

// ---------------- ROTALAR ----------------

export const quoteRoutes = new Hono<AppEnv>();
quoteRoutes.use('*', requireAuth);

quoteRoutes.get('/', async (c) => {
  const status = c.req.query('status');
  const q = str(c.req.query('q'), 100).toLowerCase();
  const customerId = c.req.query('customerId');
  const showAll = c.req.query('all') === '1';
  const where: string[] = [];
  const binds: unknown[] = [];
  if (status && QUOTE_STATUSES.includes(status as QuoteStatus)) {
    where.push('q.status = ?');
    binds.push(status);
  } else if (status === 'pending') {
    where.push("q.status IN ('sent','revision')");
  } else if (status === 'approval') {
    where.push('q.approval_required = 1');
  }
  if (customerId) {
    where.push('q.customer_id = ?');
    binds.push(customerId);
  }
  if (!showAll && !customerId) where.push('q.superseded_by IS NULL');
  if (q) {
    where.push('(LOWER(q.number) LIKE ? OR LOWER(q.customer) LIKE ? OR LOWER(q.title) LIKE ?)');
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const sql = `SELECT q.id, q.number, q.base_number, q.revision, q.status, q.customer_id, q.customer, q.title, q.currency, q.valid_until, q.view_count, q.last_viewed_at, q.approval_required, q.superseded_by, q.created_at, q.updated_at, q.totals, q.grand_try, q.profit_try, u.name AS created_by_name
    FROM quotes q LEFT JOIN users u ON u.id = q.created_by ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY q.created_at DESC LIMIT 500`;
  const { results } = await c.env.DB.prepare(sql)
    .bind(...binds)
    .all<QuoteRow>();
  const admin = isAdmin(c);
  return c.json({ quotes: results.map((r) => summaryOut(r, admin)) });
});

quoteRoutes.get('/:id', async (c) => {
  const row = await loadQuote(c, c.req.param('id'));
  const [events, revisions] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT id, type, message, actor, created_at AS createdAt FROM quote_events WHERE quote_id = ? ORDER BY id DESC LIMIT 100').bind(row.id),
    c.env.DB.prepare('SELECT id, number, revision, status, created_at AS createdAt FROM quotes WHERE base_number = ? ORDER BY revision').bind(row.base_number),
  ]);
  return c.json({ quote: quoteOut(row, isAdmin(c)), events: events.results, revisions: revisions.results });
});

quoteRoutes.post('/', async (c) => {
  const input = await c.req.json<QuoteInput>();
  const p = await prepare(c, input);
  const number = await nextNumber(c);
  const id = await insertQuote(c, p, number, number, 1);
  const user = c.get('user');
  await c.env.DB.batch([
    eventStmt(c, id, 'created', `${number} oluşturuldu`, user.name),
    auditStmt(c, 'quote.create', 'quote', id, number),
  ]);
  return c.json({ quote: quoteOut(await loadQuote(c, id), isAdmin(c)) });
});

quoteRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await loadQuote(c, id);
  const input = await c.req.json<QuoteInput>();
  if (input.version != null && input.version !== existing.version) {
    fail(409, 'Bu teklif siz düzenlerken başka biri tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.', 'VERSION_CONFLICT');
  }
  if (existing.status === 'approved' && !isAdmin(c)) fail(403, 'Onaylanmış teklifler sadece yönetici tarafından düzenlenebilir. Yeni revizyon oluşturun.');
  const p = await prepare(c, input, existing);
  const res = await c.env.DB.prepare(
    `UPDATE quotes SET customer_id=?, customer=?, title=?, currency=?, rates=?, rates_source=?, rates_date=?, vat_mode=?, gd_type=?, gd_value=?, lines=?, terms=?, options=?, ges=?, valid_until=?, approval_required=?, approved_discount_pct=?, discount_approved_by=?, totals=?, grand_try=?, net_try=?, profit_try=?, updated_at=?, version = version + 1
     WHERE id = ? AND version = ?`
  )
    .bind(
      p.customerId,
      p.customer,
      p.title,
      p.currency,
      p.rates,
      p.ratesSource,
      p.ratesDate,
      p.vatMode,
      p.gdType,
      p.gdValue,
      p.lines,
      p.terms,
      p.options,
      p.ges,
      p.validUntil,
      p.approvalRequired,
      p.approvedDiscountPct,
      p.discountApprovedBy,
      p.totals,
      p.grandTry,
      p.netTry,
      p.profitTry,
      nowIso(),
      id,
      existing.version
    )
    .run();
  if (!res.meta.changes) fail(409, 'Teklif aynı anda başka biri tarafından değiştirildi. Sayfayı yenileyin.', 'VERSION_CONFLICT');
  const stmts = [auditStmt(c, 'quote.update', 'quote', id, existing.number)];
  if (p.approvalRequired && !existing.approval_required) {
    stmts.push(eventStmt(c, id, 'approval_needed', 'İskonto limiti aşıldı – yönetici onayı bekleniyor', c.get('user').name));
  }
  if (!p.approvalRequired && existing.approval_required && isAdmin(c)) {
    stmts.push(eventStmt(c, id, 'discount_approved', 'İskonto yönetici tarafından onaylandı', c.get('user').name));
  }
  await c.env.DB.batch(stmts);
  return c.json({ quote: quoteOut(await loadQuote(c, id), isAdmin(c)) });
});

quoteRoutes.post('/:id/status', async (c) => {
  const id = c.req.param('id');
  const existing = await loadQuote(c, id);
  const { status } = await c.req.json<{ status: QuoteStatus }>();
  if (!QUOTE_STATUSES.includes(status)) fail(400, 'Geçersiz durum.');
  if (existing.approval_required && (status === 'sent' || status === 'approved')) {
    fail(403, 'Bu teklifte limit üstü iskonto var. Önce yönetici onayı gerekiyor.', 'APPROVAL_REQUIRED');
  }
  const now = nowIso();
  const user = c.get('user');
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE quotes SET status = ?, approved_at = CASE WHEN ? = 'approved' THEN COALESCE(approved_at, ?) ELSE approved_at END,
       approved_name = CASE WHEN ? = 'approved' AND approved_name IS NULL THEN ? ELSE approved_name END,
       sent_at = CASE WHEN ? = 'sent' THEN COALESCE(sent_at, ?) ELSE sent_at END, updated_at = ?, version = version + 1 WHERE id = ?`
    ).bind(status, status, now, status, `${user.name} (manuel)`, status, now, now, id),
    eventStmt(c, id, 'status', `Durum: ${STATUS_LABEL[existing.status]} → ${STATUS_LABEL[status]}`, user.name),
    auditStmt(c, 'quote.status', 'quote', id, `${existing.number}: ${status}`),
  ]);
  return c.json({ quote: quoteOut(await loadQuote(c, id), isAdmin(c)) });
});

quoteRoutes.post('/:id/approve-discount', async (c) => {
  requireAdmin(c);
  const id = c.req.param('id');
  const existing = await loadQuote(c, id);
  const totals = parseJson<QuoteTotals>(existing.totals, {} as QuoteTotals);
  const user = c.get('user');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE quotes SET approval_required = 0, approved_discount_pct = ?, discount_approved_by = ?, updated_at = ?, version = version + 1 WHERE id = ?').bind(
      totals.effectiveDiscountPct ?? 0,
      user.name,
      nowIso(),
      id
    ),
    eventStmt(c, id, 'discount_approved', `%${(totals.effectiveDiscountPct ?? 0).toFixed(1)} iskonto onaylandı`, user.name),
    auditStmt(c, 'quote.approve_discount', 'quote', id, existing.number),
  ]);
  return c.json({ quote: quoteOut(await loadQuote(c, id), true) });
});

/** Müşteri linki oluştur / getir. Taslaksa "Gönderildi" yapar. */
quoteRoutes.post('/:id/share', async (c) => {
  const id = c.req.param('id');
  const existing = await loadQuote(c, id);
  if (existing.approval_required) fail(403, 'Limit üstü iskonto yönetici onayı bekliyor; teklif henüz paylaşılamaz.', 'APPROVAL_REQUIRED');
  const { markSent } = await c.req.json<{ markSent?: boolean }>().catch(() => ({ markSent: true }));
  const token = existing.public_token || randomToken(18);
  const user = c.get('user');
  const stmts = [];
  const becomesSent = existing.status === 'draft' && markSent !== false;
  stmts.push(
    c.env.DB.prepare(
      `UPDATE quotes SET public_token = ?, status = CASE WHEN ? THEN 'sent' ELSE status END, sent_at = CASE WHEN ? THEN COALESCE(sent_at, ?) ELSE sent_at END, updated_at = ?, version = version + 1 WHERE id = ?`
    ).bind(token, becomesSent ? 1 : 0, becomesSent ? 1 : 0, nowIso(), nowIso(), id)
  );
  if (becomesSent) stmts.push(eventStmt(c, id, 'status', 'Durum: Taslak → Gönderildi', user.name));
  if (!existing.public_token) stmts.push(eventStmt(c, id, 'link', 'Müşteri linki oluşturuldu', user.name));
  await c.env.DB.batch(stmts);
  const origin = new URL(c.req.url).origin;
  return c.json({ url: `${origin}/t/${token}`, token, quote: quoteOut(await loadQuote(c, id), isAdmin(c)) });
});

/** PDF indirildiğinde kayıt düş, taslaksa gönderildi yap */
quoteRoutes.post('/:id/pdf-log', async (c) => {
  const id = c.req.param('id');
  const existing = await loadQuote(c, id);
  const { markSent } = await c.req.json<{ markSent?: boolean }>().catch(() => ({ markSent: false }));
  const user = c.get('user');
  const stmts = [eventStmt(c, id, 'pdf', 'PDF indirildi', user.name)];
  if (markSent && existing.status === 'draft' && !existing.approval_required) {
    stmts.push(
      c.env.DB.prepare("UPDATE quotes SET status = 'sent', sent_at = COALESCE(sent_at, ?), updated_at = ?, version = version + 1 WHERE id = ?").bind(nowIso(), nowIso(), id)
    );
    stmts.push(eventStmt(c, id, 'status', 'Durum: Taslak → Gönderildi', user.name));
  }
  await c.env.DB.batch(stmts);
  return c.json({ quote: quoteOut(await loadQuote(c, id), isAdmin(c)) });
});

/** Yeni revizyon (v2, v3 ...) */
quoteRoutes.post('/:id/revise', async (c) => {
  const id = c.req.param('id');
  const existing = await loadQuote(c, id);
  const maxRev = await c.env.DB.prepare('SELECT MAX(revision) AS m FROM quotes WHERE base_number = ?').bind(existing.base_number).first<{ m: number }>();
  const revision = (maxRev?.m ?? existing.revision) + 1;
  const number = `${existing.base_number}-v${revision}`;
  const settings = await loadSettings(c.env);
  const src = quoteOut(existing, true);
  const valid = new Date(Date.now() + settings.quote.validityDays * 864e5).toISOString().slice(0, 10);
  // Revizyon sahibi kendi maliyet bilgilerini korusun diye eski satırları "önceki" olarak kullan
  const p = await prepare(c, { ...src, validUntil: valid }, existing);
  const newIdv = await insertQuote(c, p, number, existing.base_number, revision);
  const user = c.get('user');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE quotes SET superseded_by = ?, updated_at = ? WHERE id = ?').bind(newIdv, nowIso(), id),
    eventStmt(c, newIdv, 'created', `${existing.number} teklifinden revizyon olarak oluşturuldu`, user.name),
    eventStmt(c, id, 'revised', `Yeni revizyon oluşturuldu: ${number}`, user.name),
    auditStmt(c, 'quote.revise', 'quote', newIdv, `${existing.number} → ${number}`),
  ]);
  return c.json({ quote: quoteOut(await loadQuote(c, newIdv), isAdmin(c)) });
});

/** Teklifi kopyala (yeni numara, başka müşteri için) */
quoteRoutes.post('/:id/duplicate', async (c) => {
  const existing = await loadQuote(c, c.req.param('id'));
  const settings = await loadSettings(c.env);
  const src = quoteOut(existing, true);
  const valid = new Date(Date.now() + settings.quote.validityDays * 864e5).toISOString().slice(0, 10);
  const p = await prepare(c, { ...src, validUntil: valid }, existing);
  const number = await nextNumber(c);
  const id = await insertQuote(c, p, number, number, 1);
  await c.env.DB.batch([
    eventStmt(c, id, 'created', `${existing.number} teklifinden kopyalandı`, c.get('user').name),
    auditStmt(c, 'quote.duplicate', 'quote', id, `${existing.number} → ${number}`),
  ]);
  return c.json({ quote: quoteOut(await loadQuote(c, id), isAdmin(c)) });
});

quoteRoutes.delete('/:id', async (c) => {
  requireAdmin(c);
  const id = c.req.param('id');
  const existing = await loadQuote(c, id);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM quotes WHERE id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM quote_events WHERE quote_id = ?').bind(id),
    c.env.DB.prepare('UPDATE quotes SET superseded_by = NULL WHERE superseded_by = ?').bind(id),
    auditStmt(c, 'quote.delete', 'quote', id, existing.number),
  ]);
  return c.json({ ok: true });
});

quoteRoutes.post('/:id/save-as-kit', async (c) => {
  requireAdmin(c);
  const existing = await loadQuote(c, c.req.param('id'));
  const { name } = await c.req.json<{ name: string }>();
  const lines = parseJson<QuoteLine[]>(existing.lines, []);
  const items = lines.filter((l) => l.type === 'product' && l.productId).map((l) => ({ productId: l.productId!, qty: l.qty }));
  if (!items.length) fail(400, 'Teklifte katalog ürünü yok.');
  const id = newId('kit');
  await c.env.DB.prepare('INSERT INTO kits (id, name, description, icon, items, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, str(name, 120) || existing.title || existing.number, `${existing.number} teklifinden oluşturuldu`, 'Layers', JSON.stringify(items), nowIso(), nowIso())
    .run();
  await audit(c, 'kit.create', 'kit', id, `${existing.number} teklifinden`);
  return c.json({ id });
});

// ---------------- MÜŞTERİLER ----------------

interface CustomerRow {
  id: string;
  kind: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  tax_office: string | null;
  tax_no: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  version: number;
  quote_count?: number;
  approved_total?: number;
  last_quote_at?: string | null;
}

const customerOut = (r: CustomerRow): Customer => ({
  id: r.id,
  kind: r.kind === 'person' ? 'person' : 'company',
  name: r.name,
  company: r.company || '',
  phone: r.phone || '',
  email: r.email || '',
  address: r.address || '',
  city: r.city || '',
  taxOffice: r.tax_office || '',
  taxNo: r.tax_no || '',
  notes: r.notes || '',
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  version: r.version,
  quoteCount: r.quote_count ?? 0,
  approvedTotalTry: r.approved_total ?? 0,
  lastQuoteAt: r.last_quote_at ?? null,
});

function sanitizeCustomer(b: Partial<Customer>) {
  const s = sanitizeSnapshot(b);
  if (!s.name && !s.company) fail(400, 'Müşteri adı veya firma unvanı gerekli.');
  return { ...s, name: s.name || s.company, notes: str(b.notes, 2000) };
}

export const customerRoutes = new Hono<AppEnv>();
customerRoutes.use('*', requireAuth);

customerRoutes.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.*, COUNT(q.id) AS quote_count, COALESCE(SUM(CASE WHEN q.status = 'approved' THEN q.net_try ELSE 0 END),0) AS approved_total, MAX(q.created_at) AS last_quote_at
     FROM customers c LEFT JOIN quotes q ON q.customer_id = c.id AND q.superseded_by IS NULL GROUP BY c.id ORDER BY COALESCE(MAX(q.created_at), c.created_at) DESC`
  ).all<CustomerRow>();
  return c.json({ customers: results.map(customerOut) });
});

customerRoutes.get('/:id', async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(c.req.param('id')).first<CustomerRow>();
  if (!row) fail(404, 'Müşteri bulunamadı.');
  const { results } = await c.env.DB.prepare(
    `SELECT q.*, u.name AS created_by_name FROM quotes q LEFT JOIN users u ON u.id = q.created_by WHERE q.customer_id = ? ORDER BY q.created_at DESC`
  )
    .bind(row.id)
    .all<QuoteRow>();
  const admin = isAdmin(c);
  return c.json({ customer: customerOut(row), quotes: results.map((r) => summaryOut(r, admin)) });
});

customerRoutes.post('/', async (c) => {
  const b = sanitizeCustomer(await c.req.json());
  const id = newId('cus');
  const now = nowIso();
  await c.env.DB.prepare(
    'INSERT INTO customers (id, kind, name, company, phone, email, address, city, tax_office, tax_no, notes, created_by, created_at, updated_at, version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)'
  )
    .bind(id, b.kind, b.name, b.company, b.phone, b.email, b.address, b.city, b.taxOffice, b.taxNo, b.notes, c.get('user').id, now, now)
    .run();
  await audit(c, 'customer.create', 'customer', id, b.company || b.name);
  const row = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<CustomerRow>();
  return c.json({ customer: customerOut(row!) });
});

customerRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const input = await c.req.json<Partial<Customer>>();
  const b = sanitizeCustomer(input);
  const res = await c.env.DB.prepare(
    `UPDATE customers SET kind=?, name=?, company=?, phone=?, email=?, address=?, city=?, tax_office=?, tax_no=?, notes=?, updated_at=?, version = version + 1 WHERE id = ?${input.version != null ? ' AND version = ?' : ''}`
  )
    .bind(...[b.kind, b.name, b.company, b.phone, b.email, b.address, b.city, b.taxOffice, b.taxNo, b.notes, nowIso(), id, ...(input.version != null ? [input.version] : [])])
    .run();
  if (!res.meta.changes) fail(409, 'Müşteri kartı başka biri tarafından değiştirildi. Sayfayı yenileyin.', 'VERSION_CONFLICT');
  await audit(c, 'customer.update', 'customer', id, b.company || b.name);
  const row = await c.env.DB.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<CustomerRow>();
  return c.json({ customer: customerOut(row!) });
});

customerRoutes.delete('/:id', async (c) => {
  requireAdmin(c);
  const id = c.req.param('id');
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE quotes SET customer_id = NULL WHERE customer_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM customers WHERE id = ?').bind(id),
    auditStmt(c, 'customer.delete', 'customer', id),
  ]);
  return c.json({ ok: true });
});
