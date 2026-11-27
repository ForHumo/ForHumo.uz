# Humo eSport — Native Android ilova (Expo) — Dizayn hujjati

- Sana: 2026-11-27
- Holat: tasdiq kutilmoqda (founder)
- Qamrov: **B — to'liq parity** (barcha eSport ekranlari)

---

## 1. Maqsad va nega

Humo eSport'ni Play Market'da **haqiqiy native Android ilova** sifatida chiqarish.
Hozir faqat web bor (`forhumo.uz/esport`, premium et-* dizayn, PWA/TWA-tayyor).

Founder qarori (aniq): sayt-wrapper EMAS — **0dan native ilova**, lekin **mavjud
backend/API qayta ishlatiladi** va sayt bilan **funksional teng** (to'liq parity).

Nega: Play Market'da ishonchli, mustaqil ilova borligi (brend + topilish + push
bildirishnoma); eSport'ni mustaqil platforma qilish yo'nalishining davomi
(Telegram support + decoupling qadamlaridan keyin).

## 2. Goals / Non-goals / Anti-goals

**Goals**
- Barcha eSport ekranlari native: home, teams(+detail), tournaments(+detail),
  standings, transfers, athlete (onboarding + profil), cards, rules, admin, notifications.
- Native Google login (cookie-siz, token-asosli).
- Push bildirishnoma (`EsNotification` bilan ulangan).
- Premium es-* dizayn tili native'da saqlanadi (gerblar, tier, arena, tri-rang).
- EAS Build + EAS Submit bilan Play Market'ga chiqadi.

**Non-goals (hozircha)**
- iOS — keyin (Expo bitta kod bazadan iOS ham beradi; birinchi reliz = Android/Play).
- Boshqa modullar (Market/Nexus/Pay/BN) — faqat eSport.
- Offline rejim — onlayn API'ga tayanadi (kesh + bo'sh holatlar, to'liq offline emas).

**Anti-goals (muvaffaqiyatsizlik belgilari)**
- WebView wrapper bo'lib qolish (founder aniq rad etdi).
- Yangi identity tizimi — auth AYNAN mavjud `UserProfile` (Humo ID) ustida qoladi;
  ikkinchi identity YO'Q.
- Web auth'ni buzish — backend o'zgarishlari **qo'shimcha (additive)** bo'lishi SHART;
  mavjud cookie-sessiya tegilmaydi.

## 3. Constraints

- Backend: Next.js 15 + NextAuth v4, **JWT session**, `NEXTAUTH_SECRET` bilan imzolangan.
  API `/api/esport/*` hozir cookie-sessiya bilan (`getMyProfile` / `getServerSession`).
- Identity: `UserProfile` (email-unique, Google); JWT ichida `profileId/humoId/jti`;
  **jti-revocation** (`AuthSession` jadvali + `isJtiRevoked` kesh).
- Mobil cookie-sessiya ishlata olmaydi → **bearer token** kerak.
- Deploy: web = Vercel (git push → auto). Mobil = EAS (alohida). Vercel CLI noto'g'ri
  akkauntga ulangan → faqat `git push`, deploy holatini Vercel MCP bilan tekshir.
- Dizayn: es-* CSS tokenlar + oltiburchak SVG gerblar. RN'da `backdrop-filter`,
  `color-mix`, CSS-gradient to'g'ridan YO'Q → `react-native-svg` + `expo-linear-gradient`.
- Founder qoidalari: **emoji yo'q** (`lucide-react-native`); **i18n uz/ru/en**;
  **styled dropdown** (native picker emas); joylashuv — kartada.

## 4. Approaches (ko'rib chiqilgan yo'llar)

Founder "qanday qurish"ni menga qoldirdi; Expo frameworkni tanladi; quyidagi 1-yo'lni tasdiqladi.

