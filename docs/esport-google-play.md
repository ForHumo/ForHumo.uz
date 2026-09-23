# Humo eSport — Google Play'ga chiqarish (TWA)

`forhumo.uz/esport` ni **TWA (Trusted Web Activity)** orqali Android ilovaga o'raymiz.
BN'dan farqi: eSport'ning **o'z domeni yo'q** — u forhumo.uz ustidan ishlaydi, shuning
uchun **path-scoped manifest** + **host-aware assetlinks** ishlatiladi. (Kelajakda
`humoesport.uz` olsangiz — manifest/assetlinks allaqachon uni ham qo'llaydi.)

## Kod tomonidan TAYYOR (bu repo'da qilingan)
- ✅ **PWA manifest** — `/esport.webmanifest` (`src/app/esport.webmanifest/route.ts`).
  name "Humo eSport", `id`/`start_url` = `/uz/esport`, `scope` "/", `standalone`,
  dark-navy `#070C1C`. Root `/manifest.webmanifest` ("For Humo") dan ALOHIDA identlik.
  Esport layout shunga link qiladi.
- ✅ **Ikonalar** — `/esport/icon-192.png` + `/esport/icon-512.png` (any) +
  `/esport/icon-maskable-512.png` (maskable, logo safe-zone ichida, dark-navy fon).
- ✅ **Service worker** — `EsServiceWorker` (esport layout) `/sw.js` ni barcha esport
  userida erta register qiladi → offline + `beforeinstallprompt` ishlaydi.
  (Eslatma: `/offline.html` hozircha BN-brendli — esport offline sahifasi keyin
  qo'shilishi mumkin, TWA uchun kritik emas.)
- ✅ **`/.well-known/assetlinks.json`** — HOST-AWARE: `forhumo.uz` (+www) → eSport paketi
  (env `TWA_ESPORT_*`), `bozornarxida.uz` → BN paketi. Hozircha `[]`, env qo'yilганда to'ladi.
- ✅ **Feature graphic 1024×500** — `docs/play-assets/esport-feature-graphic-1024x500.png`
  (RGB, alfa'siz — Play talabi).

## Sizning tomoningizdan QOLGAN qadamlar

### 0. Yagona haqiqiy xarajat
Google Play developer akkaunti — **bir martalik ~$25**. (BN uchun ochsangiz — **o'sha
akkauntda** eSport ham chiqadi, ikkinchi to'lov shart emas.)

> ⚠️ **WWW/redirect ni tekshiring** (BN'da apex→www 308 edi). TWA'ni **redirect
> qilmaydigan kanonik host** bilan init qiling — quyida forhumo.uz'ni jonli tekshiring:
> `curl -sI https://forhumo.uz/esport.webmanifest` — agar 308 → `Location` hostini
> (masalan www.forhumo.uz) ishlating. Aks holda telefonda URL bar chiqadi.

### 1. Bubblewrap
```bash
npm i -g @bubblewrap/cli
mkdir esport-twa && cd esport-twa
# Kanonik host bilan (redirect bo'lmasin):
bubblewrap init --manifest https://forhumo.uz/esport.webmanifest
```
So'raganda:
- **Application ID:** `uz.forhumo.esport.twa` (keyin o'zgarmaydi — env'ga ham yozasiz).
- **App name:** Humo eSport
- **Signing key:** yangi keystore (parol so'raydi). ⚠️ **KEYSTORE + PAROLNI YO'QOTMANG**
  (BN keystore'idan ALOHIDA — har ilovaning o'z kaliti).

### 2. Build + fingerprint
```bash
bubblewrap build
bubblewrap fingerprint
```
Natija: `app-release-bundle.aab` (Play'ga) + `app-release-signed.apk` (sinov).

### 3. Env → Vercel (redeploy)
**Vercel → Project → Settings → Environment Variables:**
```
TWA_ESPORT_PACKAGE_NAME        = uz.forhumo.esport.twa
TWA_ESPORT_SHA256_FINGERPRINTS = <SHA-256>
```
**Redeploy.** Tekshiring (kanonik host):
```bash
curl https://forhumo.uz/.well-known/assetlinks.json
```
endi `[]` emas, ichida eSport paketi + fingerprint ko'rinishi kerak.

### 4. Play Console
1. Yangi ilova (Humo eSport, uz). AAB'ni Internal testing'ga yuklang.
2. **Play App Signing yoqilgan** (default) — App integrity'dan **"App signing key" VA
   "Upload key"** SHA-256 IKKALASINI `TWA_ESPORT_SHA256_FINGERPRINTS` ga vergul bilan
   qo'shing va yana redeploy. (Eng ko'p unutiladigan joy.)
3. Store listing: ikonka `/esport/icon-512.png`, feature graphic yuqoridagi fayl,
   kamida 2 ta telefon skrinshoti, Maxfiylik siyosati URL, Data safety + Content rating.
4. Internal testda **URL bar yo'qligini** tekshiring → Production.

## Muhim eslatmalar
- eSport TWA `scope: "/"` — foydalanuvchi ilovadan Pay/Market/ID'ga o'tsa ham ilovada qoladi.
- assetlinks HOST-AWARE bo'lgani uchun BN va eSport bir kodbazada, bir-biriga xalaqit bermaydi.
- Har env o'zgarganda Vercel'da **redeploy** kerak.
