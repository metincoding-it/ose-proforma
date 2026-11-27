import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  FileText,
  CheckCircle2,
  Hourglass,
  Percent,
  Plus,
  Eye,
  AlertTriangle,
  ThumbsUp,
  PencilLine,
  ShieldAlert,
  CalendarClock,
  TrendingUp,
  DatabaseZap,
  Clock,
} from 'lucide-react';
import type { DashboardData, QuoteSummary } from '../../shared/types';
import { api, errMsg } from '../lib/api';
import { useAuth, useData, useUi } from '../lib/store';
import { fmtTry, fmtMoney, fmtRelative, fmtDate, daysUntil } from '../lib/format';
import { PageHeader, PageLoader, StatCard, StatusBadge, Segmented, Spinner } from '../components/ui';
import MonthlyChart from '../components/MonthlyChart';

type Period = 'month' | 'last_month' | 'quarter' | 'year' | 'all';

function QuoteRow({ q, right }: { q: QuoteSummary; right?: React.ReactNode }) {
  return (
    <Link to={`/teklifler/${q.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm truncate">{q.customerName}</span>
          <StatusBadge status={q.status} />
        </div>
        <div className="text-xs text-muted truncate mt-0.5">
          {q.number}
          {q.title ? ` • ${q.title}` : ''}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-extrabold text-sm tabular-nums">{fmtMoney(q.grand, q.currency)}</div>
        <div className="text-[11px] text-muted">{right ?? fmtRelative(q.createdAt)}</div>
      </div>
    </Link>
  );
}

function LegacyBanner() {
  const [info, setInfo] = useState<{ available: boolean; count: number; imported: { at?: string } | null } | null>(null);
  const [progress, setProgress] = useState<{ next: number; total: number } | null>(null);
  const { toast } = useUi();
  const { reloadCatalog } = useData();
  useEffect(() => {
    api.get<typeof info>('/admin/legacy').then(setInfo).catch(() => null);
  }, []);
  if (!info?.available || info.imported) return null;
  const run = async () => {
    try {
      let offset = 0;
      for (;;) {
        const r = await api.post<{ next: number; total: number; done: boolean }>('/admin/legacy/import', { offset });
        setProgress(r);
        offset = r.next;
        if (r.done) break;
      }
      await reloadCatalog();
      toast(`${info.count} ürün yeni veritabanına aktarıldı.`);
      setInfo({ ...info, imported: { at: new Date().toISOString() } });
    } catch (e) {
      toast(errMsg(e), 'error');
      setProgress(null);
    }
  };
  return (
    <div className="card p-5 mb-5 border-primary/40 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <DatabaseZap className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <div className="font-extrabold">Eski sistemde {info.count} ürün bulundu</div>
        <div className="text-sm text-muted">
          Önceki sürümdeki ürünlerinizi fotoğraflarıyla birlikte yeni veritabanına tek tıkla aktarın. Mevcut fiyatlar <b>satış fiyatı (USD)</b> olarak gelir; alış
          fiyatlarını sonra ekleyebilirsiniz.
        </div>
        {progress && (
          <div className="mt-2 h-2 rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${(progress.next / Math.max(1, progress.total)) * 100}%` }} />
          </div>
        )}
      </div>
      <button className="btn-primary" onClick={run} disabled={!!progress}>
        {progress ? <Spinner className="w-4 h-4" /> : null} {progress ? `${progress.next}/${progress.total}` : 'Ürünleri Aktar'}
      </button>
    </div>
  );
}

