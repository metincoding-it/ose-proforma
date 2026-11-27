import { Hono } from 'hono';
import type { AppEnv, Ctx, Env } from './core';
import { fail, newId, nowIso, num, str, parseJson, requireAdmin, isAdmin, audit, auditStmt, loadSettings, setSettingStmt } from './core';
import { requireAuth } from './auth';
import type { Category, Currency, Kit, Product, Rates, SpecField, CategoryRole, CategoryGroup, PricingMode, AppSettings, Brochure, PdfTemplate } from '../shared/types';
import { MAIN_GROUPS, PDF_TEMPLATE_KEYS } from '../shared/types';
import { CURRENCIES } from '../shared/types';
import { priceFromMargin } from '../shared/calc';
import { mergeSettings, groupOfRole } from '../shared/catalog';

const cur = (v: unknown, def: Currency = 'USD'): Currency => (CURRENCIES.includes(v as Currency) ? (v as Currency) : def);

// ---------------- DÖNÜŞÜMLER ----------------

export interface ProductRow {
  id: string;
  category_id: string;
  sku: string | null;
  brand: string | null;
  name: string;
  description: string | null;
  specs: string;
  unit: string;
  photo: string | null;
  cost_price: number | null;
  cost_currency: string;
  pricing_mode: string;
  margin_pct: number | null;
  sale_price: number;
  sale_currency: string;
  vat_rate: number;
  active: number;
  price_updated_at: string | null;
  updated_at: string | null;
  version: number;
}

export function productOut(r: ProductRow, admin: boolean): Product {
  const p: Product = {
    id: r.id,
    categoryId: r.category_id,
    sku: r.sku || '',
    brand: r.brand || '',
    name: r.name,
    description: r.description || '',
    specs: parseJson(r.specs, {}),
    unit: r.unit || 'Adet',
    photo: r.photo || '',
    salePrice: r.sale_price,
    saleCurrency: cur(r.sale_currency),
    vatRate: r.vat_rate,
    active: !!r.active,
    priceUpdatedAt: r.price_updated_at,
    updatedAt: r.updated_at,
    version: r.version,
  };
  if (admin) {
    p.costPrice = r.cost_price;
    p.costCurrency = cur(r.cost_currency);
    p.pricingMode = (r.pricing_mode as PricingMode) || 'fixed';
    p.marginPct = r.margin_pct;
  }
  return p;
}

interface CategoryRow {
  id: string;
  label: string;
  icon: string | null;
  role: string;
  grp?: string | null;
  fields: string;
  sort: number;
}
const categoryOut = (r: CategoryRow): Category => ({
  id: r.id,
  label: r.label,
  icon: r.icon || 'Box',
  group: ((r.grp || groupOfRole(r.role || '')) as CategoryGroup) || '',
  role: (r.role || '') as CategoryRole,
  fields: parseJson<SpecField[]>(r.fields, []),
  sort: r.sort,
});

/** Ana kategori ve rolü doğrular; rol başka bir ana kategoriye aitse rol temizlenir */
function sanitizeGroupRole(b: Partial<Category>): { group: CategoryGroup; role: string } {
  const role = str(b.role, 20);
  const roleGroup = groupOfRole(role);
  let group = (MAIN_GROUPS as string[]).includes(String(b.group)) ? (b.group as CategoryGroup) : '';
  if (!group) group = roleGroup;
  return { group, role: roleGroup && roleGroup !== group ? '' : role };
}

function sanitizeFields(input: unknown): SpecField[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input
    .slice(0, 30)
    .map((f: Partial<SpecField>, i): SpecField | null => {
      const label = str(f.label, 60);
      if (!label) return null;
      let key = str(f.key, 40).replace(/[^a-zA-Z0-9_]/g, '') || `f${i + 1}`;
      while (seen.has(key)) key = key + '_';
      seen.add(key);
      const type = f.type === 'number' || f.type === 'select' ? f.type : 'text';
      return {
        key,
        label,
        unit: str(f.unit, 20) || undefined,
        type,
        options: type === 'select' && Array.isArray(f.options) ? f.options.map((o) => str(o, 80)).filter(Boolean).slice(0, 40) : undefined,
        short: !!f.short,
      };
    })
    .filter((f): f is SpecField => !!f);
}

