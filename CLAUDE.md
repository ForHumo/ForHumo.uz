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
| **Nexus** | `/nexus` (SPA), `/nexus/u/[username]`, `/nexus/tag/[tag]` | `api/nexus/*` (…stories/messages/videos/report) | 🟡 Core real | Feed + profil + qidiruv/kashf + bildirishnoma + stories + DM + **Video** (uzun + Shorts: real MP4 yuklash/player/ko'rish/like/izoh/obuna) real. Qolgan ~44 komponent (live/media) mock |
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
GEMINI_API_KEY            # Gemini (AI funksiyalar: listing/qidiruv/chat) — Google AI Studio, paid prepay
GEMINI_MODEL              # ixtiyoriy — default "gemini-2.5-flash-lite" (lib/ai.ts)
LOCATION_ENCRYPTION_KEY   # ixtiyoriy — AES-256-GCM kaliti (crypto.ts); bo'lmasa NEXTAUTH_SECRET dan derive
VERCEL_OIDC_TOKEN         # Vercel tomonidan beriladi
```

## Current TODO (koddan kuzatilgan, dalilga asoslangan)

- [ ] **Pay'ni real rejimga o'tkazish** — `ZijTransactionType.DEPOSIT` test rejimda, `WITHDRAW` o'chirilgan. Haqiqiy to'lov integratsiyasi kerak.
- [ ] **KYC level 2** — `UserProfile.level == 2` (biometrik) `schema.prisma` da "future" deb belgilangan, implementatsiya yo'q.
- [ ] **Nexus N4+** — core feed real; stories/live/music/spaces/... hali mock (DB/API yo'q).
- [ ] **Market go-live** — to'lov gateway (Click/Payme), KYC, yetkazish/logistika; naqd/karta buyurtmada komissiya ushlanmaydi.
- [ ] **`.env.example` qo'shish** — yangi ishchilar uchun namuna fayl yo'q.

## Muhim qoidalar

- **EMOJI ISHLATMA.** UI'da hech qachon emoji yo'q — faqat **Lucide ikonkalar**. (Foydalanuvchi qat'iy talabi; diniy sezgirlik ham bor — masalan cho'chqa ikonkasi ishlatilmaydi.)
- **Auth FAQAT Google.** Telegram orqali ro'yxatdan o'tish For Humo'da QO'LLANILMAYDI va qo'shilmaydi (u faqat IT-hamkor Sevinch Sweets'ga tegishli edi). `auth.ts`ga boshqa provider qo'shma. IT-hamkorlar taklif asosida partner API (`api/partner/*`) orqali ulanadi. `.env.local`dan `TELEGRAM_CLIENT_*` olib tashlangan.
- **Bosh sahifa jonli fon:** `src/components/home/live-background.tsx` — canvas yulduz turkumi + aurora (Framer Motion). Theme-aware (`useTheme`), `prefers-reduced-motion`da statik, tab yashirinsa pauza, DPR≤2. `HomeContent` ichida `fixed inset-0 z-0`, kontent `z-10`.
- **i18n:** har qanday yangi UI matni `messages/uz.json`, `ru.json`, `en.json` ga **uchalasiga** qo'shilishi shart; `useTranslations()` ishlat.
- **Locale Link gotcha:** `import { Link } from "@/i18n/routing"` locale'ni **avtomatik** qo'shadi. `href="/market"` yoz, `/${locale}/market` **EMAS** (ikki marta chiqadi: `/uz/uz/...`). `useRouter` ham `@/i18n/routing` dan import qilinadi.
- **Modul shell pattern:** Har modul `src/app/[locale]/<modul>/layout.tsx` da `fixed inset-0 z-[100]` + o'z navbari bilan o'raladi (global header/footer'ni yopadi). Mavjud: eSport, ID, AI, Pay, Market, Nexus. ⚠️ Overlay foni **qattiq (opaque)** bo'lishi shart — yarim-shaffof bo'lsa global footer kunduzi sizib chiqadi (Market'da `from-white via-green-50 to-emerald-50`). Market'ning o'z footer'i `market-footer.tsx`.
- **Prisma client:** doimo `src/lib/prisma.ts` singleton orqali import qil (yangi `PrismaClient()` yaratma).
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
- **Nexus×Market (shoppable):** `NexusPost.marketProductId` → feed API postni mahsulot ma'lumoti bilan boyitadi → post kartasida "Sotib olish" → `/market/product/[slug]`.
- **Nexus profil:** `/nexus/u/[username]` (real ulashiladigan route) → `NexusProfile`. API: `api/nexus/profile` (stats+isFollowing+isMe), `api/nexus/follows` (followers/following ro'yxati). Postlar uchun `api/nexus/posts?author=` (mavjud). Feed PostCard muallifi → profilga Link. O'z profil (`ProfileView`, Profil tab) sonlari shu API'dan real, "Ommaviy profil" havolasi bor. ⚠️ Profil route SPA shell **tashqarisida** — `NxSocialFeed` `useNxPlayer()` ga tayanadi, shuning uchun `NexusProfile` `NxPlayerProvider`+`NxShare` bilan o'ralgan. `NxSocialFeed`ga `authorUsername`/`tag` prop berilsa: `?author=`/`?tag=` yuklaydi, composer+tablar yashirin.
- **Nexus qidiruv/kashf:** `api/nexus/search?q=` (odamlar/post/hashtag mos), `api/nexus/discover` (trenddagi hashtaglar + tavsiya odamlar — so'nggi ~300/100 postdan, JS agregatsiya). `nx-search` (header overlay, `searchOpen`) + `nx-explore` (`exploreOpen`) real. Teg sahifa `/nexus/tag/[tag]` → `NexusTagFeed` (NexusProfile naqshi: `NxPlayerProvider`+header+`NxShare`). Post `#hashtag`lari bosiladigan → teg sahifa.
- **Nexus bildirishnoma:** `NexusNotification` (relation yo'q) + `lib/nexus-notify.ts` `nexusNotify()` (o'ziga emas, fail-safe). like/izoh/follow route'larida `after()` bilan (LIKE/COMMENT/REPLY/FOLLOW). API: `api/nexus/notifications` (ro'yxat+`unreadCount`), `.../read` (bitta/hammasi), `.../count` (badge). `nx-notifications` panel real; header `BellButton` o'qilmagan badge (`notifOpen` yopilganda + 60s'da yangilanadi). Bosish → actor profili.
- **Nexus stories:** `NexusStory` (24 soat `expiresAt`) + `NexusStoryView` (seen/ko'rganlar). API: `api/nexus/stories` (POST yaratish; GET muallif bo'yicha guruh, `expiresAt>now`, auditoriya **men+kuzatganlarim**), `.../[id]/view` (ko'rildi upsert), `.../[id]/viewers` (faqat ega), `.../[id]` DELETE. `nx-story-create` (blob upload rasm/video+caption), `nx-stories` qatori (halqa: ko'rilmagan rangli / ko'rilgan kulrang), `nx-stories-viewer` (segmentli progress — rasm 5s / video onEnded, tap nav, o'z storysida ko'rganlar+o'chirish). Qator va viewer alohida GET qiladi; `openStoriesViewer(groupIndex)`. Avto-o'chirish (cron) yo'q — faqat `expiresAt>now` filtri.
- **Nexus DM:** `NexusConversation` (1:1, `user1Id<user2Id` normalizatsiya — `lib/nexus-dm.ts`) + `NexusMessage`. API: `api/nexus/messages` (GET ro'yxat / POST suhbat ochish-topish), `.../[id]` (GET xabarlar+o'qildi / POST yuborish), `.../count` (badge). `nx-messages` panel (ro'yxat/thread/composer/yangi-xabar foydalanuvchi qidiruv), **polling** (thread 4s, ro'yxat 6s — websocket yo'q). O'qilmagan **suhbat darajasida** (`hasUnread`). Header ikonka real badge. Profil "Xabar" → `/nexus?dm=username` → shell'dagi `MessagesWithBridge` `window.location.search` o'qib panelni ochadi (`consumedRef` bir martalik).
- **Nexus Video (real):** `NexusVideo` (LONG/SHORT, `videoUrl`/`thumbUrl` Vercel Blob — **transcoding'siz to'g'ridan MP4**) + `NexusVideoView/Like/Comment`. Kanal/obuna = `NexusFollow`. API: `api/nexus/videos` (POST yaratish+moderatsiya / GET `kind`/`sort`/`q`/`category`/`scope`), `.../[id]` (GET tafsilot+tavsiya, DELETE), `.../[id]/view` (dedup +views), `/like`, `/comments`. UI: `nx-video-create` (blob client upload + `<canvas>` thumbnail + duration), `nx-video-view.tsx` (real `VideoView` — `nx-views` re-export qiladi), `nx-video-player` (HAQIQIY `<video controls>`, `NxVideo.id` orqali yuklaydi). Moderation: `ModTargetType+=VIDEO`, `hideTarget` NexusVideo (`hidden`). **Shorts:** VideoView Shorts qatori → vertical `nx-shorts-player` real (`videoSrc=videoUrl` haqiqiy o'ynaydi, ko'rish+like API). Shorts izohlari REAL — `nx-shorts-player` ichki panel (video comments API, klaviatura handler input'da o'chadi). Player'da seriya navigatsiyasi: [id] GET `series.prev/next` (nextPart = `prevVideoId` bo'yicha eng eski farzand) → "Oldingi/Keyingi qism" tugmalari. Tavsiyalar ham 18+ filtrlangan. **Yuklovchi v2:** fayl tanlash `<label>` (JS `.click()` EMAS — ishonchli), progress %, hajm cheksiz (client-token 5TB), orientation avto-aniqlash (G/V) + qo'lda, muqova rasmi (custom > avto-kadr), dalil rasmlari (descImages), cheksiz sarlavha/tavsif, #teglar, 18+ toggle (isMature), narx Bepul/Pullik Ƶ (priceZij), series (prevVideoId — faqat o'z videosi, `scope=mine`). POST'da `kind` orientation'dan: VERTICAL→SHORT. **Bosqich 2 (sub-navbar):** VideoView yopishqoq sub-navbar — Barchasi/Kino/Musiqa/G.Video/V.Video/Bepul/Obuna/Mening videolarim. GET filtrlari: `kind` endi IXTIYORIY, `orientation`, `free=1` (priceZij=0), `scope=mine|following`, `isSaved` (watch-later holati). **18+:** `lib/nexus.ts isAdultBirthday()` (birthday yo'q = balog'atga yetmagan deb hisoblanadi) — list GET'da `isMature:false` filtr, [id] GET'da 403 (ega mustasno). `.../watch-later` POST toggle, `api/nexus/videos/library` GET (mine/watchLater/history — view route qayta ko'rishda createdAt yangilaydi). Vertikal video karta bosilganda shorts player ochiladi (ro'yxatning vertikal qismi bilan). Kartada narx `Ƶ`+`18+` badge, hover bookmark. **Bosqich 3 (monetizatsiya):** `locked` = pullik && ega emas && sotib olinmagan — list/[id]/library javoblarida `videoUrl: ""` (paywall bypass yopiq, MUHIM: yangi video o'qish joyi qo'shsang shu gate'ni takrorla). `.../purchase` POST — atomik $transaction: xaridor `PURCHASE` + avtor `SALE` (to'liq summa, komissiyasiz) + `NexusVideoPurchase`; mablag' yetmasa 402. Player `data.locked` → blur thumb + "Sotib olish — X Ƶ" (muvaffaqiyatda `loadDetail()` qayta yuklaydi). Qulflangan vertikal karta shorts emas, video player (paywall) ochadi.
- **Nexus Humo ID darvozasi:** `[locale]/nexus/layout.tsx` server komponent — sessiya yo'q YOKI `humoId` yo'q bo'lsa Nexus o'rniga gate ekrani (Kirish / "Humo ID olish" → `/id`). Barcha `/nexus/*` routelar shu layout ostida. API'lar gate'lanmagan (sessiyali himoya o'zlarida bor).
- **Google rasm backfill:** `auth.ts signIn` da `image` null bo'lsa Google rasmi yoziladi (boshqalar sharh/postlarda ko'rishi uchun). Eski hisoblar uchun re-login kerak.
- **Verified (ko'k belgi):** `src/lib/nexus.ts isVerifiedProfile()` — hozircha founders.
- **AI (Gemini):** `src/lib/ai.ts` — REST wrapper (`aiText`/`aiJSON`/`aiVisionJSON`/`aiChatJSON`), 503/429 retry. Endpointlar: `api/ai/listing` (mahsulot tavsifi+vision), `api/ai/search` (NL→filtr→mahsulot), `api/ai/chat` (suhbat+tavsiya). Kalit yo'q bo'lsa 503 (`aiAvailable()`). ⚠️ **Model nomi eskiradi**: `gemini-2.0-flash` 2026'da retired (404) → `gemini-2.5-flash-lite`. Yangi model kerak bo'lsa: `GET .../v1beta/models?key=` bilan ro'yxatni tekshir, `GEMINI_MODEL` env bilan o'zgartir. UI: product-add/edit "AI bilan yozish", navbar ✨ → `/market/ai-search`, suzuvchi Bot → `/market/assistant`.
- **AI moderatsiya:** `lib/ai-moderate.ts` `moderateContent()` (Gemini vision, fail-open→`null`), `lib/moderation.ts` `applyModeration()`/`moderateOnCreate()`/`hideTarget()`. Tetik: **pre-publish** (yaratish route'larida Next 15 `after()` bilan — javobni kechiktirmaydi) + **reaktiv** (`api/market/report`, `api/nexus/report`). `BLOCK`+severity≥`AUTO_HIDE_SEVERITY`(0.8) → avto-yashirish (mahsulot `isActive=false`, qolgani `hidden=true`); aks holda `ModerationFlag` PENDING. ⚠️ Yangi kontent o'qish so'rovi `hidden:false` (mahsulot `isActive:true`) bilan filtrlanishi SHART. Admin navbat: `/admin/moderation` (founder-gated, `lib/admin-guard.ts`). `lib/founders.ts` — yagona founder ro'yxati (`nexus.ts` shundan oladi).

## Ish uslubi (workflow) — MUHIM

- **Har o'zgarishdan keyin avtomatik:** `git add -A && git commit -m "..."` → `git push origin main` → `npx vercel deploy --prod`. Foydalanuvchi har safar so'ramaydi — bu doimiy talab.
- **TS tekshiruvi:** deploy oldidan `npx tsc --noEmit` bilan xatolarni tekshir.
- **DB o'zgarishi:** `prisma migrate dev` **interaktiv** (bu muhitda ishlamaydi). O'rniga:
  `DATABASE_URL="<.env.local dagi URL>" npx prisma db push` ishlat. Unique constraint o'zgarsa `--accept-data-loss` kerak bo'ladi (test rejimda xavfsiz).
- **PowerShell:** ish papkasi loyiha emas (uy papkasi) — buyruq oldidan `Set-Location "C:\Users\abduv\OneDrive\Рабочий стол\ForHumo.uz";` qo'sh. (`tsc`, `prisma`, `vercel` shu tarzda ishga tushiriladi.) Bash tool'da esa `cd "..." && ...` ishlaydi.
- **Test rejim (vaqtincha):** Pay (Zij pul), Market (mahsulotlar), Nexus (kontent) — **mock** ma'lumot. Qolgan hamma narsa (auth, DB, API, deploy) **real**. Mock'ni faqat keyin real qilamiz; boshqa hech narsa o'zgarmaydi.
- **Zij simvoli:** `Ƶ` (Al-Xorazmiy → ALKH). Kurs `1 Ƶ = 1 USD` o'zgarmas.
- **Mock rasm:** mahsulot/kontent rasmi kerak bo'lsa `https://picsum.photos/seed/<slug>/600/600`.
- **Token tejash:** keraksiz fayllarni qayta o'qima; faqat kerakli qismni o'qi. Katta `.json`/`.claude.json` ni to'liq o'qimasdan `python3`/`grep` bilan tahlil qil.
- **Glob/grep timeout:** loyiha OneDrive'da + `node_modules` katta — `**/CLAUDE.md` kabi keng Glob timeout bo'ladi. Aniq yo'l ber (`prisma/`, `src/...`) yoki Grep'da `path` ko'rsat.
- **Docs-only o'zgarish:** faqat CLAUDE.md/markdown o'zgarsa commit+push yetadi, `vercel deploy` shart emas (build chiqimiga ta'sir qilmaydi).
