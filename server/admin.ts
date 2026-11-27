import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import type { AppEnv, Ctx } from './core';
import { fail, nowIso, num, str, requireAdmin, isAdmin, audit, loadSettings, parseJson, getSetting, setSettingStmt } from './core';
import { requireAuth, sessionUser } from './auth';
import { summaryOut, type QuoteRow } from './quotes';
import { base64ToFile, importExternalImage } from './catalog';
import { sendMail } from './mail';
import type { DashboardData } from '../shared/types';

// ---------------- RAPORLAR / DASHBOARD ----------------

export const reportRoutes = new Hono<AppEnv>();
reportRoutes.use('*', requireAuth);

const TR_OFFSET = 3 * 3600e3; // Türkiye UTC+3 (sabit)
const trNow = () => new Date(Date.now() + TR_OFFSET);
const trStart = (y: number, m: number, d = 1) => new Date(Date.UTC(y, m, d) - TR_OFFSET).toISOString();
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function rangeFor(period: string) {
  const n = trNow();
  const y = n.getUTCFullYear();
  const m = n.getUTCMonth();
  switch (period) {
    case 'last_month':
      return { from: trStart(y, m - 1), to: trStart(y, m), label: 'Geçen Ay' };
    case 'quarter':
      return { from: trStart(y, m - 2), to: trStart(y, m + 1), label: 'Son 3 Ay' };
    case 'year':
      return { from: trStart(y, 0), to: trStart(y + 1, 0), label: `${y} Yılı` };
    case 'all':
      return { from: '2000-01-01T00:00:00.000Z', to: '2999-01-01T00:00:00.000Z', label: 'Tüm Zamanlar' };
    default:
      return { from: trStart(y, m), to: trStart(y, m + 1), label: 'Bu Ay' };
  }
}

