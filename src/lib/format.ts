import type { Currency } from '../../shared/types';
import { CURRENCY_SYMBOL } from '../../shared/types';

const nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

export const fmtNum = (n: number, digits = 2) =>
  digits === 2 ? nf2.format(n || 0) : new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(n || 0);

export function fmtMoney(n: number, cur: Currency = 'TRY', compact = false): string {
  const v = n || 0;
  if (compact && Math.abs(v) >= 1_000_000) return `${CURRENCY_SYMBOL[cur]}${fmtNum(v / 1_000_000, 2)} Mn`;
  if (compact && Math.abs(v) >= 10_000) return `${CURRENCY_SYMBOL[cur]}${nf0.format(v)}`;
  return cur === 'TRY' ? `${nf2.format(v)} ₺` : `${CURRENCY_SYMBOL[cur]}${nf2.format(v)}`;
}

export const fmtTry = (n: number, compact = false) => fmtMoney(n, 'TRY', compact);

export function parseNum(v: string | number | null | undefined): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  let s = String(v).trim().replace(/\s/g, '');
  // "1.234,56" → 1234.56 | "1234.56" → 1234.56 | "1234,56" → 1234.56
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return '–';
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function fmtRelative(iso?: string | null): string {
  if (!iso) return '–';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} gün önce`;
  return fmtDate(iso);
}

export const todayIso = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
export const addDaysIso = (days: number) => {
  const d = new Date(Date.now() + days * 864e5);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
};
export const daysUntil = (isoDate?: string | null) => {
  if (!isoDate) return null;
  return Math.round((new Date(isoDate + 'T12:00:00').getTime() - new Date(todayIso() + 'T12:00:00').getTime()) / 864e5);
};

export function waLink(phone: string, text: string) {
  let p = (phone || '').replace(/\D/g, '');
  if (p.startsWith('0')) p = '90' + p.slice(1);
  else if (p.length === 10 && p.startsWith('5')) p = '90' + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export const slug = (s: string) =>
  s
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50);

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const fileSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
