import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Plus, Search, Eye, ShieldAlert, FileText, GitBranch } from 'lucide-react';
import type { QuoteSummary } from '../../../shared/types';
import { STATUS_LABEL } from '../../../shared/types';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../lib/store';
import { fmtMoney, fmtDate, fmtTry, daysUntil } from '../../lib/format';
import { PageHeader, PageLoader, StatusBadge, Empty } from '../../components/ui';

const FILTERS = [
  { v: '', label: 'Tümü' },
  { v: 'draft', label: STATUS_LABEL.draft },
  { v: 'pending', label: 'Bekleyen' },
  { v: 'approved', label: STATUS_LABEL.approved },
  { v: 'revision', label: STATUS_LABEL.revision },
  { v: 'cancelled', label: STATUS_LABEL.cancelled },
  { v: 'approval', label: 'İskonto Onayı' },
];

export default function QuotesList() {
  const [params, setParams] = useSearchParams();
  const status = params.get('durum') || '';
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [quotes, setQuotes] = useState<QuoteSummary[] | null>(null);
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (debounced) sp.set('q', debounced);
    if (showAll) sp.set('all', '1');
    api
      .get<{ quotes: QuoteSummary[] }>(`/quotes?${sp}`)
      .then((r) => {
        setQuotes(r.quotes);
        setError('');
      })
      .catch((e) => setError(errMsg(e)));
  }, [status, debounced, showAll]);

  const sum = useMemo(() => (quotes || []).filter((x) => x.status !== 'cancelled').reduce((s, x) => s + x.grandTry, 0), [quotes]);

  return (
    <div>
      <PageHeader
        title="Teklifler"
        subtitle={quotes ? `${quotes.length} teklif • toplam ${fmtTry(sum, true)} (KDV dahil)` : 'Teklif arşivi'}
        actions={
          <button className="btn-primary" onClick={() => navigate('/teklifler/yeni')}>
            <Plus className="w-4 h-4" /> Yeni Teklif
          </button>
        }
      />
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input className="input pl-10" placeholder="Teklif no, müşteri veya proje ara..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.filter((f) => f.v !== 'approval' || isAdmin).map((f) => (
            <button
              key={f.v}
              onClick={() => setParams(f.v ? { durum: f.v } : {})}
              className={`btn-sm btn shrink-0 border ${status === f.v ? 'bg-primary text-primary-fg border-primary' : 'bg-surface border-line text-muted hover:text-fg'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted mb-3 cursor-pointer w-fit">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Eski revizyonları da göster
      </label>

      {error ? (
        <div className="card p-4 text-rose-500 text-sm">{error}</div>
      ) : !quotes ? (
        <PageLoader />
      ) : quotes.length === 0 ? (
        <Empty
          icon={FileText}
          title={q || status ? 'Sonuç bulunamadı' : 'Henüz teklif yok'}
          text={q || status ? 'Filtreleri değiştirin.' : 'İlk teklifinizi oluşturarak başlayın.'}
          action={
            !q && !status ? (
              <button className="btn-primary" onClick={() => navigate('/teklifler/yeni')}>
                <Plus className="w-4 h-4" /> Yeni Teklif
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[150px_minmax(0,1fr)_120px_110px_150px_110px] gap-4 px-5 py-3 border-b border-line table-head">
            <span>Teklif No</span>
            <span>Müşteri / Proje</span>
            <span>Durum</span>
            <span>Tarih</span>
            <span className="text-right">Tutar</span>
            <span className="text-right">Geçerlilik</span>
          </div>
          <div className="divide-y divide-line">
            {quotes.map((x) => {
              const d = daysUntil(x.validUntil);
              const expired = d != null && d < 0 && (x.status === 'sent' || x.status === 'draft');
              return (
                <Link
                  key={x.id}
                  to={`/teklifler/${x.id}`}
                  className={`grid grid-cols-[1fr_auto] md:grid-cols-[150px_minmax(0,1fr)_120px_110px_150px_110px] gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-surface-2 transition items-center ${x.supersededBy ? 'opacity-60' : ''}`}
                >
                  <div className="font-bold text-sm flex items-center gap-1.5 md:order-none order-2 md:col-auto col-span-2 text-muted md:text-fg">
                    {x.revision > 1 && <GitBranch className="w-3.5 h-3.5 text-primary" />}
                    {x.number}
                  </div>
                  <div className="min-w-0 order-1 md:order-none">
                    <div className="font-bold truncate">{x.customerName}</div>
                    <div className="text-xs text-muted truncate">
                      {x.title || '—'}
                      {x.createdByName ? ` • ${x.createdByName}` : ''}
                    </div>
                  </div>
                  <div className="order-3 md:order-none flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={x.status} />
                    {x.approvalRequired && <ShieldAlert className="w-4 h-4 text-rose-500" />}
                    {x.viewCount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted" title={`${x.viewCount} görüntülenme`}>
                        <Eye className="w-3.5 h-3.5" />
                        {x.viewCount}
                      </span>
                    )}
                  </div>
                  <div className="hidden md:block text-sm text-muted">{fmtDate(x.createdAt)}</div>
                  <div className="text-right order-1 md:order-none">
                    <div className="font-extrabold tabular-nums">{fmtMoney(x.grand, x.currency)}</div>
                    {isAdmin && x.profitTry != null && x.profitTry !== 0 && (
                      <div className={`text-[11px] font-semibold ${x.profitTry < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>kâr {fmtTry(x.profitTry, true)}</div>
                    )}
                  </div>
                  <div className={`hidden md:block text-right text-sm ${expired ? 'text-rose-500 font-semibold' : 'text-muted'}`}>{fmtDate(x.validUntil)}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