reportRoutes.get('/dashboard', async (c) => {
  const admin = isAdmin(c);
  const range = rangeFor(c.req.query('period') || 'month');
  const n = trNow();
  const sixFrom = trStart(n.getUTCFullYear(), n.getUTCMonth() - 5);
  const yearFrom = trStart(n.getUTCFullYear(), 0);
  const today = n.toISOString().slice(0, 10);
  const in7 = new Date(n.getTime() + 7 * 864e5).toISOString().slice(0, 10);
  const settings = await loadSettings(c.env);
  const staleBefore = new Date(Date.now() - settings.quote.stalePriceDays * 864e5).toISOString();
  const db = c.env.DB;
  const summaryCols =
    'q.id, q.number, q.base_number, q.revision, q.status, q.customer_id, q.customer, q.title, q.currency, q.valid_until, q.view_count, q.last_viewed_at, q.approval_required, q.superseded_by, q.created_at, q.updated_at, q.totals, q.grand_try, q.profit_try, u.name AS created_by_name';
  const res = await db.batch([
    db
      .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(net_try),0) AS t FROM quotes WHERE status NOT IN ('draft','cancelled') AND superseded_by IS NULL AND created_at >= ? AND created_at < ?")
      .bind(range.from, range.to),
    db
      .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(net_try),0) AS t, COALESCE(SUM(profit_try),0) AS p FROM quotes WHERE status = 'approved' AND approved_at >= ? AND approved_at < ?")
      .bind(range.from, range.to),
    db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(net_try),0) AS t FROM quotes WHERE status IN ('sent','revision') AND superseded_by IS NULL"),
    db.prepare("SELECT COUNT(*) AS n FROM quotes WHERE status = 'draft' AND superseded_by IS NULL"),
    db
      .prepare(
        "SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END),0) AS a FROM quotes WHERE status <> 'draft' AND superseded_by IS NULL AND created_at >= ? AND created_at < ?"
      )
      .bind(range.from, range.to),
    db
      .prepare("SELECT created_at, approved_at, status, net_try, superseded_by FROM quotes WHERE status <> 'draft' AND (superseded_by IS NULL OR status = 'approved') AND (created_at >= ? OR approved_at >= ?)")
      .bind(sixFrom, sixFrom),
    db.prepare(`SELECT ${summaryCols} FROM quotes q LEFT JOIN users u ON u.id = q.created_by WHERE q.superseded_by IS NULL ORDER BY q.updated_at DESC LIMIT 8`),
    db
      .prepare(
        `SELECT ${summaryCols} FROM quotes q LEFT JOIN users u ON u.id = q.created_by WHERE q.status IN ('sent','revision') AND q.superseded_by IS NULL AND q.valid_until IS NOT NULL AND q.valid_until <= ? ORDER BY q.valid_until LIMIT 8`
      )
      .bind(in7),
    db.prepare(
      `SELECT e.id, e.type, e.message, e.actor, e.created_at AS createdAt, q.id AS quoteId, q.number, q.customer FROM quote_events e JOIN quotes q ON q.id = e.quote_id
       WHERE e.type IN ('viewed','customer_approved','customer_revision','approval_needed') ORDER BY e.id DESC LIMIT 12`
    ),
    db.prepare(`SELECT ${summaryCols} FROM quotes q LEFT JOIN users u ON u.id = q.created_by WHERE q.approval_required = 1 ORDER BY q.updated_at DESC LIMIT 20`),
    db.prepare('SELECT COUNT(*) AS n FROM products WHERE active = 1 AND (price_updated_at IS NULL OR price_updated_at < ?)').bind(staleBefore),
    db
      .prepare(
        "SELECT customer_id AS id, customer, SUM(net_try) AS total, COUNT(*) AS cnt FROM quotes WHERE status = 'approved' AND approved_at >= ? AND customer_id IS NOT NULL GROUP BY customer_id ORDER BY total DESC LIMIT 5"
      )
      .bind(yearFrom),
  ]);
  type R = Record<string, number>;
  const issued = res[0].results[0] as R;
  const approved = res[1].results[0] as R;
  const pending = res[2].results[0] as R;
  const drafts = res[3].results[0] as R;
  const conv = res[4].results[0] as R;

  const monthly: DashboardData['monthly'] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - i, 1));
    monthly.push({ month: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, issued: 0, approved: 0 });
  }
  const idxOf = (iso: string | null) => {
    if (!iso) return -1;
    const d = new Date(new Date(iso).getTime() + TR_OFFSET);
    const diff = (n.getUTCFullYear() - d.getUTCFullYear()) * 12 + (n.getUTCMonth() - d.getUTCMonth());
    return diff >= 0 && diff < 6 ? 5 - diff : -1;
  };
  for (const r of res[5].results as { created_at: string; approved_at: string | null; status: string; net_try: number; superseded_by: string | null }[]) {
    if (r.status !== 'cancelled' && !r.superseded_by) {
      const i = idxOf(r.created_at);
      if (i >= 0) monthly[i].issued += r.net_try;
    }
    if (r.status === 'approved') {
      const j = idxOf(r.approved_at);
      if (j >= 0) monthly[j].approved += r.net_try;
    }
  }

  const customerName = (raw: string) => {
    const s = parseJson<{ company?: string; name?: string }>(raw, {});
    return s.company || s.name || 'Müşteri';
  };

  const data: DashboardData = {
    period: range,
    issued: { count: issued.n, total: issued.t },
    approved: { count: approved.n, total: approved.t, ...(admin ? { profit: approved.p } : {}) },
    pending: { count: pending.n, total: pending.t },
    drafts: drafts.n,
    conversion: conv.n ? Math.round((conv.a / conv.n) * 1000) / 10 : 0,
    monthly: monthly.map((m) => ({ ...m, issued: Math.round(m.issued), approved: Math.round(m.approved) })),
    recent: (res[6].results as unknown as QuoteRow[]).map((r) => summaryOut(r, admin)),
    expiring: (res[7].results as unknown as QuoteRow[]).map((r) => summaryOut(r, admin)),
    activity: (res[8].results as unknown as (DashboardData['activity'][number] & { customer: string })[]).map((e) => ({
      id: e.id,
      type: e.type,
      message: e.message,
      actor: e.actor,
      createdAt: e.createdAt,
      quoteId: e.quoteId,
      number: e.number,
      customerName: customerName(e.customer),
    })),
    approvals: admin ? (res[9].results as unknown as QuoteRow[]).map((r) => summaryOut(r, admin)) : [],
    stalePrices: admin ? (res[10].results[0] as R).n : undefined,
    topCustomers: (res[11].results as { id: string; customer: string; total: number; cnt: number }[]).map((r) => ({
      id: r.id,
      name: customerName(r.customer),
      total: r.total,
      count: r.cnt,
    })),
  };
  void today;
  return c.json(data);
});

