import type { Currency } from '../../shared/types';

const ONES = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
const TENS = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
const GROUPS = ['', 'Bin', 'Milyon', 'Milyar', 'Trilyon'];

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const parts: string[] = [];
  if (h) parts.push(h === 1 ? 'Yüz' : `${ONES[h]} Yüz`);
  if (t) parts.push(TENS[t]);
  if (o) parts.push(ONES[o]);
  return parts.join(' ');
}

export function numberToWordsTr(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'Sıfır';
  const parts: string[] = [];
  let g = 0;
  while (n > 0 && g < GROUPS.length) {
    const chunk = n % 1000;
    if (chunk) {
      // 1000 → "Bin" ("Bir Bin" değil)
      const w = g === 1 && chunk === 1 ? '' : threeDigits(chunk);
      parts.unshift([w, GROUPS[g]].filter(Boolean).join(' '));
    }
    n = Math.floor(n / 1000);
    g++;
  }
  return parts.join(' ');
}

const NAMES: Record<Currency, [string, string]> = {
  TRY: ['Türk Lirası', 'Kuruş'],
  USD: ['ABD Doları', 'Sent'],
  EUR: ['Euro', 'Sent'],
};

export function amountInWords(amount: number, cur: Currency): string {
  const rounded = Math.round(amount * 100) / 100;
  const whole = Math.floor(rounded);
  const frac = Math.round((rounded - whole) * 100);
  const [main, sub] = NAMES[cur];
  return `${numberToWordsTr(whole)} ${main}${frac ? ` ${numberToWordsTr(frac)} ${sub}` : ''}`;
}
