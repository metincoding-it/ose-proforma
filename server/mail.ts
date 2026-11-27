import type { Env } from './core';

export const escapeHtml = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export async function sendMail(env: Env, m: { to: string; from: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
  if (!env.RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY tanımlı değil.' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: m.from || 'OSE Proforma <onboarding@resend.dev>',
        to: m.to.split(',').map((s) => s.trim()).filter(Boolean),
        subject: m.subject,
        html: m.html,
      }),
    });
    if (!res.ok) return { ok: false, error: `Resend: ${res.status} ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
