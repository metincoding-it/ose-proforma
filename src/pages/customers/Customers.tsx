import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Users, Phone, Building2, UserRound } from 'lucide-react';
import type { Customer } from '../../../shared/types';
import { api, errMsg } from '../../lib/api';
import { fmtTry, fmtRelative } from '../../lib/format';
import { PageHeader, PageLoader, Empty } from '../../components/ui';
import CustomerForm from './CustomerForm';

export default function Customers() {
  const [list, setList] = useState<Customer[] | null>(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(false);
  const [error, setError] = useState('');
  const load = () =>
    api
      .get<{ customers: Customer[] }>('/customers')
      .then((r) => setList(r.customers))
      .catch((e) => setError(errMsg(e)));
  useEffect(() => {
    load();
  }, []);
  const filtered = useMemo(() => {
    const s = q.toLocaleLowerCase('tr');
    return (list || []).filter((c) => `${c.company} ${c.name} ${c.phone} ${c.email} ${c.city} ${c.taxNo}`.toLocaleLowerCase('tr').includes(s));
  }, [list, q]);

  return (
    <div>
      <PageHeader
        title="Müşteriler"
        subtitle={list ? `${list.length} müşteri kartı` : undefined}
        actions={
          <button className="btn-primary" onClick={() => setForm(true)}>
            <Plus className="w-4 h-4" /> Yeni Müşteri
          </button>
        }
      />
      <div className="relative mb-4">
        <Search className="w-5 h-5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input pl-10" placeholder="Firma, isim, telefon, vergi no ara..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error ? (
        <div className="card p-4 text-rose-500 text-sm">{error}</div>
      ) : !list ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <Empty
          icon={Users}
          title={q ? 'Sonuç yok' : 'Henüz müşteri yok'}
          text={q ? undefined : 'Müşteri kartları, teklif oluştururken otomatik de kaydedilebilir.'}
          action={
            !q && (
              <button className="btn-primary" onClick={() => setForm(true)}>
                <Plus className="w-4 h-4" /> Müşteri Ekle
              </button>
            )
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <Link key={c.id} to={`/musteriler/${c.id}`} className="card p-4 hover:border-primary/50 transition flex gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                {c.kind === 'company' ? <Building2 className="w-5 h-5" /> : <UserRound className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold truncate">{c.company || c.name}</div>
                {c.company && c.name && <div className="text-sm text-muted truncate">{c.name}</div>}
                <div className="text-xs text-muted mt-1 flex items-center gap-1 truncate">
                  {c.phone && (
                    <>
                      <Phone className="w-3 h-3" /> {c.phone}
                    </>
                  )}
                  {c.city && <span className="truncate">• {c.city}</span>}
                </div>
                <div className="flex items-center gap-3 mt-2.5 text-xs">
                  <span className="chip bg-surface-3 text-muted normal-case">{c.quoteCount} teklif</span>
                  {(c.approvedTotalTry ?? 0) > 0 && <span className="font-bold text-emerald-600 dark:text-emerald-400">{fmtTry(c.approvedTotalTry!, true)} ciro</span>}
                  {c.lastQuoteAt && <span className="text-muted ml-auto">{fmtRelative(c.lastQuoteAt)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <CustomerForm open={form} onClose={() => setForm(false)} onSaved={() => load()} />
    </div>
  );
}
