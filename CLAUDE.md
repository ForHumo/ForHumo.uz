# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Bu hujjat keyingi Claude Code nusxalari uchun. Faqat **kodda tasdiqlangan** ma'lumotlar yozilgan.
> Yangi modul/model qo'shsangiz — quyidagi jadvallarni yangilang.

## Loyiha haqida

**ForHumo.uz** — O'zbekiston uchun yagona identity ustiga qurilgan ko'p modulli super-app:

- **Humo ID** — yagona identity (Google OAuth, `@username` handle, `UZxxxxxxx` Humo ID)
- **Esport** — jamoalar, o'yinchilar, turnirlar, role-based admin panel
- **Market** — brendlar, mahsulotlar, savat, buyurtmalar
- **Nexus** — ijtimoiy tarmoq (feed, stories, live, kanal, kino, musiqa) — hozircha UI demo
- **Pay (ALKH Pay)** — Zij valyutali hamyon, o'tkazma, seyf
- **AI** — `/ai-static/` ichki ilovasiga iframe orqali ulanadi

## Tech Stack (package.json dan aniq)

| Soha | Texnologiya | Versiya |
|---|---|---|
| Framework | Next.js (App Router) | `^15.1.6` |
| UI | React / react-dom | `19.2.3` |
| Auth | NextAuth | `^4.24.13` (v4) |
| DB / ORM | PostgreSQL + Prisma (client + CLI) | `5.19.1` |
| i18n | next-intl | `^4.7.0` |
| Styling | Tailwind CSS | `^4` |
| State | Zustand | `^5.0.10` |
| Animatsiya | Framer Motion | `^12.26.2` |
| Storage | @vercel/blob | `^2.4.0` |
| Boshqa | leaflet (xarita), qrcode, react-easy-crop (avatar), date-fns, next-themes | — |
| Til | TypeScript | `^5` |

## Dev buyruqlari

```bash
npm run dev      # lokal server (localhost:3000)
npm run build    # prisma generate && next build
npm run start    # production server
npm run lint     # eslint (eslint.config.mjs — flat config)

npx prisma generate         # client qayta generatsiya (postinstall'da avtomatik)
npx prisma migrate dev      # lokal migratsiya
npx prisma migrate deploy   # production migratsiya
npx prisma studio           # DB ni vizual ko'rish
```

> **Test yo'q.** Repoda test framework (jest/vitest) o'rnatilmagan — "bitta testni ishga tushirish" buyrug'i mavjud emas.

## Arxitektura — "katta rasm"

Bu qismni tushunish uchun bir nechta faylni birga o'qish kerak. Eng muhim naqshlar:

### 1. Locale routing + ingichka sahifa (thin page) naqshi
- `src/middleware.ts` → `src/i18n/routing.ts` (next-intl). Locale'lar: `uz` (default), `ru`, `en`. `localePrefix: 'always'` — URL'da locale prefiks **har doim** bor.
- Barcha sahifalar `src/app/[locale]/<modul>/page.tsx` ostida.
- Sahifalar deyarli har doim **ingichka server wrapper**: `await params` → `setRequestLocale(locale)` → `generateMetadata()` → katta **client komponent**ni (`src/components/<modul>/`) render qiladi. Haqiqiy logika sahifada emas, komponentlarda.
- UI matnlari `messages/{uz,ru,en}.json` da; `useTranslations()` orqali olinadi.

### 2. Ikkita parallel identity modeli (MUHIM gotcha)
- **`UserProfile`** — asosiy Humo ID identity, `email` bo'yicha unique. NextAuth (`src/lib/auth.ts`) `signIn` callback'ida shu modelga `upsert` qiladi, login eventlarini yozadi (oxirgi 10 tasini saqlaydi), `level` ni 1 ga ko'taradi.
- **`User`** — faqat esport uchun, `nickname` bo'yicha unique. Jamoalar/turnirlar shu modelga bog'lanadi.
- **Bu ikkisi FK bilan bog'lanmagan.** "Foydalanuvchi" ustida ishlayotganda qaysi modelligini aniqlang.

