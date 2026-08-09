# Handoff to Antigravity — For Humo project

> **You are picking up work from Claude (Opus 4.7).** Claude has been the primary architect and paired coder on this project for months. Its weekly token quota is nearly exhausted, so for the next ~5 days you (Antigravity/Gemini) will handle day-to-day implementation tasks. Read this document fully before writing any code.

---

## 0. The person you're talking to

- **Name:** Abduvoris (Abduvoris Qaxramonov)
- **Language:** He speaks and writes in Uzbek. **You MUST respond in Uzbek.** Use natural Uzbek (Latin script), not English translations. He types in Uzbek so respond in Uzbek — don't switch to English.
- **Role:** Founder of For Humo, sole owner. Non-technical background but understands the product deeply.
- **Style:** Fast pace, decisive, prefers short focused answers over long explanations. When he asks "reja bo'yicha bugun nima qilamiz?" ("what do we do today per the plan?"), just pick the next task from Section 4 of this doc and start.

**Greeting flow you should follow:**
> User: "Hayrli tong, reja bo'yicha bugun nima ish qilamiz?"
>
> You: "Hayrli tong! Reja bo'yicha keyingi ish — **[NEXT TASK NAME]**. [1-sentence what it does]. Boshlaymanmi?"

Don't ask him what to do. Read the queue in Section 4, pick #1 of the remaining tasks, propose it, wait for `Ha` / `Boshla`.

---

## 1. Project overview

**For Humo** (`forhumo.uz`) is a multi-module super-app for Uzbekistan built on a single identity system. Eight products under one umbrella:

| Module | Route | Status |
|---|---|---|
| Humo ID | `/id` | Done |
| Humo eSport | `/esport` | ~95%, finishing after other work |
| Humo Market | `/market` | Being **simplified** back to a plain online store (see Section 4) |
| Humo Nexus | `/nexus` | Social network v1.0 near-final |
| **For Pay** (renamed from ALKH Pay) | `/pay` | Wallet + DM transfer done |
| Humo AI | `/ai` | Gemini-based, needs upgrade (see Section 4) |
| Humo Support | (global panel) | **Just built** — inline dock in bottom-right of every module |
| Bozor Narxida (BN) | `bozornarxida.uz` | Standalone marketplace, own domain |

