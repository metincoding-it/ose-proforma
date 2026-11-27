import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv, Env } from './core';
import { fail, newId, nowIso, randomToken, str, audit, requireAdmin, num } from './core';
import type { Role, User } from '../shared/types';

const COOKIE = 'ose_session';
const SESSION_DAYS = 30;
// Ücretsiz planda istek başına ~10 ms CPU sınırı var; 20.000 tur ≈ 4-5 ms (hız sınırlama + uzun şifre ile birlikte yeterli)
const PBKDF2_ITER = 20_000;

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));

export async function sha256(text: string) {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

/** Tuz alanı "tur:hex" biçiminde saklanır; böylece tur sayısı ileride değiştirilebilir. */
export async function hashPassword(password: string, saltField?: string) {
  let iterations = PBKDF2_ITER;
  let saltHex = saltField;
  if (saltField && saltField.includes(':')) {
    const [it, hex] = saltField.split(':');
    iterations = parseInt(it, 10) || PBKDF2_ITER;
    saltHex = hex;
  } else if (saltField) {
    iterations = 100_000; // eski biçim
  }
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return { hash: toHex(bits), salt: `${iterations}:${toHex(salt.buffer as ArrayBuffer)}` };
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: number;
  discount_limit: number | null;
  must_change_password: number;
  created_at: string;
  last_login_at: string | null;
}

export function userOut(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    active: !!r.active,
    discountLimit: r.discount_limit,
    mustChangePassword: !!r.must_change_password,
    createdAt: r.created_at,
    lastLoginAt: r.last_login_at,
  };
}

function validatePassword(pw: string) {
  if (pw.length < 8) fail(400, 'Şifre en az 8 karakter olmalı.');
}

function validateEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Geçerli bir e-posta adresi girin.');
}

async function createSession(c: Parameters<MiddlewareHandler<AppEnv>>[0], userId: string) {
  const token = randomToken(32);
  const now = Date.now();
  await c.env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at, user_agent) VALUES (?,?,?,?,?)')
    .bind(await sha256(token), userId, now + SESSION_DAYS * 864e5, now, str(c.req.header('user-agent'), 200))
    .run();
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
}

