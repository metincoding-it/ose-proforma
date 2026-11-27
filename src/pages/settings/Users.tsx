import { useEffect, useState } from 'react';
import { Plus, PencilLine, ShieldCheck, UserRound } from 'lucide-react';
import type { Role, User } from '../../../shared/types';
import { api, errMsg } from '../../lib/api';
import { useAuth, useData, useUi } from '../../lib/store';
import { fmtRelative } from '../../lib/format';
import { PageHeader, PageLoader, Modal, Field, Segmented, Toggle, NumberInput, Spinner } from '../../components/ui';

interface Form {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  discountLimit: number | null;
  password: string;
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const { settings } = useData();
  const { toast } = useUi();
  const [users, setUsers] = useState<User[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api
      .get<{ users: User[] }>('/users')
      .then((r) => setUsers(r.users))
      .catch((e) => toast(errMsg(e), 'error'));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!form) return;
    setBusy(true);
    try {
      if (form.id) await api.put(`/users/${form.id}`, form);
      else await api.post('/users', form);
      toast(form.id ? 'Kullanıcı güncellendi.' : 'Kullanıcı eklendi. Giriş bilgilerini kendisiyle paylaşın.');
      setForm(null);
      load();
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const genPass = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const arr = crypto.getRandomValues(new Uint8Array(10));
    return Array.from(arr, (b) => chars[b % chars.length]).join('');
  };

  return (
    <div>
      <PageHeader
        title="Kullanıcılar"
        subtitle="Yönetici: maliyet, kâr, ürün ve ayar yönetimi • Satış: sadece satış fiyatlarıyla teklif"
        actions={
          <button className="btn-primary" onClick={() => setForm({ id: '', name: '', email: '', role: 'sales', active: true, discountLimit: null, password: genPass() })}>
            <Plus className="w-4 h-4" /> Kullanıcı Ekle
          </button>
        }
      />
      {!users ? (
        <PageLoader />
      ) : (
        <div className="card divide-y divide-line">
          {users.map((u) => (
            <div key={u.id} className={`flex items-center gap-3 px-5 py-4 ${u.active ? '' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-primary/15 text-primary' : 'bg-surface-3 text-muted'}`}>
                {u.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <UserRound className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold flex items-center gap-2">
                  {u.name} {u.id === me?.id && <span className="chip bg-primary/15 text-primary">Siz</span>}
                  {!u.active && <span className="chip bg-rose-500/15 text-rose-500">Pasif</span>}
                </div>
                <div className="text-xs text-muted truncate">
                  {u.email} • {u.role === 'admin' ? 'Yönetici' : `Satış${u.discountLimit != null ? ` (iskonto limiti %${u.discountLimit})` : ''}`}
                </div>
              </div>
              <div className="hidden sm:block text-xs text-muted text-right">{u.lastLoginAt ? `Son giriş ${fmtRelative(u.lastLoginAt)}` : 'Hiç giriş yapmadı'}</div>
              <button className="btn-icon" onClick={() => setForm({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, discountLimit: u.discountLimit, password: '' })}>
                <PencilLine className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}
        size="sm"
        footer={
          <button className="btn-primary" onClick={save} disabled={busy || !form?.name || !form?.email}>
            {busy && <Spinner className="w-4 h-4" />} Kaydet
          </button>
        }
      >
        {form && (
          <div className="space-y-4">
            <Field label="Ad soyad">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="E-posta (giriş adı)">
              <input className="input" type="email" value={form.email} disabled={!!form.id} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Rol">
              <Segmented
                value={form.role}
                onChange={(r) => setForm({ ...form, role: r })}
                options={[
                  { value: 'sales', label: 'Satış Personeli' },
                  { value: 'admin', label: 'Yönetici' },
                ]}
              />
            </Field>
            {form.role === 'sales' && (
              <Field label="Kişisel iskonto limiti" hint={`Boş bırakılırsa genel limit (%${settings.quote.salesDiscountLimit ?? '∞'}) geçerli olur`}>
                <NumberInput value={form.discountLimit} onChange={(v) => setForm({ ...form, discountLimit: v })} suffix="%" placeholder="Genel limit" />
              </Field>
            )}
            <Field label={form.id ? 'Yeni şifre (değiştirmek için)' : 'Geçici şifre'} hint={form.id ? 'Boş bırakırsanız değişmez' : 'Kullanıcıyla paylaşın; ilk girişte değiştirmesi önerilir'}>
              <div className="flex gap-2">
                <input className="input font-mono" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" className="btn-secondary" onClick={() => setForm({ ...form, password: genPass() })}>
                  Üret
                </button>
              </div>
            </Field>
            {form.id && <Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Hesap aktif" hint="Pasif kullanıcılar giriş yapamaz" />}
          </div>
        )}
      </Modal>
    </div>
  );
}
