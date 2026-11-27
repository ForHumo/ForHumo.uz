# Humo eSport Mobile — Backend Auth + Push API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mavjud `/api/esport/*` backend'ni native ilova uchun tayyorlash — bearer-token auth (cookie-siz) va Expo push, web'ni buzmasdan.

**Architecture:** NextAuth v4 JWT crypto'si qayta ishlatiladi. Yangi `/api/auth/mobile/*` endpointlar Google ID tokenni tekshirib, mavjud `UserProfile` ustiga `jti`-li (AuthSession) mobil JWT beradi. Bitta `resolveProfileId()` resolver cookie-sessiya (web) YOKI `Authorization: Bearer` (mobil)ni qabul qiladi; `getMyProfile()` shu orqali ishlaydi, shuning uchun deyarli barcha eSport route'lari o'zgarmasdan mobil tokenni ham qabul qiladi. Push: `EsPushToken` + `esNotify` ichidan Expo'ga yuborish.

**Tech Stack:** Next.js 15 (App Router), NextAuth v4 (`next-auth/jwt` encode/decode), Prisma 5 + PostgreSQL (Neon), `google-auth-library`, `expo-server-sdk`, TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-27-esport-mobile-app-design.md`

## Global Constraints

- **Additive — web buzilmaydi:** mavjud cookie-sessiya oqumi, `authOptions`, web login tegilmaydi. Web regressiya har task oxirida tekshiriladi.
- **Identity:** faqat `UserProfile` (Humo ID). Ikkinchi identity YO'Q. Google upsert mantig'i mavjud `signIn` callback bilan bir xil bo'lishi SHART (email → upsert, LoginEvent, `emailVerified` Google'da true).
- **jti-revocation parity:** har mobil token `AuthSession` yozuviga ega (`origin: "mobile"`), `isJtiRevoked` bilan tekshiriladi — web'dagi "qurilmani masofadan chiqarish" mobilga ham ishlaydi.
- **Token imzo:** `NEXTAUTH_SECRET`; mobil token ichida `mob: true`; muddat 1 yil (web `maxAge` bilan bir xil).
- **Emoji yo'q** kod/javoblarda. **Prisma:** `src/lib/prisma.ts` singleton. **DB o'zgarishi:** `DATABASE_URL="..." npx prisma db push` (migrate dev interaktiv — ishlamaydi).
- **Test:** repoda test-runner YO'Q (CLAUDE.md). Tekshiruv = `npx tsc --noEmit` + funksional (dev server + curl) + crypto-lib uchun bitta roundtrip `.mjs` skript. Yangi test framework QO'SHILMAYDI.
- **Deploy:** faqat `git push origin main` (Vercel auto). Vercel CLI ishlatilmaydi.

## Review Focus

- **Buzilgan/muddati o'tgan bearer token** → 401, crash emas. (Task 2 roundtrip + Task 3 funksional: yaroqsiz token → `resolveProfileId` null.)
- **Revoke qilingan jti** (chiqarilgan qurilma) → bearer rad etiladi. (Task 5: logout'dan keyin `/me` 401.)
- **Noto'g'ri audience'li Google idToken** (allowlist'da yo'q) → rad. (Task 4: `GOOGLE_MOBILE_CLIENT_IDS`'ga mos kelmagan `aud` → 401.)
- **Authorization header yo'q** mobil-yo'lда → 401; web cookie yo'li o'zgarmaydi. (Task 3: header'siz + bearer'siz → null; web sessiya hali ishlaydi.)
- **Mavjud email'li Google idToken** → profil TAKRORLANMAYDI, qayta ishlatiladi. (Task 4: mavjud `UserProfile` email → o'sha `id` qaytadi, yangi yozuv yo'q.)

---

### Task 1: `EsPushToken` modeli

**Files:**
- Modify: `prisma/schema.prisma` (yangi model + `UserProfile`ga relation maydoni shart emas — `profileId` indeksli saqlanadi)

**Interfaces:**
- Produces: `EsPushToken { id, profileId, token @unique, platform, createdAt, updatedAt }` — Prisma client'da mavjud.

- [ ] **Step 1:** `prisma/schema.prisma`'ga qo'sh:
```prisma
model EsPushToken {
  id        String   @id @default(cuid())
  profileId String
  token     String   @unique
  platform  String   @default("android")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([profileId])
}
```
- [ ] **Step 2:** Schema'ni push: `DATABASE_URL="<.env.local>" npx prisma db push` → so'ng `npx prisma generate`.
- [ ] **Step 3:** Tekshir: `npx tsc --noEmit` (client tiplar yangilandi, `prisma.esPushToken` mavjud). Expected: xatolarsiz.
- [ ] **Step 4:** Commit: `git add prisma/schema.prisma && git commit -m "esport mobile: EsPushToken model"`

---

### Task 2: Mobil token lib (mint / verify)

**Files:**
- Create: `src/lib/mobile-token.ts`
- Create (vaqtinchalik, scratch): `scripts/check-mobile-token.mjs`

**Interfaces:**
- Produces:
  - `mintMobileToken(p: { profileId: string; humoId: string | null; email: string | null; jti: string }): Promise<string>`
  - `verifyMobileToken(jwt: string): Promise<{ profileId: string; humoId: string | null; email: string | null; jti: string } | null>` — `mob !== true` yoki `profileId` yo'q yoki decode xatosi → `null`.

- [ ] **Step 1:** `src/lib/mobile-token.ts` yoz. `encode`/`decode` — `next-auth/jwt`'dan; `secret = process.env.NEXTAUTH_SECRET`; `maxAge = 60*60*24*365`. `mint` token'ga `{ ...p, mob: true, sub: p.profileId }` qo'yadi. `verify` `decode` qiladi, `t?.mob === true && typeof t.profileId === "string"` bo'lsa maydonlarni qaytaradi, aks holda `null`; `try/catch` → `null`.
- [ ] **Step 2:** Roundtrip skript `scripts/check-mobile-token.mjs` — `.env.local`dan `NEXTAUTH_SECRET` o'qib (yoki env bilan ishga tushirib), `mintMobileToken` natijasini `verifyMobileToken`'ga beradi va `profileId` mosligini `console.assert` qiladi; buzilgan satr (`jwt+"x"`) → `null` ekanini tekshiradi. (Lib TS bo'lgani uchun skript import qila olmasa, mantiqni skriptda takrorlash o'rniga Task 3 funksional tekshiruviga tayan — bu holda skriptni o'tkazib yubor va buni Step 3'da belgila.)
- [ ] **Step 3:** `npx tsc --noEmit`. Expected: xatolarsiz. Agar skript ishlasa: `node scripts/check-mobile-token.mjs` → assertlar o'tadi.
- [ ] **Step 4:** Commit: `git add src/lib/mobile-token.ts && git commit -m "esport mobile: mobil JWT mint/verify lib"` (scratch skript commitga kirmaydi).

---

### Task 3: `resolveProfileId()` resolver + `getMyProfile()` porti

**Files:**
- Create: `src/lib/auth-request.ts`
- Modify: `src/lib/esport.ts:14-21` (`getMyProfile`)

**Interfaces:**
- Consumes: Task 2 `verifyMobileToken`; mavjud `isJtiRevoked` (`@/lib/auth-session-cache`), `authOptions`.
- Produces: `resolveProfileId(): Promise<string | null>` — avval `getServerSession(authOptions)` (`session.user.profileId`); bo'lmasa `headers().get("authorization")` → `Bearer` → `verifyMobileToken` → `isJtiRevoked(jti)` false bo'lsa `profileId`, aks holda `null`.

- [ ] **Step 1:** `src/lib/auth-request.ts` yoz. `getServerSession`'dan `session.user.profileId` (mavjud session callback uni beradi — `src/lib/auth.ts:289`); null bo'lsa Authorization header'dan `Bearer <jwt>` ol, `verifyMobileToken`, so'ng `isJtiRevoked(jti)` — revoked bo'lsa `null`.
- [ ] **Step 2:** `getMyProfile()`ni porti: `const profileId = await resolveProfileId(); if (!profileId) return null;` so'ng `prisma.userProfile.findUnique({ where: { id: profileId }, select: { id, humoId, username, firstName, lastName, name, image } })` (mavjud `select` bilan bir xil).
- [ ] **Step 3:** `npx tsc --noEmit`. Expected: xatolarsiz.
- [ ] **Step 4:** Funksional: dev server (`npm run dev`) + web brauzerда eSport sahifa (login bilan) hali profilni ko'rsatadi (web regressiya). `curl -s localhost:3000/api/esport/notifications` (bearer'siz, cookie'siz) → 401/ruxsatsiz (crash emas).
- [ ] **Step 5:** Commit: `git add src/lib/auth-request.ts src/lib/esport.ts && git commit -m "esport mobile: resolveProfileId (cookie|bearer) + getMyProfile porti"`

---

### Task 4: `POST /api/auth/mobile/google`

**Files:**
- Create: `src/app/api/auth/mobile/google/route.ts`
- Modify: `package.json` (`google-auth-library`)

**Interfaces:**
- Consumes: Task 2 `mintMobileToken`; mavjud `prisma`, `crypto` (jti), `headers`.
- Produces: `POST { idToken } -> 200 { token, profile: { id, humoId, username, name, image, onboardingDone } }` | `400 invalid_token` | `401 bad_audience`.

- [ ] **Step 1:** `npm i google-auth-library`.
- [ ] **Step 2:** Route yoz: `OAuth2Client.verifyIdToken({ idToken, audience: process.env.GOOGLE_MOBILE_CLIENT_IDS.split(",") })`. `aud` mos kelmasa (verify throw) → `401`. Payload'dan `email`, `name`, `picture`, `sub(googleId)`. `UserProfile` **upsert** (mavjud `signIn` callback bilan bir xil: `where email`, create `accountType:"GOOGLE", emailVerified:true, googleId, name, image, lastLoginAt`, update `lastLoginAt, emailVerified:true`). `LoginEvent.create` (fail-safe). `jti = crypto.randomBytes(16).hex`; `AuthSession.create({ jti, profileId, origin:"mobile", deviceHint: UA })` (fail-safe). `mintMobileToken({ profileId, humoId, email, jti })`. `profile`ni select bilan qaytar.
- [ ] **Step 3:** `npx tsc --noEmit`. Expected: xatolarsiz.
- [ ] **Step 4:** Funksional: `curl -X POST localhost:3000/api/auth/mobile/google -d '{"idToken":"xxx"}' -H "content-type: application/json"` → `400`/`401` (yaroqsiz token crash emas). To'liq (haqiqiy Google idToken bilan) oqim **mobil fazada** qurilmada tekshiriladi. Mavjud-email reuse: upsert `where email` — yangi yozuv yaratmaydi (kod ko'rigi bilan tasdiqlanadi).
- [ ] **Step 5:** Commit: `git add -A && git commit -m "esport mobile: /api/auth/mobile/google (Google verify + upsert + token)"`

---

### Task 5: `GET /api/auth/mobile/me` + `POST /api/auth/mobile/logout`

**Files:**
- Create: `src/app/api/auth/mobile/me/route.ts`
- Create: `src/app/api/auth/mobile/logout/route.ts`

**Interfaces:**
- Consumes: Task 3 `resolveProfileId`; mavjud jti-revoke yo'li (`AuthSession.update revokedAt` / `revokeSession` agar bor — bo'lmasa `prisma.authSession.update({ where:{jti}, data:{ revokedAt: new Date() } })` + kesh invalidatsiya `isJtiRevoked` manbasiga mos).
- Produces: `GET /me -> 200 { profile } | 401`; `POST /logout -> 200 { ok:true }`.

- [ ] **Step 1:** `/me`: `getMyProfile()` (bearer orqali) → profil yoki `401`.
- [ ] **Step 2:** `/logout`: bearer'dan `verifyMobileToken` → `jti` → AuthSession revoke (mavjud revoke mexanizmiga mos; `auth-session-cache` keshini ham yangilash kerak bo'lsa o'sha helper bilan).
- [ ] **Step 3:** `npx tsc --noEmit`. Expected: xatolarsiz.
- [ ] **Step 4:** Funksional: Task 2 skript/ Task 4 bilan olingan token bilan `curl /me -H "authorization: Bearer <t>"` → profil; `curl -X POST /logout -H "authorization: Bearer <t>"` → ok; keyin `curl /me -H "authorization: Bearer <t>"` → `401` (revoke ishladi).
- [ ] **Step 5:** Commit: `git add -A && git commit -m "esport mobile: /me + /logout"`

---

### Task 6: `athlete` route'larini resolverga o'tkazish

**Files:**
- Modify: `src/app/api/esport/athlete/route.ts` (getServerSession → `getMyProfile`/`resolveProfileId`)
- Modify: `src/app/api/esport/athlete/verify/route.ts` (xuddi shunday)

**Interfaces:**
- Consumes: Task 3 `getMyProfile`/`resolveProfileId`.

- [ ] **Step 1:** Ikkala route'da `getServerSession(authOptions)` + email-lookup o'rnига `getMyProfile()` (yoki `resolveProfileId()`) ishlatilsin; mavjud mantiq (onboarding/verify) o'zgarmaydi, faqat profil manbasi birlashadi.
- [ ] **Step 2:** `npx tsc --noEmit`. Expected: xatolarsiz.
- [ ] **Step 3:** Funksional: web'da athlete sahifa hali ishlaydi (cookie); bearer bilan `curl /api/esport/athlete -H "authorization: Bearer <t>"` → profil/holat (401 emas).
- [ ] **Step 4:** Commit: `git add -A && git commit -m "esport mobile: athlete route'lari bearer-aware"`

---

### Task 7: Push — `esport-push` lib + register endpoint + `esNotify` ulanishi

**Files:**
- Create: `src/lib/esport-push.ts`
- Create: `src/app/api/esport/push/register/route.ts`
- Modify: `src/lib/esport-notify.ts:8-24` (esNotify + esNotifyMany)
- Modify: `package.json` (`expo-server-sdk`)

**Interfaces:**
- Consumes: Task 3 `resolveProfileId`; Task 1 `EsPushToken`.
- Produces:
  - `sendEsportPush(profileId: string, n: { title: string; body?: string | null; href?: string | null }): Promise<void>` — fail-safe; `EsPushToken`'dan tokenlar, `expo-server-sdk` bilan yuboradi, `DeviceNotRegistered` tokenni o'chiradi.
  - `POST /api/esport/push/register { token, platform? } -> 200 { ok }` (bearer) — `EsPushToken` upsert (`token @unique`, profileId yangilanadi).

- [ ] **Step 1:** `npm i expo-server-sdk`.
- [ ] **Step 2:** `src/lib/esport-push.ts` — `sendEsportPush`: `Expo.isExpoPushToken` filtri, chunking, `DeviceNotRegistered` → `prisma.esPushToken.deleteMany`. To'liq `try/catch` (fail-safe).
- [ ] **Step 3:** `/api/esport/push/register` — `resolveProfileId()` (401 bo'lmasa), body `{ token, platform }`, `prisma.esPushToken.upsert({ where:{token}, create:{profileId,token,platform}, update:{profileId,platform} })`.
- [ ] **Step 4:** `esNotify`/`esNotifyMany` ichida, Telegram fan-out yonida `void sendEsportPush(profileId, { title, body, href }).catch(()=>{})` qo'sh (asosiy amalni bloklamaydi).
- [ ] **Step 5:** `npx tsc --noEmit`. Expected: xatolarsiz.
- [ ] **Step 6:** Funksional: bearer bilan `curl -X POST /api/esport/push/register -d '{"token":"ExponentPushToken[xxx]"}'` → ok; `EsPushToken` yozuvi yaratiladi (prisma studio / DB). Haqiqiy push yetkazish mobil fazada qurilmada.
- [ ] **Step 7:** Commit: `git add -A && git commit -m "esport mobile: Expo push (lib + register + esNotify ulanishi)"`

---

### Task 8: Push + deploy yakuni

- [ ] **Step 1:** `npx tsc --noEmit` (butun loyiha). Expected: xatolarsiz.
- [ ] **Step 2:** `git push origin main` → Vercel auto-deploy.
- [ ] **Step 3:** Deploy holatini Vercel MCP `list_deployments` bilan READY ekanini tekshir.
- [ ] **Step 4:** Env eslatmasi (founder tomoni, keyin): `GOOGLE_MOBILE_CLIENT_IDS` (Android/web OAuth client ID'lar) Vercel'ga qo'shiladi; qo'shilmaguncha `/api/auth/mobile/google` 500/401 beradi (kutilgan — mobil build'dan oldin).