// ---------------- YÖNETİM: KAYITLAR, YEDEK, ESKİ VERİ ----------------

export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use('*', requireAuth);
adminRoutes.use('*', async (c, next) => {
  requireAdmin(c);
  await next();
});

adminRoutes.get('/audit', async (c) => {
  const limit = Math.min(500, Math.max(10, num(c.req.query('limit'), 200)));
  const entity = c.req.query('entity');
  const { results } = await c.env.DB.prepare(
    `SELECT id, user_name AS userName, action, entity, entity_id AS entityId, detail, created_at AS createdAt FROM audit_log ${entity ? 'WHERE entity = ?' : ''} ORDER BY id DESC LIMIT ?`
  )
    .bind(...(entity ? [entity, limit] : [limit]))
    .all();
  return c.json({ items: results });
});

const BACKUP_TABLES = ['settings', 'categories', 'products', 'customers', 'kits', 'brochures', 'counters', 'users', 'quotes', 'quote_events', 'audit_log'] as const;

adminRoutes.get('/backup', async (c) => {
  const res = await c.env.DB.batch(BACKUP_TABLES.map((t) => c.env.DB.prepare(`SELECT * FROM ${t}`)));
  const tables: Record<string, unknown[]> = {};
  BACKUP_TABLES.forEach((t, i) => (tables[t] = res[i].results));
  await audit(c, 'backup.export', 'system', null);
  return c.json({ app: 'ose-proforma', version: 2, exportedAt: nowIso(), tables });
});

adminRoutes.post('/restore', async (c) => {
  const { table, rows, truncate } = await c.req.json<{ table: string; rows: Record<string, unknown>[]; truncate?: boolean }>();
  if (!(BACKUP_TABLES as readonly string[]).includes(table)) fail(400, 'Geçersiz tablo.');
  if (!Array.isArray(rows) || rows.length > 40) fail(400, 'Her istekte en fazla 40 satır.');
  const info = await c.env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  const cols = new Set(info.results.map((r) => r.name));
  const stmts: D1PreparedStatement[] = [];
  if (truncate) stmts.push(c.env.DB.prepare(`DELETE FROM ${table}`));
  for (const row of rows) {
    const keys = Object.keys(row).filter((k) => cols.has(k));
    if (!keys.length) continue;
    stmts.push(
      c.env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).bind(
        ...keys.map((k) => (row[k] === undefined ? null : row[k]))
      )
    );
  }
  if (stmts.length) await c.env.DB.batch(stmts);
  if (truncate) await audit(c, 'backup.restore', 'system', null, table);
  return c.json({ ok: true, count: rows.length });
});

adminRoutes.post('/test-mail', async (c) => {
  const settings = await loadSettings(c.env);
  if (!settings.notify.email) fail(400, 'Önce bildirim e-posta adresini kaydedin.');
  const r = await sendMail(c.env, {
    to: settings.notify.email,
    from: settings.notify.fromEmail,
    subject: 'OSE Proforma – Test e-postası',
    html: '<p>E-posta bildirimleri çalışıyor. ✅</p>',
  });
  if (!r.ok) fail(400, r.error || 'Gönderilemedi.');
  return c.json({ ok: true });
});

