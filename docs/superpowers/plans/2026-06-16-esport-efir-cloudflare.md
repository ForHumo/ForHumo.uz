# eSport Efir — Cloudflare Stream Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** eSport turnir efirini saytdan to'g'ridan (Cloudflare Stream Live, RTMP→LL-HLS, yozuvsiz) o'z brendli pleyerda jonli ko'rsatish; YouTube/Twitch embed alternativa sifatida saqlanadi.

**Architecture:** `StreamProvider` interfeysi (Cloudflare impl + kalitsiz stub — `PaymentProvider`/`testProvider` naqshi). `EsBroadcast` modeli `source`/`liveInputId`/`playbackId`/`streamKey`/`ingestUrl` bilan kengaytiriladi. Admin "Saytdan stream" yaratganda live input ochiladi, RTMP kalit faqat admin/egaga ko'rinadi; tomoshabin Cloudflare iframe orqali inline ko'radi.

**Tech Stack:** Next.js 15 App Router, Prisma 5.19.1 + PostgreSQL (Neon), Cloudflare Stream API (REST), TypeScript, fetch.

**Test eslatmasi:** Repoda test runner yo'q. Har task verifikatsiyasi = `npx tsc --noEmit` (xatosiz) + kerakli joyda `npm run build` yoki qo'lda API/UI tekshiruvi. Buyruqlar PowerShell'da `Set-Location "C:\Users\abduv\OneDrive\Рабочий стол\ForHumo.uz";` bilan, yoki Bash tool'da `cd "..." && ...`.

---

## Fayl tuzilishi