const ACTIVITY_ICON: Record<string, { icon: typeof Eye; cls: string }> = {
  viewed: { icon: Eye, cls: 'text-sky-500 bg-sky-500/12' },
  customer_approved: { icon: ThumbsUp, cls: 'text-emerald-500 bg-emerald-500/12' },
  customer_revision: { icon: PencilLine, cls: 'text-amber-500 bg-amber-500/12' },
  approval_needed: { icon: ShieldAlert, cls: 'text-rose-500 bg-rose-500/12' },
};

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<DashboardData>(`/reports/dashboard?period=${period}`)
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e) => setError(errMsg(e)));
  }, [period]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  return (
    <div>
      <PageHeader
        title={`${greet}, ${user?.name?.split(' ')[0] ?? ''}`}
        subtitle="Teklif ve satış performansınızın özeti"
        actions={
          <>
            <Segmented<Period>
              size="sm"
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'month', label: 'Bu Ay' },
                { value: 'last_month', label: 'Geçen Ay' },
                { value: 'quarter', label: '3 Ay' },
                { value: 'year', label: 'Yıl' },
              ]}
            />
            <button className="btn-primary hidden sm:inline-flex" onClick={() => navigate('/teklifler/yeni')}>
              <Plus className="w-4 h-4" /> Yeni Teklif
            </button>
          </>
        }
      />
      {isAdmin && <LegacyBanner />}
      {error && <div className="card p-4 text-rose-500 text-sm font-semibold mb-4">{error}</div>}
      {!data ? (
        <PageLoader />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label={`Kesilen Teklif (${data.period.label})`}
              value={fmtTry(data.issued.total, true)}
              sub={`${data.issued.count} teklif • KDV hariç`}
              icon={FileText}
            />
            <StatCard
              label="Onaylanan Ciro"
              value={fmtTry(data.approved.total, true)}
              sub={
                isAdmin && data.approved.profit != null ? (
                  <span>
                    {data.approved.count} onay • Kâr: <b className="text-emerald-600 dark:text-emerald-400">{fmtTry(data.approved.profit, true)}</b>
                  </span>
                ) : (
                  `${data.approved.count} onaylı teklif`
                )
              }
              icon={CheckCircle2}
              tone="emerald"
            />
            <StatCard
              label="Bekleyen Teklifler"
              value={data.pending.count}
              sub={`${fmtTry(data.pending.total, true)} potansiyel • ${data.drafts} taslak`}
              icon={Hourglass}
              tone="amber"
            />
            <StatCard label="Dönüşüm Oranı" value={`%${data.conversion.toLocaleString('tr-TR')}`} sub={`${data.period.label} gönderilen tekliflerden`} icon={Percent} tone="violet" />
          </div>

          {isAdmin && (data.approvals.length > 0 || (data.stalePrices ?? 0) > 0) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {data.approvals.length > 0 && (
                <Link to="/teklifler?durum=approval" className="card p-4 flex items-center gap-3 border-rose-500/40 hover:bg-surface-2">
                  <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0" />
                  <div className="flex-1 text-sm">
                    <b>{data.approvals.length} teklif</b> limit üstü iskonto nedeniyle onayınızı bekliyor.
                  </div>
                </Link>
              )}
              {(data.stalePrices ?? 0) > 0 && (
                <Link to="/urunler?eski=1" className="card p-4 flex items-center gap-3 border-amber-500/40 hover:bg-surface-2">
                  <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                  <div className="flex-1 text-sm">
                    <b>{data.stalePrices} ürünün</b> fiyatı uzun süredir güncellenmedi. Teklif vermeden önce kontrol edin.
                  </div>
                </Link>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-5">
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="font-extrabold">Son 6 Ay</h2>
              </div>
              <MonthlyChart data={data.monthly} />
            </div>
            <div className="card overflow-hidden">
              <div className="px-4 py-3.5 border-b border-line font-extrabold flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" /> Müşteri Hareketleri
              </div>
              {data.activity.length === 0 ? (
                <p className="p-5 text-sm text-muted">Müşterileriniz online teklifleri açtığında veya onayladığında burada görünür.</p>
              ) : (
                <div className="divide-y divide-line max-h-[320px] overflow-y-auto">
                  {data.activity.map((a) => {
                    const meta = ACTIVITY_ICON[a.type] || ACTIVITY_ICON.viewed;
                    return (
                      <Link key={a.id} to={`/teklifler/${a.quoteId}`} className="flex gap-3 px-4 py-3 hover:bg-surface-2">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}>
                          <meta.icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 text-sm">
                          <div className="font-bold truncate">{a.customerName}</div>
                          <div className="text-xs text-muted line-clamp-2">{a.message}</div>
                          <div className="text-[11px] text-muted mt-0.5">
                            {a.number} • {fmtRelative(a.createdAt)}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <div className="card overflow-hidden lg:col-span-2">
              <div className="px-4 py-3.5 border-b border-line flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Son Teklifler
                </span>
                <Link to="/teklifler" className="text-sm font-bold text-primary">
                  Tümü
                </Link>
              </div>
              {data.recent.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted mb-3">Henüz teklif oluşturulmadı.</p>
                  <button className="btn-primary" onClick={() => navigate('/teklifler/yeni')}>
                    <Plus className="w-4 h-4" /> İlk Teklifi Oluştur
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {data.recent.map((q) => (
                    <QuoteRow key={q.id} q={q} />
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-5">
              <div className="card overflow-hidden">
                <div className="px-4 py-3.5 border-b border-line font-extrabold flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-amber-500" /> Süresi Dolmak Üzere
                </div>
                {data.expiring.length === 0 ? (
                  <p className="p-5 text-sm text-muted">Önümüzdeki 7 gün içinde süresi dolacak teklif yok.</p>
                ) : (
                  <div className="divide-y divide-line">
                    {data.expiring.map((q) => {
                      const d = daysUntil(q.validUntil);
                      return (
                        <QuoteRow
                          key={q.id}
                          q={q}
                          right={
                            <span className={d != null && d < 0 ? 'text-rose-500 font-bold' : 'text-amber-500 font-bold'}>
                              {d == null ? '' : d < 0 ? `${-d} gün geçti` : d === 0 ? 'Bugün' : `${d} gün kaldı`} ({fmtDate(q.validUntil)})
                            </span>
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </div>
              {data.topCustomers.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-line font-extrabold">Yılın En İyi Müşterileri</div>
                  <div className="divide-y divide-line">
                    {data.topCustomers.map((c, i) => (
                      <Link key={c.id} to={`/musteriler/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                        <span className="w-6 text-center text-xs font-black text-muted">{i + 1}</span>
                        <span className="flex-1 text-sm font-bold truncate">{c.name}</span>
                        <span className="text-sm font-extrabold tabular-nums">{fmtTry(c.total, true)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
