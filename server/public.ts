import { Hono } from 'hono';
import type { AppEnv, Ctx, Env } from './core';
import { fail, loadSettings, nowIso, str, parseJson } from './core';
import { hasSession } from './auth';
import { quoteOut, stripCosts, eventStmt, type QuoteRow } from './quotes';
import { listBrochures } from './catalog';
import { sendMail, escapeHtml } from './mail';
import type { QuoteTotals, CustomerSnapshot } from '../shared/types';

export const publicRoutes = new Hono<AppEnv>();

async function byToken(env: Env, token: string | undefined) {
  token = token || '';
  if (!token || token.length < 16) fail(404, 'Teklif bulunamadı.');
  const row = await env.DB.prepare('SELECT * FROM quotes WHERE public_token = ?').bind(token).first<QuoteRow>();
  if (!row) fail(404, 'Teklif bulunamadı veya bağlantı geçersiz.');
  return row;
}

const todayTr = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });

publicRoutes.get('/q/:token', async (c) => {
  const row = await byToken(c.env, c.req.param('token'));
  const settings = await loadSettings(c.env);
  const brochures = await listBrochures(c.env);
  let newer: { number: string; token: string | null } | null = null;
  if (row.superseded_by) {
    const n = await c.env.DB.prepare(
      'SELECT number, public_token FROM quotes WHERE base_number = ? AND superseded_by IS NULL ORDER BY revision DESC LIMIT 1'
    )
      .bind(row.base_number)
      .first<{ number: string; public_token: string | null }>();
    if (n) newer = { number: n.number, token: n.public_token };
  }
  // Ekipten biri bakıyorsa görüntülenme sayılmaz
  const internal = await hasSession(c);
  if (!internal && c.req.query('preview') !== '1') {
    const first = row.view_count === 0;
    const stmts = [
      c.env.DB.prepare('UPDATE quotes SET view_count = view_count + 1, last_viewed_at = ? WHERE id = ?').bind(nowIso(), row.id),
    ];
    // Aynı gün tekrar eden görüntülemelerde olay kaydını şişirme
    const lastView = row.last_viewed_at ? row.last_viewed_at.slice(0, 10) : '';
    if (first || lastView !== new Date().toISOString().slice(0, 10)) {
      stmts.push(eventStmt(c, row.id, 'viewed', first ? 'Müşteri teklifi ilk kez görüntüledi' : 'Müşteri teklifi tekrar görüntüledi', 'Müşteri'));
    }
    await c.env.DB.batch(stmts);
    if (first && settings.notify.onView) {
      c.executionCtx.waitUntil(notify(c.env, settings, row, 'viewed', '', ''));
    }
  }
  const q = stripCosts(quoteOut(row, false));
  return c.json({
    quote: { ...q, publicToken: row.public_token },
    company: settings.company,
    banks: settings.banks,
    accentColor: settings.quote.accentColor,
    brochures: brochures.filter((b) => q.options.brochureIds.includes(b.id)),
    newer,
    expired: !!row.valid_until && row.valid_until < todayTr(),
  });
});