| Fayl | Mas'uliyat |
|---|---|
| `src/lib/esport-stream.ts` (yangi) | StreamProvider interfeysi + Cloudflare impl + stub + `getStreamProvider`/`isStreamLive` + `playbackIframeUrl` |
| `prisma/schema.prisma` (o'zgartirish) | `EsBroadcast` yangi maydonlari |
| `src/app/api/esport/broadcasts/route.ts` (o'zgartirish) | POST: `source=CLOUDFLARE` da live input yaratish; GET: maxfiy maydonlarni chiqarib tashlash |
| `src/app/api/esport/broadcasts/[id]/ingest/route.ts` (yangi) | Admin/ega-only: `{ rtmpUrl, streamKey }` (OBS) |
| `src/app/api/esport/broadcasts/[id]/route.ts` (o'zgartirish) | DELETE: Cloudflare live input'ni ham o'chirish |
| `src/app/api/esport/home/route.ts` (o'zgartirish) | Broadcast shape: `source` + `playbackUrl` (streamKey hech qachon) |
| `src/lib/esport-i18n.ts` (o'zgartirish) | Yangi `bc.*` kalitlar (uz/ru/en) |
| `src/components/esport/esport-broadcast.tsx` (o'zgartirish) | Manba toggle, ingest ko'rsatish, Cloudflare pleyer, URL fallback olib tashlash |
| `CLAUDE.md` (o'zgartirish) | Env hujjatlash |

---

## Task 1: StreamProvider qatlami (`esport-stream.ts`)

**Files:**
- Create: `src/lib/esport-stream.ts`

- [ ] **Step 1: Faylni yaratish**

```ts
// eSport jonli efir provayderi — Cloudflare Stream Live.
// PaymentProvider/testProvider naqshi: kalit bo'lsa real Cloudflare, bo'lmasa stub.
// eSport efiri YOZUVSIZ (recording.mode="off") — eng arzon, faqat jonli.

export interface LiveInput {
    liveInputId: string;   // Cloudflare live input uid
    rtmpUrl: string;       // OBS ingest (rtmps://...)
    streamKey: string;     // OBS maxfiy kalit
    playbackId: string;    // playback uid (live input uchun = uid)
}

export interface StreamProvider {
    createLiveInput(name: string): Promise<LiveInput>;
    liveInputStatus(liveInputId: string): Promise<{ live: boolean }>;
    deleteLiveInput(liveInputId: string): Promise<void>;
}

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN || "";
const CODE = process.env.CLOUDFLARE_STREAM_CODE || "";
const API = "https://api.cloudflare.com/client/v4";

// Kalitlar bormi (real rejim)?
export function isStreamLive(): boolean {
    return !!(ACCOUNT && TOKEN);
}

// Cloudflare iframe playback URL (server quradi — client env bilmaydi). Kod/id yo'q bo'lsa null.
export function playbackIframeUrl(playbackId: string | null | undefined): string | null {
    if (!playbackId || !CODE) return null;
    return `https://customer-${CODE}.cloudflarestream.com/${playbackId}/iframe`;
}

async function cf(path: string, init?: RequestInit) {
    const res = await fetch(`${API}/accounts/${ACCOUNT}/stream${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
        throw new Error(json?.errors?.[0]?.message || `Cloudflare API ${res.status}`);
    }
    return json.result;
}

const cloudflareProvider: StreamProvider = {
    async createLiveInput(name) {
        const r = await cf("/live_inputs", {
            method: "POST",
            body: JSON.stringify({ meta: { name }, recording: { mode: "off" } }),
        });
        return {
            liveInputId: r.uid,
            rtmpUrl: r.rtmps?.url || "rtmps://live.cloudflare.com:443/live/",
            streamKey: r.rtmps?.streamKey || "",
            playbackId: r.uid, // live input uchun playback = uid
        };
    },
    async liveInputStatus(liveInputId) {
        const r = await cf(`/live_inputs/${liveInputId}`);
        return { live: r?.status?.current?.state === "connected" };
    },
    async deleteLiveInput(liveInputId) {
        await cf(`/live_inputs/${liveInputId}`, { method: "DELETE" });
    },
};

// Stub — kalitsiz dev/test rejim. UI buzilmaydi.
const stubProvider: StreamProvider = {
    async createLiveInput() {
        const rnd = Math.random().toString(36).slice(2, 10);
        return { liveInputId: `test-${rnd}`, rtmpUrl: "rtmps://live.cloudflare.test/live/", streamKey: `test-key-${rnd}`, playbackId: `test-${rnd}` };
    },
    async liveInputStatus() { return { live: false }; },
    async deleteLiveInput() { /* no-op */ },
};

export function getStreamProvider(): StreamProvider {
    return isStreamLive() ? cloudflareProvider : stubProvider;
}
```

- [ ] **Step 2: Tip tekshiruvi**

Run: `npx tsc --noEmit`
Expected: xatosiz (chiqishsiz tugaydi).

- [ ] **Step 3: Commit**

```bash
git add src/lib/esport-stream.ts
git commit -m "feat(esport): StreamProvider (Cloudflare Stream Live + stub)"
```

---

## Task 2: `EsBroadcast` schema kengaytirish

**Files:**
- Modify: `prisma/schema.prisma` (EsBroadcast modeli, ~451-467)

- [ ] **Step 1: Maydonlarni qo'shish**

`streamUrl` qatoridan keyin (modelда), quyidagilarni qo'sh:

```prisma
  source       String    @default("EXTERNAL")  // EXTERNAL (YouTube/Twitch) | CLOUDFLARE; Nexus = nexusLiveId
  liveInputId  String?                          // Cloudflare live input uid
  playbackId   String?                          // Cloudflare playback uid
  streamKey    String?                          // MAXFIY — faqat admin/ega (OBS)
  ingestUrl    String?                          // RTMP ingest URL
```

- [ ] **Step 2: DB push + generate**

Run (Bash tool):
```bash
cd "C:/Users/abduv/OneDrive/Рабочий стол/ForHumo.uz" && DATABASE_URL="$(grep -m1 '^DATABASE_URL' .env.local | cut -d= -f2- | tr -d '"')" npx prisma db push --skip-generate && npx prisma generate
```
Expected: "Your database is now in sync" + "Generated Prisma Client".

- [ ] **Step 3: Tip tekshiruvi**

Run: `npx tsc --noEmit`
Expected: xatosiz.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(esport): EsBroadcast source/liveInputId/playbackId/streamKey/ingestUrl"
```

---

## Task 3: `broadcasts` POST (Cloudflare) + GET maxfiylik

**Files:**
- Modify: `src/app/api/esport/broadcasts/route.ts`

- [ ] **Step 1: Import qo'shish**

Fayl boshida `getEsportAdmin` importидан keyin:

```ts
import { getStreamProvider } from "@/lib/esport-stream";
```

- [ ] **Step 2: GET — maxfiy maydonlarni chiqarib tashlash**

GET funksiyasidagi `return` ni almashtir:

```ts
export async function GET() {
    const list = await prisma.esBroadcast.findMany({ orderBy: [{ status: "asc" }, { scheduledAt: "asc" }, { createdAt: "desc" }] });
    // streamKey/ingestUrl — maxfiy, hech qachon ro'yxatда qaytmaydi (faqat /ingest)
    const safe = list.map(({ streamKey, ingestUrl, ...rest }) => rest);
    return NextResponse.json({ broadcasts: safe });
}
```

- [ ] **Step 3: POST — source/CLOUDFLARE mantig'i**

POST funksiyasida `const status = ...` qatoridan keyin, `prisma.esBroadcast.create` o'rniga quyidagi blok:

```ts
    const status = ["LIVE", "SCHEDULED", "ENDED"].includes(b.status) ? b.status : "SCHEDULED";
    const source = b.source === "CLOUDFLARE" ? "CLOUDFLARE" : "EXTERNAL";

    let liveInputId: string | null = null, playbackId: string | null = null, streamKey: string | null = null, ingestUrl: string | null = null;
    if (source === "CLOUDFLARE") {
        try {
            const input = await getStreamProvider().createLiveInput(title.slice(0, 80));
            liveInputId = input.liveInputId; playbackId = input.playbackId; streamKey = input.streamKey; ingestUrl = input.rtmpUrl;
        } catch (e) {
            return NextResponse.json({ error: "Stream yaratib bo'lmadi — keyinroq urinib ko'ring" }, { status: 502 });
        }
    }

    const created = await prisma.esBroadcast.create({
        data: {
            title, status, source,
            streamUrl: source === "EXTERNAL" ? (b.streamUrl?.toString().trim() || null) : null,
            nexusLiveId: b.nexusLiveId?.toString().trim() || null,
            posterUrl: b.posterUrl?.toString().trim() || null,
            tournamentId: b.tournamentId?.toString() || null,
            matchId: b.matchId?.toString() || null,
            scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null,
            endsAt: b.endsAt ? new Date(b.endsAt) : null,
            liveInputId, playbackId, streamKey, ingestUrl,
            createdBy: admin.humoId || admin.id,
        },
    });
    const { streamKey: _sk, ingestUrl: _iu, ...safeCreated } = created;
    return NextResponse.json({ broadcast: safeCreated });
```

- [ ] **Step 4: Tip tekshiruvi**

Run: `npx tsc --noEmit`
Expected: xatosiz.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/esport/broadcasts/route.ts
git commit -m "feat(esport): broadcasts POST Cloudflare live input + GET maxfiylik"
```

---

## Task 4: Ingest endpoint (admin/ega-only)

**Files:**
- Create: `src/app/api/esport/broadcasts/[id]/ingest/route.ts`

- [ ] **Step 1: Faylni yaratish**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";

// GET /api/esport/broadcasts/[id]/ingest — OBS sozlash (RTMP URL + kalit). MAXFIY: faqat admin/ega.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;
    const b = await prisma.esBroadcast.findUnique({ where: { id }, select: { ingestUrl: true, streamKey: true, source: true } });
    if (!b) return NextResponse.json({ error: "Efir topilmadi" }, { status: 404 });
    if (b.source !== "CLOUDFLARE" || !b.streamKey) return NextResponse.json({ error: "Bu efir saytdan stream emas" }, { status: 400 });
    return NextResponse.json({ rtmpUrl: b.ingestUrl, streamKey: b.streamKey });
}
```

- [ ] **Step 2: Tip tekshiruvi**

Run: `npx tsc --noEmit`
Expected: xatosiz.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/esport/broadcasts/[id]/ingest/route.ts"
git commit -m "feat(esport): ingest endpoint (admin-only RTMP URL + kalit)"
```

---

## Task 5: DELETE — Cloudflare tozalash

**Files:**
- Modify: `src/app/api/esport/broadcasts/[id]/route.ts`

- [ ] **Step 1: Import qo'shish**

`getEsportAdmin` importидан keyin:

```ts
import { getStreamProvider } from "@/lib/esport-stream";
```

- [ ] **Step 2: DELETE'ни yangilash**

DELETE funksiyasidagi `await prisma.esBroadcast.delete(...)` ni quyidagi bilan almashtir:

```ts
    const b = await prisma.esBroadcast.findUnique({ where: { id }, select: { liveInputId: true } });
    if (b?.liveInputId) {
        try { await getStreamProvider().deleteLiveInput(b.liveInputId); } catch { /* fail-safe: DB baribir o'chadi */ }
    }
    await prisma.esBroadcast.delete({ where: { id } });
    return NextResponse.json({ ok: true });
```

- [ ] **Step 3: Tip tekshiruvi**

Run: `npx tsc --noEmit`
Expected: xatosiz.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/esport/broadcasts/[id]/route.ts"
git commit -m "feat(esport): DELETE broadcast Cloudflare input tozalash"
```

---

## Task 6: Home route — broadcast shape (source + playbackUrl)

**Files:**
- Modify: `src/app/api/esport/home/route.ts`

- [ ] **Step 1: Import qo'shish**

Fayl boshida `prisma` importидан keyin:

```ts
import { playbackIframeUrl } from "@/lib/esport-stream";
```

- [ ] **Step 2: `rawCasts` select'iga yangi maydonlar**

`prisma.esBroadcast.findMany({ orderBy: { scheduledAt: "desc" }, take: 40 })` — bu allaqachon to'liq qatorlarni oladi, shuning uchun `source`/`playbackId` mavjud. O'zgartirish shart emas; agar `select` qo'shilgan bo'lsa `source: true, playbackId: true` qo'sh.

- [ ] **Step 3: `broadcasts` map'iga `source` + `playbackUrl`**

`const broadcasts = rawCasts.map(b => ({ ... }))` ichidagi obyektga qo'sh (streamKey HECH QACHON):

```ts
        .map(b => ({ id: b.id, title: b.title, status: castStatus(b), streamUrl: b.streamUrl, nexusLiveId: b.nexusLiveId, posterUrl: b.posterUrl, scheduledAt: b.scheduledAt, endsAt: b.endsAt, viewers: b.viewers, source: b.source, playbackUrl: b.source === "CLOUDFLARE" ? playbackIframeUrl(b.playbackId) : null }))
```

- [ ] **Step 4: Tip tekshiruvi**

Run: `npx tsc --noEmit`
Expected: xatosiz.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/esport/home/route.ts
git commit -m "feat(esport): home broadcast shape source + playbackUrl"
```

---

## Task 7: i18n — `bc.*` kalitlar

**Files:**
- Modify: `src/lib/esport-i18n.ts`

- [ ] **Step 1: Kalitlarni qo'shish**

Lug'atдаги `bc.*` guruhiga (mavjud bc kalitlar yonига) qo'sh. Har biri `[uz, ru, en]`:

```ts
    "bc.sourceExternal": ["Tashqi havola (YouTube/Twitch)", "Внешняя ссылка (YouTube/Twitch)", "External link (YouTube/Twitch)"],
    "bc.sourceCloudflare": ["Saytdan stream", "Стрим с сайта", "Stream from site"],
    "bc.source": ["Manba", "Источник", "Source"],
    "bc.obsTitle": ["OBS sozlash", "Настройка OBS", "OBS setup"],
    "bc.rtmpUrl": ["Server (RTMP URL)", "Сервер (RTMP URL)", "Server (RTMP URL)"],
    "bc.streamKey": ["Stream kalit", "Ключ трансляции", "Stream key"],
    "bc.copy": ["Nusxa", "Копировать", "Copy"],
    "bc.copied": ["Nusxalandi", "Скопировано", "Copied"],
    "bc.obsHint": ["OBS → Settings → Stream → Custom: shu URL va kalitni qo'ying", "OBS → Settings → Stream → Custom: вставьте URL и ключ", "OBS → Settings → Stream → Custom: paste this URL and key"],
```

- [ ] **Step 2: Tip tekshiruvi**

Run: `npx tsc --noEmit`
Expected: xatosiz.

- [ ] **Step 3: Commit**

```bash
git add src/lib/esport-i18n.ts
git commit -m "feat(esport): efir Cloudflare i18n (bc.* uz/ru/en)"
```

---

## Task 8: UI — `esport-broadcast.tsx`

**Files:**
- Modify: `src/components/esport/esport-broadcast.tsx`

- [ ] **Step 1: `Broadcast` tipiga `source` + `playbackUrl`**

Tepadagi `Broadcast` interfeysiga qo'sh:

```ts
    source?: string | null; playbackUrl?: string | null;
```

- [ ] **Step 2: `useEmbedSrc` — Cloudflare + fallback olib tashlash**

`useEmbedSrc` funksiyasini quyidagi bilan almashtir (ixtiyoriy-URL `return u` OLIB TASHLANDI):

```ts
function useEmbedSrc() {
    const locale = useLocale();
    return (b: Broadcast): string | null => {
        if (b.source === "CLOUDFLARE") return b.playbackUrl || null;
        if (b.streamUrl) {
            const u = b.streamUrl.trim();
            const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/))([\w-]{11})/);
            if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0&modestbranding=1`;
            const tw = u.match(/twitch\.tv\/([A-Za-z0-9_]+)$/);
            if (tw) return `https://player.twitch.tv/?channel=${tw[1]}&parent=forhumo.uz&parent=www.forhumo.uz&autoplay=true`;
            return null; // tanilmagan URL — embed qilinmaydi (xavfsizlik)
        }
        if (b.nexusLiveId) return `/${locale}/nexus/live/${b.nexusLiveId}?embed=1`;
        return null;
    };
}
```

- [ ] **Step 3: Schedule forma — manba toggle + state**

Schedule forma komponentида (`streamUrl` state yonига) qo'sh:

```ts
    const [source, setSource] = useState<"EXTERNAL" | "CLOUDFLARE">("EXTERNAL");
    const [created, setCreated] = useState<{ id: string; rtmpUrl: string; streamKey: string } | null>(null);
```

`submit()` ichidаги fetch body'siga `source` qo'sh va Cloudflare bo'lsa ingest'ni ko'rsat:

```ts
        const r = await fetch("/api/esport/broadcasts", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, source, streamUrl: source === "EXTERNAL" ? streamUrl : null, posterUrl, scheduledAt: scheduledAt || null, endsAt: endsAt || null }),
        }).then(x => x.json()).catch(() => ({ error: "Xato" }));
        setBusy(false);
        if (r.error) return setErr(r.error);
        if (source === "CLOUDFLARE" && r.broadcast?.id) {
            const ing = await fetch(`/api/esport/broadcasts/${r.broadcast.id}/ingest`).then(x => x.json()).catch(() => null);
            if (ing?.streamKey) { setCreated({ id: r.broadcast.id, rtmpUrl: ing.rtmpUrl, streamKey: ing.streamKey }); onChanged(); return; }
        }
        setTitle(""); setStreamUrl(""); setScheduledAt(""); setEndsAt(""); setPosterUrl(""); setOpen(false); onChanged();
```

- [ ] **Step 4: Forma UI — manba tanlovi va shartli "Havola" input + OBS panel**

Formada `title` input'idan keyin, `streamUrl` input'ini quyidagi blok bilan o'ra (manba tanlovi + shartли):

```tsx
                        <div className="flex gap-1.5">
                            <button type="button" onClick={() => setSource("EXTERNAL")} className={`flex-1 rounded-xl px-2 py-1.5 text-[11px] font-bold ${source === "EXTERNAL" ? "text-white es-accent-bg" : "es-soft es-mut"}`}>{t("bc.sourceExternal")}</button>
                            <button type="button" onClick={() => setSource("CLOUDFLARE")} className={`flex-1 rounded-xl px-2 py-1.5 text-[11px] font-bold ${source === "CLOUDFLARE" ? "text-white es-accent-bg" : "es-soft es-mut"}`}>{t("bc.sourceCloudflare")}</button>
                        </div>
                        {source === "EXTERNAL" && <input value={streamUrl} onChange={e => setStreamUrl(e.target.value)} placeholder={t("bc.linkPh")} className="w-full rounded-xl px-3 py-2 text-sm font-semibold es-fg es-soft outline-none" />}
```

Formaning oxirida (submit tugmasidан keyin yoki forma o'rniga), `created` bo'lsa OBS panelini ko'rsat:

```tsx
                        {created && (
                            <div className="mt-2 flex flex-col gap-1.5 rounded-xl p-3 es-soft">
                                <p className="text-xs font-black es-fg">{t("bc.obsTitle")}</p>
                                <p className="text-[10px] es-mut">{t("bc.obsHint")}</p>
                                <CopyRow label={t("bc.rtmpUrl")} value={created.rtmpUrl} />
                                <CopyRow label={t("bc.streamKey")} value={created.streamKey} />
                                <button onClick={() => { setCreated(null); setTitle(""); setOpen(false); }} className="mt-1 rounded-lg py-1.5 text-xs font-bold text-white es-accent-bg">OK</button>
                            </div>
                        )}
```

- [ ] **Step 5: `CopyRow` yordamchi komponenti**

Fayl oxirida (boshqa komponentlar yonига) qo'sh:

```tsx
function CopyRow({ label, value }: { label: string; value: string }) {
    const t = useEsT();
    const [done, setDone] = useState(false);
    return (
        <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold uppercase es-faint">{label}</p>
                <p className="truncate text-[11px] font-mono es-fg">{value}</p>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
                className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-white es-accent-bg">{done ? t("bc.copied") : t("bc.copy")}</button>
        </div>
    );
}
```

(Agar `useState`/`useEsT` import qilinmagan bo'lsa — tepada mavjudligini tekshir; komponent allaqachon ikkalasini ishlatadi.)

- [ ] **Step 6: Tip tekshiruvi + build**

Run: `npx tsc --noEmit`
Expected: xatosiz.

Run (Bash): `cd "C:/Users/abduv/OneDrive/Рабочий стол/ForHumo.uz" && rm -rf .next/diagnostics 2>/dev/null; npm run build 2>&1 | tail -5`
Expected: "Compiled successfully".

- [ ] **Step 7: Commit**

```bash
git add src/components/esport/esport-broadcast.tsx
git commit -m "feat(esport): efir manba toggle + Cloudflare pleyer + OBS ingest UI"
```

---

## Task 9: CLAUDE.md — env hujjatlash

**Files:**
- Modify: `CLAUDE.md` (Environment o'zgaruvchilari bo'limi)

- [ ] **Step 1: Env qatorlarini qo'shish**

`BLOB_READ_WRITE_TOKEN` qatoridан keyin:

```bash
CLOUDFLARE_ACCOUNT_ID     # Cloudflare Stream (eSport jonli efir) — account id
CLOUDFLARE_STREAM_TOKEN   # Stream:Edit ruxsatli API token (live input yaratish/status/o'chirish)
CLOUDFLARE_STREAM_CODE    # customer-{CODE}.cloudflarestream.com (iframe playback)
```

Va "Muhim qoidalar"ga bir qator:

```markdown
- **eSport jonli efir:** `src/lib/esport-stream.ts` — Cloudflare Stream Live (RTMP→LL-HLS, yozuvsiz). Kalit yo'q bo'lsa **stub** (test). `streamKey` faqat `/broadcasts/[id]/ingest` (admin/ega) orqali; public/GET'da HECH QACHON qaytmaydi. eSport efiri yozuvsiz; abadiy yozuv kerak bo'lsa Nexus Live (`nexusLiveId`).
```

- [ ] **Step 2: Commit (docs-only — deploy shart emas)**

```bash
git add CLAUDE.md
git commit -m "docs: eSport efir Cloudflare Stream env + qoida"
```

---

## Task 10: Yakuniy build + deploy

- [ ] **Step 1: To'liq build**

Run (Bash): `cd "C:/Users/abduv/OneDrive/Рабочий стол/ForHumo.uz" && rm -rf .next/diagnostics 2>/dev/null; npm run build 2>&1 | tail -8`
Expected: "Compiled successfully" + sahifalar generatsiyasi.

- [ ] **Step 2: Push + deploy**

```bash
git push origin main
npx vercel deploy --prod --yes
```
Expected: deploy "READY".

- [ ] **Step 3: Qo'lda tekshiruv (stub rejim — kalitsiz)**

eSport → efir → "Rejalashtirish" → "Saytdan stream" tanla → sarlavha → saqla → **OBS paneli** (test RTMP URL + kalit) ko'rinishini tasdiqla. Kalit qo'shilgach real Cloudflare ishlaydi.

---

## Self-Review (yozuvchi tekshiruvi)

**Spec qamrovi:**
- Provider qatlami (StreamProvider + Cloudflare + stub) → Task 1 ✓
- Yozuvsiz (`recording.mode="off"`) → Task 1 createLiveInput ✓
- LL-HLS → Cloudflare live default (Task 1; iframe pleyer avtomatik) ✓
- Model maydonlari → Task 2 ✓
- POST source/CLOUDFLARE → Task 3 ✓
- GET maxfiylik (streamKey leak yo'q) → Task 3 GET + Task 6 home ✓
- Ingest endpoint (admin-only) → Task 4 ✓
- DELETE Cloudflare tozalash → Task 5 ✓
- UI manba toggle + pleyer + ingest + fallback olib tashlash → Task 8 ✓
- i18n → Task 7 ✓
- Env hujjat → Task 9 ✓

**Placeholder skan:** TBD/TODO yo'q; har kod step'да to'liq kod bor. ✓

**Tip muvofiqligi:** `LiveInput`/`StreamProvider` (Task 1) ↔ `getStreamProvider().createLiveInput` (Task 3), `deleteLiveInput` (Task 5), `playbackIframeUrl` (Task 6); `Broadcast.source/playbackUrl` (Task 8) ↔ home shape (Task 6). Mos. ✓

**Doira:** Bitta funksiya (eSport efir Cloudflare). Live chat/real viewer/WebRTC/Nexus yozuv — doiradan tashqari (spec §6). ✓
