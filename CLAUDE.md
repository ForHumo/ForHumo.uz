# ForHumo.uz — Claude Code Guide

## Loyiha haqida
ForHumo.uz — O'zbekiston uchun ko'p modelli platforma:
- **Humo ID** — unified identity (Google OAuth, username @handle, Humo ID UZxxxxxxx)
- **Esport** — jamoalar, turnirlar, o'yinchilar
- **Market** — mahsulotlar, brendlar, savat, buyurtmalar
- **Nexus** — ijtimoiy tarmoq (feed, stories, live, va boshqalar)
- **Pay (Alkh Pay)** — hamyon, pul o'tkazma, safe
- **AI** — moderatsiya va AI xususiyatlari

## Tech Stack
- **Framework**: Next.js 15 (App Router), React 19
- **DB**: PostgreSQL + Prisma ORM (v5.19)
- **Auth**: NextAuth v4 (Google OAuth)
- **i18n**: next-intl — 3 til: `uz`, `ru`, `en` (messages/ papkasida)
- **Styling**: Tailwind CSS v4
- **State**: Zustand
- **Animation**: Framer Motion
- **Storage**: Vercel Blob
- **Deploy**: Vercel

## Papka tuzilishi
```
src/
  app/
    [locale]/          # barcha sahifalar locale wrapper ostida
      page.tsx         # home
      id/              # Humo ID profil sahifalari
      esport/          # esport sahifalari
      market/          # bozor sahifalari
      nexus/           # ijtimoiy tarmoq
      pay/             # to'lov tizimi
      ai/              # AI sahifa
    api/               # Route Handlers (REST API)
  components/
    ai/                # AI komponenti
    auth/              # auth barrier, onboarding wizard
    esport/            # esport komponentlari
    id/                # humo id navbar
    layout/            # header, footer, module-navbar
    market/            # market komponentlari (catalog, cart, brand, product)
    nexus/             # 60+ nexus komponentlari
    pay/               # to'lov komponentlari
    ui/                # shared UI (dialog, country-select, date-picker, va boshqalar)
  lib/
    auth.ts            # NextAuth konfiguratsiyasi
    prisma.ts          # Prisma client singleton
    permissions.ts     # ruxsatlar tizimi
    repositories/      # DB query layeri (players, teams, tournaments)
    store/             # Zustand store (team-store)
    crypto.ts          # AES-256-GCM shifrlash (location ma'lumotlari uchun)
  middleware.ts        # next-intl routing middleware
  store/
    auth-store.ts      # global auth state (Zustand)
```

## Muhim qoidalar

### i18n
- Har qanday UI matnini to'g'ridan yozma — `messages/uz.json`, `ru.json`, `en.json` ga qo'sh
- `useTranslations()` hookidan foydalanish majburiy
- Fayl yo'li: `src/app/[locale]/...` — locale prefiks har doim bor

### Ma'lumotlar bazasi
- Prisma schema: `prisma/schema.prisma`
- `src/lib/prisma.ts` orqali Prisma clientni import qil (singleton pattern)
- Repository pattern: `src/lib/repositories/` da yangi DB logikani yoz
- Migration: `prisma migrate dev` (lokal), `prisma migrate deploy` (prod)

### Auth
- NextAuth session — server componentlarda `getServerSession(authOptions)`
- Client tomonida `auth-store.ts` (Zustand) — `useAuthStore()`
- Foydalanuvchi profili: `UserProfile` model (Prisma)
- Humo ID formati: `UZ` + 7 raqam (masalan: `UZ4829341`)

### API Routes
- `src/app/api/` da joylashgan Route Handlers
- Har bir route o'z papkasida: `route.ts`
- Auth tekshiruvi: `getServerSession()` bilan

### Komponentlar
- Market komponentlari: `src/components/market/`
- Nexus: juda katta, 60+ komponent — ehtiyot bo'l
- Shared UI: `src/components/ui/`

## Dev buyruqlari
```bash
npm run dev          # lokal server (localhost:3000)
npm run build        # prisma generate + next build
npm run lint         # ESLint
```

## .env kerakli o'zgaruvchilar
```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
BLOB_READ_WRITE_TOKEN    # Vercel Blob (avatar/cover upload)
```

## Eslatmalar
- `src/lib/crypto.ts` — location ma'lumotlari AES-256-GCM bilan shifrlangan, to'g'ridan saqlab/o'qib bo'lmaydi
- `vercel.json` — Vercel konfiguratsiyasi mavjud
- `profileEditedAt` — foydalanuvchi profilini 14 kunda bir marta tahrir qilishi mumkin
- Esport admin panel: `/esport/admin` (role-based access)
