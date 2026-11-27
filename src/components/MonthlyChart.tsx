import { useState } from 'react';
import { fmtTry } from '../lib/format';

interface Row {
  month: string;
  issued: number;
  approved: number;
}

// Doğrulanmış kategorik palet (slot 1: mavi, slot 2: turuncu) – açık/koyu için ayrı adımlar
const SERIES = [
  { key: 'issued' as const, label: 'Kesilen teklif', light: '#257de0', dark: '#338ced' },
  { key: 'approved' as const, label: 'Onaylanan ciro', light: '#f47230', dark: '#e76624' },
];

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} Mn` : v >= 1e3 ? `${Math.round(v / 1e3)} B` : String(Math.round(v)));

export default function MonthlyChart({ data }: { data: Row[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const dark = document.documentElement.classList.contains('dark');
  const W = 640;
  const H = 240;
  const pad = { l: 44, r: 8, t: 12, b: 28 };
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.issued, d.approved))));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const group = plotW / data.length;
  const barW = Math.min(22, (group - 18) / 2);
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;

  const bar = (x: number, v: number, color: string) => {
    const h = Math.max(0, (v / max) * plotH);
    if (h < 0.5) return null;
    const r = Math.min(4, h, barW / 2);
    const top = pad.t + plotH - h;
    const bottom = pad.t + plotH;
    // Sadece üst köşeler yuvarlak, taban düz
    return <path d={`M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${bottom} Z`} fill={color} />;
  };

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-3 text-xs font-semibold text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[3px]" style={{ background: dark ? s.dark : s.light }} />
            {s.label}
          </span>
        ))}
        <span className="ml-auto">KDV hariç, TL</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label="Aylık teklif ve onaylanan ciro grafiği">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgb(var(--line))" strokeDasharray={t === 0 ? '' : '3 4'} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="rgb(var(--muted))">
                {short(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const gx = pad.l + i * group;
            const x1 = gx + (group - (barW * 2 + 2)) / 2;
            return (
              <g key={d.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)}>
                <rect x={gx} y={pad.t} width={group} height={plotH} fill={hover === i ? 'rgb(var(--surface-3) / 0.6)' : 'transparent'} rx="6" />
                {bar(x1, d.issued, dark ? SERIES[0].dark : SERIES[0].light)}
                {bar(x1 + barW + 2, d.approved, dark ? SERIES[1].dark : SERIES[1].light)}
                <text x={gx + group / 2} y={H - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="rgb(var(--muted))">
                  {d.month}
                </text>
              </g>
            );
          })}
        </svg>
        {hover != null && (
          <div
            className="absolute top-0 pointer-events-none card shadow-xl px-3 py-2 text-xs"
            style={{ left: `${Math.min(70, Math.max(2, ((pad.l + hover * group + group / 2) / W) * 100 - 12))}%` }}
          >
            <div className="font-bold mb-1">{data[hover].month}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center gap-2 justify-between min-w-[150px]">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: dark ? s.dark : s.light }} />
                  {s.label}
                </span>
                <span className="font-bold tabular-nums">{fmtTry(data[hover][s.key])}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
