# Nexus Premium Redesign — Dizayn Spec

**Sana:** 2026-09-25
**Yo'nalish:** Refined + Adaptive (tasdiqlangan)
**Holat:** Poydevor (SP1) spec — keyingi ekranlar alohida siklda

---

## 1. Maqsad / Vizion

Humo Nexus'ni **o'ta premium, 2026-yil ijtimoiy tarmoqlari bilan raqobatlasha oladigan** darajaga olib chiqish. Founder brifi: **"hammaga birdek mos"** — universal, inkluziv, hech kimni chetlatmaydigan premium.

**Dizayn tili — Refined + Adaptive:**
- **Vazminlik (restraint)** — glass/glow/rangin-gradient o'rniga chuqur tinch asos, bitta intizomli aksent, puxta tipografiya, nozik chegara/soya. (2026 premium: Linear/Arc/yangi X tili.)
- **Adaptive** — Yorug' VA Qorong'i teng first-class (har kim o'zinikini tanlaydi = "hammaga mos").
- **Accessibility** — yuqori kontrast (WCAG AA), aniq ikonalar, tabular raqamlar.

**Muhim:** Redesign **VIZUAL** — funksiya olib tashlanmaydi. Yo'l-yo'lakay yopiladigan qarzlar: 48 native `alert()` → premium toast; e-kitoblar (yagona qurilmagan feature); ~40 o'lik mock modal tozalash.

---

## 2. Dekompozitsiya (kichik loyihalar)

Nexus juda katta (150 komponent · 244 API · ~74K qator) — bitta spec/plan uchun juda katta. Bo'lamiz:

- **SP1 (bu spec):** Dizayn tizimi poydevori — token qatlami + primitiv komponentlar + `nx-social-desktop.tsx` monolitini bo'laklash.
- **SP2+:** Ekranma-ekran redesign — har biri alohida spec→plan→implement. Prioritet: **Feed → Profil → Video/Shorts → Kanal/DM → Live → Musiqa/Karaoke → Reklama/Analitika → Sozlama**.
- **SP-oxiri:** Play tayyorlash (Nexus TWA — BN/eSport naqshi).

Har ekran redesign'ida: yangi tizimni qo'llash + o'sha ekrandagi chala/alert/dead-kodni yopish (birga, rework'siz).

---

## 3. SP1 — Dizayn tizimi poydevori (bu spec fokusi)

### 3.1 Ranglar — token qatlami

**Muammo:** hozir `#00cec8` **853 marta qo'lda yozilgan**, `--nx-*` token yo'q → dizaynni tizimli o'zgartirib bo'lmaydi.

**Yechim:** `globals.css` da `.nx-scope` (Nexus layout root) ostida token qatlami — light + dark. Barcha Nexus ranglar shundan.

| Token | Dark | Light | Vazifa |
|-------|------|-------|--------|
| `--nx-bg` | `#0A0C12` | `#FBFBFD` | Asos fon |
| `--nx-surface` | `#12151E` | `#FFFFFF` | Karta/panel |
| `--nx-surface-2` | `#171B26` | `#F5F6F8` | Ichki yuza, input |
| `--nx-elevated` | `#1B2130` | `#FFFFFF` | Modal/overlay |
| `--nx-border` | `rgba(255,255,255,.08)` | `rgba(12,17,29,.09)` | Hairline chegara |
| `--nx-border-2` | `rgba(255,255,255,.14)` | `rgba(12,17,29,.16)` | Kuchli chegara |
| `--nx-text` | `#F2F4F8` | `#0E1320` | Asosiy matn |
| `--nx-text-2` | `#9AA3B2` | `#5B6472` | Ikkilamchi |
| `--nx-text-3` | `#626B7A` | `#98A0AE` | Uchlamchi/meta |
| `--nx-accent` | `#4C77FF` | `#2E5BFF` | **Yagona aksent (moviy)** |
| `--nx-accent-weak` | `rgba(76,119,255,.18)` | `rgba(46,91,255,.10)` | Aksent fon |
| `--nx-ok` / `--nx-warn` / `--nx-danger` | `#22C55E` / `#F59E0B` / `#EF4444` | `#16A34A` / `#D97706` / `#DC2626` | Semantik |

- **Aksent yagona** — gradient/glow interfeysda YO'Q (faqat logotipda mumkin). Brend moviyligi saqlanadi.
- Dark/light almashtirish: `.nx-scope[data-theme]` yoki OS `prefers-color-scheme` (Tailwind v4 `.dark` variant bilan mos — `globals.css @custom-variant dark` saqlanadi).

### 3.2 Tipografiya

- **Display:** `Sora` (600/700) — sarlavhalar, brend, katta raqamlar. Premium xarakter.
- **Text:** `Inter` (400/500/600/700) — gavda, UI, tabular raqamlar (narx/statistika).
- `next/font/google` orqali, Nexus layout'da `--nx-font-display` / `--nx-font-text` sifatida.
- Scale (px): 12, 13, 14, 15, 17, 20, 24, 32, 40. Display'da tracking `-.02em`.

