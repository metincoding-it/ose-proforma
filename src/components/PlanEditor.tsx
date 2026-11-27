import { Plus, Trash2 } from 'lucide-react';
import type { Currency, PaymentPlanRow } from '../../shared/types';
import { fmtMoney } from '../lib/format';
import { NumberInput } from './ui';

/** Ödeme planı satırları – mobilde kart, masaüstünde tek satır */
export default function PlanEditor({ plan, onChange, total, currency }: { plan: PaymentPlanRow[]; onChange: (p: PaymentPlanRow[]) => void; total?: number; currency?: Currency }) {
  return (
    <div className="space-y-2">
      {plan.map((p, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_110px_40px] sm:grid-cols-[minmax(0,1fr)_100px_auto_36px] gap-2 items-center p-2 sm:p-0 rounded-xl bg-surface-2 sm:bg-transparent border border-line sm:border-0">
          <input
            className="input-sm col-span-3 sm:col-span-1"
            value={p.label}
            placeholder="Aşama (örn: Sipariş onayında peşin)"
            onChange={(e) => onChange(plan.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
          />
          <div className="col-start-2 row-start-2 sm:col-start-auto sm:row-start-auto">
            <NumberInput className="input-sm" value={p.pct} suffix="%" onChange={(v) => onChange(plan.map((x, j) => (j === i ? { ...x, pct: v } : x)))} />
          </div>
          {total != null && currency ? (
            <span className="text-sm text-right font-semibold tabular-nums sm:min-w-[100px] col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto text-left sm:text-right">
              {fmtMoney((total * p.pct) / 100, currency)}
            </span>
          ) : (
            <span className="col-start-1 row-start-2 sm:col-start-auto sm:row-start-auto text-xs text-muted sm:invisible">{i + 1}. aşama</span>
          )}
          <button type="button" className="btn-icon w-10 h-10 sm:w-9 sm:h-9 justify-self-end col-start-3 row-start-2 sm:col-start-auto sm:row-start-auto" aria-label="Aşamayı sil" onClick={() => onChange(plan.filter((_, j) => j !== i))}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" className="btn-ghost btn-sm" onClick={() => onChange([...plan, { label: '', pct: 0 }])}>
        <Plus className="w-4 h-4" /> Aşama ekle
      </button>
    </div>
  );
}