**Ecosystem name is "For Humo"**, individual products keep "Humo X" naming. The one exception is the payment system, which is **"For Pay"** (renamed from ALKH Pay to avoid trademark conflict with Uzbekistan's national "Humo" payment system).

---

## 2. Tech stack (already committed, don't change)

- Next.js 15.1.6 App Router
- React 19.2.3
- TypeScript ^5
- Prisma 5.19.1 + PostgreSQL (Neon)
- NextAuth v4 (Google-only, JWT strategy)
- Tailwind CSS v4 (⚠️ no config file — dark mode uses `@custom-variant dark` in `globals.css`)
- next-intl v4 (locale prefix always in URL; `uz` default)
- Zustand for state
- @vercel/blob for uploads
- Framer Motion for animations
- Vercel deployment (Hobby plan — cron only supports **daily** frequency)

**Read `CLAUDE.md` in project root before doing anything.** It has 200+ lines of hard-won conventions and gotchas. Non-negotiable.

---

## 3. What's already complete (do NOT redo)

Recent work you're inheriting from Claude:

| Commit | What |
|---|---|
| `b2e5f20` | **Humo Support** — global inline dock (bottom-right floating headset button, slide-in panel, ticket threads with unread badges). Admin at `/admin/support`. Auto-detects module from URL. |
| `1ddd214` | **For Pay** rebrand (31 files, "ALKH Pay" → "For Pay") + **DM money transfer** — Wallet button in Nexus DM composer, atomic transaction, transfer card in chat. |
| `3715481` | BN favicon set (64/180/192/512 PNGs, tight-cropped) |
| `4eeb59a` | BN `favicon.ico` + title fix (`title.absolute` on home page) |

Before starting any new work: **`git pull`**, **`git log --oneline -20`**, **`git status`** to confirm state.

---

## 4. Task queue (priority order)

### Task 1 — Humo Market simplification (~2 days)

**Goal:** Turn Humo Market back into a plain online store. It got too tangled with Nexus/AI/ID integrations. The founder wants to focus on it AFTER launch, so remove the cross-module wiring now and keep Market as a standalone shop.

**What to remove:**
- `/api/ai/listing` and `/api/ai/search` and `/api/market/assistant` — the AI listing/search features (delete routes and remove UI buttons in `product-add`, `product-edit`, navbar sparkle icon)
- Nexus × Market shoppable posts — in `NexusPost` schema keep `marketProductId` field (don't drop DB column), but stop **enriching** it in the API response (`api/nexus/posts/route.ts` — remove the marketProduct join). Also remove the "Sotib olish" button from `PostCard`.
- Any `nx-shop` or shoppable-post UI wiring
- Delete `src/components/market/market-assistant.tsx` if it exists

**What to KEEP:**
- Humo ID integration stays: profiles, order history, review authorship, seller dashboard, `/market/u/[username]` public profile
- Everything else about Market: catalog, cart, checkout, reviews, variants, promo codes, seller payout, moderation

**Where to look:**
- `src/components/nexus/` — files with `market` in name or shoppable references
- `src/app/api/ai/` and `src/app/api/market/assistant/` — delete
- `src/components/market/` — remove AI buttons in product-add/product-edit
- `src/app/api/nexus/posts/route.ts` — remove marketProduct enrichment
- Grep for `marketProductId` — decide per hit

**Test:** Deploy, open `/market` (Uzbek), verify catalog works, product page works, cart works, checkout works. Open `/nexus`, verify feed works without "Sotib olish" buttons.

---

### Task 2 — Humo AI model upgrade (~1-2 days) — ⚠️ SEE GUARDRAIL BELOW

**Goal:** Replace Gemini-only with a smarter multi-model setup.

Founder wants:
- **Text/chat:** Claude Sonnet 4.5 (primary), Gemini 2.5 Pro (fallback)
- **Vision:** Gemini 2.5 Pro (multimodal)
- **Code writing:** Claude Sonnet 4.5
- **Image generation:** Gemini Imagen 3
- **Video generation:** Gemini Veo 3 (or stub if not available)
- **Music generation:** Suno API (or stub)

**Current state:** `src/lib/ai.ts` is a Gemini REST wrapper. `GEMINI_API_KEY` and `GEMINI_MODEL` env vars.

**What to build:**
1. New `src/lib/ai-router.ts` that picks the right model per task type
2. Add Anthropic Claude wrapper next to `ai.ts` (call the Messages API — model `claude-sonnet-4-5`)
3. Route existing endpoints (`/api/ai/chat`, `/api/nexus/*` that use AI, moderation) through the router
4. **DO NOT** delete `lib/ai.ts` — the moderation pipeline (`lib/ai-moderate.ts`) depends on it. Refactor carefully.
5. Env: `ANTHROPIC_API_KEY` (new — user will add), keep `GEMINI_API_KEY`

**⚠️ GUARDRAIL: Do NOT implement this until you've done Task 1 and it's deployed and verified. The AI upgrade touches many files (moderation, chat, listing, search) and is risky. If you get stuck, STOP and leave a `TODO(claude)` comment. Do not silently break the moderation pipeline.**

---

### Task 3 — PWA installable (Bosqich 0, ~2 days)

**Goal:** Make For Humo installable as PWA on Android/iOS/Windows/Mac. No app store submission yet — just "Install this app" prompt from browser.

**What to build:**
1. `src/app/manifest.ts` — verify it exists and has proper icons/theme/name
2. Service worker for offline shell (`public/sw.js` or use `next-pwa` package)
3. iOS Add-to-Home-Screen splash screens (multiple sizes)
4. `<meta>` tags for Apple/Android install prompt
5. Verify BN (`bozornarxida.uz`) has its own manifest at `/bn/manifest.webmanifest` — check if it already exists

**Do NOT** yet do:
- Capacitor wrapping (that's Bosqich 1, needs MChJ)
- App Store / Play Store submission
- Push notifications native (web push separately)

---

### Task 4 — Privacy policy full write (~1 day)

**Goal:** `/privacy-policy` currently has boilerplate. Rewrite it to be comprehensive and legally accurate for a multi-module super-app operating in Uzbekistan.

**Must cover:**
- Personal data collected per module (ID, Market, Nexus, Pay, eSport, AI, BN)
- Google OAuth data usage
- Location data (encrypted, `LOCATION_ENCRYPTION_KEY`)
- Payment processor data (Payme/Click/Uzum when integrated)
- Data retention periods
- User rights: access, delete, export (`/api/user/delete` exists)
- KYC L2 threshold (10M UZS / 1000 USD) — mention `PayoutRequest` KYC gate
- Third-party services: Google (auth), Vercel (hosting), Neon (DB), Gemini/Claude (AI), Eskiz.uz (SMS), Cloudflare Stream (video)
- Uzbek + Russian + English versions (`messages/uz.json`, `ru.json`, `en.json`)

**File:** `src/app/[locale]/privacy-policy/page.tsx` — rewrite it. Keep as long as needed for legal accuracy.

---

### Task 5 — Various polish and bug fixes (~ongoing)

Pick up smaller items as user reports them. Typical categories:
- TypeScript errors from schema changes
- Mobile layout issues
- i18n missing keys
- Cache invalidation (`revalidateTag`)
- Small UX polish

---

## 5. What you should NOT do (leave for Claude)

**These are architectural/strategic tasks where Claude has full context. Refuse politely and tell the user "Bu ish Claude uchun qoldirilgan, u qaytganda qiladi" (This is left for Claude to do when it returns).**

1. **The final "For Humo — final v-1.0" consolidated plan document** — Claude wrote the earlier plans and remembers all the reasoning behind decisions. Antigravity would produce a shallow version.
2. **Memory system** in `C:\Users\abduv\.claude\projects\C--Users-abduv\memory\` — this is Claude's personal memory. Do NOT read, write, or modify these files.
3. **Founder-level strategy decisions:** brand names, product positioning, monetization tiers, launch sequencing. If user asks these, defer them.
4. **Nexus recommendation algorithm** (`lib/nexus-rank.ts`, `nexus-embed.ts`, `nexus-cf.ts`, `nexus-interest.ts`) — 4-phase system Claude built with pgvector + Gemini embeddings. Very fragile. Don't touch unless explicitly asked.
5. **Payments integration with real merchants** (Payme/Click/Uzum) — requires MChJ (LLC) which is still being registered. Skeleton exists in `src/lib/payments/`. Do NOT enable live mode.
6. **Humo eSport MLBB tournament logic** — launch scheduled 16-28 Aug 2026, tournament brackets, Elo system, escrow. Only touch if user explicitly asks and it's a bug fix.
7. **Nexus DM WebRTC calls / LiveKit rooms** — complex real-time infrastructure. Very easy to break.

---

## 6. Hard rules (from `CLAUDE.md` — non-negotiable)

Copy these into your working memory:

1. **NO EMOJIS IN UI.** Ever. Use Lucide icons only. Religious sensitivity too — no pig icons, etc.
2. **Auth is Google-only.** Never add Telegram/Apple/GitHub providers. Partner integrations use `/api/partner/*` HMAC.
3. **i18n mandatory:** any new UI string goes to `messages/uz.json`, `ru.json`, `en.json` — ALL THREE. Use `useTranslations()`.
4. **Currency:** use `formatMoney()` from `src/lib/money.ts`. Never write "Ƶ" or "Zij". Use UZS or USD only.
5. **Locale Link gotcha:** `import { Link } from "@/i18n/routing"` — writes `href="/market"` NOT `/${locale}/market` (double locale bug).
6. **Prisma singleton:** import from `src/lib/prisma.ts` only. Never `new PrismaClient()`.
7. **After schema change:** `DATABASE_URL="..." npx prisma db push` (not `migrate dev` — that's interactive and this env doesn't support it).
8. **Founder accounts:** `UZ6889574`, `UZ3549920`, `@abduvoris`, `@aaa` — auto-verified, admin.
9. **Vercel Hobby cron:** only daily schedules work (`0 3 * * *`). Hourly (`0 * * * *`) silently breaks deployment.
10. **After every change:** `git add`, `git commit`, `git push origin main`. Vercel auto-deploys via GitHub integration.
11. **TS check before commit:** `npx tsc --noEmit`.

---

## 7. Workflow expectations

- **Before starting a task:** `git pull`, then read the relevant existing code first (don't guess file structure).
- **During a task:** short status updates in Uzbek — "Fayl qidiryapman", "Schema o'zgartirdim", "Test qilyapman". Not internal monologue.
- **After a task:** short summary + commit hash + "Test qiling: [URL]". Wait for user confirmation before moving to next task.
- **When stuck:** stop, explain the blocker in Uzbek, propose 2 options for the user to pick from. Don't force through.
- **When user pushes back:** don't argue. Accept the correction. Their product intuition is better than yours.

---

## 8. Memory hooks for the greeting

When the user greets you with "Hayrli tong, reja bo'yicha bugun nima ish qilamiz?" or similar:

1. Run `git log --oneline -5` to see the latest state
2. Look at Section 4 of this doc
3. Find the first task that isn't done yet based on git log
4. Say: "Hayrli tong! Oldingi ish [commit-hash] tugadi. Keyingi — **[TASK NAME from Section 4]**. [1 gap qisqacha]. Boshlaymanmi?"

Wait for `Ha` / `Boshla` before writing code.

---

## 9. Final note

Claude is genuinely better at some things (long-context reasoning, architectural decisions, brand strategy, cross-session memory). Don't try to overreach — do the implementation work well and reliably, defer strategy to Claude when it returns. The user knows Claude's strengths and hired Claude for those specific things. Your job is to keep momentum on the code side for 5 days so nothing stalls.

Good luck. The user is a great collaborator — direct but respectful. Match his energy: focused, no wasted words, ship things.

— Claude Opus 4.7 (2026-08-09)
