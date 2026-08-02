# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Bu hujjat keyingi Claude Code nusxalari uchun. Faqat **kodda tasdiqlangan** ma'lumotlar yozilgan.
> Yangi modul/model qo'shsangiz — quyidagi jadvallarni yangilang.

## Loyiha haqida

**ForHumo.uz** — O'zbekiston uchun yagona identity ustiga qurilgan ko'p modulli super-app:

- **Humo ID** — yagona identity (Google OAuth, `@username` handle, `UZxxxxxxx` Humo ID)
- **Esport** — jamoalar, o'yinchilar, turnirlar, role-based admin panel
- **Market** — brendlar, mahsulotlar, savat, buyurtmalar
- **Nexus** — ijtimoiy tarmoq. **Core feed real** (post/like/izoh/follow + Nexus×Market "Sotib olish"); qolgan 60+ komponent hali mock
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

### 4. Valyuta tizimi (ALKH Pay) — REAL PUL (UZS/USD)
- **"Zij" OLIB TASHLANDI** (huquqiy: xususiy valyuta O'zbekistonda muammo). Endi **real pul**: O'zbekiston foydalanuvchilari **so'm (UZS)**, xorijliklar **dollar (USD)**. Foydalanuvchi valyutasi `UserProfile.country` dan (`currencyForCountry` — UZ/bo'sh→UZS, aks holda USD).
- **`src/lib/money.ts` — yagona manba:** `formatMoney(amount, currency)` (so'm/$), `convert(amount, from, to)` (FX, env `USD_UZS_RATE`, default 12900), `currencyForCountry`, `minAmount`/`maxAmount`, `roundMoney` (UZS butun, USD 2 kasr). UI'da **hech qachon `Ƶ` yozma** — doim `formatMoney`.
- Model nomlari ichki qoldi: `ZijWallet`/`ZijTransaction`/`ZijSafe` (foydalanuvchiga ko'rinmaydi). Har biriga `currency` maydoni qo'shildi. `Decimal(18,2)`. `ZijTransaction` — single-entry ledger.
- **Valyutalararo:** tip/obuna/video-xarid'da yuboruvchi o'z valyutasida, qabul qiluvchi o'z valyutasida (FX konvert). Narxlar (priceZij/subPriceZij) **egasining valyutasida**. `src/lib/wallet.ts getOrCreateWallet` valyutani davlatdan o'rnatadi.
- **To'lov shlyuzi `src/lib/payments/`:** `PaymentProvider` interfeysi + `testProvider` (real pul yo'q). `getDepositProvider`/`getPayoutProvider` hozir test qaytaradi. Real shlyuz (Click/Payme→UZS, Stripe→USD) kalitlari env'da bo'lganda ulanadi (`isLiveMode()`); UI/route o'zgarmaydi. **Withdraw real:** `api/pay/withdraw` payout so'rovi (`PayoutRequest`), balans escrow, FAILED'da qaytarish.
- Pay biznes-logikasi `src/app/api/pay/*` (deposit/withdraw/transfer/safe/wallet). **Hozir TEST rejim** (deposit darhol tushadi). MChJ + merchant hisob + kalitlar foydalanuvchidan kelganda real ishlaydi.
- ⚠️ **Market hali Zij'da** (narxlari migratsiya qilinmagan; Nexus shoppable postlarda vaqtincha UZS sifatida ko'rsatiladi). Market valyuta migratsiyasi keyingi ish.

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
**Market:** `MarketBrand` (+`categories[]`), `MarketProduct` (+`videos[]`, `variantLabel`), `MarketProductVariant` (narx/stock har biriga), `MarketCartItem` (+`variantId`), `MarketOrder` (+`discount`/`promoCode`/`settledAt`), `MarketOrderItem` (+`variantId`/`variantName`), `MarketWishlist`, `MarketReview` (+`media[]`), `MarketReviewReply` (cheksiz ichma-ich `parentId`), `MarketReviewLike`, `MarketBrandReview`, `MarketProductQuestion`, `MarketProductAnswer`, `MarketNotification`, `MarketPromoCode`
**Nexus:** `NexusPost` (+`marketProductId` — shoppable), `NexusLike`, `NexusSave`, `NexusComment` (`parentId`), `NexusFollow`, `NexusNotification`, `NexusStory` (24 soat), `NexusStoryView`, `NexusConversation` (1:1 DM), `NexusMessage`, `NexusVideo` (LONG/SHORT + orientation/tags/descImages/isMature/priceZij/prevVideoId series), `NexusVideoView`, `NexusVideoLike`, `NexusVideoComment`, `NexusVideoPurchase`, `NexusWatchLater`
**Moderatsiya:** `ModerationFlag` (Market+Nexus yagona — eski `MarketReport` o'rnida; AI verdict + shikoyat soni + status). `hidden` boolean qo'shilgan: `MarketReview`/`MarketReviewReply`/`MarketProductQuestion`/`MarketProductAnswer`/`NexusPost`/`NexusComment` (mahsulot uchun mavjud `isActive`)
**Pay:** `ZijWallet`, `ZijTransaction`, `ZijSafe`
**Enum'lar:** `TeamRole`, `JoinRequestStatus`, `UserRole`, `TournamentStatus`, `MarketPaymentMethod`, `MarketOrderStatus`, `MarketNotifType` (+ORDER_UPDATE/QUESTION/ANSWER), `MarketPromoType`, `ModerationStatus` (PENDING/KEPT/HIDDEN/AUTO_HIDDEN), `ModerationVerdict` (OK/REVIEW/BLOCK), `NexusNotifType` (LIKE/COMMENT/FOLLOW/REPLY), `NexusStoryMediaType` (IMAGE/VIDEO), `NexusVideoKind` (LONG/SHORT), `NexusVideoOrientation` (HORIZONTAL/VERTICAL), `ZijTransactionType` (+REFUND/SALE)

> Eslatma: Nexus'ning **core feed**i (post/like/izoh/follow) real DB'da. Qolgan komponentlar (stories/live/music/...) hali mock. "coins" (`nx-gifts.tsx`) — tizim valyutasi emas, demo `useState` (UZS da).

## Module Status

| Modul | Marshrut | Backend | Holat | Izoh |
|---|---|---|---|---|
| **Humo ID** | `/id`, `/id/edit`, `/id/[username]`, `/id/verify` | `api/user/*` to'liq | ✅ Tayyor | Profil, edit (642 qator), onboarding, avatar/cover upload, account delete |
| **Esport** | `/esport`, `/teams`, `/players`, `/tournaments`, `/esport/admin`, `/history` | `api/teams/*`, `api/tournaments/*` + repositories | ✅ Tayyor | Role-based admin, jamoa invite/join, turnir registratsiya |
| **Market** | `/market`, `/catalog`, `/cart`, `/orders`, `/wishlist`, `/product/[slug]`(+`/edit`), `/product/add`, `/brand/manage`, `/brand/[slug]`, `/profile`, `/profile/activity`, `/notifications`, `/dashboard`, `/u/[username]` | `api/market/*` to'liq | ✅ Tayyor (test) | Sharh tahrir/o'chirish, pagination, **variantlar** (rang/o'lcham, narx+stock), **Q&A**, **buyurtma kuzatuvi** (stepper+sotuvchi boshqaruvi), bekor→Zij qaytarish, oversell guard (atomik), **promokod** (founder), **sotuvchi dashboard**, **payout** (escrow 5%), shikoyat/flag, ommaviy profil. **Real launch'ga qoldi:** to'lov gateway, KYC, yetkazish |
| **Pay (ALKH)** | `/pay` | `api/pay/*` (deposit/transfer/safe/wallet) | 🟡 Funksional | Deposit **test rejim**, withdraw o'chirilgan. ⚠️ `alkh-pay-content.tsx` `TX_META` har bir `ZijTransactionType`ni qamrashi shart (fallback bor) |
| **Nexus** | `/nexus` (SPA), `/nexus/u/[username]`, `/nexus/tag/[tag]` | `api/nexus/*` (…calls/live/videos/tracks/channels) | ✅ Real | Feed + profil + qidiruv/kashf + bildirishnoma + stories + DM + **Video** (real MP4 yuklash/player/like/izoh/obuna) + **1:1 Chaqiruv** (WebRTC + Pusher + TURN + effektlar) + **Guruh chaqiruv** (LiveKit) + **Jonli efir** (LiveKit ingest) + Kanallar/Guruhlar (channels API). Mock modallar (40+) 2026-08-02 tozalandi |
| **AI** | `/ai` (iframe), `api/ai/*` (Gemini) | `lib/ai.ts`, `lib/ai-moderate.ts` (kontent moderatsiya), `lib/moderation.ts` | 🟢 Real | Market AI: listing/NL qidiruv/chat. **AI moderatsiya:** pre-publish + reaktiv (shikoyat) + avto-yashirish. ⚠️ `lib/ai-moderator.ts` boshqa narsa (esport o'yin evristikasi) |
| **Admin** | `/admin/moderation` | `api/admin/moderation/*` | 🟢 Real | Founder-gated moderatsiya navbati (`lib/admin-guard.ts` + `lib/founders.ts`). AI verdict + shikoyatlar; Saqlash/Yashirish |
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
CLOUDFLARE_ACCOUNT_ID     # Cloudflare Stream (eSport jonli efir) — account id
CLOUDFLARE_STREAM_TOKEN   # Stream:Edit ruxsatli API token (live input yaratish/status/o'chirish)
CLOUDFLARE_STREAM_CODE    # customer-{CODE}.cloudflarestream.com (iframe playback)
GEMINI_API_KEY            # Gemini (AI funksiyalar: listing/qidiruv/chat) — Google AI Studio, paid prepay
GEMINI_MODEL              # ixtiyoriy — default "gemini-2.5-flash-lite" (lib/ai.ts)
LOCATION_ENCRYPTION_KEY   # ixtiyoriy — AES-256-GCM kaliti (crypto.ts); bo'lmasa NEXTAUTH_SECRET dan derive
VERCEL_OIDC_TOKEN         # Vercel tomonidan beriladi
```

## Current TODO (2026-08-02 audit'dan keyin)

- [x] **Nexus mock tozalash** — 40+ dead komponent o'chirildi (F1+F2, commit 6f89da0)
- [x] **Nexus Live video transport** — LiveKit ingest ulanadi (F3, commit 04ff712)
- [x] **To'lov adapter skeleton** — Payme/Click/Stripe fayllar + webhook route'lar (F4, commit 7ede82c). MChJ kelgach faqat env qo'shiladi.
- [x] **SMS bildirishnoma + yetkazib berish** — Eskiz.uz + delivery quote (F5, commit c3f05a1)
- [x] **Achievement tizimi** — cross-modul yutuqlar (F6, commit ed26872)
- [x] **KYC L2 skeleton** — 10M UZS / 1000 USD chegara + admin approve (F7, commit 677f20c)
- [ ] **MChJ ochilishi** — ~1 oy kutmoqda. Ochilgach: PAYME_MERCHANT_ID/KEY + CLICK_MERCHANT_ID/SECRET + ESKIZ_EMAIL/PASSWORD env'ga qo'yish → real ishlaydi.
- [ ] **Cloudflare Stream kalitlari** — eSport jonli efir uchun (hozir stub).
- [ ] **Yandex Delivery API** — hozircha lokal tarifa (Toshkent 20k UZS, viloyat 40k).

## Muhim qoidalar

- **EMOJI ISHLATMA.** UI'da hech qachon emoji yo'q — faqat **Lucide ikonkalar**. (Foydalanuvchi qat'iy talabi; diniy sezgirlik ham bor — masalan cho'chqa ikonkasi ishlatilmaydi.)
- **Auth FAQAT Google.** Telegram orqali ro'yxatdan o'tish For Humo'da QO'LLANILMAYDI va qo'shilmaydi (u faqat IT-hamkor Sevinch Sweets'ga tegishli edi). `auth.ts`ga boshqa provider qo'shma. IT-hamkorlar taklif asosida partner API (`api/partner/*`) orqali ulanadi. `.env.local`dan `TELEGRAM_CLIENT_*` olib tashlangan.
- **Bosh sahifa jonli fon:** `src/components/home/live-background.tsx` — canvas yulduz turkumi + aurora (Framer Motion). Theme-aware (`useTheme`), `prefers-reduced-motion`da statik, tab yashirinsa pauza, DPR≤2. `HomeContent` ichida `fixed inset-0 z-0`, kontent `z-10`.
- **i18n:** har qanday yangi UI matni `messages/uz.json`, `ru.json`, `en.json` ga **uchalasiga** qo'shilishi shart; `useTranslations()` ishlat.
- **Locale Link gotcha:** `import { Link } from "@/i18n/routing"` locale'ni **avtomatik** qo'shadi. `href="/market"` yoz, `/${locale}/market` **EMAS** (ikki marta chiqadi: `/uz/uz/...`). `useRouter` ham `@/i18n/routing` dan import qilinadi.
- **Modul shell pattern:** Har modul `src/app/[locale]/<modul>/layout.tsx` da `fixed inset-0 z-[100]` + o'z navbari bilan o'raladi (global header/footer'ni yopadi). Mavjud: eSport, ID, AI, Pay, Market, Nexus. ⚠️ Overlay foni **qattiq (opaque)** bo'lishi shart — yarim-shaffof bo'lsa global footer kunduzi sizib chiqadi (Market'da `from-white via-green-50 to-emerald-50`). Market'ning o'z footer'i `market-footer.tsx`.
- **Prisma client:** doimo `src/lib/prisma.ts` singleton orqali import qil (yangi `PrismaClient()` yaratma).
- **eSport jonli efir:** `src/lib/esport-stream.ts` — Cloudflare Stream Live (RTMP→LL-HLS, `recording.mode="off"` = yozuvsiz). Kalit (`CLOUDFLARE_*`) yo'q bo'lsa **stub** (test). `streamKey`/`ingestUrl` faqat `/api/esport/broadcasts/[id]/ingest` (admin/ega) orqali; public/list GET'da HECH QACHON qaytmaydi. eSport efiri yozuvsiz; abadiy yozuv kerak bo'lsa Nexus Live (`nexusLiveId`). `EsBroadcast.source` = EXTERNAL (YouTube/Twitch embed) | CLOUDFLARE.
- **Profil tahriri:** `UserProfile.profileEditedAt` — foydalanuvchi profilini **14 kunda 1 marta** tahrir qila oladi (rate-limit).
- **Manzil:** `location`/`locationIv` shifrlangan — `src/lib/crypto.ts` siz to'g'ridan o'qib/yozib bo'lmaydi.
- **Tailwind v4 dark mode (KRITIK):** v4 da config fayli yo'q — `dark:` default'da OS media query'ga bog'lanadi, `.dark` class'ga **emas**. `src/app/globals.css` da `@custom-variant dark (&:where(.dark, .dark *));` bo'lishi SHART. Yo'qolsa dark-mode toggle butun ilovada ishlamaydi.
- **Founder hisoblar:** `FOUNDER_HUMO_IDS = ["UZ6889574","UZ3549920"]`, `FOUNDER_USERNAMES = ["abduvoris","aaa"]` (`api/market/brands/route.ts`) — avto-verified + 1-brend bepul. Brend narxi: 1-bepul, 2=25, 3=50, 4=100, 5+=200 Ƶ (atomik tranzaksiya).
- **Media yuklash:** rasm/video → `MediaUploader` (`isVideoUrl()` export qiladi), rasmni crop → `MarketCropModal` (`aspect`+`outW` prop; 1:1 mahsulot, 3:1 cover), device rasm → `ImageUploader`. Hammasi `api/market/upload` (Vercel Blob). ⚠️ Vercel serverless yuklash limiti ~4.5MB — katta video uchun client-side blob upload kerak.
- **LocationPicker:** `accent="green"` (Market) yoki `"blue"` (onboarding) prop bilan modul rangiga moslanadi. Til/xarita kabi umumiy komponentlar modul rangiga moslanishi kerak (ko'k = asosiy sayt rangi, Market = yashil).
- **Reply/like ajratish:** API javoblarda `isMine` (o'zimnikimi) + `isAuthor` (mahsulot brend egasimi = sotuvchi) hisoblanadi — sotuvchi javoblari "Sotuvchi" badge + boshqa fon bilan ko'rsatiladi.
- **Sotuvchi payout (escrow):** `src/lib/market-settle.ts` → `settleOrder()`. Checkout xaridor Zij'ini **ushlaydi**; buyurtma **DELIVERED** bo'lganda sotuvchiga (komissiya `MARKET_COMMISSION=5%` ayirib) Zij `SALE` tranzaksiyasi bilan o'tadi. `MarketOrder.settledAt` ikki marta to'lashni bloklaydi. Faqat ZIJ buyurtmalar uchun. `accept` + `status(DELIVERED)` route'larida chaqiriladi.
- **Bekor qilish:** `status` route CANCELLED'da atomik — stock tiklash + `sold` kamaytirish + (ZIJ bo'lsa) Zij `REFUND`. Checkout **interaktiv tranzaksiya** + shartli `updateMany(where stock>=qty)` bilan oversell oldini oladi.
- **Variantlar:** `MarketProductVariant` (narx/stock har biriga). Variant bo'lsa `MarketProduct.price`=eng arzon, `stock`=yig'indi. Savat `(profil,mahsulot,variant)` bo'yicha; cart PATCH/DELETE **item.id** bilan (productId emas).
- **Pay TX_META:** `alkh-pay-content.tsx` `TX_META` **har bir** `ZijTransactionType`ni qamrashi shart — aks holda tranzaksiya ro'yxati crash bo'ladi (fallback qo'shilgan, lekin yangi tip qo'shsang META'ga ham qo'sh).
- **Katta media upload:** `@vercel/blob/client` `upload()` + `/api/market/upload/client-token` (handleUpload) — 4.5MB serverless limitini chetlab o'tadi, rasm+video. Nexus post media va Market video shu yo'l bilan.
- **Promokod:** `MarketPromoCode` (PERCENT/FIXED), founder yaratadi (`api/market/promo`), checkout'da `validatePromo` (`src/lib/market-promo.ts`) qo'llaydi + `usedCount++` atomik.
- **Yangi post (+ composer, REAL):** `nx-create-post.tsx` — postlar chindan yaratiladi. `NexusPost` += `privacy` (PUBLIC/FOLLOWERS/PRIVATE enum `NexusPostPrivacy`), `location`, `pollOptions[]`, `pollEndsAt` + `NexusPollVote` (postId+profileId unique, ovoz o'zgartirish mumkin muddatgacha). POST: poll 2-4 variant + savol majburiy, `pollDurationHours` 24/72/168. GET: maxfiylik filtri (`where.AND=[{OR:[PUBLIC, o'zimniki, FOLLOWERS&&kuzataman]}]`) + poll boyitish (`pollVotes[]` groupBy, `myVote`). `.../[id]/vote` POST. PostCard: poll UI (% bar, ovozdan keyin/tugagach natija), location/privacy belgilari. Composer media: rasm 9 tagacha / video 1 ta (blob client). Teglar trending'dan (`api/nexus/discover`), tanlanganlari matnga `#tag` qo'shiladi. Yangi post `window` `nexus:post-created` eventi bilan lentaga darhol tushadi (`NxSocialFeed` listener). "Tadbir" turi olib tashlandi (backend yo'q edi).
- **Nexus×Market (shoppable):** `NexusPost.marketProductId` → feed API postni mahsulot ma'lumoti bilan boyitadi → post kartasida "Sotib olish" → `/market/product/[slug]`.
- **Nexus profil:** `/nexus/u/[username]` (real ulashiladigan route) → `NexusProfile`. API: `api/nexus/profile` (stats+isFollowing+isMe), `api/nexus/follows` (followers/following ro'yxati). Postlar uchun `api/nexus/posts?author=` (mavjud). Feed PostCard muallifi → profilga Link. O'z profil (`ProfileView`, Profil tab) sonlari shu API'dan real, "Ommaviy profil" havolasi bor. ⚠️ Profil route SPA shell **tashqarisida** — `NxSocialFeed` `useNxPlayer()` ga tayanadi, shuning uchun `NexusProfile` `NxPlayerProvider`+`NxShare` bilan o'ralgan. `NxSocialFeed`ga `authorUsername`/`tag` prop berilsa: `?author=`/`?tag=` yuklaydi, composer+tablar yashirin.
- **Nexus qidiruv/kashf:** `api/nexus/search?q=` (odamlar/post/hashtag mos), `api/nexus/discover` (trenddagi hashtaglar + tavsiya odamlar — so'nggi ~300/100 postdan, JS agregatsiya). `nx-search` (header overlay, `searchOpen`) + `nx-explore` (`exploreOpen`) real. Teg sahifa `/nexus/tag/[tag]` → `NexusTagFeed` (NexusProfile naqshi: `NxPlayerProvider`+header+`NxShare`). Post `#hashtag`lari bosiladigan → teg sahifa.
- **Nexus bildirishnoma:** `NexusNotification` (relation yo'q) + `lib/nexus-notify.ts` `nexusNotify()` (o'ziga emas, fail-safe). like/izoh/follow route'larida `after()` bilan (LIKE/COMMENT/REPLY/FOLLOW). API: `api/nexus/notifications` (ro'yxat+`unreadCount`), `.../read` (bitta/hammasi), `.../count` (badge). `nx-notifications` panel real; header `BellButton` o'qilmagan badge (`notifOpen` yopilganda + 60s'da yangilanadi). Bosish → actor profili.
- **Nexus stories:** `NexusStory` (24 soat `expiresAt`) + `NexusStoryView` (seen/ko'rganlar). API: `api/nexus/stories` (POST yaratish; GET muallif bo'yicha guruh, `expiresAt>now`, auditoriya **men+kuzatganlarim**), `.../[id]/view` (ko'rildi upsert), `.../[id]/viewers` (faqat ega), `.../[id]` DELETE. `nx-story-create` (blob upload rasm/video+caption), `nx-stories` qatori (halqa: ko'rilmagan rangli / ko'rilgan kulrang), `nx-stories-viewer` (segmentli progress — rasm 5s / video onEnded, tap nav, o'z storysida ko'rganlar+o'chirish). Qator va viewer alohida GET qiladi; `openStoriesViewer(groupIndex)`. Avto-o'chirish (cron) yo'q — faqat `expiresAt>now` filtri.
- **Chatlar↔Xabarlar birlashtirildi (Band 4):** ctx'ga `dmTarget` + `openDM(username)` qo'shildi. Ijtimoiy>Chatlar tabi endi `nx-chat-list.tsx` (inline suhbatlar ro'yxati — Xabarlar paneli bilan AYNAN bir xil `api/nexus/messages`); suhbatga bosilsa `openDM()` DM panelini o'sha threadga ochadi. Shell `MessagesWithBridge` ctx `dmTarget` ishlatadi (eski lokal state o'rniga); `?dm=` ko'prigi `openDM` chaqiradi.
- **Nexus DM:** `NexusConversation` (1:1, `user1Id<user2Id` normalizatsiya — `lib/nexus-dm.ts`) + `NexusMessage`. API: `api/nexus/messages` (GET ro'yxat / POST suhbat ochish-topish), `.../[id]` (GET xabarlar+o'qildi / POST yuborish), `.../count` (badge). `nx-messages` panel (ro'yxat/thread/composer/yangi-xabar foydalanuvchi qidiruv), **polling** (thread 4s, ro'yxat 6s — websocket yo'q). O'qilmagan **suhbat darajasida** (`hasUnread`). Header ikonka real badge. Profil "Xabar" → `/nexus?dm=username` → shell'dagi `MessagesWithBridge` `window.location.search` o'qib panelni ochadi (`consumedRef` bir martalik).
- **Nexus Video (real):** `NexusVideo` (LONG/SHORT, `videoUrl`/`thumbUrl` Vercel Blob — **transcoding'siz to'g'ridan MP4**) + `NexusVideoView/Like/Comment`. Kanal/obuna = `NexusFollow`. API: `api/nexus/videos` (POST yaratish+moderatsiya / GET `kind`/`sort`/`q`/`category`/`scope`), `.../[id]` (GET tafsilot+tavsiya, DELETE), `.../[id]/view` (dedup +views), `/like`, `/comments`. UI: `nx-video-create` (blob client upload + `<canvas>` thumbnail + duration), `nx-video-view.tsx` (real `VideoView` — `nx-views` re-export qiladi), `nx-video-player` (HAQIQIY `<video controls>`, `NxVideo.id` orqali yuklaydi). Moderation: `ModTargetType+=VIDEO`, `hideTarget` NexusVideo (`hidden`). **Shorts:** VideoView Shorts qatori → vertical `nx-shorts-player` real (`videoSrc=videoUrl` haqiqiy o'ynaydi, ko'rish+like API). Shorts izohlari REAL — `nx-shorts-player` ichki panel (video comments API, klaviatura handler input'da o'chadi). Player'da seriya navigatsiyasi: [id] GET `series.prev/next` (nextPart = `prevVideoId` bo'yicha eng eski farzand) → "Oldingi/Keyingi qism" tugmalari. Tavsiyalar ham 18+ filtrlangan. **Yuklovchi v2:** fayl tanlash `<label>` (JS `.click()` EMAS — ishonchli), progress %, hajm cheksiz (client-token 5TB), orientation avto-aniqlash (G/V) + qo'lda, muqova rasmi (custom > avto-kadr), dalil rasmlari (descImages), cheksiz sarlavha/tavsif, #teglar, 18+ toggle (isMature), narx Bepul/Pullik Ƶ (priceZij), series (prevVideoId — faqat o'z videosi, `scope=mine`). POST'da `kind` orientation'dan: VERTICAL→SHORT. **Bosqich 2 (sub-navbar):** VideoView yopishqoq sub-navbar — Barchasi/Kino/Musiqa/G.Video/V.Video/Bepul/Obuna/Mening videolarim. GET filtrlari: `kind` endi IXTIYORIY, `orientation`, `free=1` (priceZij=0), `scope=mine|following`, `isSaved` (watch-later holati). **18+:** `lib/nexus.ts isAdultBirthday()` (birthday yo'q = balog'atga yetmagan deb hisoblanadi) — list GET'da `isMature:false` filtr, [id] GET'da 403 (ega mustasno). `.../watch-later` POST toggle, `api/nexus/videos/library` GET (mine/watchLater/history — view route qayta ko'rishda createdAt yangilaydi). Vertikal video karta bosilganda shorts player ochiladi (ro'yxatning vertikal qismi bilan). Kartada narx `Ƶ`+`18+` badge, hover bookmark. **Bosqich 3 (monetizatsiya):** `locked` = pullik && ega emas && sotib olinmagan — list/[id]/library javoblarida `videoUrl: ""` (paywall bypass yopiq, MUHIM: yangi video o'qish joyi qo'shsang shu gate'ni takrorla). `.../purchase` POST — atomik $transaction: xaridor `PURCHASE` + avtor `SALE` (to'liq summa, komissiyasiz) + `NexusVideoPurchase`; mablag' yetmasa 402. Player `data.locked` → blur thumb + "Sotib olish — X Ƶ" (muvaffaqiyatda `loadDetail()` qayta yuklaydi). Qulflangan vertikal karta shorts emas, video player (paywall) ochadi.
- **Nexus Live (Faza 1 — backend):** `NexusLiveStream` (UPCOMING/LIVE/ENDED, privacy, peakViewers) + `NexusLiveMessage` (chat) + `NexusLiveViewer` (heartbeat — `lastSeenAt > now-30s` = onlayn). API: `api/nexus/live` (GET status=live|upcoming|ended / POST yaratish — bitta odamda bitta faol efir, eski LIVE avto-ENDED), `.../[id]` (GET+viewers / PATCH start|end / DELETE), `.../[id]/chat` (GET `?since=` polling / POST), `.../[id]/heartbeat` (POST ~10s, peakViewers yangilaydi). **Faza 2 (UI real):** `nx-live-view.tsx` (real LiveView — `nx-views` re-export; jonli/rejada/tugagan ro'yxatlar, kategoriya filtri, 20s polling), `nx-live-room.tsx` (tomoshabin xonasi — chat 3.5s polling `since` kursor bilan, heartbeat 10s, ega "Tugatish", status 15s tekshiriladi), `nx-go-live.tsx` REAL studio (getUserMedia kamera/mik + track.enabled toggle, POST create → LIVE, real timer/ko'ruvchi/chat, PATCH end → statistika; tracks yopilganda to'xtatiladi, stage almashganda `srcObject` qayta ulanadi). ⚠️ Video transport YO'Q — qaror: professional provayder (Cloudflare/LiveKit), foydalanuvchi "keyin" dedi (Faza 3 launch oldidan). Stream like endpointi ham yo'q.
- **Nexus Media (Faza 1 — audio real):** `NexusTrack` (MUSIC/PODCAST/AUDIOBOOK enum `NexusTrackKind`, plays, genre) + `NexusTrackPlay` (foydalanuvchi bo'yicha dedup) + `NexusTrackLike`. API: `api/nexus/tracks` (GET kind/sort=top|new/q/scope=mine|liked / POST + moderatsiya `TRACK` target), `.../[id]/play|like`, `[id]` DELETE. **Global audio pleyer allaqachon real edi** (`nx-player-ctx` `<audio>` + navbat/shuffle) — `NxTrack`ga `id?` qo'shildi, `countTrackPlay()` `_playAt`+avto-keyingida chaqiriladi. UI: `nx-track-create` (audio blob upload + muqova + davomiylik metadata), `nx-media-view.tsx` (real MediaView — `nx-views` re-export): Kino tab = `api/nexus/videos?category=kino` (real video pleyer), Musiqa/Podkast/Audiokitob = trek qatorlari (Top/Yangi/Sevimlilar, play → `playQueue`), Kitob = halol "tez kunda". ⚠️ Pleylist/albom modali (`nx-playlist`/`nx-albums`) hali mock.
- **Ijtimoiy/Profil tozalandi:** SocialView'da Kanallar/Guruhlar/Botlar tablari halol "tez kunda" holatda (soxta ro'yxatlar olib tashlandi; Postlar+Chatlar real). ProfileView statistikasi REAL: olingan layklar (`api/nexus/profile` stats `likes` qo'shildi — NexusLike count via post relation), hamyon `api/pay/wallet` balansidan (Ƶ), badge'lar real (verified=founder, humoId chip, emailVerified); soxta 2FA/toggle'lar o'rniga "Humo ID sozlamalari" → `/id` havolasi.
- **Nexus mock'dan chiqarildi (to'liq):** Asosiy tab = `NxStories` + `nx-home-rows.tsx` (real jonli/yangi video/yangi musiqa qatorlari, bo'sh qator yashirinadi) + `NxSocialFeed` (NxHero/NxFeed mock'lari interfeysdan olib tashlandi, fayllar repo'da turibdi lekin ishlatilmaydi). Sidebar to'liq qayta yozildi — faqat real manzillar (tablar, Kashfiyot/DM/Bildirishnoma, Saqlangan/Tarix/Obunalar/GoLive/Story, Pay/Market/ID havolalari, Chiqish); soxta badge va "Nexus Pro" promo yo'q. `NxSaved` REAL (saqlangan postlar `posts?scope=saved` + tarix tab — ctx `savedDefaultTab`); `NxSubscriptions` REAL (profil→username→follows API, unfollow). Profil tezkor tugmalari 6 ta realga qisqartirildi. Header avatari `nexus:navigate` CustomEvent bilan profil tabga o'tadi (shell listener). ⚠️ ~40 mock modal komponentlari shell'da mount qilingan, lekin ularga olib boruvchi tugmalar OLIB TASHLANGAN — interfeysdan kirib bo'lmaydi. Yangi trigger qo'shishdan oldin komponent realligini tekshir.
- **Nexus rate-limit:** `lib/nexus-rate.ts` `nexusRateLimited(profileId, kind)` — DB-asosli (oxirgi oynada yaratilgan yozuvlarni sanaydi, serverless-safe, fail-open). Barcha yaratish POST'larida: post(20/10daq), comment/videoComment(30/10daq), video/track(10/60daq), story(20/60daq), dm(60/10daq), live(6/60daq), liveChat(40/5daq). 429 + RATE_MSG qaytaradi.
- **Ijodkor bildirishnomalari (Band 2):** `NexusNotification` += `videoId/trackId/liveId`; `NexusNotifType` += `VIDEO_LIKE/VIDEO_COMMENT/TRACK_LIKE/PURCHASE/LIVE`. `lib/nexus-notify.ts` kengaytirildi + `nexusNotifyFollowers()` (jonli efir fan-out, 1000 cheklov). Chaqiruvchilar (`after()` bilan): video like/comments, track like, video purchase, live create (faqat darhol+PUBLIC). Notifications API video/track/live sarlavhasini boyitadi + `postId/videoId/trackId/liveId` qaytaradi; `nx-notifications` yangi tip ikon/rang/matn + `notifHref()` kontent permalinkiga link.
- **Username majburiy (Band 1):** Nexus darvozasi `humoId` + `username` talab qiladi; username yo'q → `nexus-username-gate.tsx` (inline tanlash, validatsiya, band tekshiruvi).
- **Video/trek/jonli permalink (Band 3):** `/nexus/v/[id]` (`nexus-video-permalink` — NxPlayerProvider + auto-openVideo + yopilganda /nexus), `/nexus/t/[id]` (`nexus-track-permalink` — trek kartasi + Tinglash/like/ulash, `tracks/[id]` GET qo'shildi), `/nexus/live/[id]` (`nexus-live-permalink` — NxLiveRoom, ctx talab qilmaydi). Deep-share: video/shorts ulashish endi `/nexus/v/[id]` URL beradi (`openShareSheet(title, url)`).
- **Post permalink:** `/nexus/p/[id]` (`nexus-post-page.tsx` — NxPlayerProvider+header+NxShare, `NxSocialFeed postId=` rejimi bitta postni real yuklaydi). `api/nexus/posts/[id]` GET qo'shildi (maxfiylik bilan: PRIVATE 403, FOLLOWERS faqat kuzatuvchi). `generateMetadata` real (matn snippet). **NxShare REAL:** Telegram/WhatsApp share URL, SMS/Email yoki `navigator.share`, clipboard copy — soxta `humo.uz/share/...` o'rniga haqiqiy permalink. `openShareSheet(title, url?)` ikkinchi argument oldi (url berilmasa `location.href`). PostCard "Ulash" → `/nexus/p/[id]`.
- **Nexus Humo ID darvozasi:** `[locale]/nexus/layout.tsx` server komponent — sessiya yo'q YOKI `humoId` yo'q bo'lsa Nexus o'rniga gate ekrani (Kirish / "Humo ID olish" → `/id`). Barcha `/nexus/*` routelar shu layout ostida. API'lar gate'lanmagan (sessiyali himoya o'zlarida bor).
- **Google rasm backfill:** `auth.ts signIn` da `image` null bo'lsa Google rasmi yoziladi (boshqalar sharh/postlarda ko'rishi uchun). Eski hisoblar uchun re-login kerak.
- **Verified (ko'k belgi):** `src/lib/nexus.ts isVerifiedProfile()` — hozircha founders.
- **AI (Gemini):** `src/lib/ai.ts` — REST wrapper (`aiText`/`aiJSON`/`aiVisionJSON`/`aiChatJSON`), 503/429 retry. Endpointlar: `api/ai/listing` (mahsulot tavsifi+vision), `api/ai/search` (NL→filtr→mahsulot), `api/ai/chat` (suhbat+tavsiya). Kalit yo'q bo'lsa 503 (`aiAvailable()`). ⚠️ **Model nomi eskiradi**: `gemini-2.0-flash` 2026'da retired (404) → `gemini-2.5-flash-lite`. Yangi model kerak bo'lsa: `GET .../v1beta/models?key=` bilan ro'yxatni tekshir, `GEMINI_MODEL` env bilan o'zgartir. UI: product-add/edit "AI bilan yozish", navbar ✨ → `/market/ai-search`, suzuvchi Bot → `/market/assistant`.
- **Nexus tavsiya algoritmi (rec-system, 4 bosqich):** `lib/nexus-rank.ts` (feed reytingi: yangilik decay + engagement + muallif/teg yaqinligi + semantik), `lib/nexus-interest.ts` (saqlanadigan qiziqish vektori `NexusInterest`, kunlik cron `/api/cron/interest-rebuild` 04:00), `lib/nexus-cf.ts` (collaborative filtering — umumiy-follow qo'shnilari → `recAuthors`), `lib/nexus-embed.ts` (semantik: `NexusPostEmbedding`/`NexusUserEmbedding` vector(768), raw SQL). Feed `tab=foryou` (default) shaxsiylashtirilgan. **To'liq fail-safe** — embedding/qiziqish yo'q bo'lsa xronologikka tushadi.
- **pgvector (4-bosqich):** Neon'da `CREATE EXTENSION vector` (scripts/setup-pgvector.mjs). Prisma vector turini bilmaydi → `Unsupported("vector(768)")` + barcha amallar **raw SQL** (`::vector` cast, `<=>` cosine, `AVG(vector)`). HNSW indeks. ⚠️ **Embedding model**: `text-embedding-004` RETIRED (404) → `gemini-embedding-001` + `outputDimensionality:768` (`lib/ai.ts aiEmbed`). Model eskirsa: `GET .../v1beta/models?key=` da `embedContent` qo'llovchilarni tekshir.
- **AI moderatsiya:** `lib/ai-moderate.ts` `moderateContent()` (Gemini vision, fail-open→`null`), `lib/moderation.ts` `applyModeration()`/`moderateOnCreate()`/`hideTarget()`. Tetik: **pre-publish** (yaratish route'larida Next 15 `after()` bilan — javobni kechiktirmaydi) + **reaktiv** (`api/market/report`, `api/nexus/report`). `BLOCK`+severity≥`AUTO_HIDE_SEVERITY`(0.8) → avto-yashirish (mahsulot `isActive=false`, qolgani `hidden=true`); aks holda `ModerationFlag` PENDING. ⚠️ Yangi kontent o'qish so'rovi `hidden:false` (mahsulot `isActive:true`) bilan filtrlanishi SHART. Admin navbat: `/admin/moderation` (founder-gated, `lib/admin-guard.ts`). `lib/founders.ts` — yagona founder ro'yxati (`nexus.ts` shundan oladi).

## Ish uslubi (workflow) — MUHIM

- **Har o'zgarishdan keyin avtomatik:** `git add -A && git commit -m "..."` → `git push origin main` → `npx vercel deploy --prod`. Foydalanuvchi har safar so'ramaydi — bu doimiy talab.
- **TS tekshiruvi:** deploy oldidan `npx tsc --noEmit` bilan xatolarni tekshir.
- **DB o'zgarishi:** `prisma migrate dev` **interaktiv** (bu muhitda ishlamaydi). O'rniga:
  `DATABASE_URL="<.env.local dagi URL>" npx prisma db push` ishlat. Unique constraint o'zgarsa `--accept-data-loss` kerak bo'ladi (test rejimda xavfsiz).
- **Loyiha yo'li (YANGILANDI):** loyiha OneDrive'dan **`C:\Users\abduv\Desktop\ForHumo.uz`** ga ko'chirildi (OneDrive muammolari sababli). Bash tool'da `cd "/c/Users/abduv/Desktop/ForHumo.uz" && ...` (kirill yo'q — ishonchli). PowerShell'da `Set-Location "C:\Users\abduv\Desktop\ForHumo.uz";`.
- **Test rejim (vaqtincha):** Pay (Zij pul), Market (mahsulotlar), Nexus (kontent) — **mock** ma'lumot. Qolgan hamma narsa (auth, DB, API, deploy) **real**. Mock'ni faqat keyin real qilamiz; boshqa hech narsa o'zgarmaydi.
- **Valyuta:** real pul — UZS (so'm) / USD ($). `Ƶ`/"Zij" ISHLATILMAYDI (huquqiy sabab). Doim `src/lib/money.ts formatMoney()`. Balanslar 2026-06-13 da 0ga tushirildi (`scripts/reset-wallets.mjs`).
- **Mock rasm:** mahsulot/kontent rasmi kerak bo'lsa `https://picsum.photos/seed/<slug>/600/600`.
- **Token tejash:** keraksiz fayllarni qayta o'qima; faqat kerakli qismni o'qi. Katta `.json`/`.claude.json` ni to'liq o'qimasdan `python3`/`grep` bilan tahlil qil.
- **Glob/grep timeout:** loyiha OneDrive'da + `node_modules` katta — `**/CLAUDE.md` kabi keng Glob timeout bo'ladi. Aniq yo'l ber (`prisma/`, `src/...`) yoki Grep'da `path` ko'rsat.
- **Docs-only o'zgarish:** faqat CLAUDE.md/markdown o'zgarsa commit+push yetadi, `vercel deploy` shart emas (build chiqimiga ta'sir qilmaydi).
- **⚠️ Vercel Hobby reja — cron faqat KUNLIK:** `vercel.json` `crons` da soatlik (`0 * * * *`) yoki tez-tez jadval butun deploy'ni JIM buzadi (GitHub-integratsiya deploy yaratmaydi, xato ko'rinmaydi). Faqat kunlik (`0 3 * * *`) ishlaydi. Deploy yo'qolsa: `npx vercel deploy --prod --yes` bilan aniq xatoni ko'r, yoki `list_deployments` MCP bilan oxirgi deploy holatini tekshir. Auto-deploy uzilsa CLI bilan qo'lda deploy qilinadi.
