# Humo AI — Google Play (TWA)

Humo AI **alohida Play ilovasi** sifatida chiqadi (Nexus/eSport kabi), lekin For Humo super-app ichida ham ochilaveradi. Bir host (forhumo.uz) — bir nechta TWA.

## Kod tomoni — TAYYOR ✅
- **Manifest:** `GET /ai.webmanifest` (`src/app/ai.webmanifest/route.ts`) — id `/uz/ai`, start_url `/uz/ai/chat`, scope `/`, standalone, dark brend (#0D0D0D).
- **Layout:** `src/app/[locale]/ai/layout.tsx` → `manifest: "/ai.webmanifest"`, applicationName "Humo AI", PWA ikonalar, appleWebApp, viewport themeColor.
- **Ikonalar:** `public/ai-icons/android-chrome-192x192.png` + `android-chrome-512x512.png` (any) + `icon-maskable-512.png` (maskable — oq fon + qora belgi, safe-zone).
- **assetlinks:** `src/app/.well-known/assetlinks.json/route.ts` — forhumo.uz host'ida AI TWA yozuvi (env orqali, kod o'zgarmasdan).

## Siz qiladigan — user-side
1. **Google Play dev akkaunt** ($25, bir martalik).
2. **Bubblewrap** (web → Android) — **kanonik host `www.forhumo.uz`** (apex forhumo.uz → www 307 redirect; www ishlatilmasa TWA'da URL bar chiqadi):
   ```bash
   bubblewrap init --manifest https://www.forhumo.uz/ai.webmanifest
   # applicationId: uz.forhumo.ai.twa   |   host: www.forhumo.uz
   bubblewrap build        # → imzolangan .aab (alohida keystore!)
   ```
3. **Vercel env qo'shish** (redeploy — kod o'zgarmaydi):
   - `TWA_AI_PACKAGE_NAME = uz.forhumo.ai.twa`
   - `TWA_AI_SHA256_FINGERPRINTS = AA:BB:...` (Play App Signing + Upload key SHA-256 **ikkalasi**, vergul bilan)
   - redeploy → `https://www.forhumo.uz/.well-known/assetlinks.json` AI yozuvini qaytaradi → ilova URL-barsiz to'liq ekran ochiladi.
4. **Play Console:** do'kon sahifasi (ikona 512, feature graphic 1024×500, skrinshotlar, tavsif uz/ru/en), Maxfiylik siyosati, Data Safety, content rating → review.

## Eslatma
- Launcher ikonasi hozir mavjud AI ikonadan (oq fon / qora Humo belgisi). Yakuniy brend ikonasini keyin ($100 dizayn bosqichi) almashtirsa bo'ladi.
- `start_url = /uz/ai/chat` — redirect'siz kanonik kirish.
- Env yo'q bo'lsa AI yozuvi assetlinks'da tushib qoladi (sayt buzilmaydi) — Bubblewrap build'dan keyin qo'shiladi.