// ---------------- DIŞ GÖRSELİ DEPOYA ALMA ----------------

const MAX_FILE = 20 * 1024 * 1024;

export async function putFile(env: Env, data: ArrayBuffer | Uint8Array, contentType: string, name = ''): Promise<string> {
  const id = newId('f');
  await env.OSE_DB.put(`file:${id}`, data, { metadata: { ct: contentType, name: name.slice(0, 120), size: data.byteLength } });
  return `/api/files/${id}`;
}

export async function importExternalImage(env: Env, url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) return url;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (OSE Proforma)', Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8' },
      redirect: 'follow',
    });
    clearTimeout(t);
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.startsWith('image/')) return url;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 5 * 1024 * 1024 || buf.byteLength < 100) return url;
    return await putFile(env, buf, ct.split(';')[0]);
  } catch {
    return url;
  }
}

export async function base64ToFile(env: Env, dataUrl: string): Promise<string> {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!m) return '';
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return putFile(env, bytes, m[1]);
}

// ---------------- ÜRÜN GİRDİSİ ----------------

interface ProductInput extends Partial<Product> {
  costPrice?: number | null;
}

async function normalizeProduct(env: Env, input: ProductInput, existing?: ProductRow) {
  const name = str(input.name, 200);
  if (!name) fail(400, 'Ürün adı / model gerekli.');
  const categoryId = str(input.categoryId, 60);
  if (!categoryId) fail(400, 'Kategori gerekli.');
  const specsIn = (input.specs && typeof input.specs === 'object' ? input.specs : {}) as Record<string, unknown>;
  const specs: Record<string, string> = {};
  for (const [k, v] of Object.entries(specsIn).slice(0, 40)) {
    const s = str(v, 300);
    if (s) specs[k.slice(0, 40)] = s;
  }
  const pricingMode: PricingMode = input.pricingMode === 'margin' ? 'margin' : 'fixed';
  const costPrice = input.costPrice == null || (input.costPrice as unknown) === '' ? null : Math.max(0, num(input.costPrice));
  const costCurrency = cur(input.costCurrency, 'USD');
  const marginPct = input.marginPct == null || (input.marginPct as unknown) === '' ? null : num(input.marginPct);
  let salePrice = Math.max(0, num(input.salePrice));
  let saleCurrency = cur(input.saleCurrency, 'USD');
  if (pricingMode === 'margin' && costPrice != null && marginPct != null) {
    salePrice = priceFromMargin(costPrice, marginPct);
    saleCurrency = costCurrency;
  }
  let photo = str(input.photo, 2000);
  if (photo.startsWith('data:')) photo = await base64ToFile(env, input.photo as string);
  else if (/^https?:\/\//i.test(photo) && photo !== existing?.photo) photo = await importExternalImage(env, photo);

  // KDV zorunlu değil: boş bırakılırsa mevcut değer, yoksa ayarlardaki varsayılan KDV kullanılır
  const vatRaw = input.vatRate as unknown;
  const vatRate =
    vatRaw == null || vatRaw === '' || !Number.isFinite(num(vatRaw, NaN))
      ? existing
        ? existing.vat_rate
        : (await loadSettings(env)).quote.defaultVatRate
      : Math.min(100, Math.max(0, num(vatRaw)));

  const priceChanged =
    !existing ||
    existing.sale_price !== salePrice ||
    existing.sale_currency !== saleCurrency ||
    existing.cost_price !== costPrice ||
    existing.cost_currency !== costCurrency;

  return {
    categoryId,
    sku: str(input.sku, 60) || null,
    brand: str(input.brand, 100),
    name,
    description: str(input.description, 1000),
    specs: JSON.stringify(specs),
    unit: str(input.unit, 30) || 'Adet',
    photo,
    costPrice,
    costCurrency,
    pricingMode,
    marginPct,
    salePrice,
    saleCurrency,
    vatRate,
    active: input.active === false ? 0 : 1,
    priceUpdatedAt: priceChanged ? nowIso() : existing!.price_updated_at,
  };
}

async function skuConflict(env: Env, sku: string | null, exceptId?: string) {
  if (!sku) return;
  const row = await env.DB.prepare('SELECT id, name FROM products WHERE sku = ? AND id <> ?').bind(sku, exceptId || '').first<{ id: string; name: string }>();
  if (row) fail(409, `"${sku}" stok kodu başka bir üründe kullanılıyor (${row.name}).`);
}

// ---------------- ROTALAR ----------------

export const catalogRoutes = new Hono<AppEnv>();
catalogRoutes.use('*', requireAuth);

catalogRoutes.get('/catalog', async (c) => {
  const [cats, prods] = await c.env.DB.batch([
    c.env.DB.prepare('SELECT * FROM categories ORDER BY sort, label'),
    c.env.DB.prepare('SELECT * FROM products ORDER BY sort, brand, name'),
  ]);
  const admin = isAdmin(c);
  return c.json({
    categories: (cats.results as unknown as CategoryRow[]).map(categoryOut),
    products: (prods.results as unknown as ProductRow[]).map((r) => productOut(r, admin)),
  });
});

// --- Kategoriler
catalogRoutes.post('/categories', async (c) => {
  requireAdmin(c);
  const b = await c.req.json<Partial<Category>>();
  const label = str(b.label, 60);
  if (!label) fail(400, 'Kategori adı gerekli.');
  const id = newId('cat');
  const max = await c.env.DB.prepare('SELECT COALESCE(MAX(sort),0) AS m FROM categories').first<{ m: number }>();
  const gr = sanitizeGroupRole(b);
  await c.env.DB.prepare('INSERT INTO categories (id, label, icon, role, grp, fields, sort, created_at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, label, str(b.icon, 30) || 'Box', gr.role, gr.group, JSON.stringify(sanitizeFields(b.fields)), (max?.m ?? 0) + 1, nowIso())
    .run();
  await audit(c, 'category.create', 'category', id, label);
  return c.json({ id });
});

catalogRoutes.put('/categories/:id', async (c) => {
  requireAdmin(c);
  const id = c.req.param('id');
  const b = await c.req.json<Partial<Category>>();
  const label = str(b.label, 60);
  if (!label) fail(400, 'Kategori adı gerekli.');
  const gr = sanitizeGroupRole(b);
  await c.env.DB.prepare('UPDATE categories SET label = ?, icon = ?, role = ?, grp = ?, fields = ? WHERE id = ?')
    .bind(label, str(b.icon, 30) || 'Box', gr.role, gr.group, JSON.stringify(sanitizeFields(b.fields)), id)
    .run();
  await audit(c, 'category.update', 'category', id, label);
  return c.json({ ok: true });
});

catalogRoutes.put('/categories-order', async (c) => {
  requireAdmin(c);
  const { ids } = await c.req.json<{ ids: string[] }>();
  if (!Array.isArray(ids)) fail(400, 'Geçersiz sıra.');
  await c.env.DB.batch(ids.slice(0, 40).map((id, i) => c.env.DB.prepare('UPDATE categories SET sort = ? WHERE id = ?').bind(i + 1, id)));
  return c.json({ ok: true });
});

catalogRoutes.delete('/categories/:id', async (c) => {
  requireAdmin(c);
  const id = c.req.param('id');
  const cnt = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE category_id = ?').bind(id).first<{ n: number }>();
  if ((cnt?.n ?? 0) > 0 && c.req.query('force') !== '1') fail(409, `Bu kategoride ${cnt?.n} ürün var.`, 'HAS_PRODUCTS');
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM products WHERE category_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id),
    auditStmt(c, 'category.delete', 'category', id, `${cnt?.n ?? 0} ürünle birlikte`),
  ]);
  return c.json({ ok: true });
});

