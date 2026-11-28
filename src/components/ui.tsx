/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, ElementType } from 'react';
import {
  X,
  Loader2,
  ImageIcon,
  Upload,
  Link2,
  Trash2,
  Inbox,
  Box,
  Cpu,
  Sun,
  BatteryCharging,
  Network,
  Wrench,
  Camera,
  HardDrive,
  Cctv,
  Wind,
  Snowflake,
  Zap,
  Shield,
  Plug,
  Lightbulb,
  Thermometer,
  Layers,
  Cable,
  Router,
  Wifi,
  Car,
  Droplets,
  Flame,
  Tag,
  Package,
  Tv,
  Refrigerator,
  WashingMachine,
  AirVent,
  Siren,
  House,
  BellRing,
  Speaker,
  Fan,
  Lock,
  Monitor,
  Smartphone,
  Microwave,
  DoorOpen,
} from 'lucide-react';

const ICON_MAP: Record<string, ElementType> = {
  Box,
  Cpu,
  Sun,
  BatteryCharging,
  Network,
  Wrench,
  Camera,
  HardDrive,
  Cctv,
  Wind,
  Snowflake,
  Zap,
  Shield,
  Plug,
  Lightbulb,
  Thermometer,
  Layers,
  Cable,
  Router,
  Wifi,
  Car,
  Droplets,
  Flame,
  Tag,
  Package,
  Tv,
  Refrigerator,
  WashingMachine,
  AirVent,
  Siren,
  House,
  BellRing,
  Speaker,
  Fan,
  Lock,
  Monitor,
  Smartphone,
  Microwave,
  DoorOpen,
};
import type { QuoteStatus } from '../../shared/types';
import { STATUS_LABEL } from '../../shared/types';
import { api, errMsg } from '../lib/api';
import { useUi } from '../lib/store';

export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function PageLoader({ text = 'Yükleniyor...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted">
      <Spinner className="w-8 h-8 text-primary" />
      <span className="text-sm font-semibold">{text}</span>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }[size];
  // Büyük formlar mobilde tam ekran açılır; küçükler alttan kayan sayfa olarak
  const full = size === 'lg' || size === 'xl';
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${w} bg-surface border border-line shadow-2xl flex flex-col animate-in sm:rounded-2xl sm:max-h-[90vh] ${
          full ? 'h-[100dvh] sm:h-auto rounded-none border-0 sm:border' : 'rounded-t-3xl max-h-[92dvh]'
        }`}
      >
        {!full && <div className="sm:hidden mx-auto mt-2 w-10 h-1.5 rounded-full bg-line" />}
        <div className={`flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-line ${full ? 'pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-4' : ''}`}>
          <h3 className="text-lg font-extrabold truncate">{title}</h3>
          <button className="btn-icon shrink-0" onClick={onClose} aria-label="Kapat">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 sm:p-5 overflow-y-auto overflow-x-hidden overscroll-contain flex-1">{children}</div>
        {footer && (
          <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-line flex flex-wrap justify-end gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 [&>*]:flex-1 sm:[&>*]:flex-none">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, children, hint, className = '' }: { label: ReactNode; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<QuoteStatus, string> = {
  draft: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300',
  sent: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  revision: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  cancelled: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
};

export function StatusBadge({ status, className = '' }: { status: QuoteStatus; className?: string }) {
  return <span className={`chip ${STATUS_STYLE[status]} ${className}`}>{STATUS_LABEL[status]}</span>;
}

export function Empty({ icon: Icon = Inbox, title, text, action }: { icon?: ElementType; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card border-dashed p-10 flex flex-col items-center text-center gap-2">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-extrabold text-lg">{title}</h3>
      {text && <p className="text-sm text-muted max-w-md">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 w-10 h-6 rounded-full shrink-0 transition ${checked ? 'bg-primary' : 'bg-surface-3 border border-line'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-4' : ''}`} />
      </button>
      <span className="text-sm">
        <span className="font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-surface-2 border border-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} rounded-lg font-bold transition ${
            value === o.value ? 'bg-primary text-primary-fg shadow' : 'text-muted hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4 sm:mb-5">
      <div className="min-w-0">
        <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none empty:hidden">{actions}</div>}
    </div>
  );
}