// --- Eski KV verisini içe aktarma
interface LegacyData {
  inverters?: Record<string, unknown>[];
  pvs?: Record<string, unknown>[];
  batteries?: Record<string, unknown>[];
  infrastructure?: Record<string, unknown>[];
  extras?: Record<string, unknown>[];
  customCategories?: { id: string; label: string; iconName?: string }[];
  customProducts?: Record<string, unknown>[];
}

const clean = (v: unknown): string => {
  const s = str(v, 300);
  if (!s || s === '-' || s === '%') return '';
  const m = /^([\d.,\-–/\s]+?)\s*[^\d\s]*\s*[^\d\s]*$/.exec(s);
  return m && /\d/.test(m[1]) ? m[1].trim() : s;
};

const BATTERY_MAP: Record<string, string> = {
  'Lityum Demir Fosfat (LiFePO₄ / LFP)': 'LiFePO₄ (LFP)',
  'Lityum İyon (NMC/NCA)': 'Lityum İyon (NMC)',
  'Kurşun-Asit (AGM / Jel / Sulu)': 'Kurşun-Asit (AGM/Jel)',
  'Akış Bataryası (Flow Battery)': 'Akış Bataryası',
};
const INFRA_MAP: [string, string][] = [
  ['Konstrüksiyon', 'Konstrüksiyon & Montaj'],
  ['Solar Kablo', 'Solar Kablo (DC / AC)'],
  ['MC4', 'MC4 & Bağlantı'],
  ['Konnektör', 'MC4 & Bağlantı'],
  ['GES Pano', 'GES Pano & Koruma'],
  ['Topraklama', 'Topraklama & Sabitleme'],
  ['Hazır', 'Hazır Montaj Seti'],
];
const MOUNT_MAP: [string, string][] = [
  ['Genel', 'Genel (Tüm Sahalar)'],
  ['Tüm Çatı', 'Genel (Tüm Sahalar)'],
  ['Trapez', 'Trapez Sac / Sandviç Panel'],
  ['Kiremit', 'Kiremit Çatı'],
  ['Betonarme', 'Betonarme / Teras'],
  ['Arazi', 'Arazi Tipi'],
  ['Pano', 'Pano İçi / Elektrik'],
];
const mapBy = (v: unknown, table: [string, string][]) => {
  const s = str(v, 200);
  return table.find(([k]) => s.startsWith(k))?.[1] || s;
};

interface FlatItem {
  id: string;
  categoryId: string;
  brand: string;
  name: string;
  description: string;
  specs: Record<string, string>;
  unit: string;
  photo: string;
  price: number;
}

