import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from './core';
import { ensureSchema, fail } from './core';
import { authRoutes, userRoutes } from './auth';
import { catalogRoutes } from './catalog';
import { quoteRoutes, customerRoutes } from './quotes';
import { publicRoutes } from './public';
import { reportRoutes, adminRoutes, proxyRoutes } from './admin';

const app = new Hono<AppEnv>().basePath('/api');

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    let body: { error: string; code?: string };
    try {
      body = JSON.parse(err.message);
    } catch {
      body = { error: err.message || 'Hata' };
    }
    return c.json(body, err.status);
  }
  console.error(err);
  const msg = String((err as Error)?.message || err);
  if (msg.includes('UNIQUE constraint failed')) return c.json({ error: 'Bu kayıt zaten mevcut (benzersiz alan çakışması).', code: 'UNIQUE' }, 409);
  return c.json({ error: 'Sunucu hatası: ' + msg.slice(0, 200), code: '500' }, 500);
});

// Dosya indirme (görseller, broşürler) – herkese açık, rastgele anahtarlı ve değişmez
app.get('/files/:id', async (c) => {
  const id = c.req.param('id').replace(/[^a-zA-Z0-9_]/g, '');
  const obj = await c.env.OSE_DB.getWithMetadata<{ ct?: string; name?: string }>(`file:${id}`, 'arrayBuffer');
  if (!obj.value) return c.json({ error: 'Dosya bulunamadı' }, 404);
  return new Response(obj.value, {
    headers: {
      'Content-Type': obj.metadata?.ct || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

// CSRF koruması: veri değiştiren isteklerde Origin başka siteden olamaz
app.use('*', async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = c.req.header('origin');
    if (origin && new URL(origin).host !== new URL(c.req.url).host) fail(403, 'Geçersiz istek kaynağı.');
  }
  await ensureSchema(c.env);
  await next();
});

app.get('/health', (c) => c.json({ ok: true, d1: !!c.env.DB, kv: !!c.env.OSE_DB, email: !!c.env.RESEND_API_KEY }));

app.route('/auth', authRoutes);
app.route('/users', userRoutes);
app.route('/quotes', quoteRoutes);
app.route('/customers', customerRoutes);
app.route('/public', publicRoutes);
app.route('/reports', reportRoutes);
app.route('/admin', adminRoutes);
app.route('/img-proxy', proxyRoutes);
// Katalog en sona: kendi '*' kimlik doğrulama ara katmanı diğer (herkese açık) rotaları etkilemesin
app.route('/', catalogRoutes);

app.notFound((c) => c.json({ error: 'Bulunamadı' }, 404));

export default app;