/** Çerezden oturum kullanıcısını bulur (yoksa null). */
export async function sessionUser(env: Env, token: string | undefined): Promise<(UserRow & { expires_at: number; token_hash: string }) | null> {
  if (!token) return null;
  const th = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.*, s.expires_at, s.token_hash FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`
  )
    .bind(th, Date.now())
    .first<UserRow & { expires_at: number; token_hash: string }>();
  return row || null;
}

export async function hasSession(c: Parameters<MiddlewareHandler<AppEnv>>[0]) {
  return !!(await sessionUser(c.env, getCookie(c, COOKIE)));
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const row = await sessionUser(c.env, getCookie(c, COOKIE));
  if (!row) fail(401, 'Oturum süresi doldu, lütfen tekrar giriş yapın.', 'UNAUTHORIZED');
  // Kayan oturum: süresinin yarısı geçtiyse uzat
  if (row.expires_at - Date.now() < (SESSION_DAYS / 2) * 864e5) {
    c.executionCtx.waitUntil(
      c.env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
        .bind(Date.now() + SESSION_DAYS * 864e5, row.token_hash)
        .run()
        .then(() => undefined)
    );
  }
  c.set('user', userOut(row));
  await next();
};

// ---------------- ROTALAR ----------------

export const authRoutes = new Hono<AppEnv>();

authRoutes.get('/status', async (c) => {
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
  const row = await sessionUser(c.env, getCookie(c, COOKIE));
  return c.json({ needsSetup: !count?.n, user: row ? userOut(row) : null });
});

authRoutes.post('/setup', async (c) => {
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
  if (count?.n) fail(409, 'Kurulum zaten tamamlanmış.');
  const body = await c.req.json<{ name: string; email: string; password: string }>();
  const name = str(body.name, 100);
  const email = str(body.email, 200).toLowerCase();
  if (!name) fail(400, 'Ad soyad gerekli.');
  validateEmail(email);
  validatePassword(body.password || '');
  const { hash, salt } = await hashPassword(body.password);
  const id = newId('usr');
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, name, role, password_hash, password_salt, active, created_at) VALUES (?,?,?,?,?,?,1,?)'
  )
    .bind(id, email, name, 'admin', hash, salt, nowIso())
    .run();
  await createSession(c, id);
  return c.json({ ok: true });
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const email = str(body.email, 200).toLowerCase();
  const ip = c.req.header('cf-connecting-ip') || '';
  const since = Date.now() - 15 * 60 * 1000;
  const attempts = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE (email = ? OR ip = ?) AND created_at > ?')
    .bind(email, ip, since)
    .first<{ n: number }>();
  if ((attempts?.n ?? 0) >= 10) fail(429, 'Çok fazla hatalı deneme. Lütfen 15 dakika sonra tekrar deneyin.');

  const row = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow & { password_hash: string; password_salt: string }>();
  let ok = false;
  if (row && row.active) {
    const { hash } = await hashPassword(body.password || '', row.password_salt);
    ok = timingSafeEqual(hash, row.password_hash);
  }
  if (!ok || !row) {
    await c.env.DB.prepare('INSERT INTO login_attempts (email, ip, created_at) VALUES (?,?,?)').bind(email, ip, Date.now()).run();
    fail(401, 'E-posta veya şifre hatalı.');
  }
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(nowIso(), row.id),
    c.env.DB.prepare('DELETE FROM login_attempts WHERE created_at < ? OR email = ?').bind(since, email),
    c.env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()),
  ]);
  await createSession(c, row.id);
  return c.json({ user: userOut(row) });
});

authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, COOKIE);
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  deleteCookie(c, COOKIE, { path: '/' });
  return c.json({ ok: true });
});

authRoutes.get('/me', requireAuth, (c) => c.json({ user: c.get('user') }));

authRoutes.post('/password', requireAuth, async (c) => {
  const body = await c.req.json<{ current: string; next: string }>();
  const u = c.get('user');
  const row = await c.env.DB.prepare('SELECT password_hash, password_salt FROM users WHERE id = ?').bind(u.id).first<{ password_hash: string; password_salt: string }>();
  if (!row) fail(404, 'Kullanıcı bulunamadı.');
  const { hash } = await hashPassword(body.current || '', row.password_salt);
  if (!timingSafeEqual(hash, row.password_hash)) fail(400, 'Mevcut şifre hatalı.');
  validatePassword(body.next || '');
  const n = await hashPassword(body.next);
  const token = getCookie(c, COOKIE) || '';
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 0 WHERE id = ?').bind(n.hash, n.salt, u.id),
    // Diğer cihazlardaki oturumları kapat
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').bind(u.id, await sha256(token)),
  ]);
  await audit(c, 'password.change', 'user', u.id);
  return c.json({ ok: true });
});

// ---------------- KULLANICI YÖNETİMİ (ADMIN) ----------------

export const userRoutes = new Hono<AppEnv>();
userRoutes.use('*', requireAuth);

userRoutes.get('/', async (c) => {
  requireAdmin(c);
  const { results } = await c.env.DB.prepare('SELECT * FROM users ORDER BY created_at').all<UserRow>();
  return c.json({ users: results.map(userOut) });
});

userRoutes.post('/', async (c) => {
  requireAdmin(c);
  const body = await c.req.json<{ name: string; email: string; role: Role; password: string; discountLimit?: number | null }>();
  const name = str(body.name, 100);
  const email = str(body.email, 200).toLowerCase();
  if (!name) fail(400, 'Ad soyad gerekli.');
  validateEmail(email);
  validatePassword(body.password || '');
  const role: Role = body.role === 'admin' ? 'admin' : 'sales';
  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) fail(409, 'Bu e-posta ile kayıtlı bir kullanıcı zaten var.');
  const { hash, salt } = await hashPassword(body.password);
  const id = newId('usr');
  const dl = body.discountLimit == null || (body.discountLimit as unknown) === '' ? null : num(body.discountLimit);
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, name, role, password_hash, password_salt, active, discount_limit, must_change_password, created_at) VALUES (?,?,?,?,?,?,1,?,1,?)'
  )
    .bind(id, email, name, role, hash, salt, dl, nowIso())
    .run();
  await audit(c, 'user.create', 'user', id, `${name} (${role})`);
  return c.json({ id });
});

userRoutes.put('/:id', async (c) => {
  requireAdmin(c);
  const id = c.req.param('id');
  const body = await c.req.json<{ name: string; role: Role; active: boolean; discountLimit?: number | null; password?: string }>();
  const me = c.get('user');
  if (id === me.id && (body.role !== 'admin' || body.active === false)) {
    fail(400, 'Kendi yönetici yetkinizi kaldıramaz veya hesabınızı pasifleştiremezsiniz.');
  }
  const role: Role = body.role === 'admin' ? 'admin' : 'sales';
  const dl = body.discountLimit == null || (body.discountLimit as unknown) === '' ? null : num(body.discountLimit);
  const stmts = [
    c.env.DB.prepare('UPDATE users SET name = ?, role = ?, active = ?, discount_limit = ? WHERE id = ?').bind(
      str(body.name, 100),
      role,
      body.active ? 1 : 0,
      dl,
      id
    ),
  ];
  if (body.password) {
    validatePassword(body.password);
    const { hash, salt } = await hashPassword(body.password);
    stmts.push(c.env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, must_change_password = 1 WHERE id = ?').bind(hash, salt, id));
    stmts.push(c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id));
  }
  if (!body.active) stmts.push(c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id));
  await c.env.DB.batch(stmts);
  await audit(c, 'user.update', 'user', id, `${body.name} (${role}${body.active ? '' : ', pasif'}${body.password ? ', şifre sıfırlandı' : ''})`);
  return c.json({ ok: true });
});
