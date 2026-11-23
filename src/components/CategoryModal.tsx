import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import type { CategoryIconName, CustomCategory } from '../types/product';
import { CATEGORY_ICON_LIST } from './Sidebar';

interface CategoryModalProps {
  isOpen: boolean;
  editingCategory: CustomCategory | null;
  onClose: () => void;
  onSave: (label: string, iconName: CategoryIconName) => void;
}

export default function CategoryModal({
  isOpen,
  editingCategory,
  onClose,
  onSave,
}: CategoryModalProps) {
  const [label, setLabel] = useState('');
  const [iconName, setIconName] = useState<CategoryIconName>('Box');

  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        setLabel(editingCategory.label);
        setIconName(editingCategory.iconName);
      } else {
        setLabel('');
        setIconName('Box');
      }
    }
  }, [isOpen, editingCategory]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = label.trim();
    if (!cleaned) return;
    onSave(cleaned, iconName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#161920] border-t sm:border border-[#262a34] rounded-t-3xl sm:rounded-3xl z-10 p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#262a34] pb-4">
          <h3 className="font-extrabold text-xl text-white">
            {editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#20242d] text-zinc-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-2">
              Kategori Adı
            </label>
            <input
              type="text"
              autoFocus
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Örn: Güvenlik Kamerası, Klima, Şarj İstasyonu"
              className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-2xl px-4 py-4 text-lg font-bold text-white placeholder-[#8a8f9e] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-300 mb-2">
              İkon Seçin
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
              {CATEGORY_ICON_LIST.map((item) => {
                const Icon = item.icon;
                const isSelected = iconName === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIconName(item.name)}
                    title={item.title}
                    className={`p-3.5 rounded-2xl flex items-center justify-center transition-all border ${
                      isSelected
                        ? 'bg-[#00b8e6] text-[#111318] border-[#00b8e6] shadow-[0_0_15px_rgba(0,184,230,0.35)]'
                        : 'bg-[#111318] text-zinc-300 border-[#262a34] hover:border-[#383c47]'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-[#00b8e6] hover:bg-cyan-400 text-[#111318] font-extrabold text-lg shadow-[0_0_20px_rgba(0,184,230,0.3)]"
          >
            {editingCategory ? 'Değişiklikleri Kaydet' : 'Kategori Oluştur'}
          </button>
        </form>
      </div>
    </div>
  );
}
