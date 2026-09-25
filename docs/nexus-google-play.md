# Humo Nexus — Google Play'ga chiqarish (TWA)

`forhumo.uz/nexus` ni **TWA (Trusted Web Activity)** orqali Android ilovaga o'raymiz.
eSport kabi Nexus'ning ham **o'z domeni yo'q** — u `forhumo.uz` ustidan ishlaydi. Shu bois
**eSport bilan BIR host'ni bo'lishadi**: bitta `assetlinks.json` **ikkala TWA'ni** (eSport +
Nexus) tasdiqlaydi (statement massivi). Kod buni allaqachon qo'llab-quvvatlaydi.

## Kod tomonidan TAYYOR (bu repo'da qilingan)
- ✅ **PWA manifest** — `/nexus.webmanifest` (`src/app/nexus.webmanifest/route.ts`).
  name "Humo Nexus", short_name "Nexus", `id`/`start_url` = `/uz/nexus`, `scope` "/",
  `standalone`, dark brand `#0A0C12`. Root `/manifest.webmanifest` ("For Humo") va
  `/esport.webmanifest` (eSport) dan ALOHIDA identlik. Nexus layout shunga link qiladi.
- ✅ **Ikonalar** — `/nexus/icon-192.png` + `/nexus/icon-512.png` (any) +
  `/nexus/icon-maskable-512.png` (maskable, "N" belgisi safe-zone ~62% markazda, dark fon —
  burchak kesilishidan himoyalangan). Manba: `public/logos/humo-nexus.png`.
- ✅ **Service worker** — `NxServiceWorker` (nexus layout) `/sw.js` ni barcha Nexus userida
  erta register qiladi → offline shell + `beforeinstallprompt` (o'rnatish) ishlaydi.
- ✅ **`/.well-known/assetlinks.json`** — HOST-AWARE + MULTI-APP: `forhumo.uz` (+www) →
  **eSport VA Nexus** paketlari (env `TWA_ESPORT_*` + `TWA_NEXUS_*`), `bozornarxida.uz` → BN.
  Env yo'q ilova statement'i tushib qoladi; sayt buzilmaydi.
- ✅ **Feature graphic 1024×500** — `docs/play-assets/nexus-feature-graphic-1024x500.png`
  (RGB, alfa'siz — Play talabi).

## ⚠️ Nexus'ga XOS: ilova auth-gated
BN/eSport'dan farqli — **Nexus faqat Google login + Humo ID + @username** olgan userga
ochiladi (aks holda kirish/gate ekrani chiqadi). Bu Play review'ga ta'sir qiladi:
- **Play Console → App content → App access** bo'limида "All functionality is restricted"
  ni belgилаб, **test hisob** bering: Google akkaunt (review uchun) + u orqali olingan
  Humo ID/@username. Reviewer shu bilan kirib, ilovani ko'radi. Bo'lmasa — **rad etiladi**.
- Yoki review davrида reviewer uchun maxsus bypass account tayyorlang (founder-bypass
  mavjud — reserved-usernames tizimида). Test akkaunt ma'lumotini App access'ga yozing.
- TWA `scope: "/"` — gate "Kirish"/"Humo ID olish" tugmalari `/id`, `/` ga o'tsa ham
  ilova ichида qoladi (URL bar chiqmайди).

## Sizning tomoningizdan QOLGAN qadamlar

### 0. Xarajat
Google Play developer akkaunti — **bir martalik ~$25**. BN yoki eSport uchun ochган
bo'lsangiz — **o'sha akkauntда** Nexus ham chiqади, ikkinchi to'lov shart emas.

> ⚠️ **WWW/redirect ni tekshiring** (BN'da apex→www 308 edi). TWA'ни **redirect
> qilmaydigan kanonik host** bilan init qiling:
> `curl -sI https://forhumo.uz/nexus.webmanifest` — agar 308 → `Location` hostини
> (masalan `www.forhumo.uz`) ishlating. Aks holda telefonда URL bar chiqади.
> (eSport bilan bir xil host — o'sha kanonik hostни ishlating.)

### 1. Bubblewrap
```bash
npm i -g @bubblewrap/cli
mkdir nexus-twa && cd nexus-twa
# Kanonik host bilan (redirect bo'lmasin):
bubblewrap init --manifest https://forhumo.uz/nexus.webmanifest
```
So'raganда:
- **Application ID:** `uz.forhumo.nexus.twa` (keyin o'zgarmaydi — env'ga ham yozasiz;
  eSport'ning `uz.forhumo.esport.twa` idan ALOHIDA paket).
- **App name:** Humo Nexus
- **Signing key:** yangi keystore (parol so'raydi). ⚠️ **KEYSTORE + PAROLNI YO'QOTMANG**
  (BN/eSport keystore'idan ALOHIDA — har ilovaning o'z kaliti).

### 2. Build + fingerprint
```bash
bubblewrap build
bubblewrap fingerprint
```
Natija: `app-release-bundle.aab` (Play'ga) + `app-release-signed.apk` (sinov).

### 3. Env → Vercel (redeploy)
**Vercel → Project → Settings → Environment Variables** (eSport env'ini O'CHIRMASDAN,
YONIGA qo'shing):
```
TWA_NEXUS_PACKAGE_NAME        = uz.forhumo.nexus.twa
TWA_NEXUS_SHA256_FINGERPRINTS = <SHA-256>
```
**Redeploy.** Tekshiring (kanonik host):
```bash
curl https://forhumo.uz/.well-known/assetlinks.json
```
Endi massivda **eSport VA Nexus** paketlari ko'rinishi kerak (ikkalasi bir host'ni
tasdiqlaydi — bir-biriga xalaqit bermaydi).

### 4. Play Console
1. Yangi ilova (Humo Nexus, uz). AAB'ni Internal testing'ga yuklang.
2. **Play App Signing yoqilgan** (default) — App integrity'dan **"App signing key" VA
   "Upload key"** SHA-256 IKKALASINI `TWA_NEXUS_SHA256_FINGERPRINTS` ga vergul bilan
   qo'shing va yana redeploy. (Eng ko'p unutiladigan joy.)
3. **App access** → test hisob bering (yuqoridagi auth-gate eslatmasi — MUHIM).
4. Store listing: ikonka `/nexus/icon-512.png`, feature graphic yuqoridagi fayl, kamida
   2 ta telefon skrinshoti, Maxfiylik siyosati URL, Data safety + Content rating.
   - Content rating: Nexus'da user-generated content (post/chat/live) bor → "Social"
     kategoriya, UGC + interaction e'lon qiling (aks holda keyin rad bo'ladi).
5. Internal testda **URL bar yo'qligини** + login gate ishlashini tekshiring → Production.

## Muhim eslatmalar
- **Bir host, ikki TWA:** eSport (`/esport`) va Nexus (`/nexus`) `forhumo.uz`ни bo'lishadi.
  assetlinks massiv — ikkala paket ham bo'ladi. Har biri o'z manifest/scope/ikonasi bilan
  alohida Play ilovasi. Bir-birини buzmaydi.
- Har env o'zgарганда Vercel'да **redeploy** kerak.
- `/offline.html` hozirча BN-brendли — Nexus offline sahifasi keyin qo'shилиши mumkin,
  TWA uchun kritik emas.
- **Auth-gate** eng katta review-riski: App access'ga ishlaydigan test-akkaunt bermаsangiz
  ilova rad etiladi.
