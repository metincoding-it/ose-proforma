import { useEffect, useState } from 'react';
import type { Customer } from '../../../shared/types';
import { api, errMsg } from '../../lib/api';
import { useUi } from '../../lib/store';
import { Modal, Field, Segmented, Spinner } from '../../components/ui';

export const emptyCustomer = (): Customer => ({
  id: '',
  kind: 'company',
  name: '',
  company: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  taxOffice: '',
  taxNo: '',
  notes: '',
});

export function CustomerFields({ value, onChange, showNotes = true }: { value: Customer | Omit<Customer, 'id' | 'notes'>; onChange: (c: Customer) => void; showNotes?: boolean }) {
  const v = value as Customer;
  const set = (k: keyof Customer, val: string) => onChange({ ...v, [k]: val });
  return (
    <div className="space-y-4">
      <Segmented
        value={v.kind}
        onChange={(k) => onChange({ ...v, kind: k })}
        options={[
          { value: 'company', label: 'Kurumsal' },
          { value: 'person', label: 'Bireysel' },
        ]}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        {v.kind === 'company' && (
          <Field label="Firma unvanı" className="sm:col-span-2">
            <input className="input" value={v.company} onChange={(e) => set('company', e.target.value)} placeholder="Örn: ABC Enerji San. Tic. Ltd. Şti." />
          </Field>
        )}
        <Field label={v.kind === 'company' ? 'Yetkili kişi' : 'Ad soyad'}>
          <input className="input" value={v.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Telefon">
          <input className="input" type="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} placeholder="05xx xxx xx xx" />
        </Field>
        <Field label="E-posta">
          <input className="input" type="email" value={v.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="İl / İlçe">
          <input className="input" value={v.city} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="Adres" className="sm:col-span-2">
          <textarea className="input min-h-[64px]" value={v.address} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Vergi dairesi">
          <input className="input" value={v.taxOffice} onChange={(e) => set('taxOffice', e.target.value)} />
        </Field>
        <Field label={v.kind === 'company' ? 'Vergi no' : 'TC kimlik no'}>
          <input className="input" inputMode="numeric" value={v.taxNo} onChange={(e) => set('taxNo', e.target.value.replace(/[^\d]/g, '').slice(0, 11))} />
        </Field>
        {showNotes && (
          <Field label="Notlar (sadece ekip görür)" className="sm:col-span-2">
            <textarea className="input min-h-[64px]" value={v.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        )}
      </div>
    </div>
  );
}

export default function CustomerForm({
  open,
  onClose,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Customer | null;
  onSaved: (c: Customer) => void;
}) {
  const [c, setC] = useState<Customer>(initial || emptyCustomer());
  const [busy, setBusy] = useState(false);
  const { toast } = useUi();
  useEffect(() => {
    if (open) setC(initial || emptyCustomer());
  }, [open, initial]);
  const save = async () => {
    setBusy(true);
    try {
      const r = c.id ? await api.put<{ customer: Customer }>(`/customers/${c.id}`, c) : await api.post<{ customer: Customer }>('/customers', c);
      toast(c.id ? 'Müşteri kartı güncellendi.' : 'Müşteri kaydedildi.');
      onSaved(r.customer);
      onClose();
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={c.id ? 'Müşteri Kartını Düzenle' : 'Yeni Müşteri'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Vazgeç
          </button>
          <button className="btn-primary" onClick={save} disabled={busy || (!c.name.trim() && !c.company.trim())}>
            {busy && <Spinner className="w-4 h-4" />} Kaydet
          </button>
        </>
      }
    >
      <CustomerFields value={c} onChange={setC} />
    </Modal>
  );
}