### 3.3 Shakl / o'lcham / chuqurlik

- **Radius:** sm 8, md 12, lg 16, xl 22, full 999.
- **Avatar = rounded-square (radius ~13px), DOIRA EMAS** — hozirgi Nexus profil identligini saqlaydi (founder qarori). Butun tizimda avatar shu shakl.
- **Spacing:** 4-asosli (4/8/12/16/20/24/32...).
- **Chuqurlik:** Light = nozik soya (`0 1px 2px + 0 6px 20px` past alpha). Dark = surface elevation + subtle border. **Neon glow YO'Q.**

### 3.4 Motion

- Vazmin: o'tishlar 150–250ms, standart easing. Overshoot (`cubic-bezier(.34,1.56,.64,1)`) faqat "delight" nuqtalarda (like bosish). Hozirgi ripple/glow/shake kamaytiriladi.
- `prefers-reduced-motion` to'liq qo'llanadi.

### 3.5 Ikonografiya

- Lucide/SVG, stroke ~1.9. **EMOJI YO'Q** (qat'iy founder qoidasi; cho'chqa va h.k. yo'q).
- **48 ta native `alert()` → premium `Toast`** primitivi (in-app, non-blocking).

### 3.6 Primitiv komponentlar — yangi `src/components/nexus/ui/`

Har biri token bilan ranglanadi, light+dark, accessible:

- `NxButton` — primary / ghost / quiet / danger; o'lchamlar; loading holati.
- `NxCard` — hairline chegara + nozik soya.
- `NxInput` / `NxTextarea` — fokus ring (accent-weak).
- `NxBadge` / `NxChip` — accent / ok / warn / neutral.
- `NxAvatar` — **rounded-square**, o'lchamlar (24/32/42/56), fallback bosh harf gradient, online dot.
- `NxSegmented` / `NxTabs` — "Siz uchun / Kuzatuvlar" kabi.
- `NxSheet` / `NxModal` — elevated + backdrop.
- `NxToast` — `alert()` o'rniga (success/error/info).
- `NxNavItem` — active = accent-weak fon + accent matn.
- `NxActionBar` — post like/izoh/repost/saqlash (feed uchun).

### 3.7 Shell'ni bo'laklash — `nx-social-desktop.tsx` (10 033 qator)

- **Muammo:** 10K qator bitta faylda — toza redesign imkonsiz, kontekstga sig'maydi.
- **Yondashuv:** mantiqiy bo'laklarga ajratish — `NxNavRail`, `NxTopBar`, `NxFeedColumn`, `NxRightRail`, va inline modallar alohida fayllarga. Maqsad: har bo'lak < ~400 qator, bitta aniq vazifa.
- **⚠️ Bu eng og'ir ish** — bosqichma-bosqich, har ajratishdan keyin `tsc` + jonli tekshiruv. Xatti-harakat o'zgarmaydi (faqat struktura + stil).

### 3.8 Migratsiya strategiyasi (ishlab turgan ilovani buzmasdan)

1. **A — Token qatlami:** `--nx-*` ni globals.css ga qo'shish. Mavjud hardcoded ranglar parallel ishlayveradi.
2. **B — Primitivlar:** `nexus/ui/` yaratish, token bilan.
3. **C — Ko'chirish:** 853 hardcoded qiymatni tokenga (skript-yordamli + qo'lda tekshiruv). Yangi kod faqat token.
4. **D — Shell componentize** (3.7).
5. **E — Feed ekranini** yangi tizim+primitivlarda (birinchi namuna ekran → SP2 ga ko'prik).

Har bosqich: `npx tsc --noEmit` + jonli tekshiruv + commit + push.

---

## 4. Non-goals / cheklovlar

- Funksiya **olib tashlanmaydi** — redesign faqat vizual + polish (alert→toast, e-books, dead-kod bundan mustasno).
- **Brend moviy saqlanadi** (aksent). **Shoppable** (Nexus×Market "Sotib olish") saqlanadi. **Verified** belgi saqlanadi. **Avatar = rounded-square.**
- **Emoji yo'q. Auth faqat Google.** Tailwind v4 dark variant (`@custom-variant dark`) buzilmaydi.
- Til: i18n uz/ru/en — yangi UI matni uchalasiga.

---

## 5. Muvaffaqiyat mezoni (SP1)

- Barcha Nexus ekranlari **yagona token tizimidan** ranglanadi (yangi hardcoded rang = 0).
- `nx-social-desktop.tsx` **bo'laklarga** bo'linadi (har biri fokuslangan, kontekstga sig'adigan).
- Primitiv komponentlar (`nexus/ui/`) tayyor, light+dark ishlaydi, `alert()` toast'ga o'tadi.
- **Feed ekrani** yangi tizimda ishlaydi (namuna) — `tsc` toza, jonli tasdiqlangan.

---

## 6. Keyingi (SP2+) — ekran prioriteti

Har biri alohida spec→plan: **Feed → Profil → Video/Shorts → Kanal/DM → Live → Musiqa/Karaoke → Reklama/Analitika → Sozlama → Play tayyorlash.**
