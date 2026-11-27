import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { History } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';
import { PageHeader, PageLoader, Empty } from '../../components/ui';

interface Item {
  id: number;
  userName: string;
  action: string;
  entity: string;
  entityId: string | null;
  detail: string;
  createdAt: string;
}

const LABELS: Record<string, string> = {
  'quote.create': 'Teklif oluşturdu',
  'quote.update': 'Teklifi güncelledi',
  'quote.status': 'Teklif durumunu değiştirdi',
  'quote.revise': 'Revizyon oluşturdu',
  'quote.duplicate': 'Teklifi kopyaladı',
  'quote.delete': 'Teklifi sildi',
  'quote.approve_discount': 'İskontoyu onayladı',
  'product.create': 'Ürün ekledi',
  'product.update': 'Ürünü güncelledi',
  'product.delete': 'Ürünü sildi',
  'product.bulk_import': 'Excel ile ürün yükledi',
  'product.bulk_prices': 'Excel ile fiyat güncelledi',
  'product.adjust': 'Toplu fiyat güncelledi',
  'category.create': 'Kategori ekledi',
  'category.update': 'Kategoriyi güncelledi',
  'category.delete': 'Kategoriyi sildi',
  'customer.create': 'Müşteri ekledi',
  'customer.update': 'Müşteriyi güncelledi',
  'customer.delete': 'Müşteriyi sildi',
  'kit.create': 'Paket oluşturdu',
  'kit.update': 'Paketi güncelledi',
  'kit.delete': 'Paketi sildi',
  'settings.update': 'Ayarları güncelledi',
  'user.create': 'Kullanıcı ekledi',
  'user.update': 'Kullanıcıyı güncelledi',
  'password.change': 'Şifresini değiştirdi',
  'brochure.create': 'Broşür yükledi',
  'brochure.delete': 'Broşür sildi',
  'backup.export': 'Yedek indirdi',
  'backup.restore': 'Yedekten geri yükledi',
  'legacy.import': 'Eski veriyi aktardı',
};

const FILTERS = [
  ['', 'Tümü'],
  ['quote', 'Teklifler'],
  ['product', 'Ürünler'],
  ['customer', 'Müşteriler'],
  ['user', 'Kullanıcılar'],
  ['settings', 'Ayarlar'],
];

export default function AuditPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [entity, setEntity] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setItems(null);
    api
      .get<{ items: Item[] }>(`/admin/audit?limit=300${entity ? `&entity=${entity}` : ''}`)
      .then((r) => setItems(r.items))
      .catch((e) => setError(errMsg(e)));
  }, [entity]);

  const link = (i: Item) => (i.entity === 'quote' && i.entityId && i.action !== 'quote.delete' ? `/teklifler/${i.entityId}` : i.entity === 'customer' && i.entityId && i.action !== 'customer.delete' ? `/musteriler/${i.entityId}` : null);

  return (
    <div>
      <PageHeader title="İşlem Kaydı" subtitle="Kim, ne zaman, neyi değiştirdi" />
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-4">
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setEntity(v)} className={`btn-sm btn shrink-0 border ${entity === v ? 'bg-primary text-primary-fg border-primary' : 'bg-surface border-line text-muted'}`}>
            {l}
          </button>
        ))}
      </div>
      {error ? (
        <div className="card p-4 text-rose-500 text-sm">{error}</div>
      ) : !items ? (
        <PageLoader />
      ) : items.length === 0 ? (
        <Empty icon={History} title="Kayıt yok" />
      ) : (
        <div className="card divide-y divide-line">
          {items.map((i) => {
            const to = link(i);
            const body = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <b>{i.userName}</b> <span className="text-muted">{LABELS[i.action] || i.action}</span>
                  </div>
                  {i.detail && <div className="text-xs text-muted truncate">{i.detail}</div>}
                </div>
                <div className="text-xs text-muted whitespace-nowrap">{fmtDateTime(i.createdAt)}</div>
              </>
            );
            return to ? (
              <Link key={i.id} to={to} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                {body}
              </Link>
            ) : (
              <div key={i.id} className="flex items-center gap-3 px-5 py-3">
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