// --- Ürünler
catalogRoutes.post('/products', async (c) => {
  requireAdmin(c);
  const input = await c.req.json<ProductInput>();
  const p = await normalizeProduct(c.env, input);
  await skuConflict(c.env, p.sku);
  const id = newId('prd');
  const now = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO products (id, category_id, sku, brand, name, description, specs, unit, photo, cost_price, cost_currency, pricing_mode, margin_pct, sale_price, sale_currency, vat_rate, active, price_updated_at, created_at, updated_at, version)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`
  )
    .bind(id, p.categoryId, p.sku, p.brand, p.name, p.description, p.specs, p.unit, p.photo, p.costPrice, p.costCurrency, p.pricingMode, p.marginPct, p.salePrice, p.saleCurrency, p.vatRate, p.active, p.priceUpdatedAt, now, now)
    .run();
  await audit(c, 'product.create', 'product', id, `${p.brand} ${p.name}`.trim());
  const row = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  return c.json({ product: productOut(row!, true) });
});

catalogRoutes.put('/products/:id', async (c) => {
  requireAdmin(c);
  const id = c.req.param('id');
  const input = await c.req.json<ProductInput>();
  const existing = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  if (!existing) fail(404, 'Ürün bulunamadı (silinmiş olabilir).');
  if (input.version != null && input.version !== existing.version) {
    fail(409, 'Bu ürün siz düzenlerken başka biri tarafından değiştirildi. Sayfayı yenileyip tekrar deneyin.', 'VERSION_CONFLICT');
  }
  const p = await normalizeProduct(c.env, input, existing);
  await skuConflict(c.env, p.sku, id);
  const res = await c.env.DB.prepare(
    `UPDATE products SET category_id=?, sku=?, brand=?, name=?, description=?, specs=?, unit=?, photo=?, cost_price=?, cost_currency=?, pricing_mode=?, margin_pct=?, sale_price=?, sale_currency=?, vat_rate=?, active=?, price_updated_at=?, updated_at=?, version = version + 1
     WHERE id = ? AND version = ?`
  )
    .bind(p.categoryId, p.sku, p.brand, p.name, p.description, p.specs, p.unit, p.photo, p.costPrice, p.costCurrency, p.pricingMode, p.marginPct, p.salePrice, p.saleCurrency, p.vatRate, p.active, p.priceUpdatedAt, nowIso(), id, existing.version)
    .run();
  if (!res.meta.changes) fail(409, 'Bu ürün aynı anda başka biri tarafından değiştirildi. Sayfayı yenileyin.', 'VERSION_CONFLICT');
  const priceNote =
    existing.sale_price !== p.salePrice || existing.sale_currency !== p.saleCurrency
      ? ` | Satış: ${existing.sale_price} ${existing.sale_currency} → ${p.salePrice} ${p.saleCurrency}`
      : '';
  await audit(c, 'product.update', 'product', id, `${p.brand} ${p.name}`.trim() + priceNote);
  const row = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<ProductRow>();
  return c.json({ product: productOut(row!, true) });
});

catalogRoutes.delete('/products/:id', async (c) => {
  requireAdmin(c);
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT brand, name FROM products WHERE id = ?').bind(id).first<{ brand: string; name: string }>();
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id),
    auditStmt(c, 'product.delete', 'product', id, row ? `${row.brand} ${row.name}` : ''),
  ]);
  return c.json({ ok: true });
});

/** Toplu yükleme / fiyat güncelleme (Excel). İstemci 25'erli parçalar gönderir. */
catalogRoutes.post('/products/bulk', async (c) => {
  requireAdmin(c);
  const { rows, mode } = await c.req.json<{ rows: (ProductInput & { id?: string })[]; mode: 'upsert' | 'prices' }>();
  if (!Array.isArray(rows) || rows.length > 30) fail(400, 'Her istekte en fazla 30 satır gönderilebilir.');
  const now = nowIso();
  const skus = rows.map((r) => str(r.sku, 60)).filter(Boolean);
  const ids = rows.map((r) => str(r.id, 60)).filter(Boolean);
  const existingRows: ProductRow[] = [];
  if (skus.length) {
    const q = await c.env.DB.prepare(`SELECT * FROM products WHERE sku IN (${skus.map(() => '?').join(',')})`).bind(...skus).all<ProductRow>();
    existingRows.push(...q.results);
  }
  if (ids.length) {
    const q = await c.env.DB.prepare(`SELECT * FROM products WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all<ProductRow>();
    existingRows.push(...q.results);
  }
  const bySku = new Map(existingRows.filter((r) => r.sku).map((r) => [r.sku!, r]));
  const byId = new Map(existingRows.map((r) => [r.id, r]));
  const stmts: D1PreparedStatement[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let defaultVat: number | undefined;
  for (const r of rows) {
    const existing = (r.id && byId.get(r.id)) || (r.sku && bySku.get(str(r.sku, 60))) || undefined;
    if (mode === 'prices') {
      if (!existing) {
        skipped++;
        continue;
      }
      const merged: ProductInput = {
        ...productOut(existing, true),
        ...(r.costPrice !== undefined ? { costPrice: r.costPrice } : {}),
        ...(r.costCurrency ? { costCurrency: r.costCurrency } : {}),
        ...(r.salePrice !== undefined ? { salePrice: r.salePrice } : {}),
        ...(r.saleCurrency ? { saleCurrency: r.saleCurrency } : {}),
        ...(r.marginPct !== undefined ? { marginPct: r.marginPct } : {}),
        ...(r.pricingMode ? { pricingMode: r.pricingMode } : {}),
        ...(r.vatRate !== undefined ? { vatRate: r.vatRate } : {}),
      };
      const p = await normalizeProduct(c.env, merged, existing);
      stmts.push(
        c.env.DB.prepare(
          'UPDATE products SET cost_price=?, cost_currency=?, pricing_mode=?, margin_pct=?, sale_price=?, sale_currency=?, vat_rate=?, price_updated_at=?, updated_at=?, version=version+1 WHERE id=?'
        ).bind(p.costPrice, p.costCurrency, p.pricingMode, p.marginPct, p.salePrice, p.saleCurrency, p.vatRate, p.priceUpdatedAt, now, existing.id)
      );
      updated++;
      continue;
    }
    if (!existing && (r.vatRate == null || (r.vatRate as unknown) === '')) {
      defaultVat ??= (await loadSettings(c.env)).quote.defaultVatRate;
      r.vatRate = defaultVat;
    }
    const base: ProductInput = existing ? { ...productOut(existing, true), ...r, specs: { ...productOut(existing, true).specs, ...(r.specs || {}) } } : r;
    if (existing && !r.photo) base.photo = existing.photo || '';
    const p = await normalizeProduct(c.env, base, existing);
    if (existing) {
      stmts.push(
        c.env.DB.prepare(
          `UPDATE products SET category_id=?, sku=?, brand=?, name=?, description=?, specs=?, unit=?, photo=?, cost_price=?, cost_currency=?, pricing_mode=?, margin_pct=?, sale_price=?, sale_currency=?, vat_rate=?, active=?, price_updated_at=?, updated_at=?, version=version+1 WHERE id=?`
        ).bind(p.categoryId, p.sku, p.brand, p.name, p.description, p.specs, p.unit, p.photo, p.costPrice, p.costCurrency, p.pricingMode, p.marginPct, p.salePrice, p.saleCurrency, p.vatRate, p.active, p.priceUpdatedAt, now, existing.id)
      );
      updated++;
    } else {
      stmts.push(
        c.env.DB.prepare(
          `INSERT INTO products (id, category_id, sku, brand, name, description, specs, unit, photo, cost_price, cost_currency, pricing_mode, margin_pct, sale_price, sale_currency, vat_rate, active, price_updated_at, created_at, updated_at, version)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`
        ).bind(newId('prd'), p.categoryId, p.sku, p.brand, p.name, p.description, p.specs, p.unit, p.photo, p.costPrice, p.costCurrency, p.pricingMode, p.marginPct, p.salePrice, p.saleCurrency, p.vatRate, p.active, p.priceUpdatedAt, now, now)
      );
      created++;
    }
  }
  if (stmts.length) await c.env.DB.batch(stmts);
  await audit(c, mode === 'prices' ? 'product.bulk_prices' : 'product.bulk_import', 'product', null, `${created} yeni, ${updated} güncellendi, ${skipped} atlandı`);
  return c.json({ created, updated, skipped });
});

