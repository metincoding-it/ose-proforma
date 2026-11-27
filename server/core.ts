import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppSettings, User } from '../shared/types';
import { mergeSettings, BUILTIN_CATEGORIES } from '../shared/catalog';

export interface Env {
  DB: D1Database;
  OSE_DB: KVNamespace;
  RESEND_API_KEY?: string;
}

export type AppEnv = { Bindings: Env; Variables: { user: User } };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Ctx = Context<AppEnv, any>;

export const nowIso = () => new Date().toISOString();

export function newId(prefix = ''): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const s = Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
  return prefix ? `${prefix}_${s}` : s;
}

export function randomToken(len = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fail(status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 503, message: string, code?: string): never {
  throw new HTTPException(status, { message: JSON.stringify({ error: message, code: code || String(status) }) });
}

export function parseJson<T>(raw: unknown, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const num = (v: unknown, def = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : def;
};
export const str = (v: unknown, max = 2000): string => (v == null ? '' : String(v)).slice(0, max).trim();

export function requireAdmin(c: Ctx) {
  if (c.get('user')?.role !== 'admin') fail(403, 'Bu işlem için yönetici yetkisi gerekiyor.');
}

export const isAdmin = (c: Ctx) => c.get('user')?.role === 'admin';

// ---------------- MİGRASYONLAR ----------------

const MIGRATIONS: string[][] = [
  [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, discount_limit REAL, must_change_password INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, last_login_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, user_agent TEXT)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
    `CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, ip TEXT, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, label TEXT NOT NULL, icon TEXT, role TEXT NOT NULL DEFAULT '', fields TEXT NOT NULL DEFAULT '[]', sort INTEGER NOT NULL DEFAULT 0, created_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, category_id TEXT NOT NULL, sku TEXT, brand TEXT, name TEXT NOT NULL, description TEXT, specs TEXT NOT NULL DEFAULT '{}', unit TEXT NOT NULL DEFAULT 'Adet', photo TEXT, cost_price REAL, cost_currency TEXT NOT NULL DEFAULT 'USD', pricing_mode TEXT NOT NULL DEFAULT 'fixed', margin_pct REAL, sale_price REAL NOT NULL DEFAULT 0, sale_currency TEXT NOT NULL DEFAULT 'USD', vat_rate REAL NOT NULL DEFAULT 20, active INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0, price_updated_at TEXT, created_at TEXT, updated_at TEXT, version INTEGER NOT NULL DEFAULT 1)`,
    `CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL AND sku <> ''`,
    `CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, kind TEXT NOT NULL DEFAULT 'company', name TEXT NOT NULL, company TEXT, phone TEXT, email TEXT, address TEXT, city TEXT, tax_office TEXT, tax_no TEXT, notes TEXT, created_by TEXT, created_at TEXT, updated_at TEXT, version INTEGER NOT NULL DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS kits (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, icon TEXT, items TEXT NOT NULL DEFAULT '[]', created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS quotes (id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, base_number TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'draft', customer_id TEXT, customer TEXT NOT NULL DEFAULT '{}', title TEXT, currency TEXT NOT NULL, rates TEXT NOT NULL, rates_source TEXT, rates_date TEXT, vat_mode TEXT NOT NULL DEFAULT 'excluded', gd_type TEXT NOT NULL DEFAULT 'pct', gd_value REAL NOT NULL DEFAULT 0, lines TEXT NOT NULL DEFAULT '[]', terms TEXT NOT NULL DEFAULT '{}', options TEXT NOT NULL DEFAULT '{}', ges TEXT, valid_until TEXT, public_token TEXT UNIQUE, view_count INTEGER NOT NULL DEFAULT 0, last_viewed_at TEXT, approved_at TEXT, approved_name TEXT, customer_note TEXT, approval_required INTEGER NOT NULL DEFAULT 0, approved_discount_pct REAL, discount_approved_by TEXT, totals TEXT NOT NULL DEFAULT '{}', grand_try REAL NOT NULL DEFAULT 0, net_try REAL NOT NULL DEFAULT 0, profit_try REAL NOT NULL DEFAULT 0, sent_at TEXT, superseded_by TEXT, created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1)`,
    `CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status)`,
    `CREATE INDEX IF NOT EXISTS idx_quotes_created ON quotes(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_quotes_base ON quotes(base_number)`,
    `CREATE TABLE IF NOT EXISTS quote_events (id INTEGER PRIMARY KEY AUTOINCREMENT, quote_id TEXT NOT NULL, type TEXT NOT NULL, message TEXT, actor TEXT, created_at TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_events_quote ON quote_events(quote_id)`,
    `CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, user_name TEXT, action TEXT NOT NULL, entity TEXT, entity_id TEXT, detail TEXT, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS brochures (id TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL, file_key TEXT NOT NULL, size INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, default_on INTEGER NOT NULL DEFAULT 1, created_at TEXT)`,
  ],
  // v2.1 – Ana kategoriler (Zayıf Akım / Solar / Ev Elektroniği)
  [
    `ALTER TABLE categories ADD COLUMN grp TEXT NOT NULL DEFAULT ''`,
    `UPDATE categories SET grp = 'solar' WHERE role IN ('pv','inverter','battery','infra','service')`,
    `UPDATE categories SET grp = 'zayif', role = CASE WHEN icon = 'HardDrive' THEN 'recorder' WHEN role = '' THEN 'camera' ELSE role END WHERE grp = '' AND icon IN ('Camera','Cctv','HardDrive')`,
    // Müşterisi elle yazılmış eski teklifleri telefon veya ad+firma eşleşmesiyle müşteri kartına bağla
    `UPDATE quotes SET customer_id = (SELECT c.id FROM customers c WHERE (COALESCE(c.phone,'') <> '' AND REPLACE(c.phone,' ','') = REPLACE(COALESCE(json_extract(quotes.customer,'$.phone'),''),' ','')) OR (c.name <> '' AND lower(c.name) = lower(COALESCE(json_extract(quotes.customer,'$.name'),'')) AND COALESCE(c.company,'') = COALESCE(json_extract(quotes.customer,'$.company'),'')) LIMIT 1) WHERE customer_id IS NULL`,
  ],
];

let migrated = false;

export async function ensureSchema(env: Env) {
  if (migrated) return;
  if (!env.DB) fail(503, 'D1 veritabanı bağlı değil. Cloudflare Pages ayarlarından "DB" adıyla D1 bağlantısı ekleyin.', 'D1_NOT_BOUND');
  const db = env.DB;
  await db.exec('CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, applied_at TEXT)');
  const row = await db.prepare('SELECT MAX(id) AS v FROM _migrations').first<{ v: number | null }>();
  const current = row?.v ?? 0;
  for (let i = current; i < MIGRATIONS.length; i++) {
    const stmts = MIGRATIONS[i].map((sql) => db.prepare(sql));
    stmts.push(db.prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)').bind(i + 1, nowIso()));
    if (i === 0) {
      // Yerleşik kategorileri ekle (grp sütunu 2. migrasyonda eklenir; role'den doldurulur)
      for (const cat of BUILTIN_CATEGORIES) {
        stmts.push(
          db
            .prepare('INSERT OR IGNORE INTO categories (id, label, icon, role, fields, sort, created_at) VALUES (?,?,?,?,?,?,?)')
            .bind(cat.id, cat.label, cat.icon, cat.role, JSON.stringify(cat.fields), cat.sort, nowIso())
        );
      }
    }
    await db.batch(stmts);
  }
  migrated = true;
}

// ---------------- AYARLAR ----------------

export async function loadSettings(env: Env): Promise<AppSettings> {
  const { results } = await env.DB.prepare(
    "SELECT key, value FROM settings WHERE key IN ('company','quote','banks','notify','ges','pdf')"
  ).all<{ key: string; value: string }>();
  const partial: Record<string, unknown> = {};
  for (const r of results) partial[r.key] = parseJson(r.value, null);
  return mergeSettings(partial as Partial<AppSettings>);
}

export async function getSetting<T>(env: Env, key: string, fallback: T): Promise<T> {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row ? parseJson<T>(row.value, fallback) : fallback;
}

export function setSettingStmt(env: Env, key: string, value: unknown) {
  return env.DB.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).bind(key, JSON.stringify(value), nowIso());
}

// ---------------- İŞLEM KAYDI ----------------

export function auditStmt(c: Ctx, action: string, entity: string, entityId: string | null, detail = '') {
  const u = c.get('user');
  return c.env.DB.prepare(
    'INSERT INTO audit_log (user_id, user_name, action, entity, entity_id, detail, created_at) VALUES (?,?,?,?,?,?,?)'
  ).bind(u?.id ?? null, u?.name ?? 'Sistem', action, entity, entityId, detail.slice(0, 500), nowIso());
}

export async function audit(c: Ctx, action: string, entity: string, entityId: string | null, detail = '') {
  try {
    await auditStmt(c, action, entity, entityId, detail).run();
  } catch {
    /* işlem kaydı ana işlemi bozmamalı */
  }
}
