import type { jsPDF as JsPDF } from 'jspdf';
import type { CellHookData, RowInput, CellDef } from 'jspdf-autotable';
import type { BankAccount, Brochure, CompanySettings, Currency, Quote, QuoteLine } from '../../shared/types';
import { CURRENCY_SYMBOL, CURRENCIES } from '../../shared/types';
import { calcQuote, displayLine } from '../../shared/calc';
import { amountInWords } from './words';

export interface PdfInput {
  quote: Quote;
  company: CompanySettings;
  banks: BankAccount[];
  brochures: Brochure[];
  accent?: string;
  publicUrl?: string | null;
  proxyToken?: string | null;
  /** Ana kategori şablonundan gelen başlık metinleri */
  template?: { title?: string; subtitle?: string; slogan?: string };
}

// ---------------- yardımcılar ----------------

const nf = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (v: number, c: Currency) => (c === 'TRY' ? `${nf.format(v)} ₺` : `${CURRENCY_SYMBOL[c]}${nf.format(v)}`);
const qtyFmt = (v: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 3 }).format(v);
const dateFmt = (iso?: string | null) => {
  if (!iso) return '–';
  const d = iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || '#00b8e6').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mix = (rgb: [number, number, number], w: number): [number, number, number] =>
  rgb.map((c) => Math.round(c * w + 255 * (1 - w))) as [number, number, number];
const darken = (rgb: [number, number, number], f: number): [number, number, number] => rgb.map((c) => Math.round(c * f)) as [number, number, number];

let fontCache: Record<string, string> | null = null;
async function loadFonts(): Promise<Record<string, string>> {
  if (fontCache) return fontCache;
  const files = { normal: 'Inter-400Regular.ttf', semibold: 'Inter-600SemiBold.ttf', bold: 'Inter-700Bold.ttf', heavy: 'Inter-800ExtraBold.ttf' };
  const out: Record<string, string> = {};
  await Promise.all(
    Object.entries(files).map(async ([style, file]) => {
      const buf = await (await fetch(`/fonts/${file}`)).arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      out[style] = btoa(bin);
    })
  );
  fontCache = out;
  return out;
}

interface LoadedImage {
  data: string;
  w: number;
  h: number;
  fmt: 'PNG' | 'JPEG';
}

function imgUrl(src: string, proxyToken?: string | null) {
  if (/^https?:\/\//i.test(src) && !src.startsWith(location.origin)) {
    return `/api/img-proxy?url=${encodeURIComponent(src)}${proxyToken ? `&t=${encodeURIComponent(proxyToken)}` : ''}`;
  }
  return src;
}

async function loadImage(src: string | undefined, opts: { png?: boolean; max?: number; proxyToken?: string | null } = {}): Promise<LoadedImage | null> {
  if (!src) return null;
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = imgUrl(src, opts.proxyToken);
    });
    const max = opts.max ?? 400;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    if (!opts.png) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(img, 0, 0, w, h);
    return { data: canvas.toDataURL(opts.png ? 'image/png' : 'image/jpeg', 0.88), w, h, fmt: opts.png ? 'PNG' : 'JPEG' };
  } catch {
    return null;
  }
}

function drawContain(doc: JsPDF, img: LoadedImage, x: number, y: number, w: number, h: number) {
  const s = Math.min(w / img.w, h / img.h);
  const dw = img.w * s;
  const dh = img.h * s;
  doc.addImage(img.data, img.fmt, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, undefined, 'FAST');
}

// ---------------- ana üretici ----------------

