import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  Save,
  Download,
  Eye,
  Share2,
  Plus,
  Layers,
  Sun,
  Heading,
  PencilLine,
  Trash2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  MoreVertical,
  GitBranch,
  Copy,
  PackagePlus,
  ShieldAlert,
  ShieldCheck,
  MessageCircle,
  Link2,
  Mail,
  ExternalLink,
  User,
  Search,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
} from 'lucide-react';
import type { CategoryGroup, Currency, Customer, GesInfo, Quote, QuoteEvent, QuoteLine, QuoteStatus } from '../../../shared/types';
import { CURRENCIES, CURRENCY_SYMBOL, GROUP_ICON, GROUP_LABEL, MAIN_GROUPS, QUOTE_STATUSES, STATUS_LABEL, VAT_RATES } from '../../../shared/types';
import { calcQuote, convert, type LineCalc } from '../../../shared/calc';
import { UNIT_OPTIONS, dominantGroup } from '../../../shared/catalog';
import { api, ApiError, errMsg } from '../../lib/api';
import { useAuth, useData, useUi } from '../../lib/store';
import { fmtMoney, fmtNum, fmtDateTime, fmtRelative, fmtDate, waLink, daysUntil } from '../../lib/format';
import { Modal, PageLoader, StatusBadge, Segmented, Toggle, Thumb, NumberInput, Field, Spinner, Empty, DynIcon } from '../../components/ui';
import PlanEditor from '../../components/PlanEditor';
import { CustomerFields, emptyCustomer } from '../customers/CustomerForm';
import ProductPicker from './ProductPicker';
import GesWizard from './GesWizard';
import { customLine, emptyQuote, sectionLine, termsFromTemplate, termsUntouched, templateHeader } from './quoteUtils';

interface Revision {
  id: string;
  number: string;
  revision: number;
  status: QuoteStatus;
  createdAt: string;
}

// ============ SATIR ============