### 3. Auth oqimi (NextAuth v4, JWT strategy)
- Faqat **GoogleProvider** ulangan (`src/lib/auth.ts`).
- JWT ichiga `onboardingDone`, `humoId`, `username`, `coverImage` joylanadi — shuning uchun `AuthBarrier` (layout'da) qo'shimcha fetch qilmaydi.
- Server: `getServerSession(authOptions)`. Client: `useSession()` yoki `src/store/auth-store.ts` (Zustand).
- Humo ID formati: `UZ` + 7 raqam (masalan `UZ4829341`) — `api/user/generate-humo-id`.

### 4. Zij valyuta tizimi (ALKH Pay)
- **Zij (Ƶ)** — ichki valyuta. **Kurs qat'iy: `1 Zij = 1 USD`** (o'zgarmas).
- Saqlanishi: `Decimal(18,2)` (Int emas).
- `ZijWallet` ↔ `UserProfile` bilan 1:1. `ZijTransaction` — **single-entry ledger** (`balanceAfter` maydoni bilan, double-entry emas). `ZijSafe` — maqsadli jamg'arma.
- Pay biznes-logikasi `src/app/api/pay/*` route'larida (deposit/transfer/safe/wallet). **Deposit hozircha test rejimda, withdraw o'chirilgan** (`ZijTransactionType` izohlariga qarang).