/** Seçili ürünlerde yüzde fiyat güncellemesi (zam / indirim) */
catalogRoutes.post('/products/adjust', async (c) => {
  requireAdmin(c);
  const { ids, pct, target } = await c.req.json<{ ids: string[]; pct: number; target: 'sale' | 'cost' | 'both' }>();
  if (!Array.isArray(ids) || !ids.length) fail(400, 'Ürün seçilmedi.');
  const factor = 1 + num(pct) / 100;
  if (factor <= 0) fail(400, 'Geçersiz oran.');
  const now = nowIso();
  const stmts: D1PreparedStatement[] = [];
  for (let i = 0; i < ids.length; i += 40) {
    const chunk = ids.slice(i, i + 40);
    const ph = chunk.map(() => '?').join(',');
    if (target === 'sale' || target === 'both') {
      stmts.push(
        c.env.DB.prepare(
          `UPDATE products SET sale_price = ROUND(sale_price * ?, 2), price_updated_at = ?, updated_at = ?, version = version + 1 WHERE id IN (${ph}) AND (pricing_mode <> 'margin' OR cost_price IS NULL)`
        ).bind(factor, now, now, ...chunk)
      );
    }
    if (target === 'cost' || target === 'both') {
      stmts.push(
        c.env.DB.prepare(
          `UPDATE products SET cost_price = ROUND(cost_price * ?, 2), sale_price = CASE WHEN pricing_mode = 'margin' AND margin_pct IS NOT NULL THEN ROUND(cost_price * ? * (1 + margin_pct / 100.0), 2) ELSE sale_price END, price_updated_at = ?, updated_at = ?, version = version + 1 WHERE id IN (${ph}) AND cost_price IS NOT NULL`
        ).bind(factor, factor, now, now, ...chunk)
      );
    }
  }
  if (stmts.length > 40) fail(400, 'Tek seferde en fazla 800 ürün güncellenebilir.');
  await c.env.DB.batch(stmts);
  await audit(c, 'product.adjust', 'product', null, `${ids.length} ürün, %${pct} (${target})`);
  return c.json({ ok: true });
});