function LineRow({
  line,
  lc,
  q,
  admin,
  index,
  count,
  onChange,
  onRemove,
  onMove,
}: {
  line: QuoteLine;
  lc: LineCalc;
  q: Quote;
  admin: boolean;
  index: number;
  count: number;
  onChange: (l: QuoteLine) => void;
  onRemove: () => void;
  onMove: (d: -1 | 1) => void;
}) {
  const set = <K extends keyof QuoteLine>(k: K, v: QuoteLine[K]) => onChange({ ...line, [k]: v });
  const mover = (
    <div className="flex flex-col">
      <button type="button" className="text-muted hover:text-fg disabled:opacity-30" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Yukarı">
        <ChevronUp className="w-4 h-4" />
      </button>
      <button type="button" className="text-muted hover:text-fg disabled:opacity-30" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Aşağı">
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );

  if (line.type === 'section') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/8 border-y border-primary/20">
        {mover}
        <Heading className="w-4 h-4 text-primary shrink-0" />
        <input
          className="flex-1 bg-transparent font-extrabold uppercase text-sm tracking-wide text-primary placeholder:text-primary/50 focus:outline-none"
          value={line.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="BÖLÜM BAŞLIĞI"
        />
        <button type="button" className="btn-icon" onClick={onRemove} aria-label="Sil">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const factor = q.vatMode === 'included' ? 1 + line.vatRate / 100 : 1;
  const lineTotal = (lc.gross - lc.lineDiscount) * factor;
  const foreign = line.currency !== q.currency;
  const costInfo =
    admin && line.unitCost != null && line.costCurrency
      ? (() => {
          const cost = convert(line.unitCost, line.costCurrency, q.currency, q.rates) * line.qty;
          const net = lc.net;
          const m = net > 0 ? ((net - cost) / net) * 100 : 0;
          return { cost, profit: net - cost, m };
        })()
      : null;

  return (
    <div className="px-3 py-3 border-b border-line hover:bg-surface-2/50 transition">
      <div className="grid grid-cols-[20px_minmax(0,1fr)_36px] sm:grid-cols-[20px_44px_minmax(0,1fr)_auto_32px] gap-x-2.5 gap-y-2 items-start">
        <div className="pt-1">{mover}</div>
        <Thumb src={line.photo} className="hidden sm:flex w-11 h-11" />
        <div className="min-w-0 space-y-1">
          <textarea
            rows={1}
            className="w-full resize-none [field-sizing:content] bg-transparent font-bold text-[15px] sm:text-[14px] leading-snug focus:outline-none focus:bg-surface-2 rounded px-1 -mx-1"
            value={line.title}
            onChange={(e) => set('title', e.target.value.replace(/\n/g, ' '))}
            placeholder="Kalem adı"
          />
          <textarea
            rows={1}
            className="w-full resize-none [field-sizing:content] bg-transparent text-[13px] sm:text-xs text-muted leading-snug focus:outline-none focus:bg-surface-2 rounded px-1 -mx-1"
            value={line.summary || ''}
            onChange={(e) => set('summary', e.target.value.replace(/\n/g, ' '))}
            placeholder="Açıklama / teknik özet"
          />
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
            {line.category && <span className="font-semibold text-primary/90">{line.category}</span>}
            {line.sku && <span>Kod: {line.sku}</span>}
            {line.type === 'custom' && <span className="text-amber-500 font-semibold">Serbest kalem</span>}
            {line.listPrice != null && Math.abs(line.listPrice - line.unitPrice) > 0.004 && <span className="text-amber-500">Liste: {fmtMoney(line.listPrice, line.currency)}</span>}
            {costInfo && (
              <span className={costInfo.profit < 0 ? 'text-rose-500 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                Maliyet {fmtMoney(costInfo.cost, q.currency)} • Kâr %{fmtNum(costInfo.m, 1)}
              </span>
            )}
            {admin && line.type === 'product' && line.unitCost == null && <span className="text-amber-500">Alış fiyatı tanımsız</span>}
          </div>
        </div>
        <div className="hidden sm:block text-right pt-0.5 min-w-[96px]">
          <div className="font-extrabold tabular-nums">{fmtMoney(lineTotal, q.currency)}</div>
          {lc.lineDiscount > 0.004 && <div className="text-[11px] text-emerald-600 dark:text-emerald-400">-{fmtMoney(lc.lineDiscount * factor, q.currency)}</div>}
          {q.vatMode === 'included' && <div className="text-[10px] text-muted">KDV dahil</div>}
        </div>
        <button type="button" className="btn-icon w-9 h-9 sm:w-8 sm:h-8" onClick={onRemove} aria-label="Sil">
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="col-span-3 sm:col-start-3 sm:col-span-3 grid grid-cols-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,0.8fr)] gap-2">
          <div>
            <span className="block text-[11px] font-semibold text-muted mb-0.5">Miktar</span>
            <div className="flex">
              <NumberInput className="input-sm rounded-r-none text-center" value={line.qty} onChange={(v) => set('qty', v)} min={0} />
              <select className="input-sm w-auto max-w-[84px] rounded-l-none border-l-0 px-1 text-xs" value={line.unit} onChange={(e) => set('unit', e.target.value)}>
                {[...new Set([line.unit, ...UNIT_OPTIONS])].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-muted mb-0.5">
              Birim fiyat {foreign && <span className="text-amber-500">≈ {fmtMoney(lc.unitPrice, q.currency)}</span>}
            </span>
            <div className="flex">
              <NumberInput className="input-sm rounded-r-none text-right" value={line.unitPrice} onChange={(v) => set('unitPrice', v)} min={0} />
              <select
                className={`input-sm w-auto rounded-l-none border-l-0 px-1 text-xs font-bold ${foreign ? 'text-amber-500' : ''}`}
                value={line.currency}
                onChange={(e) => set('currency', e.target.value as Currency)}
                title="Kalem para birimi"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_SYMBOL[c]} {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-muted mb-0.5">İskonto</span>
            <div className="flex">
              <NumberInput className="input-sm rounded-r-none text-right" value={line.discountValue} onChange={(v) => set('discountValue', v)} min={0} placeholder="0" />
              <button
                type="button"
                className="input-sm w-9 rounded-l-none border-l-0 px-0 text-xs font-bold"
                onClick={() => set('discountType', line.discountType === 'pct' ? 'amt' : 'pct')}
                title="Yüzde / tutar"
              >
                {line.discountType === 'pct' ? '%' : CURRENCY_SYMBOL[q.currency]}
              </button>
            </div>
          </div>
          <div>
            <span className="block text-[11px] font-semibold text-muted mb-0.5">KDV</span>
            <select className="input-sm px-1.5" value={line.vatRate} onChange={(e) => set('vatRate', Number(e.target.value))}>
              {[...new Set([...VAT_RATES, line.vatRate])].map((r) => (
                <option key={r} value={r}>
                  %{r}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:hidden flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-muted">
              Satır toplamı{q.vatMode === 'included' ? ' (KDV dahil)' : ''}
              {lc.lineDiscount > 0.004 && <span className="text-emerald-600 dark:text-emerald-400"> • -{fmtMoney(lc.lineDiscount * factor, q.currency)}</span>}
            </span>
            <span className="font-extrabold tabular-nums">{fmtMoney(lineTotal, q.currency)}</span>
          </div>
        </div>
      </div>
      {admin && line.type === 'custom' && (
        <div className="mt-2 sm:ml-[74px] flex items-center gap-2 text-xs">
          <span className="text-muted">Birim maliyet:</span>
          <NumberInput className="input-sm w-28" value={line.unitCost ?? null} onChange={(v) => onChange({ ...line, unitCost: v, costCurrency: line.currency })} placeholder="opsiyonel" />
          <span className="text-muted">{line.currency}</span>
        </div>
      )}
    </div>
  );
}

// ============ MÜŞTERİ ============

function CustomerSection({ q, update, saveCustomer, setSaveCustomer }: { q: Quote; update: (p: Partial<Quote>) => void; saveCustomer: boolean; setSaveCustomer: (v: boolean) => void }) {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(!q.customerId && !q.customer.name && !q.customer.company ? false : false);
  const [mode, setMode] = useState<'pick' | 'new'>(q.customerId || q.customer.name || q.customer.company ? 'new' : 'pick');

  const load = useCallback(() => {
    if (!customers) api.get<{ customers: Customer[] }>('/customers').then((r) => setCustomers(r.customers)).catch(() => setCustomers([]));
  }, [customers]);

  const filtered = (customers || []).filter((c) => `${c.company} ${c.name} ${c.phone} ${c.taxNo}`.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))).slice(0, 8);

  const pick = (c: Customer) => {
    const { id, kind, name, company, phone, email, address, city, taxOffice, taxNo } = c;
    update({ customerId: id, customer: { kind, name, company, phone, email, address, city, taxOffice, taxNo } });
    setOpen(false);
    setSearch('');
    setMode('new');
    setEdit(false);
  };
  const clear = () => {
    update({ customerId: null, customer: { ...emptyCustomer() } });
    setMode('pick');
  };
  const c = q.customer;
  const hasCustomer = !!(c.name || c.company);

  if (mode === 'pick' && !hasCustomer) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-10"
            placeholder="Kayıtlı müşteri ara (firma, isim, telefon)..."
            value={search}
            onFocus={() => {
              load();
              setOpen(true);
            }}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
          />
          {open && (
            <div className="absolute z-30 mt-1 w-full card shadow-2xl max-h-72 overflow-y-auto">
              {!customers ? (
                <div className="p-4 flex justify-center">
                  <Spinner />
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-sm text-muted">Eşleşen müşteri yok.</div>
              ) : (
                filtered.map((cu) => (
                  <button key={cu.id} type="button" onClick={() => pick(cu)} className="w-full text-left px-4 py-2.5 hover:bg-surface-2 border-b border-line last:border-0">
                    <div className="font-bold text-sm">{cu.company || cu.name}</div>
                    <div className="text-xs text-muted">
                      {[cu.company ? cu.name : '', cu.phone, cu.city].filter(Boolean).join(' • ')} {cu.quoteCount ? `• ${cu.quoteCount} teklif` : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {open && <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />}
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setMode('new')}>
          <Plus className="w-4 h-4" /> Yeni müşteri bilgisi gir
        </button>
      </div>
    );
  }

  if (q.customerId && !edit) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-2 border border-line">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 text-sm">
          <div className="font-extrabold">{c.company || c.name}</div>
          <div className="text-muted text-xs mt-0.5">{[c.company ? c.name : '', c.phone, c.email, c.city].filter(Boolean).join(' • ') || '—'}</div>
          {(c.taxOffice || c.taxNo) && <div className="text-muted text-xs">{[c.taxOffice, c.taxNo].filter(Boolean).join(' / ')}</div>}
        </div>
        <div className="flex flex-col sm:flex-row gap-1">
          <Link to={`/musteriler/${q.customerId}`} className="btn-ghost btn-sm" title="Müşteri kartı">
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(true)} title="Bu teklif için düzenle">
            <PencilLine className="w-4 h-4" />
          </button>
          <button type="button" className="btn-ghost btn-sm" onClick={clear} title="Müşteriyi değiştir">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CustomerFields value={{ ...c, id: q.customerId || '', notes: '' }} onChange={(nc) => update({ customer: { kind: nc.kind, name: nc.name, company: nc.company, phone: nc.phone, email: nc.email, address: nc.address, city: nc.city, taxOffice: nc.taxOffice, taxNo: nc.taxNo } })} showNotes={false} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!q.customerId ? (
          <Toggle checked={saveCustomer} onChange={setSaveCustomer} label="Müşteri kartı olarak da kaydet" hint="Sonraki tekliflerde listeden seçebilirsiniz" />
        ) : (
          <span className="text-xs text-muted">Değişiklikler yalnızca bu teklife yansır, müşteri kartı değişmez.</span>
        )}
        <button type="button" className="btn-ghost btn-sm" onClick={q.customerId ? () => setEdit(false) : clear}>
          {q.customerId ? 'Tamam' : 'Kayıtlı müşteri seç'}
        </button>
      </div>
    </div>
  );
}

// ============ PAYLAŞ ============

function ShareModal({ open, onClose, q, url }: { open: boolean; onClose: () => void; q: Quote; url: string }) {
  const { settings } = useData();
  const { toast } = useUi();
  const name = q.customer.name || q.customer.company || '';
  const msg = `Merhaba${name ? ' ' + name : ''}, ${settings.company.name} olarak hazırladığımız ${q.number} numaralı teklifimizi aşağıdaki bağlantıdan inceleyip onaylayabilirsiniz:\n${url}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('Link kopyalandı.');
    } catch {
      toast('Kopyalanamadı, linki elle seçin.', 'error');
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Müşteriyle Paylaş" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted">Müşteriniz bu link ile teklifi telefonundan inceleyebilir, PDF indirebilir ve tek tıkla onaylayabilir. Görüntülemeler ve onaylar size bildirilir.</p>
        <div className="flex gap-2">
          <input className="input text-sm" readOnly value={url} onFocus={(e) => e.target.select()} />
          <button className="btn-secondary" onClick={copy}>
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <a className="btn bg-[#25D366] text-white hover:brightness-105" href={waLink(q.customer.phone, msg)} target="_blank" rel="noreferrer">
            <MessageCircle className="w-5 h-5" /> WhatsApp ile Gönder {q.customer.phone ? `(${q.customer.phone})` : ''}
          </a>
          {q.customer.email && (
            <a className="btn-secondary" href={`mailto:${q.customer.email}?subject=${encodeURIComponent(`${q.number} – Fiyat Teklifi`)}&body=${encodeURIComponent(msg)}`}>
              <Mail className="w-4 h-4" /> E-posta ile Gönder
            </a>
          )}
          <a className="btn-ghost" href={`${url}?preview=1`} target="_blank" rel="noreferrer">
            <Eye className="w-4 h-4" /> Müşterinin göreceği sayfayı önizle
          </a>
        </div>
      </div>
    </Modal>
  );
}

// ============ ANA EDİTÖR ============

export default function QuoteEditor() {
  const { id = 'yeni' } = useParams();
  const isNew = id === 'yeni';
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isAdmin, user } = useAuth();
  const { settings, brochures, ready, reloadKits, productMap, categoryMap } = useData();
  const { toast, confirm } = useUi();

  const [q, setQ] = useState<Quote | null>(null);
  const [events, setEvents] = useState<QuoteEvent[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<'' | 'download' | 'preview'>('');
  const [error, setError] = useState('');
  const [picker, setPicker] = useState<'' | 'products' | 'kits'>('');
  const [ges, setGes] = useState(false);
  const [share, setShare] = useState<string>('');
  const [menu, setMenu] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [ratesBusy, setRatesBusy] = useState(false);
  const loadedFor = useRef('');

  const fetchRates = useCallback(
    async (force = false) => {
      setRatesBusy(true);
      try {
        const r = await api.get<{ rates: Quote['rates']; source: string; date: string }>(`/rates${force ? '?refresh=1' : ''}`);
        setQ((prev) => (prev ? { ...prev, rates: r.rates, ratesSource: r.source, ratesDate: r.date } : prev));
        if (force) {
          setDirty(true);
          toast(`Kurlar güncellendi: 1 USD = ${fmtNum(r.rates.USD, 4)} ₺`, 'info');
        }
      } catch (e) {
        toast(errMsg(e), 'error');
      } finally {
        setRatesBusy(false);
      }
    },
    [toast]
  );

  // Yükleme
  useEffect(() => {
    if (!ready || loadedFor.current === id) return;
    loadedFor.current = id;
    setError('');
    if (isNew) {
      const tur = params.get('tur') as CategoryGroup | null;
      const draft = emptyQuote(settings, brochures, tur && (MAIN_GROUPS as string[]).includes(tur) ? tur : '');
      setQ(draft);
      setEvents([]);
      setRevisions([]);
      setDirty(false);
      fetchRates();
      const cid = params.get('musteri');
      if (cid) {
        api
          .get<{ customer: Customer }>(`/customers/${cid}`)
          .then(({ customer: c }) =>
            setQ((prev) =>
              prev
                ? {
                    ...prev,
                    customerId: c.id,
                    customer: { kind: c.kind, name: c.name, company: c.company, phone: c.phone, email: c.email, address: c.address, city: c.city, taxOffice: c.taxOffice, taxNo: c.taxNo },
                  }
                : prev
            )
          )
          .catch(() => null);
      }
    } else {
      setQ(null);
      api
        .get<{ quote: Quote; events: QuoteEvent[]; revisions: Revision[] }>(`/quotes/${id}`)
        .then((r) => {
          setQ(r.quote);
          setEvents(r.events);
          setRevisions(r.revisions);
          setDirty(false);
        })
        .catch((e) => setError(errMsg(e)));
    }
  }, [id, isNew, ready, settings, brochures, fetchRates, params]);

  const update = useCallback((patch: Partial<Quote> | ((q: Quote) => Quote)) => {
    setQ((prev) => (prev ? (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }) : prev));
    setDirty(true);
  }, []);

  const calc = useMemo(() => (q ? calcQuote(q) : null), [q]);
  const readOnly = !!q && q.status === 'approved' && !isAdmin;

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const save = useCallback(
    async (silent = false): Promise<Quote | null> => {
      if (!q) return null;
      setSaving(true);
      try {
        let draft = q;
        if (!draft.customerId && (draft.customer.name || draft.customer.company)) {
          // Elle yazılan müşteri kayıtlı biriyle eşleşiyorsa (telefon veya ad + firma) teklifi o karta bağla
          const digits = (v: string) => (v || '').replace(/\D/g, '').slice(-10);
          const norm = (v: string) => (v || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');
          const cu = draft.customer;
          const list = await api.get<{ customers: Customer[] }>('/customers').then((r) => r.customers).catch(() => [] as Customer[]);
          const match = list.find(
            (c) =>
              (digits(cu.phone).length >= 7 && digits(c.phone) === digits(cu.phone)) ||
              (norm(cu.name || cu.company) !== '' && norm(c.name) === norm(cu.name) && norm(c.company) === norm(cu.company))
          );
          if (match) draft = { ...draft, customerId: match.id };
          else if (saveCustomer) {
            const r = await api.post<{ customer: Customer }>('/customers', { ...draft.customer, notes: '' });
            draft = { ...draft, customerId: r.customer.id };
          }
        }
        const r = isNew ? await api.post<{ quote: Quote }>('/quotes', draft) : await api.put<{ quote: Quote }>(`/quotes/${draft.id}`, draft);
        setQ(r.quote);
        setDirty(false);
        if (!silent) toast(isNew ? `${r.quote.number} oluşturuldu.` : 'Teklif kaydedildi.');
        if (r.quote.approvalRequired && !silent) toast('İskonto limitinizi aştınız; teklif yönetici onayına düştü.', 'info');
        if (isNew) {
          loadedFor.current = r.quote.id;
          navigate(`/teklifler/${r.quote.id}`, { replace: true });
        } else {
          api.get<{ events: QuoteEvent[] }>(`/quotes/${r.quote.id}`).then((d) => setEvents(d.events)).catch(() => null);
        }
        return r.quote;
      } catch (e) {
        if (e instanceof ApiError && e.code === 'VERSION_CONFLICT') {
          const ok = await confirm({ title: 'Çakışma', message: `${e.message}\n\nGüncel hali yüklensin mi? (Kaydedilmemiş değişiklikleriniz kaybolur)`, confirmText: 'Yeniden yükle' });
          if (ok) {
            loadedFor.current = '';
            setQ(null);
            api.get<{ quote: Quote; events: QuoteEvent[]; revisions: Revision[] }>(`/quotes/${id}`).then((r) => {
              setQ(r.quote);
              setEvents(r.events);
              setRevisions(r.revisions);
              setDirty(false);
              loadedFor.current = id;
            });
          }
        } else toast(errMsg(e), 'error');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [q, isNew, saveCustomer, toast, navigate, confirm, id]
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!readOnly) save();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [save, readOnly]);

  if (error) return <Empty icon={AlertTriangle} title="Teklif açılamadı" text={error} action={<Link to="/teklifler" className="btn-secondary">Tekliflere dön</Link>} />;
  if (!q || !calc) return <PageLoader text="Teklif yükleniyor..." />;

  const t = calc.totals;
  const cur = q.currency;
  const limit = user?.discountLimit ?? settings.quote.salesDiscountLimit;
  const overLimit = !isAdmin && limit != null && t.effectiveDiscountPct > limit + 0.01;

  const setLines = (fn: (lines: QuoteLine[]) => QuoteLine[]) => update((prev) => ({ ...prev, lines: fn(prev.lines) }));
  const lineGroup = (l: QuoteLine): CategoryGroup => {
    const p = l.productId ? productMap.get(l.productId) : undefined;
    return (p && categoryMap.get(p.categoryId)?.group) || '';
  };
  /** Teklif türü seçilmemişse ve şartlar elle değiştirilmemişse türü kalemlerden belirle, şablonu uygula */
  const autoGroup = (prev: Quote, lines: QuoteLine[], forced?: CategoryGroup): Quote => {
    if (prev.options.group || !termsUntouched(prev, settings)) return { ...prev, lines };
    const g = forced || dominantGroup(lines.filter((l) => l.type === 'product').map(lineGroup));
    if (!g) return { ...prev, lines };
    toast(`Teklif türü: ${GROUP_LABEL[g]} – PDF metinleri bu şablona göre ayarlandı.`, 'info');
    return { ...prev, lines, options: { ...prev.options, group: g }, terms: termsFromTemplate(settings, g) };
  };
  const addLines = (nl: QuoteLine[]) => {
    // Aynı ürün tekrar eklenirse miktarı artır (bölüm/paket eklemeleri hariç)
    if (nl.length === 1 && nl[0].productId) {
      const ex = q.lines.find((l) => l.productId === nl[0].productId && l.type === 'product');
      if (ex) return setLines((ls) => ls.map((l) => (l.id === ex.id ? { ...l, qty: l.qty + nl[0].qty } : l)));
    }
    update((prev) => autoGroup(prev, [...prev.lines, ...nl]));
  };
  const changeGroup = async (g: CategoryGroup) => {
    if (g === (q.options.group || '')) return;
    let apply = termsUntouched(q, settings);
    if (!apply) {
      apply = await confirm({
        title: `${GROUP_LABEL[g]} metinleri uygulansın mı?`,
        message: 'Ödeme planı, ön yazı, teslimat, garanti ve notlar seçtiğiniz teklif türünün şablonuyla değiştirilecek. "Vazgeç" derseniz sadece tür değişir, yazdığınız metinler korunur.',
        confirmText: 'Şablonu uygula',
      });
    }
    update((prev) => ({ ...prev, options: { ...prev.options, group: g }, ...(apply ? { terms: termsFromTemplate(settings, g) } : {}) }));
  };
  const missingRate = CURRENCIES.filter((c) => c !== 'TRY' && (c === cur || q.lines.some((l) => l.type !== 'section' && l.currency === c)) && !q.rates[c]);

  const makePdf = async (mode: 'download' | 'preview') => {
    let cq: Quote | null = q;
    if (dirty || isNew) cq = await save(true);
    if (!cq) return;
    if (cq.approvalRequired && mode === 'download') {
      toast('Limit üstü iskonto yönetici onayı bekliyor. Şimdilik sadece önizleme yapabilirsiniz.', 'error');
      return;
    }
    setPdfBusy(mode);
    try {
      let token = cq.publicToken;
      if (!token && mode === 'download') {
        const r = await api.post<{ token: string; quote: Quote }>(`/quotes/${cq.id}/share`, { markSent: false });
        token = r.token;
        cq = r.quote;
      }
      const { buildQuotePdf, savePdf, pdfFileName } = await import('../../pdf/quotePdf');
      const head = templateHeader(settings, cq.options.group);
      const blob = await buildQuotePdf({
        quote: cq,
        company: settings.company,
        banks: settings.banks,
        brochures: brochures.filter((b) => cq!.options.brochureIds.includes(b.id)),
        accent: head.accent,
        template: head.template,
        publicUrl: token ? `${location.origin}/t/${token}` : null,
      });
      await savePdf(blob, pdfFileName(cq), mode);
      if (mode === 'download') {
        const wasDraft = cq.status === 'draft';
        const r = await api.post<{ quote: Quote }>(`/quotes/${cq.id}/pdf-log`, { markSent: true });
        setQ(r.quote);
        if (wasDraft) toast('PDF indirildi, teklif “Gönderildi” olarak işaretlendi.');
        api.get<{ events: QuoteEvent[] }>(`/quotes/${cq.id}`).then((d) => setEvents(d.events)).catch(() => null);
      }
    } catch (e) {
      console.error(e);
      toast('PDF oluşturulamadı: ' + errMsg(e), 'error');
    } finally {
      setPdfBusy('');
    }
  };

  const openShare = async () => {
    let cq: Quote | null = q;
    if (dirty || isNew) cq = await save(true);
    if (!cq) return;
    try {
      const r = await api.post<{ url: string; quote: Quote }>(`/quotes/${cq.id}/share`, { markSent: true });
      setQ(r.quote);
      setShare(r.url);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const changeStatus = async (status: QuoteStatus) => {
    if (dirty) {
      const s = await save(true);
      if (!s) return;
    }
    try {
      const r = await api.post<{ quote: Quote }>(`/quotes/${q.id}/status`, { status });
      setQ(r.quote);
      toast(`Durum: ${STATUS_LABEL[status]}`);
      api.get<{ events: QuoteEvent[] }>(`/quotes/${q.id}`).then((d) => setEvents(d.events)).catch(() => null);
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const action = async (kind: 'revise' | 'duplicate' | 'kit' | 'delete' | 'approve') => {
    setMenu(false);
    try {
      if (kind === 'revise') {
        if (!(await confirm({ title: 'Yeni revizyon oluşturulsun mu?', message: `${q.number} kopyalanarak v${(revisions.at(-1)?.revision ?? q.revision) + 1} oluşturulacak. Eski teklif arşivde kalır, müşteri linki yeni revizyona yönlendirilir.` }))) return;
        const r = await api.post<{ quote: Quote }>(`/quotes/${q.id}/revise`);
        toast(`${r.quote.number} oluşturuldu.`);
        navigate(`/teklifler/${r.quote.id}`);
      } else if (kind === 'duplicate') {
        const r = await api.post<{ quote: Quote }>(`/quotes/${q.id}/duplicate`);
        toast(`Kopya oluşturuldu: ${r.quote.number}`);
        navigate(`/teklifler/${r.quote.id}`);
      } else if (kind === 'kit') {
        const name = window.prompt('Paket adı', q.title || q.number);
        if (!name) return;
        await api.post(`/quotes/${q.id}/save-as-kit`, { name });
        await reloadKits();
        toast('Hazır paket olarak kaydedildi.');
      } else if (kind === 'delete') {
        if (!(await confirm({ title: 'Teklif silinsin mi?', message: `${q.number} kalıcı olarak silinecek. Bu işlem geri alınamaz.`, confirmText: 'Sil', danger: true }))) return;
        await api.del(`/quotes/${q.id}`);
        setDirty(false);
        toast('Teklif silindi.');
        navigate('/teklifler');
      } else if (kind === 'approve') {
        const r = await api.post<{ quote: Quote }>(`/quotes/${q.id}/approve-discount`);
        setQ(r.quote);
        toast('İskonto onaylandı.');
      }
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  const applyGes = (lines: QuoteLine[], info: GesInfo, title: string) => {
    update((prev) => ({ ...autoGroup(prev, [...prev.lines, ...lines], 'solar'), ges: info, title: prev.title || title }));
  };

  const planSum = q.terms.paymentPlan.reduce((s, p) => s + (Number(p.pct) || 0), 0);
  const days = daysUntil(q.validUntil);
  const pricedCount = q.lines.filter((l) => l.type !== 'section').length;

  return (
    <div>
      {/* ÜST BAR */}
      <div className="flex items-start lg:items-center justify-between gap-3 mb-4 lg:mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/teklifler" className="btn-icon border border-line shrink-0 w-10 h-10" aria-label="Geri">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black truncate">{isNew ? 'Yeni Teklif' : q.number}</h1>
              {!isNew && <StatusBadge status={q.status} className="hidden sm:inline-flex" />}
              {q.approvalRequired && <span className="chip bg-rose-500/15 text-rose-500">Onay Bekliyor</span>}
              {dirty && <span className="chip bg-amber-500/15 text-amber-600 dark:text-amber-400">Kaydedilmedi</span>}
            </div>
            <div className="text-xs text-muted mt-0.5 truncate">
              {isNew ? 'Taslak – ilk kayıtta numara verilir' : `${q.createdByName || ''} • ${fmtDateTime(q.createdAt)}${q.viewCount ? ` • ${q.viewCount} kez görüntülendi` : ''}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isNew && (
            <select
              className="input-sm w-auto font-bold max-w-[132px] sm:max-w-none"
              value={q.status}
              onChange={(e) => changeStatus(e.target.value as QuoteStatus)}
              disabled={readOnly && !isAdmin}
              aria-label="Teklif durumu"
            >
              {QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          )}
          <div className="hidden lg:flex gap-2">
            <button className="btn-secondary" onClick={() => makePdf('preview')} disabled={!!pdfBusy || !pricedCount}>
              {pdfBusy === 'preview' ? <Spinner className="w-4 h-4" /> : <Eye className="w-4 h-4" />} Önizle
            </button>
            <button className="btn-secondary" onClick={() => makePdf('download')} disabled={!!pdfBusy || !pricedCount}>
              {pdfBusy === 'download' ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />} PDF
            </button>
            <button className="btn-secondary" onClick={openShare} disabled={!pricedCount || q.approvalRequired}>
              <Share2 className="w-4 h-4" /> Paylaş
            </button>
            {!readOnly && (
              <button className="btn-primary" onClick={() => save()} disabled={saving || (!dirty && !isNew)}>
                {saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Kaydet
              </button>
            )}
          </div>
          <div className="relative">
            <button className="btn-icon border border-line h-10 w-10 lg:h-[42px] lg:w-[42px]" onClick={() => setMenu(!menu)} aria-label="Diğer işlemler">
              <MoreVertical className="w-5 h-5" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-30 bg-black/40 lg:bg-transparent" onClick={() => setMenu(false)} />
                <div className="fixed lg:absolute inset-x-0 bottom-0 lg:bottom-auto lg:inset-x-auto lg:right-0 lg:mt-1 z-40 lg:w-64 bg-surface border border-line rounded-t-3xl lg:rounded-2xl shadow-2xl py-2 lg:py-1.5 animate-in safe-bottom">
                  <div className="lg:hidden mx-auto w-10 h-1.5 rounded-full bg-line mb-2" />
                  <div className="lg:hidden">
                    <MenuItem icon={Eye} onClick={() => { setMenu(false); makePdf('preview'); }} disabled={!!pdfBusy || !pricedCount}>
                      PDF önizle
                    </MenuItem>
                    <MenuItem icon={Share2} onClick={() => { setMenu(false); openShare(); }} disabled={!pricedCount || q.approvalRequired}>
                      Müşteriyle paylaş (WhatsApp / link)
                    </MenuItem>
                  </div>
                  {!isNew && (
                    <>
                      <MenuItem icon={GitBranch} onClick={() => action('revise')}>
                        Yeni revizyon (v{(revisions.at(-1)?.revision ?? q.revision) + 1})
                      </MenuItem>
                      <MenuItem icon={Copy} onClick={() => action('duplicate')}>
                        Kopyala (yeni teklif)
                      </MenuItem>
                      {isAdmin && (
                        <MenuItem icon={PackagePlus} onClick={() => action('kit')}>
                          Hazır paket olarak kaydet
                        </MenuItem>
                      )}
                      {isAdmin && (
                        <MenuItem icon={Trash2} danger onClick={() => action('delete')}>
                          Teklifi sil
                        </MenuItem>
                      )}
                    </>
                  )}
                  {isNew && <div className="lg:block hidden px-4 py-2.5 text-xs text-muted">Diğer işlemler ilk kayıttan sonra açılır.</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {q.supersededBy && (
        <div className="card p-3.5 mb-4 border-amber-500/40 bg-amber-500/5 text-sm flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-amber-500" /> Bu teklifin daha yeni bir revizyonu var.
          <Link className="font-bold text-primary ml-auto" to={`/teklifler/${q.supersededBy}`}>
            Güncel revizyona git →
          </Link>
        </div>
      )}
      {readOnly && (
        <div className="card p-3.5 mb-4 border-emerald-500/40 bg-emerald-500/5 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-500" /> Onaylanmış teklif kilitlidir. Değişiklik için “Yeni revizyon” oluşturun.
        </div>
      )}
      {q.customerNote && (q.status === 'revision' || q.status === 'approved') && (
        <div className={`card p-4 mb-4 text-sm ${q.status === 'revision' ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/40 bg-emerald-500/5'}`}>
          <div className="font-bold mb-1">{q.status === 'revision' ? 'Müşterinin revize talebi' : 'Müşteri notu'}</div>
          <p className="whitespace-pre-line">{q.customerNote}</p>
        </div>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <fieldset disabled={readOnly} className="space-y-5 min-w-0">
          {/* MÜŞTERİ & PROJE */}
          <section className="card p-4 sm:p-5 space-y-4">
            <h2 className="font-extrabold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Müşteri & Proje
            </h2>
            <CustomerSection q={q} update={update} saveCustomer={saveCustomer} setSaveCustomer={setSaveCustomer} />
            <div>
              <label className="label">Teklif türü</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['', ...MAIN_GROUPS] as CategoryGroup[]).map((g) => {
                  const on = (q.options.group || '') === g;
                  return (
                    <button
                      key={g || 'genel'}
                      type="button"
                      onClick={() => changeGroup(g)}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition ${
                        on ? 'bg-primary/12 text-primary border-primary/50 ring-2 ring-primary/15' : 'bg-surface-2 border-line text-muted hover:text-fg'
                      }`}
                    >
                      <DynIcon name={GROUP_ICON[g]} className="w-4 h-4" /> {GROUP_LABEL[g]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted mt-1.5">PDF başlığı, ödeme planı, garanti ve notlar bu türün şablonundan gelir (Ayarlar → Proforma PDF).</p>
            </div>
            <div className="grid sm:grid-cols-[1fr_180px] gap-3 pt-1">
              <Field label="Proje / konu">
                <input className="input" value={q.title} onChange={(e) => update({ title: e.target.value })} placeholder={q.options.group === 'zayif' ? 'Örn: 8 Kameralı IP Güvenlik Sistemi' : q.options.group === 'elektronik' ? 'Örn: Daire Beyaz Eşya Seti' : 'Örn: 10 kW Hibrit Ev Tipi GES Kurulumu'} />
              </Field>
              <Field
                label="Geçerlilik tarihi"
                hint={days != null ? <span className={days < 0 ? 'text-rose-500 font-semibold' : days <= 3 ? 'text-amber-500 font-semibold' : ''}>{days < 0 ? `${-days} gün önce doldu` : `${days} gün kaldı`}</span> : undefined}
              >
                <input type="date" className="input" value={q.validUntil || ''} onChange={(e) => update({ validUntil: e.target.value || null })} />
              </Field>
            </div>
          </section>

          {/* KALEMLER */}
          <section className="card overflow-visible">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line">
              <h2 className="font-extrabold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Kalemler <span className="text-muted font-semibold">({pricedCount})</span>
              </h2>
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap [&>button]:shrink-0">
                <button type="button" className="btn-primary btn-sm" onClick={() => setPicker('products')}>
                  <Plus className="w-4 h-4" /> Ürün
                </button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setPicker('kits')}>
                  <Layers className="w-4 h-4" /> Paket
                </button>
                {(!q.options.group || q.options.group === 'solar') && (
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setGes(true)}>
                    <Sun className="w-4 h-4 text-amber-500" /> GES Asistanı
                  </button>
                )}
                <button type="button" className="btn-secondary btn-sm" onClick={() => setLines((ls) => [...ls, customLine(cur, settings.quote.defaultVatRate)])}>
                  <PencilLine className="w-4 h-4" /> Serbest
                </button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setLines((ls) => [...ls, sectionLine('')])}>
                  <Heading className="w-4 h-4" /> Bölüm
                </button>
              </div>
            </div>
            {q.lines.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-muted text-sm mb-4">Teklife ürün veya hazır paket ekleyin{!q.options.group || q.options.group === 'solar' ? ', ya da GES asistanıyla sistemi otomatik oluşturun' : ''}.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn-primary" onClick={() => setPicker('products')}>
                    <Plus className="w-4 h-4" /> Ürün Ekle
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => setPicker('kits')}>
                    <Layers className="w-4 h-4" /> Paket
                  </button>
                  {(!q.options.group || q.options.group === 'solar') && (
                    <button type="button" className="btn-secondary" onClick={() => setGes(true)}>
                      <Sun className="w-4 h-4 text-amber-500" /> GES Asistanı
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {q.lines.map((l, i) => (
                  <LineRow
                    key={l.id}
                    line={l}
                    lc={calc.lines[i]}
                    q={q}
                    admin={isAdmin}
                    index={i}
                    count={q.lines.length}
                    onChange={(nl) => setLines((ls) => ls.map((x) => (x.id === l.id ? nl : x)))}
                    onRemove={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                    onMove={(d) =>
                      setLines((ls) => {
                        const a = [...ls];
                        const j = i + d;
                        [a[i], a[j]] = [a[j], a[i]];
                        return a;
                      })
                    }
                  />
                ))}
              </>
            )}
          </section>

          {/* FİYATLANDIRMA */}
          <section className="card p-4 sm:p-5 space-y-4">
            <h2 className="font-extrabold">Fiyatlandırma & Görünüm</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Teklif para birimi">
                <Segmented<Currency> value={cur} onChange={(c) => update({ currency: c })} options={CURRENCIES.map((c) => ({ value: c, label: `${CURRENCY_SYMBOL[c]} ${c}` }))} size="sm" />
              </Field>
              <Field label="KDV gösterimi">
                <Segmented
                  value={q.vatMode}
                  onChange={(v) => update({ vatMode: v })}
                  size="sm"
                  options={[
                    { value: 'excluded', label: 'KDV Hariç' },
                    { value: 'included', label: 'KDV Dahil' },
                  ]}
                />
              </Field>
              <Field label="Tüm kalemlere KDV uygula">
                <select
                  className="input-sm"
                  value=""
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setLines((ls) => ls.map((l) => (l.type === 'section' ? l : { ...l, vatRate: r })));
                  }}
                >
                  <option value="" disabled>
                    Seçin…
                  </option>
                  {VAT_RATES.map((r) => (
                    <option key={r} value={r}>
                      %{r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Genel iskonto">
                <div className="flex">
                  <NumberInput className="input-sm rounded-r-none" value={q.generalDiscountValue} onChange={(v) => update({ generalDiscountValue: v })} min={0} placeholder="0" />
                  <button
                    type="button"
                    className="input-sm w-12 rounded-l-none border-l-0 px-0 font-bold"
                    onClick={() => update({ generalDiscountType: q.generalDiscountType === 'pct' ? 'amt' : 'pct' })}
                  >
                    {q.generalDiscountType === 'pct' ? '%' : CURRENCY_SYMBOL[cur]}
                  </button>
                </div>
              </Field>
            </div>
            <div className="p-3 rounded-xl bg-surface-2 border border-line">
              <div className="flex flex-wrap items-end gap-3">
                {(['USD', 'EUR'] as Currency[]).map((c) => (
                  <Field key={c} label={`1 ${c} =`}>
                    <NumberInput className="input-sm w-32" value={q.rates[c]} onChange={(v) => update((p) => ({ ...p, rates: { ...p.rates, [c]: v }, ratesSource: 'Manuel' }))} suffix="₺" />
                  </Field>
                ))}
                <button type="button" className="btn-secondary btn-sm mb-0.5" onClick={() => fetchRates(true)} disabled={ratesBusy}>
                  <RefreshCw className={`w-4 h-4 ${ratesBusy ? 'animate-spin' : ''}`} /> TCMB kurunu çek
                </button>
                <span className="text-xs text-muted mb-1.5">
                  {q.ratesSource} {q.ratesDate}
                </span>
              </div>
              {missingRate.length > 0 && <div className="text-xs font-semibold text-rose-500 mt-2">{missingRate.join(', ')} kuru girilmeden kaydedilemez.</div>}
            </div>
            <div className="grid sm:grid-cols-3 gap-4 pt-1">
              <Toggle
                checked={q.options.showUnitPrices}
                onChange={(v) => update((p) => ({ ...p, options: { ...p.options, showUnitPrices: v } }))}
                label="Birim fiyatları göster"
                hint={q.options.showUnitPrices ? 'Kalem bazlı fiyat + KDV dökümü' : 'Sadece anahtar teslim toplam'}
              />
              <Toggle checked={q.options.showPhotos} onChange={(v) => update((p) => ({ ...p, options: { ...p.options, showPhotos: v } }))} label="Ürün görselleri" hint="PDF tablosunda küçük görsel" />
              <Toggle
                checked={q.options.showTryEquivalent}
                onChange={(v) => update((p) => ({ ...p, options: { ...p.options, showTryEquivalent: v } }))}
                label="TL karşılığını göster"
                hint="Döviz tekliflerde toplamın TL'si"
              />
            </div>
          </section>

          {/* ŞARTLAR */}
          <section className="card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-extrabold">Ödeme, Garanti & Ekler</h2>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={async () => {
                  if (await confirm({ title: 'Şablon metinleri yeniden yüklensin mi?', message: `${GROUP_LABEL[q.options.group || '']} şablonundaki güncel metinler bu teklife uygulanacak.`, confirmText: 'Yükle' }))
                    update((x) => ({ ...x, terms: termsFromTemplate(settings, x.options.group) }));
                }}
              >
                <RefreshCw className="w-4 h-4" /> {GROUP_LABEL[q.options.group || '']} şablonunu yükle
              </button>
            </div>
            <Field label="Ön yazı" hint='PDF’te kalem tablosundan önce "Sayın …" hitabıyla görünür. Boşsa gösterilmez.'>
              <textarea className="input min-h-[64px] text-sm" value={q.terms.intro || ''} onChange={(e) => update((x) => ({ ...x, terms: { ...x.terms, intro: e.target.value } }))} />
            </Field>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Ödeme planı</label>
                <span className={`text-xs font-bold ${Math.abs(planSum - 100) < 0.01 || planSum === 0 ? 'text-muted' : 'text-amber-500'}`}>Toplam: %{fmtNum(planSum, 2)}</span>
              </div>
              <PlanEditor plan={q.terms.paymentPlan} total={t.grand} currency={cur} onChange={(paymentPlan) => update((x) => ({ ...x, terms: { ...x.terms, paymentPlan } }))} />
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
              <Field label="Teslimat & kurulum">
                <textarea className="input min-h-[84px] text-sm" value={q.terms.delivery} onChange={(e) => update((x) => ({ ...x, terms: { ...x.terms, delivery: e.target.value } }))} />
              </Field>
              <Field label="Garanti şartları">
                <textarea className="input min-h-[84px] text-sm" value={q.terms.warranty} onChange={(e) => update((x) => ({ ...x, terms: { ...x.terms, warranty: e.target.value } }))} />
              </Field>
              <Field label="Notlar & genel şartlar" className="lg:col-span-2">
                <textarea className="input min-h-[72px] text-sm" value={q.terms.notes} onChange={(e) => update((x) => ({ ...x, terms: { ...x.terms, notes: e.target.value } }))} />
              </Field>
            </div>
            {brochures.length > 0 && (
              <div>
                <label className="label">PDF sonuna eklenecek broşürler</label>
                <div className="flex flex-wrap gap-2">
                  {brochures.map((b) => {
                    const on = q.options.brochureIds.includes(b.id);
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() =>
                          update((x) => ({ ...x, options: { ...x.options, brochureIds: on ? x.options.brochureIds.filter((y) => y !== b.id) : [...x.options.brochureIds, b.id] } }))
                        }
                        className={`btn-sm btn border ${on ? 'border-primary bg-primary/10 text-primary' : 'border-line bg-surface-2 text-muted'}`}
                      >
                        {on ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />} {b.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </fieldset>

        {/* SAĞ PANEL */}
        <aside className="space-y-4 xl:sticky xl:top-6">
          <div className="card p-5 scroll-mt-20" ref={summaryRef}>
            <div className="space-y-2 text-sm">
              <Row label="Ara toplam" value={fmtMoney(t.gross - t.lineDiscount, cur)} />
              {t.generalDiscount > 0 && <Row label="Genel iskonto" value={`-${fmtMoney(t.generalDiscount, cur)}`} accent="text-emerald-600 dark:text-emerald-400" />}
              <Row label="KDV matrahı" value={fmtMoney(t.net, cur)} />
              {t.vatBreakdown.map((v) => (
                <Row key={v.rate} label={`KDV %${v.rate}`} value={fmtMoney(v.vat, cur)} muted />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-line">
              <div className="flex items-end justify-between">
                <span className="text-sm font-bold text-muted">GENEL TOPLAM</span>
                <span className="text-[26px] leading-none font-black text-primary tabular-nums">{fmtMoney(t.grand, cur)}</span>
              </div>
              {cur !== 'TRY' && (
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-muted">TL karşılığı</span>
                  <span className="font-bold tabular-nums">{fmtMoney(t.grandTry, 'TRY')}</span>
                </div>
              )}
            </div>
            {t.discountTotal > 0 && (
              <div className={`mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${overLimit || q.approvalRequired ? 'bg-rose-500/10 text-rose-500' : 'bg-surface-2 text-muted'}`}>
                {overLimit || q.approvalRequired ? <ShieldAlert className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
                <span>
                  Toplam iskonto %{fmtNum(t.effectiveDiscountPct, 1)}
                  {limit != null && !isAdmin && ` (limitiniz %${limit})`}
                  {overLimit && ' – kaydedince yönetici onayına düşer'}
                </span>
              </div>
            )}
            {q.approvalRequired && isAdmin && !dirty && (
              <button className="btn w-full mt-3 bg-emerald-600 text-white hover:bg-emerald-500" onClick={() => action('approve')}>
                <ShieldCheck className="w-4 h-4" /> İskontoyu Onayla
              </button>
            )}
          </div>

          {isAdmin && t.cost != null && (
            <div className="card p-5">
              <div className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Kârlılık (sadece yönetici)</div>
              <div className="space-y-2 text-sm">
                <Row label="Toplam maliyet" value={fmtMoney(t.cost, cur)} />
                <Row label="Net kâr" value={fmtMoney(t.profit ?? 0, cur)} accent={(t.profit ?? 0) < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'} strong />
                <Row label="Kâr marjı" value={`%${fmtNum(t.marginPct ?? 0, 1)}`} strong />
              </div>
              <div className="mt-3 h-2 rounded-full bg-surface-3 overflow-hidden">
                <div className={`h-full ${(t.marginPct ?? 0) < 10 ? 'bg-rose-500' : (t.marginPct ?? 0) < 20 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.max(0, t.marginPct ?? 0) * 2)}%` }} />
              </div>
              {(t.costMissing ?? 0) > 0 && <p className="text-xs text-amber-500 mt-2">{t.costMissing} kalemin alış fiyatı tanımsız; kâr olduğundan yüksek görünebilir.</p>}
            </div>
          )}

          {!isNew && (
            <div className="card p-5 space-y-3">
              <div className="text-xs font-bold text-muted uppercase tracking-wide">Müşteri Linki</div>
              {q.publicToken ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4 text-primary" />
                    {q.viewCount ? (
                      <span>
                        <b>{q.viewCount}</b> kez görüntülendi • son {fmtRelative(q.lastViewedAt)}
                      </span>
                    ) : (
                      <span className="text-muted">Henüz görüntülenmedi</span>
                    )}
                  </div>
                  <button className="btn-secondary btn-sm w-full" onClick={openShare}>
                    <Link2 className="w-4 h-4" /> Linki aç / tekrar gönder
                  </button>
                </>
              ) : (
                <button className="btn-secondary btn-sm w-full" onClick={openShare} disabled={!pricedCount || q.approvalRequired}>
                  <Share2 className="w-4 h-4" /> Online teklif linki oluştur
                </button>
              )}
              {q.approvedAt && (
                <div className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> {q.approvedName} – {fmtDate(q.approvedAt)}
                </div>
              )}
            </div>
          )}

          {revisions.length > 1 && (
            <div className="card p-5">
              <div className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Revizyonlar</div>
              <div className="space-y-1">
                {revisions.map((r) => (
                  <Link key={r.id} to={`/teklifler/${r.id}`} className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-sm ${r.id === q.id ? 'bg-primary/10 font-bold' : 'hover:bg-surface-2'}`}>
                    <span>{r.number}</span>
                    <StatusBadge status={r.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="card p-5">
              <div className="text-xs font-bold text-muted uppercase tracking-wide mb-3">Geçmiş</div>
              <ol className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-2.5 text-sm">
                    <Clock className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="leading-snug">{e.message}</div>
                      <div className="text-[11px] text-muted">
                        {e.actor} • {fmtDateTime(e.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>

      {/* MOBİL ALT EYLEM ÇUBUĞU */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-surface/95 backdrop-blur border-t border-line safe-bottom">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button type="button" className="flex-1 min-w-0 text-left" onClick={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <div className="text-[11px] font-bold text-muted uppercase tracking-wide">Genel toplam{q.vatMode === 'included' ? ' (KDV d.)' : ''}</div>
            <div className="text-lg font-black text-primary tabular-nums leading-tight truncate">{fmtMoney(t.grand, cur)}</div>
          </button>
          <button className="btn-secondary h-11 w-11 p-0" onClick={() => makePdf('download')} disabled={!!pdfBusy || !pricedCount} aria-label="PDF indir">
            {pdfBusy === 'download' ? <Spinner className="w-5 h-5" /> : <Download className="w-5 h-5" />}
          </button>
          <button className="btn-secondary h-11 w-11 p-0" onClick={openShare} disabled={!pricedCount || q.approvalRequired} aria-label="Paylaş">
            <Share2 className="w-5 h-5" />
          </button>
          {!readOnly && (
            <button className="btn-primary h-11 px-5" onClick={() => save()} disabled={saving || (!dirty && !isNew)}>
              {saving ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" />} Kaydet
            </button>
          )}
        </div>
      </div>

      <ProductPicker open={!!picker} initialTab={picker || 'products'} onClose={() => setPicker('')} onAdd={addLines} existing={q.lines} group={q.options.group || ''} />
      <GesWizard open={ges} onClose={() => setGes(false)} onApply={applyGes} />
      {share && <ShareModal open={!!share} onClose={() => setShare('')} q={q} url={share} />}
    </div>
  );
}

function MenuItem({ icon: Icon, children, onClick, danger, disabled }: { icon: typeof Eye; children: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-5 lg:px-4 py-3.5 lg:py-2.5 text-[15px] lg:text-sm font-semibold hover:bg-surface-2 disabled:opacity-40 ${danger ? 'text-rose-500' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className={`w-5 h-5 lg:w-4 lg:h-4 ${danger ? '' : 'text-primary'}`} /> {children}
    </button>
  );
}

function Row({ label, value, muted, accent, strong }: { label: string; value: string; muted?: boolean; accent?: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={muted ? 'text-muted' : 'text-muted font-semibold'}>{label}</span>
      <span className={`tabular-nums ${strong ? 'font-extrabold' : 'font-semibold'} ${accent || ''}`}>{value}</span>
    </div>
  );
}
