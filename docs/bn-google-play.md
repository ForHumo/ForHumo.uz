# Bozor Narxida — Google Play'ga chiqarish (TWA)

Mavjud PWA (`bozornarxida.uz`) ni **TWA (Trusted Web Activity)** orqali Android ilovaga
o'raymiz. Yangi kod yozilmaydi — sayt shundayligicha ilova ichida ochiladi.

## Kod tomonidan TAYYOR (bu repo'da qilingan)
- ✅ PWA manifest (`/manifest.webmanifest`) — BN nomi, `standalone`, `id`, to'g'ri ikonalar.
  Host `bozornarxida.uz` bo'lsa avtomatik BN manifest chiqadi.
- ✅ Ikonalar — `any`: `/bn/icon-192.png` (192×192) + `/bn/icon-512.png` (512×512).
  **maskable: ALOHIDA** `/bn/icon-maskable-512.png` — logo safe-zone (markaziy ~60%)
  ichida, oq fon bilan. (Avval to'liq-chetgacha icon-512 maskable deb berilgan edi →
  Android adaptiv ikonada burchaklari kesilardi. Bubblewrap aynan shu maskable'ni Play
  launcher ikonasiga oladi, shuning uchun bu muhim edi.)
- ✅ Service worker (`/sw.js`) — offline shell. Endi **`BnServiceWorker`** (BN layout)
  orqali BARCHA foydalanuvchida erta ro'yxatga olinadi (avval faqat push yoqilganda
  edi) → offline + Chrome `beforeinstallprompt` (bir-bosishli o'rnatish) ishonchli.
- ✅ `/.well-known/assetlinks.json` route — hozircha bo'sh `[]`, env qo'yilганда to'ladi.
  Middleware `.`-li yo'llarni chetlab o'tadi, shuning uchun `bozornarxida.uz` hostida ham
  `/.well-known/assetlinks.json` va `/manifest.webmanifest` to'g'ri (rewrite'siz) beriladi.

## Sizning tomoningizdan QOLGAN qadamlar

### 0. Yagona haqiqiy xarajat
Google Play developer akkaunti — **bir martalik ~$25** (~315 000 so'm). Busiz Play'ga
chiqib bo'lmaydi. Qolgan hamma narsa bepul. (Byudjet yetguncha 1-7 qadamlarni tayyorlab
qo'yish mumkin, faqat oxirgi "publish" kutadi.)

### 1. Bubblewrap o'rnatish (kompyuterda, bepul)
Node bor kompyuterda:
```bash
npm i -g @bubblewrap/cli
```
Birinchi ishga tushirishda JDK + Android SDK'ni o'zi so'rab yuklab oladi.

### 2. Loyihani init qilish
```bash
mkdir bn-twa && cd bn-twa
bubblewrap init --manifest https://bozornarxida.uz/manifest.webmanifest
```
So'raganda:
- **Application ID (package name):** `uz.bozornarxida.twa` (yoki xohlagan, lekin keyin
  o'zgarmaydi — yaxshi tanlang). Buni env'ga ham yozasiz.
- **App name:** Bozor Narxida
- **Signing key:** yangi keystore yaratadi (parol so'raydi).
  ⚠️ **KEYSTORE + PAROLNI YO'QOTMANG.** Yo'qotsangiz ilovani boshqa hech qachon
  yangilab bo'lmaydi. Zaxira nusxa oling (parolli joyga).

### 3. Build
```bash
bubblewrap build
```
Natija: `app-release-bundle.aab` (Play'ga yuklanadigan fayl) + `app-release-signed.apk`
(telefonда sinash uchun).

### 4. Fingerprint olish va env'ga qo'yish
```bash
bubblewrap fingerprint
```
SHA-256 ni oling. Keyin **Vercel → Project → Settings → Environment Variables**:
```
TWA_PACKAGE_NAME        = uz.bozornarxida.twa
TWA_SHA256_FINGERPRINTS = <SHA-256 fingerprint>
```
**Redeploy** qiling. Tekshiring:
```bash
curl https://bozornarxida.uz/.well-known/assetlinks.json
```
endi `[]` emas, ichida package + fingerprint ko'rinishi kerak.

### 5. Play Console (bir martalik $25'dan keyin)
1. Yangi ilova yarating (Bozor Narxida, uz).
2. **App bundle** (`app-release-bundle.aab`) ni Internal testing track'ga yuklang.
3. **Play App Signing yoqilgan** bo'ladi (default) — Google ilovani QAYTA imzolaydi.
   Shuning uchun **Play Console → Test and release → Setup → App integrity** dan:
   - "App signing key certificate" SHA-256
   - "Upload key certificate" SHA-256
   **IKKALASINI** `TWA_SHA256_FINGERPRINTS` ga vergul bilan qo'shing va yana redeploy:
   ```
   TWA_SHA256_FINGERPRINTS = <upload_key_sha256>,<app_signing_key_sha256>
   ```
   (Bu qadam eng ko'p unutiladigan joy — assetlinks'da ikkala kalit bo'lmasa telefonда
   URL bar ko'rinib qoladi.)

### 6. Do'kon ma'lumotlari (dizayn/qo'lda)
- Ilova ikonasi 512×512 — bor (`/bn/icon-512.png`).
- **Feature graphic 1024×500** — yasash kerak (dizayn ishi).
- **Skrinshotlar** — kamida 2 ta telefon skrinshoti.
- **Maxfiylik siyosati URL** — Google majburiy qiladi. `bozornarxida.uz/privacy-policy`
  ishlashini tekshiring (yoki BN uchun alohida sahifa qo'shiladi).
- **Data safety** formasi + **Content rating** so'rovnomasi.

### 7. Sinov va chiqarish
- Internal testing'da o'rnatib, **URL bar yo'qligini** tekshiring (= assetlinks to'g'ri).
- So'ng Production track'ga chiqaring (Google 1-3 kun tekshiradi).

## Muhim eslatmalar
- Keystore + parol = ilovaning "kaliti". Yo'qolса — yangilash imkonsiz.
- Assetlinks'da **upload key + Play App Signing key** ikkalasi bo'lishi shart.
- Har env o'zgarganda Vercel'da **redeploy** kerak (env runtime'да o'qiladi, lekin
  yangi qiymat faqat redeploy'dan keyin).