### 5. Repository vs API-direct (mos kelmaslik)
- **Esport** DB logikasi `src/lib/repositories/` da (players / teams / tournaments).
- **Market va Pay** esa `prisma`'ni to'g'ridan-to'g'ri API route'larida chaqiradi (repository qatlami yo'q).
- Yangi kod yozayotganda mavjud modulning uslubiga moslang.

### 6. Esport rollari (ikkinchi rol tizimi)
- `src/lib/permissions.ts` — `ORGANIZER` / `MODERATOR` / `SYSTEM_AI` rollari → action ruxsatlari (`hasPermission()`).
- Bu Prisma `UserRole` (USER/ADMIN) dan **alohida** tizim. `/esport/admin` (`esport/admin/page.tsx`) shu role-based ruxsatlardan foydalanadi.

### 7. Shifrlangan manzil
- `src/lib/crypto.ts` — AES-256-GCM. `UserProfile.location` (shifrlangan) + `locationIv` juftligida saqlanadi. Kalit: `LOCATION_ENCRYPTION_KEY` (bo'lmasa `NEXTAUTH_SECRET` dan derive qilinadi).

### 8. Statik ichki ilovalar (iframe)
- `public/ai-static/` — `/ai/page.tsx` buni iframe qiladi va `localStorage["humo_profile"]` ga session profilini yozib, ilovani real foydalanuvchi bilan ishga tushiradi.
- `public/pay-static/` — papka mavjud, lekin `src` dan iframe sifatida chaqirilmagan (Pay aslida `AlkhPayContent` React komponenti orqali ishlaydi).

## Ma'lumotlar bazasi modellari (`prisma/schema.prisma`)

**Humo ID:** `UserProfile`, `LoginEvent`, `SupportTicket`, `EmailVerificationCode`
**Esport:** `User`, `PlayerProfile`, `Team`, `TeamInvite`, `TeamMember`, `JoinRequest`, `Tournament`, `TournamentTeam`, `TournamentMatch`, `TournamentStanding`
**Market:** `MarketBrand` (+`categories[]`), `MarketProduct` (+`videos[]`), `MarketCartItem`, `MarketOrder`, `MarketOrderItem`, `MarketWishlist`, `MarketReview` (+`media[]`), `MarketReviewReply` (cheksiz ichma-ich, `parentId`), `MarketReviewLike`, `MarketBrandReview`, `MarketNotification`
**Pay:** `ZijWallet`, `ZijTransaction`, `ZijSafe`
**Enum'lar:** `TeamRole`, `JoinRequestStatus`, `UserRole`, `TournamentStatus`, `MarketPaymentMethod`, `MarketOrderStatus`, `MarketNotifType`, `ZijTransactionType`

> Eslatma: **Nexus** uchun DB modeli yo'q — u to'liq frontend (mock ma'lumotlar). Nexus sovg'alaridagi "coins" (`nx-gifts.tsx`) — bu tizim valyutasi emas, `useState` dagi demo holat (narxlar UZS da).

## Module Status

| Modul | Marshrut | Backend | Holat | Izoh |
|---|---|---|---|---|
| **Humo ID** | `/id`, `/id/edit`, `/id/[username]`, `/id/verify` | `api/user/*` to'liq | ✅ Tayyor | Profil, edit (642 qator), onboarding, avatar/cover upload, account delete |
| **Esport** | `/esport`, `/teams`, `/players`, `/tournaments`, `/esport/admin`, `/history` | `api/teams/*`, `api/tournaments/*` + repositories | ✅ Tayyor | Role-based admin, jamoa invite/join, turnir registratsiya |
| **Market** | `/market`, `/catalog`, `/cart`, `/orders`, `/wishlist`, `/product/[slug]`, `/product/add`, `/brand/manage`, `/brand/[slug]`, `/profile`, `/profile/activity`, `/notifications` | `api/market/*` to'liq | 🟢 Deyarli tayyor | Wishlist (heart), harid-gate sharhlar+rasm/video, cheksiz ichma-ich javoblar, like ("qo'shilaman"), sotuvchi badge (`isAuthor`), brend yaratish/tahrirlash (ko'p yo'nalish), founder bepul brend, mahsulot qo'shish/tahrirlash+video, savat (manzil+Zij/naqd/karta), bildirishnomalar, profil statistika+faoliyat. **Qoldi:** sharh/javob tahrirlash+o'chirish, pagination |
| **Pay (ALKH)** | `/pay` | `api/pay/*` (deposit/transfer/safe/wallet) | 🟡 Funksional | Deposit **test rejim**, withdraw o'chirilgan |
| **Nexus** | `/nexus` | ❌ Backend yo'q | 🟠 UI demo | 72 komponent / ~24k qator, lekin DB/API yo'q — mock |
| **AI** | `/ai` | `lib/ai-moderator.ts` | 🟡 Wrapper | `/ai-static/` ga iframe; session'ni localStorage orqali uzatadi |
| **Statik** | `/faq`, `/support`, `/privacy-policy`, `/coming-soon` | `api/support/contact` | ✅ Tayyor | — |

## Environment o'zgaruvchilari

`.env.example` **yo'q** — sozlamalar `.env.local` da. Kodda ishlatilganlari:

```bash
DATABASE_URL              # PostgreSQL (Prisma)
NEXTAUTH_SECRET           # NextAuth + crypto.ts fallback kaliti
NEXTAUTH_URL
GOOGLE_CLIENT_ID          # GoogleProvider (auth.ts)
GOOGLE_CLIENT_SECRET
BLOB_READ_WRITE_TOKEN     # Vercel Blob (avatar / cover upload)
LOCATION_ENCRYPTION_KEY   # ixtiyoriy — AES-256-GCM kaliti (crypto.ts); bo'lmasa NEXTAUTH_SECRET dan derive
TELEGRAM_CLIENT_ID        # .env.local da bor, LEKIN auth.ts da hali ulanmagan
TELEGRAM_CLIENT_SECRET    # (yuqoridagidek)
VERCEL_OIDC_TOKEN         # Vercel tomonidan beriladi
```

## Current TODO (koddan kuzatilgan, dalilga asoslangan)

- [ ] **Telegram OAuth ulash** — `TELEGRAM_CLIENT_ID/SECRET` `.env.local` da bor, ammo `src/lib/auth.ts` da faqat `GoogleProvider` ulangan. Telegram provider hali qo'shilmagan.
- [ ] **Pay'ni real rejimga o'tkazish** — `ZijTransactionType.DEPOSIT` test rejimda, `WITHDRAW` o'chirilgan. Haqiqiy to'lov integratsiyasi kerak.
- [ ] **KYC level 2** — `UserProfile.level == 2` (biometrik) `schema.prisma` da "future" deb belgilangan, implementatsiya yo'q.
- [ ] **Nexus backend** — 72 ta UI komponenti mock ma'lumot bilan ishlaydi; DB modellari va API route'lari yo'q.
- [ ] **`.env.example` qo'shish** — yangi ishchilar uchun namuna fayl yo'q.

## Muhim qoidalar

- **EMOJI ISHLATMA.** UI'da hech qachon emoji yo'q — faqat **Lucide ikonkalar**. (Foydalanuvchi qat'iy talabi; diniy sezgirlik ham bor — masalan cho'chqa ikonkasi ishlatilmaydi.)
- **i18n:** har qanday yangi UI matni `messages/uz.json`, `ru.json`, `en.json` ga **uchalasiga** qo'shilishi shart; `useTranslations()` ishlat.
- **Locale Link gotcha:** `import { Link } from "@/i18n/routing"` locale'ni **avtomatik** qo'shadi. `href="/market"` yoz, `/${locale}/market` **EMAS** (ikki marta chiqadi: `/uz/uz/...`). `useRouter` ham `@/i18n/routing` dan import qilinadi.
- **Modul shell pattern:** Har modul `src/app/[locale]/<modul>/layout.tsx` da `fixed inset-0 z-[100]` + o'z navbari bilan o'raladi (global header'ni yopadi). Navbar uchun `src/components/layout/module-navbar.tsx` (`ModuleNavbar`) config bilan ishlatiladi. Mavjud: eSport, ID, AI, Pay, Market.
- **Prisma client:** doimo `src/lib/prisma.ts` singleton orqali import qil (yangi `PrismaClient()` yaratma).
- **Profil tahriri:** `UserProfile.profileEditedAt` — foydalanuvchi profilini **14 kunda 1 marta** tahrir qila oladi (rate-limit).
- **Manzil:** `location`/`locationIv` shifrlangan — `src/lib/crypto.ts` siz to'g'ridan o'qib/yozib bo'lmaydi.
- **Tailwind v4 dark mode (KRITIK):** v4 da config fayli yo'q — `dark:` default'da OS media query'ga bog'lanadi, `.dark` class'ga **emas**. `src/app/globals.css` da `@custom-variant dark (&:where(.dark, .dark *));` bo'lishi SHART. Yo'qolsa dark-mode toggle butun ilovada ishlamaydi.
- **Founder hisoblar:** `FOUNDER_HUMO_IDS = ["UZ6889574","UZ3549920"]`, `FOUNDER_USERNAMES = ["abduvoris","aaa"]` (`api/market/brands/route.ts`) — avto-verified + 1-brend bepul. Brend narxi: 1-bepul, 2=25, 3=50, 4=100, 5+=200 Ƶ (atomik tranzaksiya).
- **Media yuklash:** rasm/video → `MediaUploader` (`isVideoUrl()` export qiladi), rasmni crop → `MarketCropModal` (`aspect`+`outW` prop; 1:1 mahsulot, 3:1 cover), device rasm → `ImageUploader`. Hammasi `api/market/upload` (Vercel Blob). ⚠️ Vercel serverless yuklash limiti ~4.5MB — katta video uchun client-side blob upload kerak.
- **LocationPicker:** `accent="green"` (Market) yoki `"blue"` (onboarding) prop bilan modul rangiga moslanadi. Til/xarita kabi umumiy komponentlar modul rangiga moslanishi kerak (ko'k = asosiy sayt rangi, Market = yashil).
- **Reply/like ajratish:** API javoblarda `isMine` (o'zimnikimi) + `isAuthor` (mahsulot brend egasimi = sotuvchi) hisoblanadi — sotuvchi javoblari "Sotuvchi" badge + boshqa fon bilan ko'rsatiladi.

## Ish uslubi (workflow) — MUHIM

- **Har o'zgarishdan keyin avtomatik:** `git add -A && git commit -m "..."` → `git push origin main` → `npx vercel deploy --prod`. Foydalanuvchi har safar so'ramaydi — bu doimiy talab.
- **TS tekshiruvi:** deploy oldidan `npx tsc --noEmit` bilan xatolarni tekshir.
- **DB o'zgarishi:** `prisma migrate dev` **interaktiv** (bu muhitda ishlamaydi). O'rniga:
  `DATABASE_URL="<.env.local dagi URL>" npx prisma db push` ishlat.
- **Test rejim (vaqtincha):** Pay (Zij pul), Market (mahsulotlar), Nexus (kontent) — **mock** ma'lumot. Qolgan hamma narsa (auth, DB, API, deploy) **real**. Mock'ni faqat keyin real qilamiz; boshqa hech narsa o'zgarmaydi.
- **Zij simvoli:** `Ƶ` (Al-Xorazmiy → ALKH). Kurs `1 Ƶ = 1 USD` o'zgarmas.
- **Mock rasm:** mahsulot/kontent rasmi kerak bo'lsa `https://picsum.photos/seed/<slug>/600/600`.
- **Token tejash:** keraksiz fayllarni qayta o'qima; faqat kerakli qismni o'qi. Katta `.json`/`.claude.json` ni to'liq o'qimasdan `python3`/`grep` bilan tahlil qil.
- **Glob/grep timeout:** loyiha OneDrive'da + `node_modules` katta — `**/CLAUDE.md` kabi keng Glob timeout bo'ladi. Aniq yo'l ber (`prisma/`, `src/...`) yoki Grep'da `path` ko'rsat.
- **Docs-only o'zgarish:** faqat CLAUDE.md/markdown o'zgarsa commit+push yetadi, `vercel deploy` shart emas (build chiqimiga ta'sir qilmaydi).