export const ICON_CHOICES = [
  'Box',
  'Cpu',
  'Sun',
  'BatteryCharging',
  'Network',
  'Wrench',
  'Camera',
  'HardDrive',
  'Cctv',
  'Wind',
  'Snowflake',
  'Zap',
  'Shield',
  'Plug',
  'Lightbulb',
  'Thermometer',
  'Layers',
  'Cable',
  'Router',
  'Wifi',
  'Car',
  'Droplets',
  'Flame',
  'Tag',
  'Tv',
  'Refrigerator',
  'WashingMachine',
  'AirVent',
  'Siren',
  'House',
  'BellRing',
  'Speaker',
  'Fan',
  'Lock',
  'Monitor',
  'Smartphone',
  'Microwave',
  'DoorOpen',
];

export function DynIcon({ name, className = 'w-5 h-5' }: { name?: string; className?: string }) {
  const I = (name && ICON_MAP[name]) || Box;
  return <I className={className} />;
}

export function Thumb({ src, className = 'w-12 h-12', icon }: { src?: string; className?: string; icon?: string }) {
  const [err, setErr] = useState(false);
  return (
    <div className={`${className} rounded-xl bg-white dark:bg-[#0b0d11] border border-line flex items-center justify-center overflow-hidden shrink-0`}>
      {src && !err ? (
        <img src={src} alt="" loading="lazy" className="w-full h-full object-contain p-0.5" onError={() => setErr(true)} />
      ) : icon ? (
        <DynIcon name={icon} className="w-1/2 h-1/2 text-muted" />
      ) : (
        <ImageIcon className="w-1/2 h-1/2 text-muted/60" />
      )}
    </div>
  );
}

/** Görseli küçültüp WEBP'ye çevirir */
export async function compressImage(file: File, maxSize = 900, quality = 0.86, type = 'image/webp'): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), type, quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ImageField({
  value,
  onChange,
  label = 'Görsel',
  maxSize = 900,
  keepPng = false,
  allowUrl = true,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  maxSize?: number;
  keepPng?: boolean;
  allowUrl?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useUi();
  const isUrl = /^https?:\/\//.test(value);

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      const blob = await compressImage(f, maxSize, 0.88, keepPng ? 'image/png' : 'image/webp');
      const { url } = await api.upload(blob, f.name);
      onChange(url);
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <Thumb src={value} className="w-20 h-20" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap gap-2">
            <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button type="button" className="btn-secondary btn-sm" onClick={() => ref.current?.click()} disabled={busy}>
              {busy ? <Spinner className="w-4 h-4" /> : <Upload className="w-4 h-4" />} Yükle
            </button>
            {value && (
              <button type="button" className="btn-danger btn-sm" onClick={() => onChange('')}>
                <Trash2 className="w-4 h-4" /> Kaldır
              </button>
            )}
          </div>
          {allowUrl && (
            <div className="relative">
              <Link2 className="w-4 h-4 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                className="input-sm pl-8"
                placeholder="veya görsel linki yapıştırın (https://...)"
                value={isUrl ? value : ''}
                onChange={(e) => onChange(e.target.value.trim())}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: ElementType;
  tone?: 'primary' | 'emerald' | 'amber' | 'violet';
}) {
  const tones = {
    primary: 'bg-primary/12 text-primary',
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  };
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted">{label}</span>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
      </div>
      <div className="text-[22px] sm:text-2xl font-black mt-2 tracking-tight tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  className = 'input',
  placeholder,
  suffix,
  min,
  wrapClassName = '',
  ...rest
}: {
  value: number | null | undefined;
  onChange: (v: number) => void;
  className?: string;
  /** Sarmalayıcı div sınıfı (örn. flex içinde büyümesi için "flex-1 min-w-0") */
  wrapClassName?: string;
  placeholder?: string;
  suffix?: ReactNode;
  min?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(value == null ? '' : String(value).replace('.', ','));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      setText(value == null ? '' : String(value).replace('.', ','));
      last.current = value;
    }
  }, [value]);
  return (
    <div className={`relative ${wrapClassName}`}>
      <input
        {...rest}
        inputMode="decimal"
        className={`${className} ${suffix ? 'pr-10' : ''} tabular-nums`}
        value={text}
        placeholder={placeholder}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.,-]/g, '');
          setText(t);
          let s = t;
          if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '');
          const n = parseFloat(s.replace(',', '.'));
          const v = isNaN(n) ? 0 : min != null ? Math.max(min, n) : n;
          last.current = v;
          onChange(v);
        }}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">{suffix}</span>}
    </div>
  );
}
