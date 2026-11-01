import { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Download,
  RefreshCw,
  Search,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import jsPDF from 'jspdf';
import type {
  InverterProduct,
  PvProduct,
  BatteryProduct,
  InfrastructureProduct,
  ExtraProduct,
  ProductSubTab,
} from '../types/product';

interface ProformaPageProps {
  inverters: InverterProduct[];
  pvs: PvProduct[];
  batteries: BatteryProduct[];
  infrastructure: InfrastructureProduct[];
  extras: ExtraProduct[];
}

interface PickerItem {
  key: string;
  tab: ProductSubTab;
  categoryLabel: string;
  title: string;
  techSummary: string;
  unit: string;
  unitPriceUsd: number;
  photo?: string;
}

interface SelectedProformaItem {
  key: string;
  categoryLabel: string;
  title: string;
  techSummary: string;
  unit: string;
  quantity: number;
  quantityInput: string; // Kutuyu tamamen silip yeni sayı yazabilmek için
  unitPriceUsd: number;
  photo?: string;
}

// Boş veya '-' olan değerleri temizleyen yardımcı fonksiyonlar
function isValidValue(val?: string): boolean {
  if (!val) return false;
  const cleaned = val.trim();
  return cleaned !== '' && cleaned !== '-' && cleaned !== '%' && !cleaned.startsWith('- ');
}

function cleanTitle(brand?: string, model?: string, fallback = 'Ürün'): string {
  const parts = [brand, model].filter(isValidValue).map((s) => s!.trim());
  return parts.length > 0 ? parts.join(' ') : fallback;
}

function buildInverterSummary(inv: InverterProduct): string {
  const parts: string[] = [];
  if (isValidValue(inv.kw)) parts.push(`${inv.kw} Güç`);
  if (isValidValue(inv.maxDcPower)) parts.push(`Maks. DC: ${inv.maxDcPower}`);
  if (isValidValue(inv.mpptCount)) parts.push(`${inv.mpptCount} MPPT`);
  if (isValidValue(inv.mpptRange)) parts.push(`(${inv.mpptRange})`);
  return parts.length > 0 ? parts.join(' • ') : 'Solar İnverter Sistemi';
}

function buildPvSummary(pv: PvProduct): string {
  const parts: string[] = [];
  if (isValidValue(pv.pvType)) parts.push(pv.pvType);
  if (isValidValue(pv.nominalPower)) parts.push(pv.nominalPower);
  if (isValidValue(pv.efficiency)) parts.push(`Verim: ${pv.efficiency}`);
  if (isValidValue(pv.cellCount)) parts.push(pv.cellCount);
  return parts.length > 0 ? parts.join(' • ') : 'Solar PV Güneş Paneli';
}

function buildBatterySummary(bat: BatteryProduct): string {
  const parts: string[] = [];
  if (isValidValue(bat.batteryType)) parts.push(bat.batteryType);
  if (isValidValue(bat.energyKwh)) parts.push(bat.energyKwh);
  const voltAh = [bat.nominalVoltage, bat.capacityAh].filter(isValidValue).join(' ');
  if (voltAh) parts.push(voltAh);
  if (isValidValue(bat.cycleLife)) parts.push(bat.cycleLife);
  return parts.length > 0 ? parts.join(' • ') : 'Enerji Depolama Bataryası';
}

function buildInfraSummary(inf: InfrastructureProduct): string {
  const parts: string[] = [];
  if (isValidValue(inf.brand)) parts.push(inf.brand);
  if (isValidValue(inf.applicationType)) parts.push(inf.applicationType);
  if (isValidValue(inf.materialSpec)) parts.push(inf.materialSpec);
  return parts.length > 0 ? parts.join(' • ') : inf.category || 'GES Montaj & Altyapı Donanımı';
}

function buildExtraSummary(ext: ExtraProduct): string {
  if (isValidValue(ext.description)) return ext.description;
  return 'Anahtar Teslim Kurulum, Montaj ve Mühendislik Hizmeti';
}

// Canvas için güvenli görsel yükleyici
function loadImageSafe(src?: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src || !src.trim()) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Görseli kutu içine orantısını bozmadan (object-contain) çizer
function drawContainImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  padding = 8
) {
  const innerW = boxW - padding * 2;
  const innerH = boxH - padding * 2;
  const scale = Math.min(innerW / img.width, innerH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const drawX = boxX + (boxW - drawW) / 2;
  const drawY = boxY + (boxH - drawH) / 2;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

// Canvas üzerinde yuvarlatılmış dikdörtgen çizimi
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  lineWidth = 1
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

// Uzun metinleri satırlara bölen yardımcı fonksiyon
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 2);
}

