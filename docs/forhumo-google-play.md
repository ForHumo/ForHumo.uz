# For Humo (super-app) — Google Play'ga chiqarish (TWA)

Butun ekotizimni **bitta "For Humo" ilova** qilib chiqaramiz: `www.forhumo.uz` (scope `/`) —
ichida **ID, Nexus, eSport, Market, Pay, AI, Support, Bozor Narxida** hammasi. **Humo Support
shu ilova orqali Play'ga kiradi** (alohida support ilova YASALMAYDI — Play thin-content siyosati
+ ortiqcha; Support super-app ichida to'liq ishlaydi).

Bir host'da (`forhumo.uz`) endi **uch TWA**: For Humo (super-app, scope `/`) + eSport (`/esport`)
+ Nexus (`/nexus`). Ular alohida Play ilovalari; assetlinks uchalasini ham tasdiqlaydi. Har
biri o'z ikonasidan ochiladi va o'z start_url'iga tushadi.

## Kod tomonidan TAYYOR (bu repo'da qilingan)
- ✅ **PWA manifest** — `/manifest.webmanifest` (`src/app/manifest.ts`), host-aware:
  `bozornarxida.uz` → "Bozor Narxida"; boshqa host → **"For Humo"** (`id`/`start_url` `/`,
  `scope` `/`, `standalone`, dark `#0A0E1A`, categories social/lifestyle/productivity).
- ✅ **Ikonalar** — `/forhumo/icon-192.png` + `/forhumo/icon-512.png` (any) +
  `/forhumo/icon-maskable-512.png` (maskable, "F" belgisi safe-zone ~62% markazda, dark fon).
  Manba: `public/logos/forhumo.png`.
- ✅ **Service worker** — `ForHumoServiceWorker` (root `[locale]/layout.tsx`) `/sw.js` ni
  barcha core sahifada (home, /id, /pay, /faq, /support, /market, /ai) erta register qiladi →
  offline shell + `beforeinstallprompt`. (BN/eSport/Nexus layout'laridagi register bilan
  idempotent — bir xil `/sw.js`.)
- ✅ **`/.well-known/assetlinks.json`** — HOST-AWARE + MULTI-APP: `forhumo.uz` (+www) →
  **For Humo + eSport + Nexus** paketlari (env `TWA_FORHUMO_*` + `TWA_ESPORT_*` + `TWA_NEXUS_*`),
  `bozornarxida.uz` → BN. Env yo'q ilova statement'i tushib qoladi; sayt buzilmaydi.
- ✅ **Feature graphic 1024×500** — `docs/play-assets/forhumo-feature-graphic-1024x500.png`
  (RGB, alfa'siz).

## ⚠️ Review eslatmalari (super-app'ga xos)
- **Aralash auth:** super-app'ning **public** qismlari bor (home, /faq, ba'zi info sahifalar,
  BN ko'rish) — reviewer login'siz ko'radi. Lekin **Nexus + Humo ID talab qiluvchi** qismlar
  auth-gated. **App access → test hisob** (Google + Humo ID/@username) bering, aks holda
  reviewer gated modullarni ko'ra olmay muammo bo'lishi mumkin.
- **Content rating:** ilovada **user-generated content** (Nexus post/chat/live) bor → "Social"
  + UGC + interaction e'lon qiling. Aks holda keyin rad bo'ladi.
- **Data safety:** Google login, email, profil, joylashuv (BN/Nexus), to'lov (Pay test) — barchasini
  rostini yozing.
- **To'lov:** For Pay hozir TEST rejim; real pul oqimi yo'q (MChJ/Payme-Click kutilmoqda) —
  Play'da "in-app purchase" yo'q deb belgilang (Google Play Billing ishlatilmayapti).

## Sizning tomoningizdan QOLGAN qadamlar

### 0. Xarajat
Google Play developer akkaunti — **bir martalik ~$25**. BN/eSport/Nexus uchun ochgan
bo'lsangiz — **o'sha akkauntda** For Humo ham chiqadi, ikkinchi to'lov shart emas.

> ⚠️ **WWW/redirect:** `forhumo.uz` apex → `www.forhumo.uz` ga **307 redirect** qiladi
> (jonli tekshirilgan). TWA'ni **kanonik host** bilan init qiling:
> `bubblewrap init --manifest https://www.forhumo.uz/manifest.webmanifest`
> (apex bilan emas — aks holda telefonda URL bar chiqadi).

### 1. Bubblewrap
```bash
npm i -g @bubblewrap/cli
mkdir forhumo-twa && cd forhumo-twa
bubblewrap init --manifest https://www.forhumo.uz/manifest.webmanifest
```
So'raganda:
- **Application ID:** `uz.forhumo.app` (keyin o'zgarmaydi — env'ga ham yozasiz; eSport
  `uz.forhumo.esport.twa` / Nexus `uz.forhumo.nexus.twa` dan ALOHIDA paket).
- **App name:** For Humo
- **Signing key:** yangi keystore. ⚠️ **KEYSTORE + PAROLNI YO'QOTMANG** (har ilovaning o'z kaliti).

### 2. Build + fingerprint
```bash
bubblewrap build
bubblewrap fingerprint
```
Natija: `app-release-bundle.aab` + `app-release-signed.apk`.

### 3. Env → Vercel (redeploy)
**Vercel → Settings → Environment Variables** (eSport/Nexus env'ini O'CHIRMASDAN, yoniga):
```
TWA_FORHUMO_PACKAGE_NAME        = uz.forhumo.app
TWA_FORHUMO_SHA256_FINGERPRINTS = <SHA-256>
```
**Redeploy.** Tekshiring (kanonik host):
```bash
curl https://www.forhumo.uz/.well-known/assetlinks.json
```
Endi massivda **For Humo + eSport + Nexus** (3 paket) ko'rinishi kerak.

### 4. Play Console
1. Yangi ilova (For Humo, uz). AAB'ni Internal testing'ga yuklang.
2. **Play App Signing yoqilgan** (default) — App integrity'dan **"App signing key" VA
   "Upload key"** SHA-256 IKKALASINI `TWA_FORHUMO_SHA256_FINGERPRINTS` ga vergul bilan qo'shing
   va yana redeploy. (Eng ko'p unutiladigan joy.)
3. **App access** → test hisob (yuqoridagi aralash-auth eslatmasi).
4. Store listing: ikonka `/forhumo/icon-512.png`, feature graphic yuqoridagi fayl, kamida
   2 ta telefon skrinshoti (turli modullardan — Nexus feed, BN, eSport), Maxfiylik siyosati
   URL, Data safety + Content rating (Social+UGC).
5. Internal testda **URL bar yo'qligini** + har modulga o'tish ilova ichida qolishini tekshiring
   → Production.

## Muhim eslatmalar
- **Bir host, uch TWA:** For Humo (`/`, super-app) + eSport (`/esport`) + Nexus (`/nexus`).
  assetlinks massiv — uch paket ham bo'ladi. For Humo scope `/` bo'lgani uchun ichidan har
  modulga o'tsa ilovada qoladi (Support, Market, Pay, ID ham).
- **Strategiya:** For Humo super-app + alohida eSport/Nexus ilovalari birga yashaydi. Xohlasangiz
  keyin faqat super-app qoldirib, alohidalarni to'xtatishingiz mumkin (Play'da unpublish).
- Har env o'zgarganda Vercel'da **redeploy** kerak.
- `/offline.html` hozircha BN-brendli — For Humo offline sahifasi keyin qo'shilishi mumkin,
  TWA uchun kritik emas.