- **1-yo'l — TANLANDI: web-stack'ni ko'zgulash.** Expo + Expo Router (fayl-asosli, Next.js
  App Router kabi) + NativeWind (RN'da Tailwind) + `react-native-svg` (gerblar) +
  `expo-linear-gradient` + es-* tokenlardan ko'chirilgan tema. Mental model va dizayn
  tili ~1:1 ko'chadi; premium ko'rinish saqlanadi.
- **2-yo'l — rad: sof RN StyleSheet.** Eng bashoratli, qo'shimchasiz; lekin har Tailwind
  klassni qo'lda yozish — 10+ ekranda sekin, ko'p kod.
- **3-yo'l — rad: UI-kit (Tamagui/gluestack).** Standart komponentlar tez; lekin maxsus
  premium estetika (oltiburchak tier, arena) kit bilan urishadi — shablon xavfi.

## 5. Arxitektura — qaror qilingan qism

### 5.1 Repo tузилmasi
Alohida repo: `ForHumo-eSport-mobile` (disk: `C:\Users\abduv\Desktop\ForHumo-eSport-mobile`).
Web'dan ajralgan — EAS build izolyatsiya, Vercel deploy toza qoladi. API javob tiplari
mobil repo'da `src/api/types.ts`da takrorlanadi (kichik, qo'lda boshqariladi; shared npm
paket hozir ortiqcha).

### 5.2 Auth (eng muhim bo'lak)

**Backend (web repo, additive):**
- `POST /api/auth/mobile/google` — body `{ idToken }` (Google ID token, native sign-in'dan).
  Server `google-auth-library` bilan ID tokenni verify qiladi. **Audience:** native
  sign-in ID tokenining `aud`'i Android/iOS/web OAuth client ID'laridan biri bo'ladi →
  backend yangi env `GOOGLE_MOBILE_CLIENT_IDS` (vergulli ro'yxat) ichidagi har qaysisini
  qabul qiladi. Verify → email → **mavjud `signIn` callback mantig'ini qayta ishlatib** `UserProfile`
  upsert (+ LoginEvent) → **`jti` yaratib `AuthSession`ga yozadi** (web bilan parity —
  qurilmani masofadan chiqarish ishlaydi) → `NEXTAUTH_SECRET` bilan imzolangan JWT
  (`next-auth/jwt` `encode`, web token formati bilan bir xil) qaytaradi. Token:
  `profileId, humoId, email, jti, exp` (1 yil, web kabi). **Ajratish:** NextAuth v4'da salt
  yo'q — mobil token ichiga `mob: true` belgisi qo'yiladi; bearer alohida (`decode`) tekshiriladi,
  web cookie dekoderiga hech qachon berilmaydi.
- `src/lib/auth-request.ts` — yangi **unified resolver** `resolveProfileId()`:
  1) `getServerSession(authOptions)` (cookie/web) → bo'lsa profileId;
  2) bo'lmasa `headers().get("authorization")` → `Bearer <jwt>` → `decode` + jti-revocation
     tekshir → profileId. 401 bo'lsa null.