// --- Paketler (Kitler)
const kitOut = (r: { id: string; name: string; description: string | null; icon: string | null; items: string; updated_at: string | null }): Kit => ({
  id: r.id,
  name: r.name,
  description: r.description || '',
  icon: r.icon || 'Layers',
  items: parseJson(r.items, []),
  updatedAt: r.updated_at || undefined,
});

function sanitizeKit(b: Partial<Kit>) {
  const name = str(b.name, 120);
  if (!name) fail(400, 'Paket adı gerekli.');
  const items = (Array.isArray(b.items) ? b.items : [])
    .map((i) => ({ productId: str(i.productId, 60), qty: Math.max(0, num(i.qty, 1)) }))
    .filter((i) => i.productId && i.qty > 0)
    .slice(0, 100);
  return { name, description: str(b.description, 500), icon: str(b.icon, 30) || 'Layers', items: JSON.stringify(items) };
}

catalogRoutes.get('/kits', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM kits ORDER BY name').all();
  return c.json({ kits: (results as unknown as Parameters<typeof kitOut>[0][]).map(kitOut) });
});
catalogRoutes.post('/kits', async (c) => {
  requireAdmin(c);
  const k = sanitizeKit(await c.req.json());
  const id = newId('kit');
  await c.env.DB.prepare('INSERT INTO kits (id, name, description, icon, items, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, k.name, k.description, k.icon, k.items, nowIso(), nowIso())
    .run();
  await audit(c, 'kit.create', 'kit', id, k.name);
  return c.json({ id });
});
catalogRoutes.put('/kits/:id', async (c) => {
  requireAdmin(c);
  const k = sanitizeKit(await c.req.json());
  await c.env.DB.prepare('UPDATE kits SET name=?, description=?, icon=?, items=?, updated_at=? WHERE id=?')
    .bind(k.name, k.description, k.icon, k.items, nowIso(), c.req.param('id'))
    .run();
  await audit(c, 'kit.update', 'kit', c.req.param('id'), k.name);
  return c.json({ ok: true });
});
catalogRoutes.delete('/kits/:id', async (c) => {
  requireAdmin(c);
  await c.env.DB.batch([c.env.DB.prepare('DELETE FROM kits WHERE id = ?').bind(c.req.param('id')), auditStmt(c, 'kit.delete', 'kit', c.req.param('id'))]);
  return c.json({ ok: true });
});

// --- Dosyalar (görsel, logo, kaşe, broşür)
catalogRoutes.post('/files', async (c) => {
  requireAdmin(c);
  const ct = (c.req.header('content-type') || 'application/octet-stream').split(';')[0];
  if (!/^(image\/(png|jpeg|webp|gif|svg\+xml)|application\/pdf)$/.test(ct)) fail(400, 'Sadece görsel (PNG/JPG/WEBP) veya PDF yüklenebilir.');
  const buf = await c.req.arrayBuffer();
  if (buf.byteLength > MAX_FILE) fail(413, 'Dosya 20 MB sınırını aşıyor.');
  if (!buf.byteLength) fail(400, 'Boş dosya.');
  const name = decodeURIComponent(c.req.header('x-file-name') || '');
  const url = await putFile(c.env, buf, ct, name);
  return c.json({ url, size: buf.byteLength });
});

// --- Kur
async function fetchTcmb(): Promise<{ rates: Rates; date: string } | null> {
  try {
    const res = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml', { headers: { 'User-Agent': 'Mozilla/5.0 (OSE Proforma)' } });
    if (!res.ok) return null;
    const xml = await res.text();
    const pick = (code: string) => {
      const m = new RegExp(`Kod="${code}"[\\s\\S]*?<ForexSelling>([\\d.]+)</ForexSelling>`).exec(xml);
      return m ? parseFloat(m[1]) : 0;
    };
    const usd = pick('USD');
    const eur = pick('EUR');
    const date = /Tarih="([\d.]+)"/.exec(xml)?.[1] || '';
    if (!usd || !eur) return null;
    return { rates: { TRY: 1, USD: usd, EUR: eur }, date };
  } catch {
    return null;
  }
}

async function fetchOpenEr(): Promise<{ rates: Rates; date: string } | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/TRY');
    const d = await res.json<{ rates?: Record<string, number>; time_last_update_utc?: string }>();
    if (!d?.rates?.USD || !d.rates.EUR) return null;
    return {
      rates: { TRY: 1, USD: Math.round((1 / d.rates.USD) * 10000) / 10000, EUR: Math.round((1 / d.rates.EUR) * 10000) / 10000 },
      date: new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }),
    };
  } catch {
    return null;
  }
}

