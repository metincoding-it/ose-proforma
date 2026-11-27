# OSE Teknoloji – Teklif & Proforma Sistemi (v2)

GES ve güvenlik sistemleri için ürün kataloğu, teklif motoru, mini CRM ve online teklif onayı.
Tamamen **ücretsiz Cloudflare** altyapısında çalışır: Pages + Functions + D1 (SQL) + KV.

## Özellikler

| Alan | Neler var |
|---|---|
| **Altyapı** | D1 (SQLite) veritabanı, otomatik şema/migrasyon, satır bazlı kayıt + sürüm kontrolü (aynı anda düzenlemede çakışma koruması), görseller/broşürler KV'de ayrı dosya |
| **Güvenlik** | E-posta + şifre girişi (PBKDF2), HttpOnly oturum çerezi, Admin / Satış rolleri, maliyet ve kâr verisi satış rolüne **sunucuda** gizlenir, CSRF ve giriş deneme limiti, işlem kaydı (audit log) |
| **Fiyatlandırma** | Alış + satış fiyatı veya kâr %'si ile otomatik satış, USD/EUR/TRY karışık kalemler, TCMB döviz satış kuru (teklifte sabitlenir), kalem ve genel iskonto (% / tutar), KDV %0/1/10/20, KDV hariç/dahil gösterim |
| **Teklif** | `OSE-2026-0042` otomatik numara, Taslak / Gönderildi / Onaylandı / Revize İstendi / İptal, tek tıkla revizyon (`-v2`) ve kopyalama, bölüm başlıkları, serbest kalem, satış personeli için iskonto limiti ve yönetici onayı |
| **PDF** | Vektörel çok sayfalı A4, Türkçe font, otomatik sayfa bölme, birim fiyat göster/gizle anahtarı, KDV dökümü, yazıyla tutar, ödeme planı, garanti, IBAN'lar, kaşe/imza alanı, online onay QR kodu, sonuna eklenen A4 broşür sayfaları |
| **Online teklif** | `/t/<link>` mobil uyumlu salt-okunur sayfa, müşteri onayı / revize talebi, görüntülenme takibi, WhatsApp ile paylaşım, e-posta bildirimi (Resend) |
| **CRM** | Müşteri kartları, müşteri bazlı teklif geçmişi, KPI paneli (kesilen teklif, onaylanan ciro, kâr, bekleyen, dönüşüm oranı, 6 aylık grafik) |
| **Saha hızı** | Hazır paketler (kit), GES boyutlandırma asistanı (kWp → panel adedi, inverter önerisi, DC/AC oranı, yıllık üretim), Excel/CSV ile toplu ürün ve fiyat güncelleme, toplu % zam |
| **Diğer** | Açık/koyu tema, telefona uygulama gibi yükleme (PWA), JSON tam yedek / geri yükleme, eski KV verisini tek tıkla aktarma |

## Cloudflare kurulumu (bir kerelik, ~5 dakika)

Proje zaten GitHub'a bağlı bir Cloudflare Pages projesi olarak yayındaysa:

1. **D1 veritabanı oluşturun:** Cloudflare paneli → *Storage & Databases* → *D1 SQL Database* → **Create** → ad: `ose-proforma`.
2. **Pages projesine bağlayın:** *Workers & Pages* → projeniz → *Settings* → *Bindings* → **Add** → *D1 database*
   - Variable name: **`DB`**
   - D1 database: `ose-proforma`
3. **KV bağlantısını kontrol edin:** Aynı ekranda mevcut **`OSE_DB`** KV bağlantısı duruyor olmalı (eski ürünler ve yeni görseller burada).
4. **Derleme ayarları** (*Settings → Build*): Build command `npm run build`, output directory `dist`.
5. **(İsteğe bağlı) E-posta bildirimi:** [resend.com](https://resend.com)'da ücretsiz hesap → API key → *Settings → Variables and Secrets* → `RESEND_API_KEY` (Secret).
6. GitHub'a push edin (veya *Deployments → Retry deployment*). Tablolar ilk istekte otomatik oluşur.
7. Siteyi açın → **yönetici hesabınızı oluşturun** → Panel'deki **"Ürünleri Aktar"** ile eski ürünleri taşıyın → *Ayarlar*'dan firma, banka, logo, kaşe ve broşürleri girin.

> Bindings değişikliği sadece **yeni dağıtımlarda** geçerli olur; bağladıktan sonra mutlaka yeniden dağıtın.

## Yerel geliştirme

```bash
npm install
npm run dev        # derler, wrangler (API, :8788) + vite (:5173) birlikte açılır
```
Yerel D1/KV verisi `.wrangler/` klasöründe tutulur (git'e gönderilmez).

## Klasör yapısı

```
functions/api/[[route]].ts   Cloudflare Pages Functions girişi (tüm /api/*)
server/                      Hono API: auth, katalog, teklif, CRM, rapor, yedek
shared/                      Sunucu + istemci ortak tipler ve hesaplama motoru
src/                         React arayüzü (sayfalar, PDF üretici, bileşenler)
public/                      Fontlar, ikonlar, PWA manifest ve service worker
```
