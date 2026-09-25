# Nexus Design System Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nexus uchun token-driven, adaptive (light+dark) dizayn poydevorini qurish — `--nx-*` token qatlami + `src/components/nexus/ui/` primitiv komponentlar (avatar rounded-square, tugma, karta, badge, input, segmented, toast).

**Architecture:** `globals.css` da `.nx-scope` ostida CSS token qatlami (light default + `.dark .nx-scope` override — mavjud next-themes `.dark` mexanizmi bilan integratsiya). Nexus layout kontentini `.nx-scope` ga o'raydi. Primitivlar faqat tokenlarni ishlatadi (hardcoded rang yo'q). Bu poydevor SP1'ning birinchi bo'lagi — keyin shell componentize + 853 qiymat migratsiyasi + ekranma-ekran.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v4 (`@custom-variant dark`), next-themes, styled-jsx yo'q — primitivlar token CSS-var + Tailwind. Til: TypeScript. Ikona: lucide-react.

**Tekshiruv (loyihada test framework YO'Q — CLAUDE.md):** har taskda `npx tsc --noEmit` (toza) + jonli brauzer preview + commit. Unit test yozilmaydi.

---

### Task 1: `--nx-*` token qatlami (globals.css)

**Files:**
- Modify: `src/app/globals.css` (Nexus utility bloki yonida — `.nx-glass` atrofida)

- [ ] **Step 1: Token blokini qo'shish**

`src/app/globals.css` ga (Nexus utilities bo'limi boshiga) qo'sh:

```css
/* ── Nexus design tokens (adaptive: light default + .dark override) ───────── */
.nx-scope {
  --nx-bg:#FBFBFD; --nx-surface:#FFFFFF; --nx-surface-2:#F5F6F8; --nx-elevated:#FFFFFF;
  --nx-border:rgba(12,17,29,.09); --nx-border-2:rgba(12,17,29,.16);
  --nx-text:#0E1320; --nx-text-2:#5B6472; --nx-text-3:#98A0AE;
  --nx-accent:#2E5BFF; --nx-accent-weak:rgba(46,91,255,.10); --nx-accent-ink:#fff;
  --nx-ok:#16A34A; --nx-warn:#D97706; --nx-danger:#DC2626;
  --nx-shadow:0 1px 2px rgba(16,24,40,.06), 0 6px 20px rgba(16,24,40,.08);
  --nx-r-sm:8px; --nx-r-md:12px; --nx-r-lg:16px; --nx-r-xl:22px; --nx-r-avatar:13px;
}
.dark .nx-scope {
  --nx-bg:#0A0C12; --nx-surface:#12151E; --nx-surface-2:#171B26; --nx-elevated:#1B2130;
  --nx-border:rgba(255,255,255,.08); --nx-border-2:rgba(255,255,255,.14);
  --nx-text:#F2F4F8; --nx-text-2:#9AA3B2; --nx-text-3:#626B7A;
  --nx-accent:#4C77FF; --nx-accent-weak:rgba(76,119,255,.18); --nx-accent-ink:#fff;
  --nx-ok:#22C55E; --nx-warn:#F59E0B; --nx-danger:#EF4444;
  --nx-shadow:0 1px 0 rgba(255,255,255,.03), 0 8px 24px rgba(0,0,0,.35);
}
```

- [ ] **Step 2: Nexus layout kontentini `.nx-scope` ga o'rash**

`src/app/[locale]/nexus/layout.tsx` da — eng tashqi wrapper `div` ga `nx-scope` klassini qo'sh (mavjud klasslar yoniga). Masalan `<div className="nx-scope ...">`. (Aniq faylni ochib, mavjud root elementga `nx-scope` qo'shiladi.)

- [ ] **Step 3: Tekshirish (build + tsc)**

Run: `npx tsc --noEmit`
Expected: exit 0 (CSS tsc'ga ta'sir qilmaydi; layout o'zgarishi type-toza).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css "src/app/[locale]/nexus/layout.tsx"
git commit -m "nexus(ds): --nx-* token qatlami (light+dark) + nx-scope wrapper"
```

---

### Task 2: `NxAvatar` — rounded-square avatar

**Files:**
- Create: `src/components/nexus/ui/nx-avatar.tsx`

- [ ] **Step 1: Komponentni yozish**

```tsx
"use client";
// Nexus avatar — DOIRA emas, rounded-square (Nexus identligi, founder qarori).
import Image from "next/image";

const SIZE = { sm: 24, md: 32, lg: 42, xl: 56 } as const;

export function NxAvatar({
  src, name, size = "lg", online,
}: { src?: string | null; name?: string | null; size?: keyof typeof SIZE; online?: boolean }) {
  const px = SIZE[size];
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span style={{ position: "relative", display: "inline-block", width: px, height: px }}>
      <span
        style={{
          width: px, height: px, borderRadius: "var(--nx-r-avatar)", overflow: "hidden",
          display: "grid", placeItems: "center", color: "#fff", fontWeight: 700,
          fontFamily: "var(--nx-font-display, inherit)", fontSize: px * 0.42,
          background: "linear-gradient(135deg,#4C77FF,#7A5CFF)",
        }}
      >
        {src ? <Image src={src} alt={name ?? ""} width={px} height={px} style={{ objectFit: "cover", width: px, height: px }} /> : initial}
      </span>
      {online && (
        <span style={{
          position: "absolute", right: -1, bottom: -1, width: px * 0.28, height: px * 0.28,
          borderRadius: 999, background: "var(--nx-ok)", border: "2px solid var(--nx-bg)",
        }} />
      )}
    </span>
  );
}
```

- [ ] **Step 2: Tekshirish**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/nexus/ui/nx-avatar.tsx
git commit -m "nexus(ui): NxAvatar (rounded-square)"
```

---

### Task 3: `NxButton`

**Files:**
- Create: `src/components/nexus/ui/nx-button.tsx`

- [ ] **Step 1: Komponentni yozish**

```tsx
"use client";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "quiet" | "danger";
const base: React.CSSProperties = {
  fontWeight: 600, fontSize: 14, borderRadius: "var(--nx-r-md)", padding: "11px 18px",
  border: "1px solid transparent", cursor: "pointer", display: "inline-flex",
  alignItems: "center", gap: 8, transition: "filter .15s, background .15s",
};
const V: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--nx-accent)", color: "var(--nx-accent-ink)" },
  ghost: { background: "var(--nx-surface-2)", color: "var(--nx-text)", borderColor: "var(--nx-border)" },
  quiet: { background: "transparent", color: "var(--nx-text-2)" },
  danger: { background: "var(--nx-danger)", color: "#fff" },
};

export function NxButton(
  { variant = "primary", style, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant },
) {
  return <button {...rest} style={{ ...base, ...V[variant], ...style }} />;
}
```

- [ ] **Step 2: Tekshirish**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/nexus/ui/nx-button.tsx
git commit -m "nexus(ui): NxButton (primary/ghost/quiet/danger)"
```

---

### Task 4: `NxCard` + `NxBadge`

**Files:**
- Create: `src/components/nexus/ui/nx-card.tsx`
- Create: `src/components/nexus/ui/nx-badge.tsx`

- [ ] **Step 1: NxCard yozish**

```tsx
"use client";
import type { HTMLAttributes } from "react";
export function NxCard({ style, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} style={{
    background: "var(--nx-surface)", border: "1px solid var(--nx-border)",
    borderRadius: "var(--nx-r-lg)", boxShadow: "var(--nx-shadow)", ...style,
  }} />;
}
```

- [ ] **Step 2: NxBadge yozish**

```tsx
"use client";
type Tone = "accent" | "ok" | "warn" | "neutral";
const T: Record<Tone, React.CSSProperties> = {
  accent: { background: "var(--nx-accent-weak)", color: "var(--nx-accent)" },
  ok: { background: "rgba(34,197,94,.14)", color: "var(--nx-ok)" },
  warn: { background: "rgba(245,158,11,.14)", color: "var(--nx-warn)" },
  neutral: { background: "var(--nx-surface-2)", color: "var(--nx-text-2)" },
};
export function NxBadge({ tone = "accent", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span style={{ fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 999, ...T[tone] }}>{children}</span>;
}
```

- [ ] **Step 3: Tekshirish**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/nexus/ui/nx-card.tsx src/components/nexus/ui/nx-badge.tsx
git commit -m "nexus(ui): NxCard + NxBadge"
```

---

### Task 5: `NxInput` + `NxSegmented`

**Files:**
- Create: `src/components/nexus/ui/nx-input.tsx`
- Create: `src/components/nexus/ui/nx-segmented.tsx`

- [ ] **Step 1: NxInput yozish**

```tsx
"use client";
import { useState, type InputHTMLAttributes } from "react";
export function NxInput({ style, onFocus, onBlur, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const [f, setF] = useState(false);
  return <input {...rest}
    onFocus={(e) => { setF(true); onFocus?.(e); }}
    onBlur={(e) => { setF(false); onBlur?.(e); }}
    style={{
      fontSize: 14, background: "var(--nx-surface-2)", color: "var(--nx-text)",
      border: `1px solid ${f ? "var(--nx-accent)" : "var(--nx-border)"}`,
      boxShadow: f ? "0 0 0 3px var(--nx-accent-weak)" : "none",
      borderRadius: "var(--nx-r-md)", padding: "11px 14px", outline: "none", ...style,
    }} />;
}
```

- [ ] **Step 2: NxSegmented yozish**

```tsx
"use client";
export function NxSegmented(
  { options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (k: string) => void },
) {
  return (
    <div style={{ display: "inline-flex", gap: 2, background: "var(--nx-surface-2)", border: "1px solid var(--nx-border)", borderRadius: 999, padding: 3 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button key={o.key} onClick={() => onChange(o.key)}
            style={{
              border: "none", background: on ? "var(--nx-elevated)" : "transparent",
              color: on ? "var(--nx-text)" : "var(--nx-text-2)", fontWeight: 600, fontSize: 13,
              padding: "6px 14px", borderRadius: 999, cursor: "pointer",
              boxShadow: on ? "var(--nx-shadow)" : "none",
            }}>{o.label}</button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Tekshirish**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/nexus/ui/nx-input.tsx src/components/nexus/ui/nx-segmented.tsx
git commit -m "nexus(ui): NxInput + NxSegmented"
```

---

### Task 6: `NxToast` — `alert()` o'rniga premium toast

**Files:**
- Create: `src/components/nexus/ui/nx-toast.tsx`

- [ ] **Step 1: Toast provider + hook yozish**

```tsx
"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Tone = "info" | "success" | "error";
type Toast = { id: number; text: string; tone: Tone };
const Ctx = createContext<(text: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function NxToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Tone = "info") => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, text, tone }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3200);
  }, []);
  const color = (t: Tone) => t === "success" ? "var(--nx-ok)" : t === "error" ? "var(--nx-danger)" : "var(--nx-accent)";
  return (
    <Ctx.Provider value={push}>
      {children}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 9999, pointerEvents: "none" }}>
        {items.map((t) => (
          <div key={t.id} style={{
            background: "var(--nx-elevated)", color: "var(--nx-text)", border: "1px solid var(--nx-border)",
            borderLeft: `3px solid ${color(t.tone)}`, borderRadius: "var(--nx-r-md)", boxShadow: "var(--nx-shadow)",
            padding: "12px 16px", fontSize: 14, fontWeight: 500, maxWidth: 420,
          }}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
```

- [ ] **Step 2: Provider'ni Nexus layout'ga ulash**

`src/app/[locale]/nexus/layout.tsx` da `nx-scope` wrapper ichini `<NxToastProvider>` bilan o'rab qo'y (import qo'sh). Bu keyin `alert()` larni `useToast()` bilan almashtirishga tayyorlaydi (per-ekran, SP2).

- [ ] **Step 3: Tekshirish**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/nexus/ui/nx-toast.tsx "src/app/[locale]/nexus/layout.tsx"
git commit -m "nexus(ui): NxToast provider (alert o'rniga tayyor)"
```

---

### Task 7: Jonli tekshiruv + push

**Files:** (yo'q — verifikatsiya)

- [ ] **Step 1: To'liq tsc**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Jonli tekshiruv (dev)**

Nexus'ni ochib (auth kerak — founder), light/dark almashtirib, buzilmaganini tekshir: mavjud ekranlar ishlaydi, `.nx-scope` tokenlari yuklangan (DevTools'da `--nx-bg` ko'rinadi). Yangi primitivlar hali hech joyda ishlatilmagan — regressiya bo'lmasligi kerak.

- [ ] **Step 3: Push (deploy)**

```bash
git push origin main
```

---

## Keyingi rejalar (SP1 davomi — alohida plan)
- **Plan 2:** `nx-social-desktop.tsx` (10K) componentize — NavRail/TopBar/FeedColumn/RightRail bo'laklarga.
- **Plan 3:** 853 hardcoded rangni tokenga ko'chirish (skript + qo'lda) + 48 `alert()` → `useToast()`.
- **Plan 4+ (SP2):** Feed ekranini primitivlar+token bilan redesign (birinchi to'liq ekran), keyin Profil, Video/Shorts...

---

## Self-Review (spec qamrovi)
- Token qatlami (spec 3.1) → Task 1 ✅
- Tipografiya (3.2) → tokenlar + primitivlarda `--nx-font-*` ishlatiladi; font ulash Plan 2'da layout bilan (izoh: NxAvatar `--nx-font-display` fallback bilan xavfsiz).
- Radius/avatar rounded-square (3.3) → Task 1 (`--nx-r-avatar`) + Task 2 ✅
- Primitivlar (3.6) → Task 2-6 (Avatar/Button/Card/Badge/Input/Segmented/Toast) ✅
- Shell componentize (3.7) → Keyingi Plan 2 (scope: bu plan poydevor)
- Migratsiya (3.8 A,B) → Task 1 (A token) + Task 2-6 (B primitiv); C/D keyingi planlar
- Non-goals (emoji yo'q, brend moviy, adaptive) → tokenlar + SVG, funksiya tegilmaydi ✅