catalogRoutes.get('/rates', async (c) => {
  const cacheKey = 'cache:rates';
  if (c.req.query('refresh') !== '1') {
    const cached = await c.env.OSE_DB.get(cacheKey, 'json');
    if (cached) return c.json(cached);
  }
  const tcmb = await fetchTcmb();
  const result = tcmb
    ? { rates: tcmb.rates, source: 'TCMB Döviz Satış', date: tcmb.date }
    : await fetchOpenEr().then((r) => (r ? { rates: r.rates, source: 'Serbest Piyasa (open.er-api)', date: r.date } : null));
  if (!result) fail(503, 'Kur bilgisi alınamadı. Kuru elle girebilirsiniz.');
  await c.env.OSE_DB.put(cacheKey, JSON.stringify(result), { expirationTtl: 1800 });
  return c.json(result);
});

// --- Ayarlar & Broşürler
interface BrochureRow {
  id: string;
  title: string;
  kind: string;
  file_key: string;
  size: number;
  sort: number;
  default_on: number;
}
export const brochureOut = (r: BrochureRow): Brochure => ({
  id: r.id,
  title: r.title,
  kind: r.kind === 'pdf' ? 'pdf' : 'image',
  fileKey: r.file_key,
  size: r.size,
  sort: r.sort,
  defaultOn: !!r.default_on,
});

