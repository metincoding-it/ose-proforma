import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Plus, PencilLine, Trash2, Phone, Mail, MapPin, Receipt, MessageCircle, FileText } from 'lucide-react';
import type { Customer, QuoteSummary } from '../../../shared/types';
import { api, errMsg } from '../../lib/api';
import { useAuth, useUi } from '../../lib/store';
import { fmtMoney, fmtDate, fmtTry, waLink } from '../../lib/format';
import { PageLoader, StatusBadge, Empty, StatCard } from '../../components/ui';
import CustomerForm from './CustomerForm';
import { CheckCircle2, Hourglass } from 'lucide-react';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast, confirm } = useUi();
  const [c, setC] = useState<Customer | null>(null);
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState(false);

  const load = () =>
    api
      .get<{ customer: Customer; quotes: QuoteSummary[] }>(`/customers/${id}`)
      .then((r) => {
        setC(r.customer);
        setQuotes(r.quotes);
      })
      .catch((e) => setError(errMsg(e)));
  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Empty title="Müşteri bulunamadı" text={error} action={<Link to="/musteriler" className="btn-secondary">Geri dön</Link>} />;
  if (!c) return <PageLoader />;

  const active = quotes.filter((q) => !q.supersededBy);
  const approved = active.filter((q) => q.status === 'approved');
  const pending = active.filter((q) => q.status === 'sent' || q.status === 'revision');

  const del = async () => {
    if (!(await confirm({ title: 'Müşteri silinsin mi?', message: 'Teklifler silinmez, yalnızca müşteri kartı kaldırılır.', danger: true, confirmText: 'Sil' }))) return;
    try {
      await api.del(`/customers/${c.id}`);
      toast('Müşteri silindi.');
      navigate('/musteriler');
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/musteriler" className="btn-icon border border-line shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-black truncate">{c.company || c.name}</h1>
            {c.company && c.name && <p className="text-sm text-muted">Yetkili: {c.name}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.phone && (
            <a className="btn bg-[#25D366] text-white" href={waLink(c.phone, `Merhaba ${c.name || ''},`)} target="_blank" rel="noreferrer">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          )}
          <button className="btn-secondary" onClick={() => setEdit(true)}>
            <PencilLine className="w-4 h-4" /> Düzenle
          </button>
          {isAdmin && (
            <button className="btn-danger" onClick={del}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button className="btn-primary" onClick={() => navigate(`/teklifler/yeni?musteri=${c.id}`)}>
            <Plus className="w-4 h-4" /> Yeni Teklif
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
        <div className="card p-5 space-y-3 text-sm">
          {c.phone && (
            <a href={`tel:${c.phone}`} className="flex gap-3 hover:text-primary">
              <Phone className="w-4 h-4 text-muted mt-0.5" /> {c.phone}
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} className="flex gap-3 hover:text-primary break-all">
              <Mail className="w-4 h-4 text-muted mt-0.5 shrink-0" /> {c.email}
            </a>
          )}
          {(c.address || c.city) && (
            <div className="flex gap-3">
              <MapPin className="w-4 h-4 text-muted mt-0.5 shrink-0" /> {[c.address, c.city].filter(Boolean).join(', ')}
            </div>
          )}
          {(c.taxOffice || c.taxNo) && (
            <div className="flex gap-3">
              <Receipt className="w-4 h-4 text-muted mt-0.5 shrink-0" /> {[c.taxOffice, c.taxNo].filter(Boolean).join(' / ')}
            </div>
          )}
          {c.notes && <div className="p-3 rounded-xl bg-surface-2 border border-line text-muted whitespace-pre-line">{c.notes}</div>}
          <div className="text-xs text-muted pt-2 border-t border-line">Kayıt: {fmtDate(c.createdAt)}</div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Toplam teklif" value={active.length} icon={FileText} />
            <StatCard label="Onaylanan ciro" value={fmtTry(approved.reduce((s, q) => s + q.grandTry, 0), true)} sub={`${approved.length} teklif`} icon={CheckCircle2} tone="emerald" />
            <StatCard label="Bekleyen" value={pending.length} sub={fmtTry(pending.reduce((s, q) => s + q.grandTry, 0), true)} icon={Hourglass} tone="amber" />
          </div>
          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-line font-extrabold">Teklif Geçmişi</div>
            {quotes.length === 0 ? (
              <p className="p-6 text-sm text-muted">Bu müşteriye henüz teklif verilmedi.</p>
            ) : (
              <div className="divide-y divide-line">
                {quotes.map((q) => (
                  <Link key={q.id} to={`/teklifler/${q.id}`} className={`flex items-center gap-3 px-5 py-3 hover:bg-surface-2 ${q.supersededBy ? 'opacity-55' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{q.number}</span>
                        <StatusBadge status={q.status} />
                        {q.supersededBy && <span className="text-[11px] text-muted">eski revizyon</span>}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {q.title || '—'} • {fmtDate(q.createdAt)}
                      </div>
                    </div>
                    <div className="font-extrabold tabular-nums text-sm">{fmtMoney(q.grand, q.currency)}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <CustomerForm open={edit} onClose={() => setEdit(false)} initial={c} onSaved={(nc) => setC({ ...c, ...nc })} />
    </div>
  );
}