function flatten(d: LegacyData): FlatItem[] {
  const out: FlatItem[] = [];
  const nameOf = (v: unknown, fb: string) => {
    const s = str(v, 200);
    return s && s !== '-' ? s : fb;
  };
  const brandOf = (v: unknown) => {
    const s = str(v, 100);
    return s === '-' ? '' : s;
  };
  for (const x of d.inverters || []) {
    let maxDc = clean(x.maxDcPower);
    if (maxDc && parseFloat(maxDc) > 300) maxDc = String(Math.round((parseFloat(maxDc) / 1000) * 100) / 100);
    const model = str(x.model, 200);
    out.push({
      id: str(x.id, 60),
      categoryId: 'inverter',
      brand: brandOf(x.brand),
      name: nameOf(x.model, 'Inverter'),
      description: '',
      specs: {
        kw: clean(x.kw),
        type: /hibrit/i.test(model) ? 'Hibrit' : '',
        maxDcPower: maxDc,
        maxDcVoltage: clean(x.maxDcVoltage),
        mpptRange: clean(x.mpptRange),
        mpptCount: clean(x.mpptCount),
      },
      unit: 'Adet',
      photo: str(x.photo, 2_000_000),
      price: num(x.priceUsd),
    });
  }
  for (const x of d.pvs || []) {
    out.push({
      id: str(x.id, 60),
      categoryId: 'pv',
      brand: brandOf(x.brand),
      name: nameOf(x.model, 'PV Panel'),
      description: '',
      specs: {
        power: clean(x.nominalPower),
        pvType: str(x.pvType, 50),
        efficiency: clean(x.efficiency),
        cellCount: clean(x.cellCount),
        vmp: clean(x.vmp),
        imp: clean(x.imp),
        voc: clean(x.voc),
        lifespan: clean(x.lifespan),
      },
      unit: 'Adet',
      photo: str(x.photo, 2_000_000),
      price: num(x.priceUsd),
    });
  }
  for (const x of d.batteries || []) {
    out.push({
      id: str(x.id, 60),
      categoryId: 'batarya',
      brand: brandOf(x.brand),
      name: nameOf(x.model, 'Batarya'),
      description: '',
      specs: {
        energyKwh: clean(x.energyKwh),
        batteryType: BATTERY_MAP[str(x.batteryType, 100)] || str(x.batteryType, 100),
        nominalVoltage: clean(x.nominalVoltage),
        capacityAh: clean(x.capacityAh),
        dischargeCurrent: clean(x.dischargeCurrent),
        chargeCurrent: clean(x.chargeCurrent),
        dod: clean(x.dod),
        cycleLife: clean(x.cycleLife),
        bms: str(x.bms, 100) === '-' ? '' : str(x.bms, 100),
      },
      unit: 'Adet',
      photo: str(x.photo, 2_000_000),
      price: num(x.priceUsd),
    });
  }
  for (const x of d.infrastructure || []) {
    out.push({
      id: str(x.id, 60),
      categoryId: 'altyapi',
      brand: brandOf(x.brand),
      name: nameOf(x.name, 'Altyapı Malzemesi'),
      description: '',
      specs: {
        infraType: mapBy(x.category, INFRA_MAP),
        applicationType: mapBy(x.applicationType, MOUNT_MAP),
        materialSpec: str(x.materialSpec, 200) === '-' ? '' : str(x.materialSpec, 200),
        warrantyStandard: str(x.warrantyStandard, 200) === '-' ? '' : str(x.warrantyStandard, 200),
      },
      unit: str(x.unit, 30).replace(/\s*\(.*\)$/, '').replace('Set / Paket', 'Set') || 'Adet',
      photo: str(x.photo, 2_000_000),
      price: num(x.priceUsd),
    });
  }
  for (const x of d.extras || []) {
    out.push({
      id: str(x.id, 60),
      categoryId: 'ekstralar',
      brand: '',
      name: nameOf(x.name, 'Hizmet'),
      description: str(x.description, 1000) === '-' ? '' : str(x.description, 1000),
      specs: {},
      unit: str(x.unit, 30) || 'Hizmet',
      photo: '',
      price: num(x.priceUsd),
    });
  }
  for (const x of d.customProducts || []) {
    out.push({
      id: str(x.id, 60),
      categoryId: str(x.categoryId, 60),
      brand: brandOf(x.brand),
      name: nameOf(x.name, 'Ürün'),
      description: str(x.specs, 1000) === '-' ? '' : str(x.specs, 1000),
      specs: {},
      unit: str(x.unit, 30) || 'Adet',
      photo: str(x.photo, 2_000_000),
      price: num(x.priceUsd),
    });
  }
  return out.filter((i) => i.id);
}

async function loadLegacy(c: Ctx): Promise<LegacyData | null> {
  if (!c.env.OSE_DB) return null;
  const raw = await c.env.OSE_DB.get('ose_products_data');
  return raw ? parseJson<LegacyData | null>(raw, null) : null;
}