export async function listBrochures(env: Env) {
  const { results } = await env.DB.prepare('SELECT * FROM brochures ORDER BY sort, created_at').all<BrochureRow>();
  return results.map(brochureOut);
}

function sanitizeTemplate(t: PdfTemplate): PdfTemplate {
  const color = str(t.accentColor, 9);
  return {
    title: str(t.title, 40),
    subtitle: str(t.subtitle, 40),
    slogan: str(t.slogan, 120),
    intro: str(t.intro, 1500),
    accentColor: /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '',
    paymentPlan: (Array.isArray(t.paymentPlan) ? t.paymentPlan : [])
      .slice(0, 12)
      .map((p) => ({ label: str(p.label, 200), pct: num(p.pct) }))
      .filter((p) => p.label || p.pct),
    delivery: str(t.delivery, 1000),
    warranty: str(t.warranty, 3000),
    notes: str(t.notes, 3000),
  };
}

catalogRoutes.get('/settings', async (c) => {
  const settings = await loadSettings(c.env);
  const brochures = await listBrochures(c.env);
  const out: Partial<AppSettings> = { ...settings };
  if (!isAdmin(c)) delete out.notify;
  return c.json({ settings: out, brochures, emailEnabled: !!c.env.RESEND_API_KEY });
});

catalogRoutes.put('/settings', async (c) => {
  requireAdmin(c);
  const body = await c.req.json<Partial<AppSettings>>();
  const merged = mergeSettings({ ...(await loadSettings(c.env)), ...body });
  merged.quote.prefix = (merged.quote.prefix || 'OSE').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'OSE';
  merged.quote.validityDays = Math.max(1, Math.min(365, num(merged.quote.validityDays, 15)));
  for (const k of PDF_TEMPLATE_KEYS) merged.pdf[k] = sanitizeTemplate(merged.pdf[k]);
  // Eski alanları Genel şablonla senkron tut (geriye dönük uyumluluk)
  merged.quote.paymentPlan = merged.pdf.genel.paymentPlan;
  merged.quote.delivery = merged.pdf.genel.delivery;
  merged.quote.warranty = merged.pdf.genel.warranty;
  merged.quote.notes = merged.pdf.genel.notes;
  await c.env.DB.batch([
    setSettingStmt(c.env, 'company', merged.company),
    setSettingStmt(c.env, 'quote', merged.quote),
    setSettingStmt(c.env, 'banks', merged.banks.slice(0, 10)),
    setSettingStmt(c.env, 'notify', merged.notify),
    setSettingStmt(c.env, 'ges', merged.ges),
    setSettingStmt(c.env, 'pdf', merged.pdf),
    auditStmt(c, 'settings.update', 'settings', null, Object.keys(body).join(', ')),
  ]);
  return c.json({ settings: merged });
});