async function customerAction(c: Ctx, kind: 'approve' | 'revision') {
  const row = await byToken(c.env, c.req.param('token'));
  const body = await c.req.json<{ name?: string; note?: string }>().catch(() => ({} as { name?: string; note?: string }));
  const name = str(body.name, 120);
  const note = str(body.note, 2000);
  if (row.superseded_by) fail(409, 'Bu teklifin daha güncel bir revizyonu mevcut.');
  if (row.status === 'cancelled') fail(409, 'Bu teklif iptal edilmiş.');
  if (row.status === 'approved') fail(409, 'Bu teklif zaten onaylanmış.');
  if (row.approval_required) fail(409, 'Teklif henüz son halini almadı.');
  if (kind === 'approve') {
    if (row.valid_until && row.valid_until < todayTr()) fail(409, 'Teklifin geçerlilik süresi dolmuş. Lütfen bizimle iletişime geçin.');
    if (!name) fail(400, 'Lütfen adınızı ve soyadınızı yazın.');
  } else if (!note) {
    fail(400, 'Lütfen revize talebinizi kısaca açıklayın.');
  }
  const now = nowIso();
  const actor = name || 'Müşteri';
  if (kind === 'approve') {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE quotes SET status = 'approved', approved_at = ?, approved_name = ?, customer_note = ?, updated_at = ?, version = version + 1 WHERE id = ?"
      ).bind(now, name, note || null, now, row.id),
      eventStmt(c, row.id, 'customer_approved', `Müşteri teklifi onayladı${note ? `: "${note}"` : ''}`, actor),
    ]);
  } else {
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE quotes SET status = 'revision', customer_note = ?, updated_at = ?, version = version + 1 WHERE id = ?").bind(note, now, row.id),
      eventStmt(c, row.id, 'customer_revision', `Müşteri revize istedi: "${note}"`, actor),
    ]);
  }
  const settings = await loadSettings(c.env);
  if ((kind === 'approve' && settings.notify.onApprove) || (kind === 'revision' && settings.notify.onRevision)) {
    c.executionCtx.waitUntil(notify(c.env, settings, row, kind, actor, note, new URL(c.req.url).origin));
  }
  return c.json({ ok: true });
}

publicRoutes.post('/q/:token/approve', (c) => customerAction(c, 'approve'));
publicRoutes.post('/q/:token/revision', (c) => customerAction(c, 'revision'));

async function notify(
  env: Env,
  settings: Awaited<ReturnType<typeof loadSettings>>,
  row: QuoteRow,
  kind: 'approve' | 'revision' | 'viewed',
  actor: string,
  note: string,
  origin = ''
) {
  if (!env.RESEND_API_KEY || !settings.notify.email) return;
  const snap = parseJson<CustomerSnapshot>(row.customer, {} as CustomerSnapshot);
  const totals = parseJson<QuoteTotals>(row.totals, {} as QuoteTotals);
  const customer = snap.company || snap.name || 'Müşteri';
  const amount = `${(totals.grand ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${row.currency}`;
  const titles = {
    approve: `✅ Teklif onaylandı: ${row.number} – ${customer}`,
    revision: `✏️ Revize talebi: ${row.number} – ${customer}`,
    viewed: `👀 Teklif görüntülendi: ${row.number} – ${customer}`,
  };
  const lines = {
    approve: `<b>${escapeHtml(customer)}</b>, <b>${escapeHtml(row.number)}</b> numaralı teklifi <b>${escapeHtml(actor)}</b> adına onayladı.`,
    revision: `<b>${escapeHtml(customer)}</b>, <b>${escapeHtml(row.number)}</b> numaralı teklif için revize talep etti.`,
    viewed: `<b>${escapeHtml(customer)}</b>, <b>${escapeHtml(row.number)}</b> numaralı teklifi ilk kez açtı.`,
  };
  const link = origin ? `${origin}/teklifler/${row.id}` : '';
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0f172a;max-width:560px">
    <h2 style="margin:0 0 12px">${escapeHtml(titles[kind])}</h2>
    <p>${lines[kind]}</p>
    <p>Teklif tutarı: <b>${escapeHtml(amount)}</b></p>
    ${note ? `<p style="background:#f1f5f9;padding:12px;border-radius:8px">Müşteri notu: ${escapeHtml(note)}</p>` : ''}
    ${link ? `<p><a href="${link}" style="background:#00b8e6;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Teklifi aç</a></p>` : ''}
    <p style="color:#64748b;font-size:12px">${escapeHtml(settings.company.name)} Proforma Sistemi</p></div>`;
  await sendMail(env, { to: settings.notify.email, from: settings.notify.fromEmail, subject: titles[kind], html });
}
