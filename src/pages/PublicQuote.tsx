import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Download, CheckCircle2, PencilLine, Phone, Mail, Globe, MapPin, Copy, AlertTriangle, Sun, Clock, Loader2, ThumbsUp } from 'lucide-react';
import type { BankAccount, Brochure, CompanySettings, Quote } from '../../shared/types';
import { calcQuote } from '../../shared/calc';
import { api, errMsg } from '../lib/api';
import { useUi } from '../lib/store';
import { fmtMoney, fmtDate, fmtNum, daysUntil } from '../lib/format';
import { Modal, Field } from '../components/ui';

interface PublicData {
  quote: Quote;
  company: CompanySettings;
  banks: BankAccount[];
  accentColor: string;
  brochures: Brochure[];
  newer: { number: string; token: string | null } | null;
  expired: boolean;
}

export default function PublicQuote() {
  const { token = '' } = useParams();
  const { toast } = useUi();
  const [d, setD] = useState<PublicData | null>(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'' | 'approve' | 'revision'>('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [done, setDone] = useState<'' | 'approve' | 'revision'>('');

  useEffect(() => {
    document.documentElement.className = 'light';
    const preview = new URLSearchParams(location.search).get('preview') === '1';
    api
      .get<PublicData>(`/public/q/${token}${preview ? '?preview=1' : ''}`)
      .then((r) => {
        setD(r);
        document.title = `${r.quote.number} – ${r.company.name}`;
      })
      .catch((e) => setError(errMsg(e)));
  }, [token]);

  const calc = useMemo(() => (d ? calcQuote(d.quote) : null), [d]);

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
        <div className="card p-8 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h1 className="font-black text-xl">Teklif bulunamadı</h1>
          <p className="text-muted text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  if (!d || !calc)
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  const { quote: q, company: co } = d;
  const t = calc.totals;
  const cur = q.currency;
  const accent = d.accentColor || '#00b8e6';
  const canAct = !d.newer && (q.status === 'sent' || q.status === 'revision') && !done;
  const days = daysUntil(q.validUntil);
  const showPrices = q.options.showUnitPrices;

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/public/q/${token}/${modal === 'approve' ? 'approve' : 'revision'}`, { name, note });
      setDone(modal as 'approve' | 'revision');
      setD({ ...d, quote: { ...q, status: modal === 'approve' ? 'approved' : 'revision', approvedName: modal === 'approve' ? name : q.approvedName, approvedAt: modal === 'approve' ? new Date().toISOString() : q.approvedAt } });
      setModal('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const pdf = async () => {
    setPdfBusy(true);
    try {
      const { buildQuotePdf, savePdf, pdfFileName } = await import('../pdf/quotePdf');
      const blob = await buildQuotePdf({ quote: q, company: co, banks: d.banks, brochures: d.brochures, accent, publicUrl: `${location.origin}/t/${token}`, proxyToken: token });
      await savePdf(blob, pdfFileName(q), 'download');
    } catch (e) {
      toast('PDF oluşturulamadı: ' + errMsg(e), 'error');
    } finally {
      setPdfBusy(false);
    }
  };

  const copyIban = async (iban: string) => {
    try {
      await navigator.clipboard.writeText(iban.replace(/\s/g, ''));
      toast('IBAN kopyalandı.');
    } catch {
      /* yoksay */
    }
  };

  let no = 0;

  return (
    <div className="min-h-screen bg-bg pb-28" style={{ ['--primary' as string]: hexToRgbVar(accent) }}>
      <div className="h-1.5" style={{ background: accent }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ANTET */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {co.logo && <img src={co.logo} alt="" className="w-14 h-14 rounded-xl object-contain border border-line bg-white" />}
            <div>
              <div className="font-black text-xl tracking-wide">{co.name}</div>
              {co.slogan && <div className="text-sm text-muted">{co.slogan}</div>}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {co.phone && (
              <a href={`tel:${co.phone}`} className="flex items-center gap-1.5 hover:text-fg">
                <Phone className="w-4 h-4" /> {co.phone}
              </a>
            )}
            {co.email && (
              <a href={`mailto:${co.email}`} className="flex items-center gap-1.5 hover:text-fg">
                <Mail className="w-4 h-4" /> {co.email}
              </a>
            )}
            {co.website && (
              <a href={co.website.startsWith('http') ? co.website : `https://${co.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-fg">
                <Globe className="w-4 h-4" /> {co.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </header>

        {/* DURUM BANDI */}
        {d.newer && (
          <div className="card p-4 border-amber-400 bg-amber-50 flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="flex-1">Bu teklifin güncellenmiş bir versiyonu ({d.newer.number}) mevcut.</span>
            {d.newer.token && (
              <a className="btn-primary btn-sm" href={`/t/${d.newer.token}`}>
                Güncel teklifi aç
              </a>
            )}
          </div>
        )}
        {q.status === 'approved' && (
          <div className="card p-4 border-emerald-300 bg-emerald-50 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div className="text-sm">
              <div className="font-bold text-emerald-700">{done === 'approve' ? 'Teşekkür ederiz! Teklif onaylandı.' : 'Bu teklif onaylanmıştır.'}</div>
              <div className="text-emerald-700/80">
                {q.approvedName} • {fmtDate(q.approvedAt)}. {done === 'approve' && 'Ekibimiz en kısa sürede sizinle iletişime geçecek.'}
              </div>
            </div>
          </div>
        )}
        {done === 'revision' && (
          <div className="card p-4 border-amber-300 bg-amber-50 flex items-center gap-3 text-sm">
            <ThumbsUp className="w-5 h-5 text-amber-600" /> Talebiniz iletildi. Teklifinizi güncelleyip size tekrar ulaşacağız.
          </div>
        )}
        {q.status === 'cancelled' && <div className="card p-4 border-rose-300 bg-rose-50 text-sm text-rose-700">Bu teklif iptal edilmiştir.</div>}

        {/* BAŞLIK KARTI */}
        <section className="card overflow-hidden">
          <div className="p-5 sm:p-6 grid sm:grid-cols-[1fr_auto] gap-5">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase" style={{ color: accent }}>
                Fiyat Teklifi
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mt-1">{q.title || 'Sistem Kurulum Teklifi'}</h1>
              <div className="mt-3 text-sm">
                <div className="text-muted text-xs font-semibold">SAYIN</div>
                <div className="font-bold text-base">{q.customer.company || q.customer.name || 'Değerli Müşterimiz'}</div>
                {q.customer.company && q.customer.name && <div className="text-muted">{q.customer.name}</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-6 gap-y-2 text-sm sm:text-right">
              <div>
                <div className="text-xs text-muted">Teklif No</div>
                <div className="font-bold">{q.number}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Tarih</div>
                <div className="font-semibold">{fmtDate(q.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Geçerlilik</div>
                <div className={`font-semibold ${d.expired ? 'text-rose-600' : ''}`}>
                  {fmtDate(q.validUntil)}
                  {days != null && days >= 0 && q.status !== 'approved' && <span className="text-xs text-muted font-normal"> ({days} gün)</span>}
                </div>
              </div>
            </div>
          </div>
          {q.ges && (
            <div className="px-5 sm:px-6 py-3 border-t border-line flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ background: `${accent}12` }}>
              <span className="flex items-center gap-1.5 font-semibold">
                <Sun className="w-4 h-4 text-amber-500" /> {fmtNum(q.ges.kwp, 2)} kWp kurulu güç
              </span>
              {q.ges.panelCount > 0 && (
                <span>
                  {q.ges.panelCount} panel × {q.ges.panelW} W
                </span>
              )}
              {q.ges.yearlyKwh > 0 && <span>Tahmini yıllık üretim: <b>{fmtNum(q.ges.yearlyKwh, 0)} kWh</b></span>}
            </div>
          )}
        </section>

        {/* KALEMLER */}
        <section className="card overflow-hidden">
          <div className="divide-y divide-line">
            {q.lines.map((l, i) => {
              if (l.type === 'section')
                return (
                  <div key={l.id} className="px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide" style={{ background: `${accent}14`, color: accent }}>
                    {l.title}
                  </div>
                );
              no++;
              const lc = calc.lines[i];
              const f = q.vatMode === 'included' ? 1 + l.vatRate / 100 : 1;
              return (
                <div key={l.id} className="px-4 sm:px-5 py-3.5 flex gap-3">
                  {q.options.showPhotos && l.photo ? (
                    <img src={l.photo} alt="" className="w-14 h-14 rounded-lg object-contain border border-line bg-white shrink-0" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                  ) : (
                    <span className="w-7 text-center text-xs font-bold text-muted pt-1 shrink-0">{no}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold">{l.title}</div>
                    {l.summary && <div className="text-xs text-muted mt-0.5">{l.summary}</div>}
                    <div className="text-sm text-muted mt-1">
                      {fmtNum(l.qty, 3)} {l.unit}
                      {showPrices && <> × {fmtMoney(lc.unitPrice * f, cur)}</>}
                      {showPrices && lc.lineDiscount > 0.004 && <span className="text-emerald-600"> (−{l.discountType === 'pct' ? `%${fmtNum(l.discountValue, 2)}` : fmtMoney(lc.lineDiscount * f, cur)})</span>}
                    </div>
                  </div>
                  {showPrices && <div className="font-extrabold tabular-nums text-right">{fmtMoney((lc.gross - lc.lineDiscount) * f, cur)}</div>}
                </div>
              );
            })}
          </div>
          <div className="border-t border-line p-5 sm:p-6 bg-surface-2">
            <div className="max-w-sm ml-auto space-y-1.5 text-sm">
              {showPrices && q.vatMode === 'excluded' && (
                <>
                  <Line l="Ara toplam" v={fmtMoney(t.gross - t.lineDiscount, cur)} />
                  {t.generalDiscount > 0 && <Line l="Genel iskonto" v={`−${fmtMoney(t.generalDiscount, cur)}`} />}
                </>
              )}
              {(!showPrices || q.vatMode === 'excluded') && <Line l={showPrices ? 'KDV matrahı' : 'Anahtar teslim toplam (KDV hariç)'} v={fmtMoney(t.net, cur)} />}
              {t.vatBreakdown
                .filter((v) => v.rate > 0)
                .map((v) => (
                  <Line key={v.rate} l={`${q.vatMode === 'included' ? 'İçindeki ' : ''}KDV %${v.rate}`} v={fmtMoney(v.vat, cur)} />
                ))}
              <div className="flex justify-between items-end pt-3 mt-2 border-t border-line">
                <span className="font-bold text-muted">GENEL TOPLAM</span>
                <span className="text-2xl font-black tabular-nums" style={{ color: accent }}>
                  {fmtMoney(t.grand, cur)}
                </span>
              </div>
              {cur !== 'TRY' && q.options.showTryEquivalent && <Line l={`TL karşılığı (1 ${cur} = ${fmtNum(q.rates[cur], 4)} ₺)`} v={fmtMoney(t.grandTry, 'TRY')} />}
            </div>
          </div>
        </section>

        {/* ŞARTLAR */}
        <section className="grid md:grid-cols-2 gap-5">
          {q.terms.paymentPlan.length > 0 && (
            <div className="card p-5">
              <h3 className="font-extrabold mb-3">Ödeme Planı</h3>
              <div className="space-y-2 text-sm">
                {q.terms.paymentPlan.map((p, i) => (
                  <div key={i} className="flex justify-between gap-3">
                    <span>
                      <b>%{fmtNum(p.pct, 2)}</b> – {p.label}
                    </span>
                    <span className="font-semibold tabular-nums">{fmtMoney((t.grand * p.pct) / 100, cur)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {d.banks.filter((b) => b.iban).length > 0 && (
            <div className="card p-5">
              <h3 className="font-extrabold mb-3">Banka Hesapları</h3>
              <div className="space-y-3 text-sm">
                {d.banks
                  .filter((b) => b.iban)
                  .map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">
                          {b.bank} {b.branch && <span className="text-muted font-normal">/ {b.branch}</span>} <span className="chip bg-surface-3 text-muted">{b.currency}</span>
                        </div>
                        <div className="font-mono text-xs break-all">{b.iban}</div>
                        <div className="text-xs text-muted">{b.holder || co.title}</div>
                      </div>
                      <button className="btn-icon" onClick={() => copyIban(b.iban)} title="Kopyala">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {[
            ['Teslimat & Kurulum', q.terms.delivery],
            ['Garanti Şartları', q.terms.warranty],
            ['Notlar & Genel Şartlar', q.terms.notes],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="card p-5">
                <h3 className="font-extrabold mb-2">{k}</h3>
                <p className="text-sm text-muted whitespace-pre-line">{v}</p>
              </div>
            ))}
        </section>

        <footer className="text-center text-xs text-muted space-y-1 pt-4">
          <div className="font-semibold">{co.title || co.name}</div>
          {(co.address || co.city) && (
            <div className="flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" /> {[co.address, co.city].filter(Boolean).join(', ')}
            </div>
          )}
          {(co.taxOffice || co.taxNo) && <div>{[co.taxOffice && `${co.taxOffice} V.D.`, co.taxNo].filter(Boolean).join(' • ')}</div>}
        </footer>
      </div>

      {/* ALT AKSİYON BARI */}
      <div className="fixed bottom-0 inset-x-0 bg-surface/95 backdrop-blur border-t border-line safe-bottom z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="hidden sm:block flex-1 min-w-0">
            <div className="text-xs text-muted">Genel toplam</div>
            <div className="font-black text-lg tabular-nums" style={{ color: accent }}>
              {fmtMoney(t.grand, cur)}
            </div>
          </div>
          <button className="btn-secondary flex-1 sm:flex-none" onClick={pdf} disabled={pdfBusy}>
            {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
          </button>
          {canAct && (
            <>
              <button className="btn-secondary flex-1 sm:flex-none" onClick={() => setModal('revision')}>
                <PencilLine className="w-4 h-4" /> Revize İste
              </button>
              <button className="btn flex-[2] sm:flex-none text-white shadow-lg" style={{ background: d.expired ? '#94a3b8' : '#059669' }} onClick={() => (d.expired ? toast('Teklifin geçerlilik süresi dolmuş. Lütfen bizimle iletişime geçin.', 'error') : setModal('approve'))}>
                <CheckCircle2 className="w-5 h-5" /> Teklifi Onayla
              </button>
            </>
          )}
        </div>
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal('')}
        title={modal === 'approve' ? 'Teklifi Onayla' : 'Revize Talebi'}
        size="sm"
        footer={
          <button
            className="btn text-white w-full sm:w-auto"
            style={{ background: modal === 'approve' ? '#059669' : accent }}
            onClick={submit}
            disabled={busy || (modal === 'approve' ? !name.trim() || !accept : !note.trim())}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {modal === 'approve' ? 'Onaylıyorum' : 'Talebi Gönder'}
          </button>
        }
      >
        <div className="space-y-4">
          {modal === 'approve' && (
            <div className="p-3 rounded-xl bg-surface-2 border border-line text-sm flex justify-between">
              <span className="text-muted">{q.number}</span>
              <b className="tabular-nums">{fmtMoney(t.grand, cur)}</b>
            </div>
          )}
          <Field label="Adınız soyadınız">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label={modal === 'approve' ? 'Notunuz (opsiyonel)' : 'Neleri değiştirmemizi istersiniz?'}>
            <textarea className="input min-h-[90px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder={modal === 'revision' ? 'Örn: Batarya kapasitesini artıralım, ödeme planını 3 taksit yapabilir miyiz?' : ''} />
          </Field>
          {modal === 'approve' && (
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <input type="checkbox" className="mt-1" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
              <span>Teklif kapsamını, ödeme planını ve şartları okudum, kabul ediyorum.</span>
            </label>
          )}
          <p className="text-xs text-muted flex gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" /> İşleminiz tarih ve saatiyle kayıt altına alınır ve {co.name} ekibine iletilir.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function Line({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{l}</span>
      <span className="font-semibold tabular-nums">{v}</span>
    </div>
  );
}

function hexToRgbVar(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}
