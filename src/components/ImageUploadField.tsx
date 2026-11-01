import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Upload, Image as ImageIcon, Trash2, Link as LinkIcon } from 'lucide-react';

interface ImageUploadFieldProps {
  photo: string;
  onChange: (newPhoto: string) => void;
}

export default function ImageUploadField({ photo, onChange }: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBase64 = photo.startsWith('data:');

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 500;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        onChange(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-[#111318] border border-[#2c303a] rounded-2xl p-4 space-y-3.5">
      <label className="block text-base font-bold text-zinc-200">
        Ürün Fotoğrafı
      </label>

      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-[#090a0d] border border-[#2c303a] flex items-center justify-center overflow-hidden shrink-0">
          {photo ? (
            <img src={photo} alt="Önizleme" className="w-full h-full object-contain p-1" />
          ) : (
            <ImageIcon className="w-8 h-8 text-zinc-600" />
          )}
        </div>

        <div className="flex-1 flex flex-wrap gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-3 rounded-xl bg-[#00b8e6]/15 hover:bg-[#00b8e6]/25 text-[#00b8e6] border border-[#00b8e6]/30 text-sm font-bold flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Cihazdan Seç
          </button>

          {photo && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-4 py-3 rounded-xl bg-rose-500/15 text-rose-400 text-sm font-bold flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Kaldır
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <LinkIcon className="w-5 h-5 text-[#8a8f9e] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="url"
          value={isBase64 ? '' : photo}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            isBase64
              ? 'Cihazdan fotoğraf yüklendi (Link kullanmak için buraya yapıştırın)'
              : 'Veya fotoğraf linkini buraya yapıştırın (https://...)'
          }
          className="w-full bg-[#090a0d] border border-[#2c303a] focus:border-[#00b8e6] rounded-xl pl-11 pr-4 py-3.5 text-base text-white placeholder-[#8a8f9e] focus:outline-none"
        />
      </div>
    </div>
  );
}
