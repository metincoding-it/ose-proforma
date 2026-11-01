// Kaydederken değer doluysa sonuna birimi otomatik ekler, boşsa boş bırakır
export function withUnit(val: string, unit: string): string {
  const cleaned = val.trim();
  if (!cleaned) return '-';
  const regex = new RegExp(`\\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const raw = cleaned.replace(regex, '').replace(/^%\s*/, '').trim();
  if (!raw || raw === '-') return '-';
  return unit === '%' ? `%${raw}` : `${raw} ${unit}`;
}

// Düzenleme modunda mevcut birim yazısını veya '-' işaretini kutudan ayıklar
export function stripUnit(val: string, unit: string): string {
  if (!val || val === '-') return '';
  const regex = new RegExp(`\\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  return val.replace(regex, '').replace(/^%\s*/, '').trim();
}

interface UnitInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  unit: string;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'number';
  step?: string;
  highlight?: boolean;
}

export default function UnitInput({
  label,
  value,
  onChange,
  unit,
  placeholder,
  required = false,
  type = 'text',
  step,
  highlight = false,
}: UnitInputProps) {
  return (
    <div>
      <label
        className={`block text-sm font-bold mb-1.5 ${
          highlight ? 'text-[#00b8e6]' : 'text-zinc-300'
        }`}
      >
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          type={type}
          step={step}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-[#111318] border rounded-xl pl-4 pr-20 py-3.5 text-base focus:outline-none transition-colors ${
            highlight
              ? 'border-[#00b8e6] text-[#00b8e6] font-extrabold text-lg'
              : 'border-[#2c303a] focus:border-[#00b8e6] text-white font-semibold'
          }`}
        />
        <span
          className={`absolute right-2.5 px-2.5 py-1 rounded-lg text-xs font-extrabold pointer-events-none select-none ${
            highlight
              ? 'bg-[#00b8e6] text-[#111318]'
              : 'bg-[#1c2029] text-[#00b8e6] border border-[#2c303a]'
          }`}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}