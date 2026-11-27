import { useState } from 'react';
import type { FormEvent } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../lib/store';
import { Field, Spinner } from '../components/ui';

export default function LoginPage({ setup }: { setup: boolean }) {
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (setup && password !== password2) return setError('Şifreler eşleşmiyor.');
    setBusy(true);
    try {
      if (setup) await api.post('/auth/setup', { name, email, password });
      else await api.post('/auth/login', { email, password });
      await refresh();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-surface border-r border-line relative overflow-hidden">
        <div className="absolute -right-32 -top-32 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="flex items-center gap-3 relative">
          <img src="/logo.png" alt="" className="w-12 h-12 rounded-xl border border-line" />
          <div className="font-black text-2xl tracking-wide">
            OSE <span className="text-primary">TEKNOLOJİ</span>
          </div>
        </div>
        <div className="relative space-y-5 max-w-md">
          <h1 className="text-4xl font-black leading-tight">
            Teklifinizi dakikalar içinde hazırlayın, <span className="text-primary">onayını telefondan alın.</span>
          </h1>
          <ul className="space-y-2.5 text-muted font-semibold">
            <li>• Alış / satış fiyatı ve kâr marjı takibi</li>
            <li>• Çoklu kur, KDV ve iskonto motoru</li>
            <li>• Müşteri kartları ve teklif arşivi</li>
            <li>• Online teklif linki ile tek tıkla onay</li>
          </ul>
        </div>
        <div className="text-xs text-muted relative">© {new Date().getFullYear()} OSE Teknoloji</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <img src="/logo.png" alt="" className="w-11 h-11 rounded-xl border border-line" />
            <div className="font-black text-xl tracking-wide">
              OSE <span className="text-primary">TEKNOLOJİ</span>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black">{setup ? 'İlk Kurulum' : 'Giriş Yap'}</h2>
            <p className="text-sm text-muted mt-1">
              {setup ? 'Sistemi kullanmaya başlamak için yönetici hesabınızı oluşturun.' : 'Hesabınızla oturum açın.'}
            </p>
          </div>
          {setup && (
            <div className="flex gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30 text-sm">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
              <span>Bu hesap tüm maliyet, kâr, ürün ve kullanıcı yönetimine erişecek. Satış personelini daha sonra ekleyebilirsiniz.</span>
            </div>
          )}
          {setup && (
            <Field label="Ad Soyad">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </Field>
          )}
          <Field label="E-posta">
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus={!setup} />
          </Field>
          <Field label="Şifre" hint={setup ? 'En az 8 karakter' : undefined}>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={setup ? 8 : undefined}
              autoComplete={setup ? 'new-password' : 'current-password'}
            />
          </Field>
          {setup && (
            <Field label="Şifre (tekrar)">
              <input type="password" className="input" value={password2} onChange={(e) => setPassword2(e.target.value)} required autoComplete="new-password" />
            </Field>
          )}
          {error && <div className="text-sm font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2.5">{error}</div>}
          <button className="btn-primary w-full py-3 text-[15px]" disabled={busy}>
            {busy ? <Spinner className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            {setup ? 'Hesabı Oluştur ve Başla' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