- `getMyProfile()` (`esport.ts`) shu resolver orqali **profileId bo'yicha** topadigan
  qilinadi (hozir email bo'yicha; web sessiyada ham `token.profileId` bor — ikkala yo'l id'ga birlashadi). Shu bitta o'zgarish `getEsportAdmin`/`getEsportOwner` va ularga
  tayanadigan barcha route'larga tarqaladi. **To'g'ridan `getServerSession` chaqiradigan
  eSport route'lar grep qilinib** shu resolverga o'tkaziladi (audit — build vazifasi).
- `GET /api/auth/mobile/me` — app start'da token amalligini tekshirish (profil qaytaradi).
- `POST /api/auth/mobile/logout` — jti revoke (`AuthSession`).

**Mobil:**
- `expo-auth-session` (Google, native) → Google ID token → `/api/auth/mobile/google` →
  JWT → `expo-secure-store`da saqlanadi.
- `src/api/client.ts` — har so'rovga `Authorization: Bearer <jwt>`; 401 → logout + login ekran.

### 5.3 Navigatsiya (Expo Router)
Web route'larni ko'zgulaydi:
```
app/(tabs)/index          -> home
app/(tabs)/tournaments     -> ro'yxat
app/(tabs)/teams           -> ro'yxat
app/(tabs)/standings        -> divizionlar
app/(tabs)/more             -> transfers/cards/rules/athlete/admin hub
app/tournaments/[id]        -> turnir detali (setka)
app/teams/[id]              -> jamoa detali
app/a/[id]                  -> sportchi profili (ommaviy)
app/athlete                 -> onboarding + o'z profil
app/cards, app/rules, app/admin, app/notifications
```
Tab bar (pastda) + stack navigation. Deep-link sxema `humoesport://` (push bosilganda).

### 5.4 Tema porti
- `src/theme/tokens.ts` — es-* qiymatlar (c1/c2/c3 light+dark, surface, border, radius,
  shriftlar) JS obyekt. `useColorScheme` bilan dark/light. NativeWind config'ga ulanadi.
- `src/components/Crest.tsx` — oltiburchak gerb (`react-native-svg`); web `esport-card.ts`
  mantig'i (`tierFromElo`, `TIER_MAT`, `GAME_CREST`, `tier`/`game` ranglari) ko'chiriladi.
- Arena fon / gradientlar: `expo-linear-gradient`. Shriftlar: `expo-font` (Chakra Petch + Inter).

### 5.5 Ekranlar (to'liq parity) — har biri qaysi API'ni chaqiradi
| Ekran | API | Asosiy |
|---|---|---|
| Home | `GET /api/esport/home` | hero, jonli efir, faol turnirlar |
| Tournaments | `GET /api/esport/tournaments` | ro'yxat + tarix |
| Tournament detail | `GET /api/esport/tournaments/[id]` | setka, ro'yxat, (admin amallar) |
| Teams | `GET /api/esport/teams/all` | gerb + tier kartalar |
| Team detail | `GET /api/esport/teams/[id]` | tahrir/invite/staff/roster/dispute |
| Standings | `GET /api/esport/standings` | divizion/mavsum jadval |
| Transfers | `GET /api/esport/transfers` | bozor + takliflar |
| Athlete | `GET/POST /api/esport/athlete*` | onboarding + profil (styled dropdown) |
| Athlete public | `GET /api/esport/athletes/[id]` | ommaviy profil + karta |
| Cards | (mavjud showcase) | karta tizimi |
| Rules | statik | 3 til |
| Admin | `/api/esport/admin/*` | 8 tab (oxirgi bosqich) |
| Notifications | `GET /api/esport/notifications` | qo'ng'iroq + push |

### 5.6 Push
- Backend: `POST /api/esport/push/register` (bearer) — Expo push tokenni saqlaydi
  (yangi `EsPushToken` jadval: profileId, token, platform). `EsNotification` yaratilganda
  `expo-server-sdk` bilan yuboriladi (`after()`, fail-safe). Bosilganda ekranga deep-link.
- Mobil: `expo-notifications` — ruxsat + token ro'yxat + handler.

### 5.7 Build / Submit
- `app.json`: paket `uz.forhumo.esport`, nom "Humo eSport", ikonka/splash (eSport brend
  `C:/For Humo/Logo`dan), `scheme: humoesport`, versioning.
- `eas.json`: `preview` (internal apk, sinov), `production` (aab, Play).
- EAS Submit — founder Google Play Developer akkaunt + service-account JSON bilan.

## 6. Ish tartibi (bosqichlar)
0. **Backend auth qatlami** (token endpoint + `resolveProfileId` + `getMyProfile` port) —
   web buzilmasligini tekshir (regressiya: web login + bir eSport sahifa).
1. **Expo skelet**: navigatsiya + tema + login (Google → token → home).
2. **Read-only ekranlar**: home, tournaments(+detail), teams(+detail), standings, cards,
   rules, athlete public.
3. **Interaktiv**: athlete onboarding/profil, transfers, team boshqaruv, notifications + push.
4. **Admin** (8 tab).
5. **EAS**: preview apk (sinov) → production aab → Play Submit.

## 7. Builderga qolgan (open — mayda, qurувchi hal qiladi)
- Token refresh endpoint (ixtiyoriy; 1 yil muddat yetarli, refresh keyin).
- i18n kutubxona: `i18next` + `expo-localization` (device-locale, uz/ru/en).
- Shared mantiq: `esport-card` helperlarini mobil repo'ga ko'chirma (oddiyroq, npm paket emas).
- Admin ekran tafsiloti bosqich 4'da aniqlanadi (8 tab katta — read + asosiy amallar avval).

## 8. Founder tomoni (kod kutmaydi, lekin relyezga kerak)
- **Google Play Developer akkaunt** ($25 bir martalik).
- **Google Cloud OAuth — Android client ID** (ilova paketi `uz.forhumo.esport` + SHA-1
  sertifikat barmoq izi; EAS build SHA-1 beradi). Native Google login shusiz ishlamaydi.
- Play Submit uchun **service-account JSON** (Google Play Console → API access).