catalogRoutes.post('/brochures', async (c) => {
  requireAdmin(c);
  const b = await c.req.json<Partial<Brochure>>();
  const fileKey = str(b.fileKey, 200);
  if (!fileKey.startsWith('/api/files/')) fail(400, 'Önce dosyayı yükleyin.');
  const id = newId('br');
  const max = await c.env.DB.prepare('SELECT COALESCE(MAX(sort),0) AS m FROM brochures').first<{ m: number }>();
  await c.env.DB.prepare('INSERT INTO brochures (id, title, kind, file_key, size, sort, default_on, created_at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, str(b.title, 120) || 'Broşür', b.kind === 'pdf' ? 'pdf' : 'image', fileKey, num(b.size), (max?.m ?? 0) + 1, b.defaultOn === false ? 0 : 1, nowIso())
    .run();
  await audit(c, 'brochure.create', 'brochure', id, str(b.title, 120));
  return c.json({ brochures: await listBrochures(c.env) });
});

catalogRoutes.put('/brochures/:id', async (c) => {
  requireAdmin(c);
  const b = await c.req.json<Partial<Brochure>>();
  await c.env.DB.prepare('UPDATE brochures SET title = ?, default_on = ?, sort = ? WHERE id = ?')
    .bind(str(b.title, 120) || 'Broşür', b.defaultOn ? 1 : 0, num(b.sort), c.req.param('id'))
    .run();
  return c.json({ brochures: await listBrochures(c.env) });
});

catalogRoutes.delete('/brochures/:id', async (c) => {
  requireAdmin(c);
  const row = await c.env.DB.prepare('SELECT file_key, title FROM brochures WHERE id = ?').bind(c.req.param('id')).first<{ file_key: string; title: string }>();
  if (row) {
    await c.env.DB.prepare('DELETE FROM brochures WHERE id = ?').bind(c.req.param('id')).run();
    const fid = row.file_key.replace('/api/files/', '');
    c.executionCtx.waitUntil(c.env.OSE_DB.delete(`file:${fid}`));
    await audit(c, 'brochure.delete', 'brochure', c.req.param('id'), row.title);
  }
  return c.json({ brochures: await listBrochures(c.env) });
});

export async function getProductsByIds(c: Ctx, ids: string[]): Promise<Map<string, ProductRow>> {
  const map = new Map<string, ProductRow>();
  const uniq = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < uniq.length; i += 90) {
    const chunk = uniq.slice(i, i + 90);
    const { results } = await c.env.DB.prepare(`SELECT * FROM products WHERE id IN (${chunk.map(() => '?').join(',')})`).bind(...chunk).all<ProductRow>();
    for (const r of results) map.set(r.id, r);
  }
  return map;
}
