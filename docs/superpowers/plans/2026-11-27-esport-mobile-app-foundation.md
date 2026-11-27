# Humo eSport Mobile — Expo App Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Yangi Expo ilovasining poydevori — scaffold + navigatsiya + es-* tema + Google login (token→SecureStore) + Home ekrani (real `/api/esport/home`) + push ro'yxati. Qurilmada sinaladigan birinchi ishlaydigan ilova.

**Architecture:** Expo (managed) + Expo Router (fayl-asosli nav) + NativeWind (Tailwind) + react-native-svg + expo-linear-gradient. Auth: `expo-auth-session` Google → idToken → mavjud `POST /api/auth/mobile/google` → mobil JWT → `expo-secure-store`; har API so'rovga `Authorization: Bearer`. Backend O'ZGARMAYDI (1-reja tayyor).

**Tech Stack:** Expo SDK (joriy barqaror), TypeScript, Expo Router, NativeWind v4, react-native-svg, expo-auth-session, expo-secure-store, expo-notifications, expo-font, expo-linear-gradient.

**Spec:** `docs/superpowers/specs/2026-11-27-esport-mobile-app-design.md`

**Repo:** yangi, alohida — `C:\Users\abduv\Desktop\ForHumo-eSport-mobile` (web repo'dan ajralgan).

## Global Constraints

- **Backend tayyor, tegilmaydi:** ilova faqat mavjud `/api/*` ni iste'mol qiladi. API bazasi env `EXPO_PUBLIC_API_BASE` (default `https://www.forhumo.uz`).
- **Auth:** `expo-auth-session` Google (Expo Go mos). idToken → `/api/auth/mobile/google` → `{ token, profile }`. Token `expo-secure-store`da. `aud` → `GOOGLE_MOBILE_CLIENT_IDS` (backend) va ilovadagi client ID bir xil Google OAuth loyihadan.
- **Dizayn:** es-* tokenlar (tri-rang c1/c2/c3, surface, border) JS temaga ko'chiriladi; light+dark (`useColorScheme`). Emoji yo'q — `lucide-react-native`. i18n uz/ru/en (keyingi rejada to'liq; poydevorda uz + struktura).
- **Paket:** `uz.forhumo.esport`, nom "Humo eSport", `scheme: humoesport`.
- **Test/run:** bu muhitda emulator yo'q — gate = `npx tsc --noEmit` + `npx expo-doctor`. Runtime oqimlar (login/home/push) QURILMADA founder tomonidan Expo Go bilan sinaladi (har shunday taskda "on-device" qadami bor).

## Review Focus

- **Token yo'q holatida ilova** → login ekraniga yo'naltiradi, oq ekran/crash emas. (Task 4: auth-context boshlang'ich holati.)
- **401 API javobi** (token eskirgan/revoked) → logout + login ekran, cheksiz spinner emas. (Task 3: client 401 handler.)
- **Google login bekor qilinsa** (foydalanuvchi oynani yopsa) → login ekranida qoladi, crash emas. (Task 4: AuthSession natijasi `dismiss`/`cancel`.)
- **Dark/light almashinuvi** → tema tokenlari ikkala rejimda o'qiladi (kontrast). (Task 2.)
- **Tarmoqsiz (offline)** Home → bo'sh/qayta-urinish holati, oq ekran emas. (Task 6.)

---

### Task 1: Expo loyiha scaffold + konfiguratsiya

**Files (yangi repo ildizida):** `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`, `app/_layout.tsx`, `app/index.tsx` (vaqtincha).

- [ ] **Step 1:** `C:\Users\abduv\Desktop`da: `npx create-expo-app@latest ForHumo-eSport-mobile` (Expo Router + TS default template). Agar interaktiv/muvaffaqiyatsiz bo'lsa — `--template blank-typescript` bilan, so'ng Expo Router qo'lda.
- [ ] **Step 2:** NativeWind o'rnatish + sozlash: `npm i nativewind tailwindcss react-native-reanimated react-native-safe-area-context`; `tailwind.config.js` (content: app/src), `global.css` (@tailwind), `babel.config.js` (`nativewind/babel`), `metro.config.js` (`withNativeWind`). `app/_layout.tsx` global.css import.
- [ ] **Step 3:** `app.json`: name "Humo eSport", slug, `scheme: "humoesport"`, `android.package: "uz.forhumo.esport"`, `ios.bundleIdentifier`, `plugins: ["expo-router","expo-secure-store","expo-font"]`, `extra`/env. Qolgan deps: `npm i expo-router react-native-svg expo-linear-gradient expo-auth-session expo-crypto expo-secure-store expo-notifications expo-font expo-constants lucide-react-native`.
- [ ] **Step 4:** Gate: `npx tsc --noEmit` → xatolarsiz; `npx expo-doctor` → kritik muammosiz.
- [ ] **Step 5:** Repo git init + birinchi commit. `git add -A && git commit -m "scaffold: Expo + Expo Router + NativeWind"`.

**On-device (founder):** `npx expo start` → Expo Go → bo'sh/placeholder ekran ochiladi.

---

### Task 2: Tema (es-* tokenlar) + shriftlar

**Files:** Create `src/theme/tokens.ts`, `src/theme/ThemeProvider.tsx`; Modify `tailwind.config.js` (tokenlarni Tailwind rangiga ulash), `app/_layout.tsx` (provider + font yuklash).

**Interfaces:**
- Produces: `tokens(scheme: "light"|"dark"): EsTokens` — `{ c1,c2,c3, bg, surface, surface2, border, text, text2, faint, ... }`; `useTheme(): { t: EsTokens; scheme }`.

- [ ] **Step 1:** `tokens.ts` — es-* qiymatlar (web `globals.css`dan): light va dark uchun ikki obyekt (c1 #0A5CFF/#2B8BFF, c2 #00B8D4/#00E0FF, c3 #6A4CFF/#8B6DFF, surface/border/text). `tailwind.config.js`ga `colors: { es: {...} }` (CSS-var o'rniga NativeWind uchun to'g'ridan qiymat; dark `dark:` variant orqali).
- [ ] **Step 2:** `ThemeProvider` — `useColorScheme()` bilan light/dark; `useTheme()` hook. `expo-font` bilan Chakra Petch + Inter yuklash (`useFonts`), yuklanmaguncha `SplashScreen`.
- [ ] **Step 3:** Gate: `npx tsc --noEmit` → xatolarsiz.
- [ ] **Step 4:** Commit.

---

### Task 3: API client + tiplar

**Files:** Create `src/api/client.ts`, `src/api/types.ts`, `src/api/config.ts`.

**Interfaces:**
- Produces: `apiFetch<T>(path, opts?): Promise<T>` — base URL + `Authorization: Bearer <token>` (SecureStore'dan, Task 4 beradi — bu yerda getter param/inject), JSON parse, 401 → `onUnauthorized()` callback (Task 4 ulaydi). `API_BASE` config'dan.

- [ ] **Step 1:** `config.ts` — `API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? "https://www.forhumo.uz"`.
- [ ] **Step 2:** `client.ts` — `apiFetch`: token getter (Task 4 `getToken`), `Authorization` header, `res.status === 401` → `authEvents.emit("unauthorized")` (yoki injected handler), xato → throw typed. `types.ts` — `MeProfile`, `HomePayload` (hero/broadcasts/activeTournaments — web `/api/esport/home` javobiga mos), `GoogleLoginResp { token, profile }`.
- [ ] **Step 3:** Gate: `npx tsc --noEmit`.
- [ ] **Step 4:** Commit.

---

### Task 4: Auth — Google login + SecureStore + kontekst + login ekran

**Files:** Create `src/auth/AuthProvider.tsx`, `src/auth/google.ts`, `src/auth/storage.ts`, `app/login.tsx`; Modify `app/_layout.tsx` (AuthProvider + gated routing).

**Interfaces:**
- Consumes: Task 3 `apiFetch`; mavjud backend `POST /api/auth/mobile/google`, `GET /api/auth/mobile/me`, `POST /api/auth/mobile/logout`.
- Produces: `useAuth(): { status: "loading"|"authed"|"anon"; profile?; signInWithGoogle(); signOut() }`; `getToken()`/`setToken()` (SecureStore).

- [ ] **Step 1:** `storage.ts` — `getToken/setToken/clearToken` (`expo-secure-store`).
- [ ] **Step 2:** `google.ts` — `expo-auth-session` Google provider: `useAuthRequest` (yoki `AuthSession.startAsync`), `responseType: "id_token"`, `clientId` (env `EXPO_PUBLIC_GOOGLE_CLIENT_ID`), nonce (`expo-crypto`). Natija idToken → qaytaradi. Bekor/xato → null.
- [ ] **Step 3:** `AuthProvider` — start: `getToken()` bor bo'lsa `GET /me` (yaroqli→authed, 401→clear→anon), yo'q bo'lsa anon. `signInWithGoogle`: idToken → `POST /api/auth/mobile/google` → `setToken(resp.token)` + profile → authed. `signOut`: `POST /logout` + `clearToken` → anon. `apiFetch`ga `getToken` + 401 handler ulanadi.
- [ ] **Step 4:** `app/login.tsx` — brend hero + "Google bilan kirish" tugma (es-tema). `_layout.tsx`: `status==="loading"`→splash, `"anon"`→`/login`, `"authed"`→`(tabs)`.
- [ ] **Step 5:** Gate: `npx tsc --noEmit` + `npx expo-doctor`.
- [ ] **Step 6:** Commit.

**On-device (founder):** Expo Go → "Google bilan kirish" → Google oynasi → qaytib **Home**ga kiradi; ilovani qayta ochganda login so'ramaydi (token saqlangan); bekor qilsa login ekranda qoladi.

---

### Task 5: Tab shell + navbar

**Files:** Create `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx` (Home — Task 6 to'ldiradi), `app/(tabs)/tournaments.tsx`, `app/(tabs)/teams.tsx`, `app/(tabs)/standings.tsx`, `app/(tabs)/more.tsx` (placeholder), `src/components/EsHeader.tsx`.

- [ ] **Step 1:** `(tabs)/_layout.tsx` — Expo Router `Tabs`, es-tema tab bar (ikonlar `lucide-react-native`: Home/Trophy/Users/BarChart3/Menu), active rang c2. `EsHeader` — logo + sarlavha + (keyin) support/bildirishnoma.
- [ ] **Step 2:** Placeholder ekranlar (tournaments/teams/standings/more) — sarlavha + "tez kunda" holati (keyingi rejalarda to'ladi).
- [ ] **Step 3:** Gate: `npx tsc --noEmit`.
- [ ] **Step 4:** Commit.

---

### Task 6: Home ekrani (real `/api/esport/home`)

**Files:** Modify `app/(tabs)/index.tsx`; Create `src/components/Hero.tsx`, `src/components/TournamentRow.tsx`, `src/hooks/useApi.ts`.

**Interfaces:**
- Consumes: Task 3 `apiFetch` + `HomePayload`.
- Produces: `useApi<T>(path)` — `{ data, loading, error, reload }` (fetch + holat).

- [ ] **Step 1:** `useApi` hook — fetch on mount, loading/error/reload. Offline/error → qayta-urinish holati (oq ekran emas).
- [ ] **Step 2:** `Hero` (brend gradient, `expo-linear-gradient`) + `TournamentRow` (faol turnirlar ro'yxati). `index.tsx` — `useApi<HomePayload>("/api/esport/home")` → hero + faol turnirlar + jonli efir (bor bo'lsa). Bo'sh holatlar ishlov beriladi.
- [ ] **Step 3:** Gate: `npx tsc --noEmit`.
- [ ] **Step 4:** Commit.

**On-device (founder):** Home real ma'lumot ko'rsatadi (turnirlar/efir); tarmoqsiz holatда qayta-urinish ko'rinadi.

---

### Task 7: Push ro'yxati (expo-notifications)

**Files:** Create `src/push/registerPush.ts`; Modify `app/_layout.tsx` (authed bo'lgach ro'yxat).

- [ ] **Step 1:** `registerPush()` — `expo-notifications` ruxsat so'rash → `getExpoPushTokenAsync()` → `POST /api/esport/push/register { token, platform: "android" }` (Bearer). Ruxsat berilmasa jim.
- [ ] **Step 2:** `_layout.tsx` — `status==="authed"` bo'lganda bir marta `registerPush()` (fail-safe). `app.json` — `expo-notifications` plugin + android ikonka.
- [ ] **Step 3:** Gate: `npx tsc --noEmit` + `npx expo-doctor`.
- [ ] **Step 4:** Commit.

**On-device (founder):** ruxsat so'raladi; berilsa token backendga yoziladi (dev build kerak bo'lishi mumkin — Expo Go push cheklovi README'da).

---

### Task 8: EAS config + README + handoff

**Files:** Create `eas.json`, `README.md`, `.env.example`.

- [ ] **Step 1:** `eas.json` — `preview` (apk, internal) + `production` (aab). `.env.example` — `EXPO_PUBLIC_API_BASE`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID`.
- [ ] **Step 2:** `README.md` — ishga tushirish (`npx expo start` + Expo Go), env, Google OAuth (Android client ID + SHA-1 EAS'dan), backend env eslatmasi (`GOOGLE_MOBILE_CLIENT_IDS`), Play uchun EAS build/submit qadamlari, Expo Go vs dev-build push farqi.
- [ ] **Step 3:** Gate: `npx tsc --noEmit` + `npx expo-doctor`. Commit.

## Builderga qolgan (open)
- Expo Go'da `expo-auth-session` Google redirect sxemasi (proxy vs scheme) — builder Expo versiyasiga mos tanlaydi.
- i18n (uz/ru/en) to'liq — poydevorda uz + struktura, keyingi rejada `i18next` + `expo-localization`.
- Premium karta vizuali (oltiburchak gerb SVG) — keyingi "ekranlar" rejasida (Home'da soddalashtirilgan).