export async function buildQuotePdf(input: PdfInput): Promise<Blob> {
  const [{ jsPDF }, autoTableMod, fonts] = await Promise.all([import('jspdf'), import('jspdf-autotable'), loadFonts()]);
  const autoTable = autoTableMod.default;
  const { quote: q, company } = input;
  const accent = hexToRgb(input.accent || '#00b8e6');
  const accentDark = darken(accent, 0.62);
  const accentSoft = mix(accent, 0.1);
  const INK: [number, number, number] = [15, 23, 42];
  const MUTED: [number, number, number] = [100, 116, 139];
  const LINE: [number, number, number] = [226, 232, 240];
  const SOFT: [number, number, number] = [248, 250, 252];

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  for (const [style, data] of Object.entries(fonts)) {
    doc.addFileToVFS(`Inter-${style}.ttf`, data);
    doc.addFont(`Inter-${style}.ttf`, 'Inter', style);
  }
  doc.setFont('Inter', 'normal');
  doc.setProperties({ title: `${q.number} - ${company.name}`, author: company.title || company.name, subject: q.title || 'Fiyat Teklifi', creator: 'OSE Proforma' });

  const PW = 210;
  const PH = 297;
  const M = 14;
  const CW = PW - M * 2;
  const TOP2 = 20; // devam sayfaları üst boşluğu
  const BOTTOM = 20;
  const font = (style: 'normal' | 'semibold' | 'bold' | 'heavy', size: number, color: [number, number, number] = INK) => {
    doc.setFont('Inter', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const { lines: calc, totals } = calcQuote(q);
  const opts = q.options;
  const showPrices = opts.showUnitPrices;
  const priced = q.lines.filter((l) => l.type !== 'section');
  const showPhotos = opts.showPhotos && priced.some((l) => l.photo);
  const anyDiscount = showPrices && q.lines.some((l, i) => l.type !== 'section' && calc[i].lineDiscount > 0.004);

  // Görselleri paralel yükle
  const [logo, stamp, qrData, ...photos] = await Promise.all([
    loadImage(company.logo, { png: true, max: 500 }),
    loadImage(company.stamp, { png: true, max: 600 }),
    input.publicUrl
      ? import('qrcode').then((m) => m.toDataURL(input.publicUrl!, { margin: 0, width: 320, errorCorrectionLevel: 'M' })).catch(() => null)
      : Promise.resolve(null),
    ...q.lines.map((l) => (showPhotos && l.type !== 'section' && l.photo ? loadImage(l.photo, { max: 260, proxyToken: input.proxyToken }) : Promise.resolve(null))),
  ]);

  // ---------- 1. ANTET ----------
  doc.setFillColor(...accent);
  doc.rect(0, 0, PW, 2.6, 'F');
  let x = M;
  if (logo) {
    drawContain(doc, logo, M, 9, 22, 22);
    x = M + 26;
  }
  font('heavy', 15);
  doc.text(company.name || 'Firma', x, 15.5);
  font('normal', 8, MUTED);
  let hy = 20;
  const slogan = input.template?.slogan || company.slogan;
  if (slogan) {
    doc.text(slogan, x, hy);
    hy += 4;
  }
  const addr = [company.address, company.city].filter(Boolean).join(', ');
  if (addr) {
    const al = doc.splitTextToSize(addr, 100);
    doc.text(al.slice(0, 2), x, hy);
    hy += 3.6 * Math.min(2, al.length);
  }
  const contact = [company.phone && `Tel: ${company.phone}`, company.phone2, company.email, company.website].filter(Boolean).join('  •  ');
  if (contact) {
    doc.text(contact, x, hy);
    hy += 3.6;
  }
  const tax = [company.taxOffice && `${company.taxOffice} V.D.`, company.taxNo && `VKN: ${company.taxNo}`, company.mersis && `MERSİS: ${company.mersis}`].filter(Boolean).join('  •  ');
  if (tax) {
    doc.text(tax, x, hy);
    hy += 3.6;
  }

  const pdfTitle = (input.template?.title ?? 'FİYAT TEKLİFİ') || 'FİYAT TEKLİFİ';
  const pdfSub = input.template?.subtitle ?? 'PROFORMA';
  font('heavy', pdfTitle.length > 16 ? 14 : 17, accent);
  doc.text(pdfTitle, PW - M, 16, { align: 'right' });
  if (pdfSub) {
    font('semibold', 7.5, MUTED);
    doc.text(pdfSub, PW - M, 20.5, { align: 'right', charSpace: 1.2 });
  }

  // ---------- 2. MÜŞTERİ + TEKLİF BİLGİLERİ ----------
  let y = Math.max(36, hy + 4);
  const c = q.customer;
  const custW = 112;
  const metaX = M + custW + 4;
  const metaW = CW - custW - 4;
  const custLines: { text: string; style: 'bold' | 'normal' | 'semibold'; size: number; color: [number, number, number] }[] = [];
  const primaryName = c.company || c.name || 'Değerli Müşterimiz';
  doc.setFont('Inter', 'bold');
  doc.setFontSize(11);
  for (const t of doc.splitTextToSize(primaryName, custW - 10)) custLines.push({ text: t, style: 'bold', size: 11, color: INK });
  if (c.company && c.name) custLines.push({ text: `Yetkili: ${c.name}`, style: 'semibold', size: 8.5, color: INK });
  doc.setFont('Inter', 'normal');
  doc.setFontSize(8);
  const caddr = [c.address, c.city].filter(Boolean).join(', ');
  if (caddr) for (const t of doc.splitTextToSize(caddr, custW - 10).slice(0, 3)) custLines.push({ text: t, style: 'normal', size: 8, color: MUTED });
  const cc = [c.phone && `Tel: ${c.phone}`, c.email].filter(Boolean).join('  •  ');
  if (cc) custLines.push({ text: cc, style: 'normal', size: 8, color: MUTED });
  const ct = [c.taxOffice && `V.D.: ${c.taxOffice}`, c.taxNo && `${c.kind === 'person' ? 'TCKN' : 'VKN'}: ${c.taxNo}`].filter(Boolean).join('  •  ');
  if (ct) custLines.push({ text: ct, style: 'normal', size: 8, color: MUTED });

  const meta: [string, string][] = [
    ['Teklif No', q.number || 'TASLAK'],
    ['Tarih', dateFmt(q.createdAt || new Date().toISOString())],
    ['Geçerlilik', dateFmt(q.validUntil)],
  ];
  if (q.revision > 1) meta.push(['Revizyon', `v${q.revision}`]);
  if (q.createdByName) meta.push(['Hazırlayan', q.createdByName]);
  meta.push(['Para Birimi', q.currency === 'TRY' ? 'Türk Lirası (₺)' : q.currency === 'USD' ? 'ABD Doları ($)' : 'Euro (€)']);

  const custH = 10 + custLines.reduce((s, l) => s + l.size * 0.43 + 0.9, 0) + 2;
  const metaH = 6 + meta.length * 5.2 + 2;
  const boxH = Math.max(custH, metaH, 30);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.setFillColor(...SOFT);
  doc.roundedRect(M, y, custW, boxH, 2.5, 2.5, 'FD');
  doc.setFillColor(...accent);
  doc.rect(M, y + 4, 1.1, boxH - 8, 'F');
  font('bold', 7, accentDark);
  doc.text('SAYIN', M + 5, y + 6.5, { charSpace: 0.8 });
  let cy = y + 12;
  for (const l of custLines) {
    font(l.style, l.size, l.color);
    doc.text(l.text, M + 5, cy);
    cy += l.size * 0.43 + 0.9;
  }
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(metaX, y, metaW, boxH, 2.5, 2.5, 'FD');
  let my = y + 7;
  for (const [k, v] of meta) {
    font('normal', 8, MUTED);
    doc.text(k, metaX + 4, my);
    font(k === 'Teklif No' ? 'bold' : 'semibold', k === 'Teklif No' ? 9 : 8.3, k === 'Teklif No' ? accentDark : INK);
    doc.text(v, metaX + metaW - 4, my, { align: 'right' });
    my += 5.2;
  }
  y += boxH + 5;

  // Proje başlığı + GES özet
  if (q.title || q.ges) {
    doc.setFillColor(...accentSoft);
    const chips = q.ges
      ? [
          `Kurulu Güç: ${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(q.ges.kwp)} kWp`,
          q.ges.panelCount ? `${q.ges.panelCount} Panel × ${q.ges.panelW} W` : '',
          q.ges.yearlyKwh ? `Tahmini Yıllık Üretim: ${new Intl.NumberFormat('tr-TR').format(Math.round(q.ges.yearlyKwh))} kWh` : '',
        ].filter(Boolean)
      : [];
    const h = q.title && chips.length ? 14 : 9;
    doc.roundedRect(M, y, CW, h, 2, 2, 'F');
    let ty = y + 5.8;
    if (q.title) {
      font('bold', 7, accentDark);
      doc.text('PROJE / KONU', M + 4, ty, { charSpace: 0.6 });
      font('bold', 9.5);
      doc.text(doc.splitTextToSize(q.title, CW - 40)[0], M + 30, ty);
      ty += 5.5;
    }
    if (chips.length) {
      font('semibold', 8, accentDark);
      doc.text(chips.join('    •    '), q.title ? M + 30 : M + 4, ty);
    }
    y += h + 4;
  }

  // Ön yazı
  const intro = (q.terms.intro || '').trim();
  if (intro) {
    const salutation = c.name ? `Sayın ${c.name},` : c.company ? `Sayın ${c.company} yetkilisi,` : '';
    font('normal', 8.3, [51, 65, 85]);
    const lines = doc.splitTextToSize(intro, CW) as string[];
    if (salutation) {
      font('semibold', 8.3, INK);
      doc.text(salutation, M, y + 1);
      y += 4.6;
      font('normal', 8.3, [51, 65, 85]);
    }
    doc.text(lines, M, y + 1, { lineHeightFactor: 1.45 });
    y += lines.length * 8.3 * 0.3528 * 1.45 + 4;
  }

  // ---------- 3. KALEM TABLOSU ----------
  type Col = { key: string; header: string; width: number; align: 'left' | 'center' | 'right' };
  const cols: Col[] = [{ key: 'no', header: '#', width: 8, align: 'center' }];
  if (showPhotos) cols.push({ key: 'photo', header: 'GÖRSEL', width: 17, align: 'center' });
  cols.push({ key: 'desc', header: 'ÜRÜN / AÇIKLAMA', width: 0, align: 'left' });
  cols.push({ key: 'qty', header: 'MİKTAR', width: 21, align: 'center' });
  if (showPrices) {
    cols.push({ key: 'unit', header: q.vatMode === 'included' ? 'B.FİYAT (KDV D.)' : 'BİRİM FİYAT', width: 27, align: 'right' });
    if (anyDiscount) cols.push({ key: 'disc', header: 'İSK.', width: 14, align: 'right' });
    cols.push({ key: 'total', header: q.vatMode === 'included' ? 'TUTAR (KDV D.)' : 'TUTAR', width: 29, align: 'right' });
  }
  const fixed = cols.reduce((s, c2) => s + c2.width, 0);
  const descCol = cols.find((c2) => c2.key === 'desc')!;
  descCol.width = CW - fixed;
  const idx = (k: string) => cols.findIndex((c2) => c2.key === k);

  const rowLine: (QuoteLine | null)[] = [];
  const rowPhoto: (LoadedImage | null)[] = [];
  const body: RowInput[] = [];
  let no = 0;
  q.lines.forEach((l, i) => {
    if (l.type === 'section') {
      body.push([
        {
          content: l.title.toUpperCase(),
          colSpan: cols.length,
          styles: { halign: 'left', fillColor: accentSoft, textColor: accentDark, font: 'Inter', fontStyle: 'bold', fontSize: 8, cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 } },
        } as CellDef,
      ]);
      rowLine.push(null);
      rowPhoto.push(null);
      return;
    }
    no++;
    const lc = calc[i];
    const disp = displayLine(lc, l.qty, l.vatRate, q.vatMode);
    const factor = q.vatMode === 'included' ? 1 + l.vatRate / 100 : 1;
    const afterLineDisc = (lc.gross - lc.lineDiscount) * factor;
    const row: string[] = [];
    for (const col of cols) {
      switch (col.key) {
        case 'no':
          row.push(String(no));
          break;
        case 'photo':
          row.push('');
          break;
        case 'desc':
          row.push(l.title + (l.summary ? '\n' + l.summary : ''));
          break;
        case 'qty':
          row.push(`${qtyFmt(l.qty)} ${l.unit}`);
          break;
        case 'unit':
          row.push(money(disp.unitList, q.currency));
          break;
        case 'disc':
          row.push(lc.lineDiscount > 0.004 ? (l.discountType === 'pct' ? `%${qtyFmt(l.discountValue)}` : money(lc.lineDiscount * factor, q.currency)) : '–');
          break;
        case 'total':
          row.push(money(afterLineDisc, q.currency));
          break;
      }
    }
    body.push(row);
    rowLine.push(l);
    rowPhoto.push((photos[i] as LoadedImage | null) || null);
  });

  const descFont = { title: 8.6, sub: 7.2 };
  const descLayout = new Map<number, { title: string[]; sub: string[] }>();

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, top: TOP2, bottom: BOTTOM },
    head: [cols.map((c2) => ({ content: c2.header, styles: { halign: c2.align } }))],
    body,
    theme: 'plain',
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    styles: { font: 'Inter', fontStyle: 'normal', fontSize: 8.2, textColor: INK, cellPadding: { top: 2.4, bottom: 2.4, left: 2, right: 2 }, valign: 'middle', lineColor: LINE, lineWidth: 0 },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7, cellPadding: { top: 2.6, bottom: 2.6, left: 2, right: 2 } },
    columnStyles: Object.fromEntries(
      cols.map((c2, i) => [
        i,
        {
          cellWidth: c2.width,
          halign: c2.align,
          ...(c2.key === 'total' ? { fontStyle: 'bold' } : {}),
          ...(c2.key === 'no' ? { textColor: MUTED, fontSize: 7.5 } : {}),
          ...(c2.key === 'photo' ? { minCellHeight: 14 } : {}),
        },
      ])
    ),
    didParseCell: (d: CellHookData) => {
      if (d.section !== 'body') return;
      const line = rowLine[d.row.index];
      if (!line) return;
      if (d.column.index === idx('desc')) {
        const w = descCol.width - 4;
        doc.setFont('Inter', 'bold');
        doc.setFontSize(descFont.title);
        const t = doc.splitTextToSize(line.title, w) as string[];
        doc.setFont('Inter', 'normal');
        doc.setFontSize(descFont.sub);
        const s = line.summary ? (doc.splitTextToSize(line.summary, w) as string[]).slice(0, 4) : [];
        descLayout.set(d.row.index, { title: t, sub: s });
        // Yükseklik hesabı için satır sayısı kadar metin bırak (gerçek çizim didDrawCell'de)
        d.cell.text = [...t, ...s.map(() => ' ')];
        d.cell.styles.fontSize = descFont.title * 0.92;
      }
    },
    willDrawCell: (d: CellHookData) => {
      if (d.section === 'body' && rowLine[d.row.index]) {
        const n = body.slice(0, d.row.index + 1).filter((_, i) => rowLine[i]).length;
        if (n % 2 === 0) {
          doc.setFillColor(...SOFT);
          doc.rect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, 'F');
        }
        if (d.column.index === idx('desc')) d.cell.text = [];
      }
    },
    didDrawCell: (d: CellHookData) => {
      if (d.section !== 'body') return;
      const line = rowLine[d.row.index];
      if (!line) return;
      // satır alt çizgisi
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
      if (d.column.index === idx('photo')) {
        const img = rowPhoto[d.row.index];
        if (img) drawContain(doc, img, d.cell.x + 1.5, d.cell.y + 1.2, d.cell.width - 3, d.cell.height - 2.4);
      }
      if (d.column.index === idx('desc')) {
        const lay = descLayout.get(d.row.index);
        if (!lay) return;
        const th = descFont.title * 0.3528 * 1.18;
        const sh = descFont.sub * 0.3528 * 1.25;
        const total = lay.title.length * th + lay.sub.length * sh;
        let ty = d.cell.y + (d.cell.height - total) / 2 + th * 0.78;
        font('bold', descFont.title);
        for (const t of lay.title) {
          doc.text(t, d.cell.x + 2, ty);
          ty += th;
        }
        font('normal', descFont.sub, MUTED);
        for (const s of lay.sub) {
          doc.text(s, d.cell.x + 2, ty - th + sh);
          ty += sh;
        }
      }
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  const ensure = (h: number) => {
    if (y + h > PH - BOTTOM) {
      doc.addPage();
      y = TOP2 + 2;
    }
  };

  // ---------- 4. TOPLAMLAR ----------
  const rows: { label: string; value: string; strong?: boolean; muted?: boolean }[] = [];
  const cur = q.currency;
  if (showPrices) {
    if (q.vatMode === 'included') {
      const sub = q.lines.reduce((s, l, i) => (l.type === 'section' ? s : s + (calc[i].gross - calc[i].lineDiscount) * (1 + l.vatRate / 100)), 0);
      const gd = q.lines.reduce((s, l, i) => (l.type === 'section' ? s : s + calc[i].generalDiscount * (1 + l.vatRate / 100)), 0);
      rows.push({ label: 'Ara Toplam (KDV Dahil)', value: money(sub, cur) });
      if (gd > 0.004)
        rows.push({ label: `Genel İskonto${q.generalDiscountType === 'pct' ? ` (%${qtyFmt(q.generalDiscountValue)})` : ''}`, value: `-${money(gd, cur)}` });
      rows.push({ label: 'GENEL TOPLAM (KDV DAHİL)', value: money(totals.grand, cur), strong: true });
      rows.push({ label: 'KDV Matrahı', value: money(totals.net, cur), muted: true });
      for (const v of totals.vatBreakdown) if (v.rate > 0) rows.push({ label: `İçindeki KDV (%${v.rate})`, value: money(v.vat, cur), muted: true });
    } else {
      rows.push({ label: 'Ara Toplam', value: money(totals.gross - totals.lineDiscount, cur) });
      if (totals.generalDiscount > 0.004) {
        rows.push({ label: `Genel İskonto${q.generalDiscountType === 'pct' ? ` (%${qtyFmt(q.generalDiscountValue)})` : ''}`, value: `-${money(totals.generalDiscount, cur)}` });
        rows.push({ label: 'KDV Matrahı', value: money(totals.net, cur) });
      }
      for (const v of totals.vatBreakdown) rows.push({ label: v.rate > 0 ? `KDV (%${v.rate})` : 'KDV (%0)', value: money(v.vat, cur) });
      rows.push({ label: 'GENEL TOPLAM', value: money(totals.grand, cur), strong: true });
    }
  } else {
    rows.push({ label: 'Anahtar Teslim Toplam (KDV Hariç)', value: money(totals.net, cur) });
    for (const v of totals.vatBreakdown) if (v.rate > 0) rows.push({ label: `KDV (%${v.rate})`, value: money(v.vat, cur) });
    rows.push({ label: 'GENEL TOPLAM', value: money(totals.grand, cur), strong: true });
  }
  const showTry = cur !== 'TRY' && opts.showTryEquivalent;
  if (showTry) rows.push({ label: 'TL Karşılığı', value: money(totals.grandTry, 'TRY'), muted: false });

  const totW = 84;
  const totX = PW - M - totW;
  const rowH = 6.2;
  const totH = rows.reduce((s, r) => s + (r.strong ? 9 : rowH), 0) + 3;
  ensure(totH + (showTry ? 5 : 0));
  const blockTop = y;
  let ty2 = y;
  doc.setDrawColor(...LINE);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(totX, y, totW, totH, 2, 2, 'S');
  ty2 += 1.5;
  for (const r of rows) {
    if (r.strong) {
      doc.setFillColor(...INK);
      doc.roundedRect(totX + 1.5, ty2, totW - 3, 8, 1.5, 1.5, 'F');
      font('bold', 8.2, [255, 255, 255]);
      doc.text(r.label, totX + 4.5, ty2 + 5.3);
      font('heavy', 10.5, [255, 255, 255]);
      doc.text(r.value, totX + totW - 4.5, ty2 + 5.4, { align: 'right' });
      ty2 += 9;
    } else {
      font(r.muted ? 'normal' : 'semibold', 8, r.muted ? MUTED : INK);
      doc.text(r.label, totX + 4.5, ty2 + 4.3);
      font(r.label === 'TL Karşılığı' ? 'bold' : 'semibold', 8.5, r.muted ? MUTED : r.label === 'TL Karşılığı' ? accentDark : INK);
      doc.text(r.value, totX + totW - 4.5, ty2 + 4.3, { align: 'right' });
      ty2 += rowH;
    }
  }

  // Sol taraf: Yazıyla tutar + kur bilgisi
  const leftW = CW - totW - 5;
  let ly = blockTop;
  doc.setFillColor(...SOFT);
  const words = `Yalnız: ${amountInWords(totals.grand, cur)}${q.vatMode === 'included' || totals.vat > 0 ? ' (KDV dahil)' : ''}`;
  font('semibold', 7.8);
  const wl = doc.splitTextToSize(words, leftW - 8) as string[];
  const usedCur = CURRENCIES.filter((cx) => cx !== 'TRY' && (cx === cur || q.lines.some((l) => l.type !== 'section' && l.currency === cx)));
  const rateLines = usedCur.map((cx) => `1 ${cx} = ${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 4 }).format(q.rates[cx])} ₺`);
  const lh = 6 + wl.length * 3.6 + (rateLines.length ? 8 : 0);
  doc.roundedRect(M, ly, leftW, lh, 2, 2, 'F');
  font('bold', 6.8, MUTED);
  doc.text('TUTAR (YAZIYLA)', M + 4, ly + 4.6, { charSpace: 0.5 });
  font('semibold', 7.8);
  doc.text(wl, M + 4, ly + 8.6);
  if (rateLines.length) {
    font('normal', 7, MUTED);
    doc.text(`Kur bilgisi: ${rateLines.join('  •  ')}${q.ratesSource ? `  (${q.ratesSource}${q.ratesDate ? ' ' + q.ratesDate : ''})` : ''}`, M + 4, ly + lh - 3, {
      maxWidth: leftW - 8,
    });
  }
  ly += lh;
  y = Math.max(ty2, ly) + 7;

  // ---------- 5. ŞARTLAR ----------
  const heading = (t: string) => {
    ensure(14);
    font('bold', 9, accentDark);
    doc.text(t.toUpperCase(), M, y, { charSpace: 0.5 });
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.5);
    doc.line(M, y + 1.6, M + 12, y + 1.6);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M + 12, y + 1.6, PW - M, y + 1.6);
    y += 6;
  };
  const paragraph = (text: string, size = 8) => {
    font('normal', size, [51, 65, 85]);
    const lines = doc.splitTextToSize(text, CW) as string[];
    for (const ln of lines) {
      if (y + 4 > PH - BOTTOM) {
        doc.addPage();
        y = TOP2 + 2;
        font('normal', size, [51, 65, 85]);
      }
      doc.text(ln, M, y);
      y += size * 0.3528 * 1.45;
    }
    y += 3;
  };

  const plan = q.terms.paymentPlan.filter((p) => p.label || p.pct);
  if (plan.length) {
    heading('Ödeme Planı');
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, top: TOP2, bottom: BOTTOM },
      theme: 'plain',
      head: [['AŞAMA', 'ORAN', 'TUTAR']],
      body: plan.map((p) => [p.label + (p.note ? ` – ${p.note}` : ''), `%${qtyFmt(p.pct)}`, money((totals.grand * p.pct) / 100, cur)]),
      styles: { font: 'Inter', fontSize: 8, textColor: INK, cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 } },
      headStyles: { fillColor: SOFT, textColor: MUTED, fontStyle: 'bold', fontSize: 6.8 },
      columnStyles: { 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 36, halign: 'right', fontStyle: 'semibold' as 'bold' } },
      didDrawCell: (d) => {
        if (d.section === 'body') {
          doc.setDrawColor(...LINE);
          doc.setLineWidth(0.2);
          doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
        }
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;
  }
  if (q.terms.delivery) {
    heading('Teslimat & Kurulum');
    paragraph(q.terms.delivery);
  }
  if (q.terms.warranty) {
    heading('Garanti Şartları');
    paragraph(q.terms.warranty);
  }
  const notes = [q.terms.notes, q.validUntil ? `Bu teklif ${dateFmt(q.validUntil)} tarihine kadar geçerlidir.` : ''].filter(Boolean).join('\n');
  if (notes) {
    heading('Notlar & Genel Şartlar');
    paragraph(notes);
  }

  const banks = input.banks.filter((b) => b.iban);
  if (banks.length) {
    heading('Banka Hesap Bilgileri');
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, top: TOP2, bottom: BOTTOM },
      theme: 'plain',
      head: [['BANKA', 'HESAP SAHİBİ', 'IBAN', 'DÖVİZ']],
      body: banks.map((b) => [b.bank + (b.branch ? ` / ${b.branch}` : ''), b.holder || company.title || company.name, b.iban, b.currency]),
      styles: { font: 'Inter', fontSize: 8, textColor: INK, cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 } },
      headStyles: { fillColor: SOFT, textColor: MUTED, fontStyle: 'bold', fontSize: 6.8 },
      columnStyles: { 2: { fontStyle: 'semibold' as 'bold', cellWidth: 68 }, 3: { cellWidth: 16, halign: 'center' } },
      didDrawCell: (d) => {
        if (d.section === 'body') {
          doc.setDrawColor(...LINE);
          doc.setLineWidth(0.2);
          doc.line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
        }
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ---------- 6. KAŞE / İMZA / QR ----------
  const sigH = 38;
  ensure(sigH + 2);
  const qrW = qrData ? 34 : 0;
  const boxW = (CW - qrW - (qrData ? 4 : 0) - 4) / 2;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, boxW, sigH, 2, 2, 'S');
  font('bold', 7, MUTED);
  doc.text('FİRMA KAŞE / İMZA', M + 4, y + 5, { charSpace: 0.5 });
  if (stamp) drawContain(doc, stamp, M + 4, y + 7, boxW - 8, sigH - 15);
  font('semibold', 7.5);
  doc.text(company.title || company.name, M + 4, y + sigH - 3.5, { maxWidth: boxW - 8 });

  const bx = M + boxW + 4;
  doc.roundedRect(bx, y, boxW, sigH, 2, 2, 'S');
  font('bold', 7, MUTED);
  doc.text('MÜŞTERİ ONAYI', bx + 4, y + 5, { charSpace: 0.5 });
  font('normal', 7.5, MUTED);
  const fields = ['Ad Soyad', 'Tarih', 'İmza / Kaşe'];
  fields.forEach((f, i) => {
    const fy = y + 13 + i * 8.5;
    doc.text(`${f}:`, bx + 4, fy);
    doc.setDrawColor(...LINE);
    doc.line(bx + 24, fy + 0.8, bx + boxW - 4, fy + 0.8);
  });
  if (q.approvedAt && q.approvedName) {
    font('bold', 8, [5, 150, 105]);
    doc.text(`✓ Online onaylandı: ${q.approvedName} – ${dateFmt(q.approvedAt)}`, bx + 4, y + sigH - 3, { maxWidth: boxW - 8 });
  }

  if (qrData) {
    const qx = PW - M - qrW;
    doc.setFillColor(...SOFT);
    doc.roundedRect(qx, y, qrW, sigH, 2, 2, 'F');
    doc.addImage(qrData, 'PNG', qx + (qrW - 22) / 2, y + 3, 22, 22);
    font('bold', 6.6, accentDark);
    doc.text('ONLINE İNCELE & ONAYLA', qx + qrW / 2, y + 29, { align: 'center' });
    font('normal', 5.8, MUTED);
    doc.text('Kamerayla okutun', qx + qrW / 2, y + 32.5, { align: 'center' });
  }
  y += sigH;

  // ---------- 7. SAYFA ÜST/ALT BİLGİLERİ ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (p > 1) {
      doc.setFillColor(...accent);
      doc.rect(0, 0, PW, 1.6, 'F');
      font('bold', 8.5);
      doc.text(company.name, M, 10);
      font('semibold', 8, MUTED);
      doc.text(`${q.number}  •  ${c.company || c.name || ''}`, PW - M, 10, { align: 'right' });
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(M, 13, PW - M, 13);
    }
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, PH - 12, PW - M, PH - 12);
    font('normal', 6.8, MUTED);
    const foot = [company.title || company.name, company.phone, company.email, company.website].filter(Boolean).join('  •  ');
    doc.text(foot, M, PH - 7.5, { maxWidth: CW - 30 });
    font('semibold', 7, MUTED);
    doc.text(`Sayfa ${p} / ${pages}`, PW - M, PH - 7.5, { align: 'right' });
  }

  let bytes: ArrayBuffer = doc.output('arraybuffer');

  // ---------- 8. BROŞÜR SAYFALARI ----------
  if (input.brochures.length) {
    const { PDFDocument } = await import('pdf-lib');
    const out = await PDFDocument.load(bytes);
    for (const b of input.brochures) {
      try {
        const res = await fetch(b.fileKey);
        if (!res.ok) continue;
        const buf = await res.arrayBuffer();
        if (b.kind === 'pdf') {
          const src = await PDFDocument.load(buf, { ignoreEncryption: true });
          const copied = await out.copyPages(src, src.getPageIndices());
          copied.forEach((pg) => out.addPage(pg));
        } else {
          const img = await loadImage(b.fileKey, { max: 2480 });
          if (!img) continue;
          const jpg = await out.embedJpg(img.data);
          const landscape = img.w > img.h;
          const [pw, ph] = landscape ? [841.89, 595.28] : [595.28, 841.89];
          const page = out.addPage([pw, ph]);
          const s = Math.min(pw / jpg.width, ph / jpg.height);
          const dw = jpg.width * s;
          const dh = jpg.height * s;
          page.drawImage(jpg, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
        }
      } catch (e) {
        console.warn('Broşür eklenemedi', b.title, e);
      }
    }
    bytes = (await out.save()).buffer as ArrayBuffer;
  }
  return new Blob([bytes], { type: 'application/pdf' });
}

export function pdfFileName(q: Quote) {
  const name = (q.customer.company || q.customer.name || 'Musteri')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .slice(0, 40);
  return `${q.number || 'Teklif'}_${name}.pdf`;
}

export async function savePdf(blob: Blob, fileName: string, mode: 'download' | 'preview') {
  // Telefonda: paylaşım menüsü (WhatsApp, Dosyalar'a kaydet, e-posta...) – iOS PWA'da blob indirme güvenilir değil
  if (mode === 'download' && typeof navigator !== 'undefined' && 'canShare' in navigator && window.matchMedia('(pointer: coarse)').matches) {
    try {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName.replace(/\.pdf$/i, '') });
        return;
      }
    } catch (e) {
      // Kullanıcı paylaşımı kapattıysa sessizce çık; diğer hatalarda klasik indirmeye düş
      if ((e as Error)?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  if (mode === 'preview') {
    const w = window.open(url, '_blank');
    if (!w) {
      // açılır pencere engellendiyse indir
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    }
  } else {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
