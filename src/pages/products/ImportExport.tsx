import { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import type { Category, Currency, Product } from '../../../shared/types';
import { CURRENCIES } from '../../../shared/types';
import { api, errMsg } from '../../lib/api';
import { useUi } from '../../lib/store';
import { fmtMoney, parseNum } from '../../lib/format';
import { Modal, Segmented, Spinner } from '../../components/ui';

const BASE_COLS = [
  'ID',
  'Stok Kodu',
  'Kategori',
  'Marka',
  'Model / Ürün Adı',
  'Açıklama',
  'Birim',
  'Alış Fiyatı',
  'Alış Döviz',
  'Fiyatlama',
  'Kâr %',
  'Satış Fiyatı',
  'Satış Döviz',
  'KDV %',
  'Aktif',
  'Görsel URL',
] as const;

const fieldHeader = (f: { label: string; unit?: string }) => (f.unit ? `${f.label} (${f.unit})` : f.label);
const norm = (s: string) =>
  String(s || '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[^a-z0-9%]/g, '');

const absUrl = (u: string) => (u && u.startsWith('/') ? `${location.origin}${u}` : u);

async function getExcel() {
  const mod = await import('exceljs');
  return (mod as unknown as { default: typeof import('exceljs') }).default || mod;
}

export async function exportProducts(products: Product[], categories: Category[], template = false) {
  const ExcelJS = await getExcel();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OSE Proforma';
  const info = wb.addWorksheet('Bilgi');
  info.columns = [{ width: 110 }];
  [
    'OSE Proforma – Ürün İçe/Dışa Aktarım Dosyası',
    '',
    '• Her kategori ayrı bir sayfadadır. Sayfa adı kategori adıyla eşleşir (veya "Kategori" sütununu doldurun).',
    '• Eşleştirme sırası: ID → Stok Kodu. İkisi de boşsa ürün yeni olarak eklenir.',
    '• "Sadece fiyat güncelle" modunda yalnızca fiyat/döviz/KDV sütunları dikkate alınır, eşleşmeyen satırlar atlanır.',
    '• Döviz: TRY, USD veya EUR. Fiyatlama: "Sabit" ya da "Marj" (Marj seçilirse satış = alış × (1 + Kâr%)).',
    '• Görsel URL sütununa internet linki yazarsanız sistem görseli otomatik indirip saklar.',
  ].forEach((t, i) => {
    const r = info.addRow([t]);
    if (i === 0) r.font = { bold: true, size: 14 };
  });

  for (const cat of categories) {
    const ws = wb.addWorksheet(cat.label.slice(0, 31).replace(/[\\/?*[\]:]/g, '-'));
    const headers = [...BASE_COLS, ...cat.fields.map(fieldHeader)];
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111318' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.columns = headers.map((h) => ({ width: h === 'Model / Ürün Adı' || h === 'Açıklama' ? 34 : h === 'ID' ? 22 : Math.max(11, h.length + 3) }));
    if (!template) {
      for (const p of products.filter((x) => x.categoryId === cat.id)) {
        ws.addRow([
          p.id,
          p.sku,
          cat.label,
          p.brand,
          p.name,
          p.description,
          p.unit,
          p.costPrice ?? '',
          p.costCurrency ?? '',
          p.pricingMode === 'margin' ? 'Marj' : 'Sabit',
          p.marginPct ?? '',
          p.salePrice,
          p.saleCurrency,
          p.vatRate,
          p.active ? 'Evet' : 'Hayır',
          absUrl(p.photo),
          ...cat.fields.map((f) => p.specs[f.key] || ''),
        ]);
      }
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = template ? 'OSE_Urun_Sablonu.xlsx' : `OSE_Urunler_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

interface ParsedRow {
  sheet: string;
  line: number;
  data: Partial<Product> & { id?: string };
  match?: Product;
  status: 'new' | 'update' | 'skip' | 'error';
  message?: string;
}

function parseCsv(text: string): string[][] {
  const delim = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export default function ImportExport({
  open,
  onClose,
  products,
  categories,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
  onDone: () => void;
}) {
  const { toast } = useUi();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upsert' | 'prices'>('prices');
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setRows(null);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const buildRows = (sheets: { name: string; rows: unknown[][] }[]): ParsedRow[] => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const bySku = new Map(products.filter((p) => p.sku).map((p) => [norm(p.sku), p]));
    const catByName = new Map(categories.map((c) => [norm(c.label), c]));
    const out: ParsedRow[] = [];
    for (const sh of sheets) {
      if (norm(sh.name) === 'bilgi' || sh.rows.length < 2) continue;
      const header = sh.rows[0].map((h) => norm(String(h ?? '')));
      const col = (name: string) => header.indexOf(norm(name));
      const sheetCat = catByName.get(norm(sh.name));
      sh.rows.slice(1).forEach((r, i) => {
        const get = (name: string) => {
          const j = col(name);
          if (j < 0) return undefined;
          const v = r[j];
          if (v == null) return '';
          if (typeof v === 'object' && v && 'text' in (v as object)) return String((v as { text: string }).text);
          if (typeof v === 'object' && v && 'result' in (v as object)) return String((v as { result: unknown }).result ?? '');
          return String(v).trim();
        };
        const name = get('Model / Ürün Adı') ?? get('Ürün Adı') ?? get('Model') ?? '';
        const sku = get('Stok Kodu') ?? '';
        const id = get('ID') ?? '';
        if (!name && !sku && !id) return;
        const catName = get('Kategori');
        const cat = (catName && catByName.get(norm(catName))) || sheetCat;
        const match = (id && byId.get(id)) || (sku && bySku.get(norm(sku))) || undefined;
        const cur = (v?: string): Currency | undefined => {
          const u = (v || '').toUpperCase().replace('TL', 'TRY').replace('₺', 'TRY').replace('$', 'USD').replace('€', 'EUR');
          return CURRENCIES.includes(u as Currency) ? (u as Currency) : undefined;
        };
        const priceVal = (v?: string) => (v === undefined || v === '' ? undefined : parseNum(v));
        const data: ParsedRow['data'] = {
          id: match?.id,
          sku: sku || undefined,
          costPrice: priceVal(get('Alış Fiyatı')),
          costCurrency: cur(get('Alış Döviz')),
          salePrice: priceVal(get('Satış Fiyatı')),
          saleCurrency: cur(get('Satış Döviz')),
          marginPct: priceVal(get('Kâr %')),
          pricingMode: get('Fiyatlama') ? (norm(get('Fiyatlama')!).startsWith('marj') ? 'margin' : 'fixed') : undefined,
          vatRate: priceVal(get('KDV %')),
        };
        if (mode === 'upsert') {
          Object.assign(data, {
            categoryId: cat?.id,
            brand: get('Marka') ?? '',
            name,
            description: get('Açıklama') ?? '',
            unit: get('Birim') || 'Adet',
            active: get('Aktif') ? !['hayir', 'pasif', '0', 'false'].includes(norm(get('Aktif')!)) : true,
            photo: get('Görsel URL') || undefined,
            specs: Object.fromEntries((cat?.fields || []).map((f) => [f.key, get(fieldHeader(f)) ?? get(f.label) ?? '']).filter(([, v]) => v)),
          });
          if (data.costPrice === undefined) data.costPrice = match?.costPrice ?? null;
          if (data.salePrice === undefined) data.salePrice = match?.salePrice ?? 0;
        }
        let status: ParsedRow['status'] = match ? 'update' : 'new';
        let message = '';
        if (mode === 'prices' && !match) {
          status = 'skip';
          message = 'Eşleşen ürün yok';
        } else if (mode === 'upsert' && !cat) {
          status = 'error';
          message = 'Kategori bulunamadı';
        } else if (mode === 'upsert' && !name) {
          status = 'error';
          message = 'Ürün adı boş';
        }
        out.push({ sheet: sh.name, line: i + 2, data, match, status, message });
      });
    }
    return out;
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      let sheets: { name: string; rows: unknown[][] }[];
      if (/\.csv$/i.test(f.name)) {
        sheets = [{ name: 'CSV', rows: parseCsv(await f.text()) }];
      } else {
        const ExcelJS = await getExcel();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(await f.arrayBuffer());
        sheets = wb.worksheets.map((ws) => {
          const rows: unknown[][] = [];
          ws.eachRow({ includeEmpty: false }, (row) => {
            const vals = (row.values as unknown[]).slice(1);
            rows.push(vals);
          });
          return { name: ws.name, rows };
        });
      }
      const parsed = buildRows(sheets);
      if (!parsed.length) toast('Dosyada okunabilir satır bulunamadı. Başlık satırını kontrol edin.', 'error');
      setRows(parsed);
    } catch (e) {
      toast('Dosya okunamadı: ' + errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!rows) return;
    const todo = rows.filter((r) => r.status === 'new' || r.status === 'update');
    setBusy(true);
    let created = 0;
    let updated = 0;
    try {
      for (let i = 0; i < todo.length; i += 20) {
        const chunk = todo.slice(i, i + 20).map((r) => r.data);
        const res = await api.post<{ created: number; updated: number }>('/products/bulk', { rows: chunk, mode });
        created += res.created;
        updated += res.updated;
        setProgress(Math.min(todo.length, i + 20));
      }
      toast(`${created} yeni ürün eklendi, ${updated} ürün güncellendi.`);
      onDone();
      reset();
      onClose();
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const counts = rows ? { new: rows.filter((r) => r.status === 'new').length, update: rows.filter((r) => r.status === 'update').length, skip: rows.filter((r) => r.status === 'skip' || r.status === 'error').length } : null;
  const todoCount = counts ? counts.new + counts.update : 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Excel ile İçe / Dışa Aktar"
      size="xl"
      footer={
        rows ? (
          <>
            <button className="btn-secondary" onClick={reset} disabled={busy}>
              Başka dosya seç
            </button>
            <button className="btn-primary" onClick={apply} disabled={busy || !todoCount}>
              {busy ? <Spinner className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {busy ? `${progress}/${todoCount}` : `${todoCount} satırı uygula`}
            </button>
          </>
        ) : undefined
      }
    >
      {!rows ? (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-line bg-surface-2 space-y-3">
            <div className="flex items-center gap-2 font-extrabold">
              <Download className="w-5 h-5 text-primary" /> Dışa aktar
            </div>
            <p className="text-sm text-muted">Tüm ürünleri (alış/satış fiyatları ve teknik özellikleriyle) kategori başına bir sayfa olacak şekilde Excel'e aktarın. Düzenleyip geri yükleyebilirsiniz.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => exportProducts(products, categories).catch((e) => toast(errMsg(e), 'error'))}>
                <FileSpreadsheet className="w-4 h-4" /> Ürünleri indir ({products.length})
              </button>
              <button className="btn-secondary" onClick={() => exportProducts([], categories, true).catch((e) => toast(errMsg(e), 'error'))}>
                Boş şablon
              </button>
            </div>
          </div>
          <div className="p-5 rounded-2xl border border-line bg-surface-2 space-y-3">
            <div className="flex items-center gap-2 font-extrabold">
              <Upload className="w-5 h-5 text-primary" /> İçe aktar
            </div>
            <Segmented
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'prices', label: 'Sadece fiyat güncelle' },
                { value: 'upsert', label: 'Ekle / güncelle' },
              ]}
            />
            <p className="text-sm text-muted">
              {mode === 'prices'
                ? 'Tedarikçi fiyat listesindeki Stok Kodu ile eşleşen ürünlerin alış/satış fiyatları güncellenir. Diğer bilgiler değişmez.'
                : 'Eşleşen ürünler güncellenir, eşleşmeyenler yeni ürün olarak eklenir. Kategori sayfa adından veya "Kategori" sütunundan okunur.'}
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />} Excel / CSV seç
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="chip bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 normal-case text-xs">{counts!.new} yeni</span>
            <span className="chip bg-sky-500/15 text-sky-600 dark:text-sky-400 normal-case text-xs">{counts!.update} güncellenecek</span>
            <span className="chip bg-zinc-500/15 text-muted normal-case text-xs">{counts!.skip} atlanacak</span>
          </div>
          <div className="border border-line rounded-xl overflow-hidden">
            <div className="max-h-[50vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 sticky top-0">
                  <tr className="table-head">
                    <th className="px-3 py-2">Durum</th>
                    <th className="px-3 py-2">Sayfa / Satır</th>
                    <th className="px-3 py-2">Ürün</th>
                    <th className="px-3 py-2 text-right">Alış</th>
                    <th className="px-3 py-2 text-right">Satış</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((r, i) => {
                    const m = r.match;
                    const ccur = r.data.costCurrency || m?.costCurrency || 'USD';
                    const scur = r.data.saleCurrency || m?.saleCurrency || 'USD';
                    return (
                      <tr key={i} className={r.status === 'skip' || r.status === 'error' ? 'opacity-55' : ''}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {r.status === 'new' && <span className="text-emerald-500 font-bold text-xs">YENİ</span>}
                          {r.status === 'update' && <span className="text-sky-500 font-bold text-xs">GÜNCELLE</span>}
                          {(r.status === 'skip' || r.status === 'error') && (
                            <span className="text-amber-500 font-bold text-xs inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> {r.message}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted text-xs whitespace-nowrap">
                          {r.sheet} #{r.line}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-semibold">{r.data.name || (m ? `${m.brand} ${m.name}` : '—')}</div>
                          <div className="text-xs text-muted">{r.data.sku || m?.sku}</div>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                          {r.data.costPrice != null ? (
                            <>
                              {m?.costPrice != null && m.costPrice !== r.data.costPrice && (
                                <span className="text-muted line-through text-xs mr-1">{fmtMoney(m.costPrice, m.costCurrency || 'USD')}</span>
                              )}
                              {fmtMoney(r.data.costPrice, ccur)}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">
                          {r.data.salePrice != null ? (
                            <span className="inline-flex items-center gap-1">
                              {m && m.salePrice !== r.data.salePrice && (
                                <>
                                  <span className="text-muted text-xs">{fmtMoney(m.salePrice, m.saleCurrency)}</span>
                                  <ArrowRight className="w-3 h-3 text-muted" />
                                </>
                              )}
                              <b>{fmtMoney(r.data.salePrice, scur)}</b>
                            </span>
                          ) : r.data.marginPct != null ? (
                            `Marj %${r.data.marginPct}`
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