adminRoutes.get('/legacy', async (c) => {
  const data = await loadLegacy(c);
  const status = await getSetting<{ at?: string; count?: number } | null>(c.env, 'legacy_import', null);
  const items = data ? flatten(data) : [];
  return c.json({ available: items.length > 0, count: items.length, categories: data?.customCategories?.length ?? 0, imported: status });
});

adminRoutes.post('/legacy/import', async (c) => {
  const { offset } = await c.req.json<{ offset: number }>();
  const data = await loadLegacy(c);
  if (!data) fail(404, 'Eski veritabanında içe aktarılacak veri bulunamadı.');
  const items = flatten(data);
  const start = Math.max(0, num(offset));
  const stmts: D1PreparedStatement[] = [];
  const now = nowIso();
  if (start === 0) {
    let sort = 10;
    for (const cat of data.customCategories || []) {
      stmts.push(
        c.env.DB.prepare('INSERT OR IGNORE INTO categories (id, label, icon, role, fields, sort, created_at) VALUES (?,?,?,?,?,?,?)').bind(
          str(cat.id, 60),
          str(cat.label, 60) || 'Kategori',
          str(cat.iconName, 30) || 'Box',
          '',
          '[]',
          sort++,
          now
        )
      );
    }
  }
  const chunk = items.slice(start, start + 12);
  for (const it of chunk) {
    let photo = it.photo;
    if (photo.startsWith('data:')) photo = await base64ToFile(c.env, photo);
    else if (/^https?:\/\//.test(photo)) photo = await importExternalImage(c.env, photo);
    const specs: Record<string, string> = {};
    for (const [k, v] of Object.entries(it.specs)) if (v) specs[k] = v;
    stmts.push(
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO products (id, category_id, sku, brand, name, description, specs, unit, photo, cost_price, cost_currency, pricing_mode, margin_pct, sale_price, sale_currency, vat_rate, active, price_updated_at, created_at, updated_at, version)
         VALUES (?,?,NULL,?,?,?,?,?,?,NULL,'USD','fixed',NULL,?,'USD',20,1,?,?,?,1)`
      ).bind(it.id, it.categoryId, it.brand, it.name, it.description, JSON.stringify(specs), it.unit, photo, it.price, now, now, now)
    );
  }
  if (stmts.length) await c.env.DB.batch(stmts);
  const next = start + chunk.length;
  const done = next >= items.length;
  if (done) {
    await c.env.DB.batch([setSettingStmt(c.env, 'legacy_import', { at: now, count: items.length })]);
    await audit(c, 'legacy.import', 'system', null, `${items.length} ürün eski sistemden aktarıldı`);
  }
  return c.json({ next, total: items.length, done });
});

// ---------------- GÖRSEL PROXY (PDF için, sadece oturum veya geçerli teklif linki) ----------------

export const proxyRoutes = new Hono<AppEnv>();
proxyRoutes.get('/', async (c) => {
  const token = c.req.query('t');
  let allowed = !!(await sessionUser(c.env, getCookie(c, 'ose_session')));
  if (!allowed && token) {
    allowed = !!(await c.env.DB.prepare('SELECT 1 FROM quotes WHERE public_token = ?').bind(token).first());
  }
  if (!allowed) fail(401, 'Yetkisiz.');
  const url = c.req.query('url') || '';
  if (!/^https?:\/\//i.test(url)) fail(400, 'Geçersiz adres.');
  const host = new URL(url).hostname;
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) fail(400, 'Geçersiz adres.');
  const upstream = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (OSE Proforma)', Accept: 'image/*' },
    redirect: 'follow',
  }).catch(() => null);
  if (!upstream) fail(404, 'Görsel alınamadı.');
  const ct = upstream.headers.get('content-type') || '';
  if (!upstream.ok || !ct.startsWith('image/')) fail(400, 'Görsel alınamadı.');
  return new Response(upstream.body, {
    headers: { 'Content-Type': ct, 'Cache-Control': 'private, max-age=86400' },
  });
});