export default function ProformaPage({
  inverters,
  pvs,
  batteries,
  infrastructure,
  extras,
}: ProformaPageProps) {
  const [customerName, setCustomerName] = useState('');
  const [usdRateInput, setUsdRateInput] = useState<string>(() => {
    return localStorage.getItem('ose_custom_usd_rate') || '34.50';
  });
  const [isRateLoading, setIsRateLoading] = useState<boolean>(false);

  const [pickerTab, setPickerTab] = useState<ProductSubTab>('inverter');
  const [productSearch, setProductSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedProformaItem[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const numericUsdRate = parseFloat(usdRateInput.replace(',', '.')) || 0;

  const handleRateChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.,]/g, '');
    setUsdRateInput(cleaned);
    localStorage.setItem('ose_custom_usd_rate', cleaned);
  };

  const fetchLiveUsdRate = async () => {
    setIsRateLoading(true);
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await response.json();
      if (data?.rates?.TRY) {
        const formatted = Number(data.rates.TRY).toFixed(2);
        setUsdRateInput(formatted);
        localStorage.setItem('ose_custom_usd_rate', formatted);
      }
    } catch {
      // Hata durumunda mevcut kur korunur
    } finally {
      setIsRateLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('ose_custom_usd_rate')) {
      fetchLiveUsdRate();
    }
  }, []);

  // Tüm ürünleri tek bir seçilebilir listede birleştir (Arama ve sekme filtrelemesi için)
  const allPickerItems: PickerItem[] = [
    ...inverters.map((inv) => ({
      key: inv.id,
      tab: 'inverter' as ProductSubTab,
      categoryLabel: 'Inverter',
      title: cleanTitle(inv.brand, inv.model, 'Inverter'),
      techSummary: buildInverterSummary(inv),
      unit: 'Adet',
      unitPriceUsd: inv.priceUsd,
      photo: inv.photo,
    })),
    ...pvs.map((pv) => ({
      key: pv.id,
      tab: 'pv' as ProductSubTab,
      categoryLabel: 'PV Güneş Paneli',
      title: cleanTitle(pv.brand, pv.model, 'PV Güneş Paneli'),
      techSummary: buildPvSummary(pv),
      unit: 'Adet',
      unitPriceUsd: pv.priceUsd,
      photo: pv.photo,
    })),
    ...batteries.map((bat) => ({
      key: bat.id,
      tab: 'batarya' as ProductSubTab,
      categoryLabel: 'Batarya',
      title: cleanTitle(bat.brand, bat.model, 'Batarya'),
      techSummary: buildBatterySummary(bat),
      unit: 'Adet',
      unitPriceUsd: bat.priceUsd,
      photo: bat.photo,
    })),
    ...infrastructure.map((inf) => ({
      key: inf.id,
      tab: 'altyapi' as ProductSubTab,
      categoryLabel: 'Altyapı',
      title: isValidValue(inf.name) ? inf.name : 'Altyapı Malzemesi',
      techSummary: buildInfraSummary(inf),
      unit: inf.unit,
      unitPriceUsd: inf.priceUsd,
      photo: inf.photo,
    })),
    ...extras.map((ext) => ({
      key: ext.id,
      tab: 'ekstralar' as ProductSubTab,
      categoryLabel: 'Hizmet / Ekstra',
      title: isValidValue(ext.name) ? ext.name : 'Ekstra Hizmet',
      techSummary: buildExtraSummary(ext),
      unit: ext.unit,
      unitPriceUsd: ext.priceUsd,
      photo: undefined,
    })),
  ];

  // Arama varsa tüm ürünlerde ara, yoksa aktif sekmedeki ürünleri göster
  const normalizedSearch = productSearch.trim().toLowerCase();
  const displayedPickerItems = normalizedSearch
    ? allPickerItems.filter(
        (item) =>
          item.title.toLowerCase().includes(normalizedSearch) ||
          item.techSummary.toLowerCase().includes(normalizedSearch) ||
          item.categoryLabel.toLowerCase().includes(normalizedSearch)
      )
    : allPickerItems.filter((item) => item.tab === pickerTab);

  // Ürünü Teklife Ekle
  const addItem = (item: PickerItem) => {
    setSelectedItems((prev) => {
      const existing = prev.find((i) => i.key === item.key);
      if (existing) {
        const nextQty = existing.quantity + 1;
        return prev.map((i) =>
          i.key === item.key
            ? { ...i, quantity: nextQty, quantityInput: String(nextQty), photo: item.photo }
            : i
        );
      }
      return [
        ...prev,
        {
          key: item.key,
          categoryLabel: item.categoryLabel,
          title: item.title,
          techSummary: item.techSummary,
          unit: item.unit,
          quantity: 1,
          quantityInput: '1',
          unitPriceUsd: item.unitPriceUsd,
          photo: item.photo,
        },
      ];
    });
  };

  // + ve - Butonları ile Adet Güncelleme
  const changeQuantityByStep = (key: string, delta: number) => {
    setSelectedItems((prev) => {
      return prev
        .map((item) => {
          if (item.key !== key) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return {
            ...item,
            quantity: nextQty,
            quantityInput: String(nextQty),
          };
        })
        .filter(Boolean) as SelectedProformaItem[];
    });
  };

  // Adet Kutusuna Yazarken (Tamamen silmeye izin verir)
  const handleQuantityInputChange = (key: string, rawVal: string) => {
    const cleaned = rawVal.replace(/[^0-9]/g, '');
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const parsed = parseInt(cleaned, 10);
        return {
          ...item,
          quantityInput: cleaned,
          quantity: !isNaN(parsed) && parsed > 0 ? parsed : 0,
        };
      })
    );
  };

  // Adet Kutusundan Çıkınca (Boş bırakıldıysa 1'e tamamlar)
  const handleQuantityBlur = (key: string) => {
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        if (!item.quantityInput || item.quantity <= 0) {
          return { ...item, quantity: 1, quantityInput: '1' };
        }
        return { ...item, quantityInput: String(item.quantity) };
      })
    );
  };

  const removeItem = (key: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.key !== key));
  };

  const totalUsd = selectedItems.reduce(
    (sum, item) => sum + item.unitPriceUsd * item.quantity,
    0
  );
  const totalTry = totalUsd * numericUsdRate;
  const displayRate = usdRateInput.trim() || '0';

  // ÜRÜN FOTOĞRAFLI VE TAM ORTALI A4 PDF ÜRETİCİ
  const handleDownloadPdf = async () => {
    if (selectedItems.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const canvas = document.createElement('canvas');
      const W = 1600;
      const rowH = 126;
      // Çok sayıda ürün varsa sayfa yüksekliğini dinamik uzat, yoksa standart A4 (2262px)
      const neededHeight = 760 + selectedItems.length * (rowH + 12) + 320;
      const H = Math.max(2262, neededHeight);
      canvas.width = W;
      canvas.height = H;

      const ctx = canvas.getContext('2d')!;
      const fontFamily = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

      // Arka Plan Beyaz
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      const M = 80;
      const contentW = W - M * 2; // 1440px

      // ================= 1. ÜST ANTET KUTUSU =================
      const headerY = 70;
      const headerH = 190;
      drawRoundedRect(ctx, M, headerY, contentW, headerH, 28, '#111318');

      const logoBoxSize = 126;
      const logoBoxX = M + 36;
      const logoBoxY = headerY + (headerH - logoBoxSize) / 2;
      drawRoundedRect(ctx, logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 24, '#14161c', '#383c47', 3);
      drawRoundedRect(ctx, logoBoxX + 10, logoBoxY + 10, logoBoxSize - 20, logoBoxSize - 20, 16, '#090a0d');

      const logoImg = await loadImageSafe('/logo.png');
      if (logoImg) {
        drawContainImage(ctx, logoImg, logoBoxX + 10, logoBoxY + 10, logoBoxSize - 20, logoBoxSize - 20, 12);
      } else {
        ctx.fillStyle = '#00b8e6';
        ctx.font = `900 38px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OSE', logoBoxX + logoBoxSize / 2, logoBoxY + logoBoxSize / 2);
      }

      const brandX = logoBoxX + logoBoxSize + 32;
      const headerCenterY = headerY + headerH / 2;

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = `900 50px ${fontFamily}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('OSE ', brandX, headerCenterY - 22);

      const oseWidth = ctx.measureText('OSE ').width;
      ctx.fillStyle = '#00b8e6';
      ctx.fillText('TEKNOLOJİ', brandX + oseWidth, headerCenterY - 22);

      ctx.font = `600 28px ${fontFamily}`;
      ctx.fillStyle = '#8a8f9e';
      ctx.fillText('0544 462 11 22', brandX, headerCenterY + 30);

      // Sağ Üst: PROFORMA TEKLİF Rozeti
      const badgeW = 310;
      const badgeH = 58;
      const badgeX = M + contentW - badgeW - 36;
      const badgeY = headerCenterY - 46;
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 14, '#00b8e6');

      ctx.font = `900 24px ${fontFamily}`;
      ctx.fillStyle = '#111318';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PROFORMA TEKLİF', badgeX + badgeW / 2, badgeY + badgeH / 2);

      ctx.font = `700 24px ${fontFamily}`;
      ctx.fillStyle = '#c4c9d4';
      ctx.textAlign = 'right';
      ctx.fillText(
        `Tarih: ${new Date().toLocaleDateString('tr-TR')}`,
        M + contentW - 36,
        headerCenterY + 36
      );

      // ================= 2. MÜŞTERİ VE KONU KUTUSU =================
      const infoY = headerY + headerH + 36;
      const infoH = 136;
      drawRoundedRect(ctx, M, infoY, contentW, infoH, 24, '#f8fafc', '#cbd5e1', 2);

      ctx.beginPath();
      ctx.moveTo(M + contentW * 0.55, infoY + 24);
      ctx.lineTo(M + contentW * 0.55, infoY + infoH - 24);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();

      const infoCenterY = infoY + infoH / 2;

      ctx.textAlign = 'left';
      ctx.font = `800 20px ${fontFamily}`;
      ctx.fillStyle = '#64748b';
      ctx.fillText('SAYIN / FİRMA', M + 36, infoCenterY - 24);

      ctx.font = `900 36px ${fontFamily}`;
      ctx.fillStyle = '#0f172a';
      ctx.fillText(customerName.trim() || 'Değerli Müşterimiz', M + 36, infoCenterY + 20);

      ctx.textAlign = 'right';
      ctx.font = `800 20px ${fontFamily}`;
      ctx.fillStyle = '#64748b';
      ctx.fillText('PROJE / KONU', M + contentW - 36, infoCenterY - 24);

      ctx.font = `800 28px ${fontFamily}`;
      ctx.fillStyle = '#1e293b';
      ctx.fillText('Güneş Enerjisi Sistemi (GES) Teklifi', M + contentW - 36, infoCenterY + 20);

      // ================= 3. ÜRÜN TABLOSU (FOTOĞRAFLI) =================
      const tableY = infoY + infoH + 40;
      const tableHeaderH = 74;

      // Sütun Koordinatları
      const colPhotoCenterX = M + 68;
      const colTitleX = M + 136;
      const colSpecX = M + 620;
      const colQtyCenterX = M + contentW - 125;

      drawRoundedRect(ctx, M, tableY, contentW, tableHeaderH, 18, '#111318');
      const thCenterY = tableY + tableHeaderH / 2;

      ctx.font = `800 21px ${fontFamily}`;
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';

      ctx.textAlign = 'center';
      ctx.fillText('GÖRSEL', colPhotoCenterX, thCenterY);

      ctx.textAlign = 'left';
      ctx.fillText('ÜRÜN / SİSTEM KALEMİ', colTitleX, thCenterY);
      ctx.fillText('TEKNİK ÖZELLİK ÖZETİ', colSpecX, thCenterY);

      ctx.textAlign = 'center';
      ctx.fillText('MİKTAR', colQtyCenterX, thCenterY);

      // Tüm ürünlerin fotoğraflarını önceden paralel yükle
      const loadedProductPhotos = await Promise.all(
        selectedItems.map((item) => loadImageSafe(item.photo))
      );

      let currentY = tableY + tableHeaderH + 12;

      selectedItems.forEach((item, idx) => {
        const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
        drawRoundedRect(ctx, M, currentY, contentW, rowH, 18, bg, '#e2e8f0', 2);

        const rowCenterY = currentY + rowH / 2;

        // 1. Ürün Fotoğrafı Kutusu (Fotoğraf varsa çiz, yoksa numara rozeti çiz)
        const thumbSize = 92;
        const thumbX = colPhotoCenterX - thumbSize / 2;
        const thumbY = rowCenterY - thumbSize / 2;
        const prodImg = loadedProductPhotos[idx];

        if (prodImg) {
          drawRoundedRect(ctx, thumbX, thumbY, thumbSize, thumbSize, 16, '#ffffff', '#cbd5e1', 1.5);
          drawContainImage(ctx, prodImg, thumbX, thumbY, thumbSize, thumbSize, 6);
        } else {
          drawRoundedRect(ctx, thumbX + 14, thumbY + 14, thumbSize - 28, thumbSize - 28, 14, '#e0f7fc');
          ctx.font = `900 24px ${fontFamily}`;
          ctx.fillStyle = '#007799';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(idx + 1), colPhotoCenterX, rowCenterY);
        }

        // 2. Kategori Etiketi ve Ürün Adı
        ctx.textAlign = 'left';
        ctx.font = `800 18px ${fontFamily}`;
        ctx.fillStyle = '#0088ad';
        ctx.fillText(item.categoryLabel.toUpperCase(), colTitleX, rowCenterY - 22);

        ctx.font = `900 27px ${fontFamily}`;
        ctx.fillStyle = '#0f172a';
        const titleLines = wrapCanvasText(ctx, item.title, 460);
        ctx.fillText(titleLines[0] || item.title, colTitleX, rowCenterY + 16);

        // 3. Teknik Özellik Özeti
        ctx.font = `600 22px ${fontFamily}`;
        ctx.fillStyle = '#334155';
        const specLines = wrapCanvasText(ctx, item.techSummary, 540);
        if (specLines.length === 1) {
          ctx.fillText(specLines[0], colSpecX, rowCenterY);
        } else {
          ctx.fillText(specLines[0], colSpecX, rowCenterY - 15);
          ctx.fillText(specLines[1], colSpecX, rowCenterY + 15);
        }

        // 4. Miktar Kutusu (Tam Ortalanmış)
        const qtyW = 190;
        const qtyH = 54;
        const displayQty = item.quantity > 0 ? item.quantity : 1;
        drawRoundedRect(
          ctx,
          colQtyCenterX - qtyW / 2,
          rowCenterY - qtyH / 2,
          qtyW,
          qtyH,
          14,
          '#e2e8f0',
          '#cbd5e1',
          1.5
        );
        ctx.font = `900 23px ${fontFamily}`;
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${displayQty} ${item.unit}`, colQtyCenterX, rowCenterY);

        currentY += rowH + 12;
      });

      // ================= 4. ALT TOPLAM VE BİLGİ BÖLÜMÜ =================
      const footerH = 220;
      const footerY = Math.max(currentY + 40, H - footerH - 80);

      ctx.beginPath();
      ctx.moveTo(M, footerY - 24);
      ctx.lineTo(M + contentW, footerY - 24);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();

      const noteW = 720;
      drawRoundedRect(ctx, M, footerY, noteW, footerH, 24, '#f8fafc', '#cbd5e1', 2);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `800 20px ${fontFamily}`;
      ctx.fillStyle = '#0088ad';
      ctx.fillText('TEKLİF KOŞULLARI & BİLGİLENDİRME', M + 32, footerY + 42);

      ctx.font = `600 21px ${fontFamily}`;
      ctx.fillStyle = '#475569';
      ctx.fillText('• Teklifimiz anahtar teslim sistem bileşenlerini kapsamaktadır.', M + 32, footerY + 86);
      ctx.fillText(
        `• TL toplamı güncel kur (1$ = ${displayRate} TL) üzerinden hesaplanmıştır.`,
        M + 32,
        footerY + 122
      );

      ctx.font = `800 23px ${fontFamily}`;
      ctx.fillStyle = '#0f172a';
      ctx.fillText('Ose Teknoloji İletişim: 0544 462 11 22', M + 32, footerY + 174);

      const totalBoxW = 680;
      const totalBoxX = M + contentW - totalBoxW;
      drawRoundedRect(ctx, totalBoxX, footerY, totalBoxW, footerH, 24, '#111318');

      const row1CenterY = footerY + footerH * 0.28;
      ctx.textAlign = 'left';
      ctx.font = `800 24px ${fontFamily}`;
      ctx.fillStyle = '#8a8f9e';
      ctx.fillText('TOPLAM (USD)', totalBoxX + 36, row1CenterY);

      ctx.textAlign = 'right';
      ctx.font = `900 44px ${fontFamily}`;
      ctx.fillStyle = '#00b8e6';
      ctx.fillText(
        `$${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalBoxX + totalBoxW - 36,
        row1CenterY
      );

      ctx.beginPath();
      ctx.moveTo(totalBoxX + 36, footerY + footerH / 2);
      ctx.lineTo(totalBoxX + totalBoxW - 36, footerY + footerH / 2);
      ctx.strokeStyle = '#262a34';
      ctx.lineWidth = 2;
      ctx.stroke();

      const row2CenterY = footerY + footerH * 0.74;
      ctx.textAlign = 'left';
      ctx.font = `800 24px ${fontFamily}`;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('TL KARŞILIĞI', totalBoxX + 36, row2CenterY - 12);

      ctx.font = `700 18px ${fontFamily}`;
      ctx.fillStyle = '#00b8e6';
      ctx.fillText(`Baz Alınan Kur: 1$ = ${displayRate} TL`, totalBoxX + 36, row2CenterY + 18);

      ctx.textAlign = 'right';
      ctx.font = `900 40px ${fontFamily}`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(
        `${totalTry.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`,
        totalBoxX + totalBoxW - 36,
        row2CenterY
      );

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (H * pdfW) / W;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);

      const safeName = customerName.trim()
        ? customerName.trim().replace(/\s+/g, '_')
        : 'Musteri';
      pdf.save(`Ose_Teknoloji_Proforma_${safeName}.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. ADIM: MÜŞTERİ ADI VE DOLAR KURU */}
      <div className="bg-[#161920] border border-[#262a34] rounded-3xl p-5 sm:p-6 space-y-4">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
          1. Müşteri & Kur Bilgisi
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-base font-bold text-zinc-300 mb-2">
              Müşteri Adı Soyadı / Firma
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Örn: Silopi Cami / Ahmet Yılmaz"
              className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-2xl px-4 py-4 text-lg font-bold text-white placeholder-[#8a8f9e] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-base font-bold text-[#00b8e6] mb-2">
              Güncel Dolar Kuru (₺)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative w-full">
                <input
                  type="text"
                  inputMode="decimal"
                  value={usdRateInput}
                  onChange={(e) => handleRateChange(e.target.value)}
                  placeholder="Örn: 49.95"
                  className="w-full bg-[#111318] border border-[#00b8e6]/60 focus:border-[#00b8e6] rounded-2xl pl-4 pr-10 py-4 text-lg font-extrabold text-white focus:outline-none"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#00b8e6]">
                  ₺
                </span>
              </div>
              <button
                type="button"
                onClick={fetchLiveUsdRate}
                className="p-4 rounded-2xl bg-[#00b8e6]/15 hover:bg-[#00b8e6]/25 text-[#00b8e6] border border-[#00b8e6]/30 shrink-0"
                title="Canlı Kuru Çek"
              >
                <RefreshCw className={`w-6 h-6 ${isRateLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ADIM: HIZLI ÜRÜN SEÇİMİ VE ARAMA */}
      <div className="bg-[#161920] border border-[#262a34] rounded-3xl p-5 sm:p-6 space-y-4">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
          2. Ürün Seçin
        </h2>

        {/* ÜRÜN ARAMA KUTUSU */}
        <div className="relative">
          <Search className="w-5 h-5 text-[#8a8f9e] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Tüm ürünlerde marka, model veya özellik ara..."
            className="w-full bg-[#111318] border border-[#2c303a] focus:border-[#00b8e6] rounded-2xl pl-12 pr-12 py-4 text-base font-bold text-white placeholder-[#8a8f9e] focus:outline-none"
          />
          {productSearch && (
            <button
              type="button"
              onClick={() => setProductSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-[#20242d] text-zinc-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* KATEGORİ SEKMELERİ (Arama yapılmıyorken aktif) */}
        {!normalizedSearch ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'inverter', label: 'Inverter' },
              { id: 'pv', label: 'PV Panel' },
              { id: 'batarya', label: 'Batarya' },
              { id: 'altyapi', label: 'Altyapı' },
              { id: 'ekstralar', label: 'Ekstralar' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPickerTab(tab.id as ProductSubTab)}
                className={`px-5 py-3.5 rounded-2xl text-base font-extrabold whitespace-nowrap transition-all ${
                  pickerTab === tab.id
                    ? 'bg-[#00b8e6] text-[#111318] shadow-md'
                    : 'bg-[#111318] text-zinc-300 border border-[#262a34]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm font-bold text-[#00b8e6] px-1">
            "{productSearch}" için tüm kategorilerde {displayedPickerItems.length} sonuç bulundu:
          </div>
        )}

        {/* ÜRÜN LİSTESİ (FOTOĞRAFLI) */}
        {displayedPickerItems.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#111318] border border-[#262a34] border-dashed text-center text-base text-[#8a8f9e]">
            Arama kriterine uygun ürün bulunamadı.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {displayedPickerItems.map((item) => {
              const added = selectedItems.find((i) => i.key === item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => addItem(item)}
                  className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                    added
                      ? 'bg-[#00b8e6]/10 border-[#00b8e6]'
                      : 'bg-[#111318] border-[#262a34] hover:border-[#383c47]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Ürün Fotoğrafı */}
                    <div className="w-14 h-14 rounded-xl bg-[#090a0d] border border-[#262a34] flex items-center justify-center overflow-hidden shrink-0">
                      {item.photo ? (
                        <img
                          src={item.photo}
                          alt={item.title}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-zinc-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-[#00b8e6] uppercase truncate">
                        {item.categoryLabel} • {item.techSummary}
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-white mt-0.5 truncate">
                        {item.title}
                      </div>
                    </div>
                  </div>

                  <div className="w-11 h-11 rounded-xl bg-[#00b8e6] text-[#111318] flex items-center justify-center font-extrabold text-base shrink-0">
                    {added ? `+${added.quantity}` : <Plus className="w-6 h-6" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. ADIM: SEÇİLEN ÜRÜNLER VE GENEL TOPLAM ÖZETİ */}
      <div className="bg-[#161920] border border-[#262a34] rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            3. Teklif Özeti ({selectedItems.length} Kalem)
          </h2>
          {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedItems([])}
              className="text-sm font-bold text-rose-400"
            >
              Temizle
            </button>
          )}
        </div>

        {selectedItems.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#111318] border border-[#262a34] border-dashed text-center text-base text-[#8a8f9e]">
            Yukarıdaki listeden ürünlere dokunarak teklife ekleyin.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedItems.map((item) => (
              <div
                key={item.key}
                className="p-4 rounded-2xl bg-[#111318] border border-[#262a34] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-16 h-16 rounded-xl bg-[#090a0d] border border-[#262a34] flex items-center justify-center overflow-hidden shrink-0">
                    {item.photo ? (
                      <img
                        src={item.photo}
                        alt={item.title}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <ImageIcon className="w-7 h-7 text-zinc-600" />
                    )}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-extrabold uppercase text-[#00b8e6]">
                      {item.categoryLabel}
                    </span>
                    <h4 className="text-lg font-extrabold text-white truncate">{item.title}</h4>
                    <p className="text-sm text-[#8a8f9e] line-clamp-2">{item.techSummary}</p>
                  </div>
                </div>

                {/* ADET KONTROLÜ (Tamamen silip yeni sayı yazılabilir) */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#262a34] shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeQuantityByStep(item.key, -1)}
                      className="w-11 h-11 rounded-xl bg-[#20242d] hover:bg-[#282d38] text-white flex items-center justify-center"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.quantityInput}
                      onChange={(e) => handleQuantityInputChange(item.key, e.target.value)}
                      onBlur={() => handleQuantityBlur(item.key)}
                      onFocus={(e) => e.target.select()}
                      className="w-16 h-11 text-center bg-[#090a0d] border border-[#2c303a] focus:border-[#00b8e6] rounded-xl text-lg font-extrabold text-white focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => changeQuantityByStep(item.key, 1)}
                      className="w-11 h-11 rounded-xl bg-[#20242d] hover:bg-[#282d38] text-white flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    className="p-3 rounded-xl bg-rose-500/15 text-rose-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TOPLAM DOLAR VE TL KUTUSU */}
        <div className="bg-[#111318] border border-[#00b8e6]/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#262a34] pb-3.5">
            <span className="text-base font-bold text-[#8a8f9e]">TOPLAM DOLAR</span>
            <span className="text-3xl font-black text-[#00b8e6]">
              ${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-zinc-200">TL KARŞILIĞI</span>
              <span className="px-3 py-1 rounded-lg bg-[#00b8e6]/15 border border-[#00b8e6]/30 text-[#00b8e6] text-sm font-extrabold">
                Baz Alınan Kur: 1$ = {displayRate} ₺
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-white">
              ₺{totalTry.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={selectedItems.length === 0 || isGeneratingPdf}
          className={`w-full py-5 rounded-2xl font-extrabold text-xl flex items-center justify-center gap-3 transition-all ${
            selectedItems.length === 0
              ? 'bg-[#20242d] text-zinc-500 cursor-not-allowed'
              : 'bg-[#00b8e6] hover:bg-cyan-400 text-[#111318] shadow-[0_0_25px_rgba(0,184,230,0.4)]'
          }`}
        >
          <Download className="w-6 h-6" />
          {isGeneratingPdf ? 'PDF Hazırlanıyor...' : 'Proformayı PDF Olarak İndir'}
        </button>
      </div>
    </div>
  );
}