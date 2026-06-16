# Humo eSport — O'z brendli jonli efir (Cloudflare Stream Live)

**Sana:** 2026-06-16
**Modul:** Humo eSport — Turnir efiri (broadcast)
**Maqsad:** Turnir efirini YouTube/Twitch'ga bog'liqlikdan ozod qilib, saytdan to'g'ridan-to'g'ri (RTMP→HLS) o'z brendli, past-kechikishli jonli stream qilish. Launch: 16–28 avgust 2026.

## 1. Kontekst va muammo

eSport efiri (`EsBroadcast` + `esport-broadcast.tsx`) hozir **tashqi embed** orqali ishlaydi:
- `useEmbedSrc` YouTube/Twitch URL'ni inline iframe'ga aylantiradi (16:9 oynada, autoplay).
- `nexusLiveId` → Nexus Live efiriga bog'lanish.

Bu launchga **funksional**, lekin: (a) YouTube/Twitch brendi, reklama, "tashqarida ko'rish" clickthrough; (b) yuqori kechikish (YouTube ~15–30s); (c) ixtiyoriy URL fallback (`return u`) — iframe'ga har qanday URL soladi (admin-only, lekin xavf).

**Yechim:** Cloudflare Stream Live integratsiyasi — saytdan to'g'ridan stream, o'z pleyerimizda, **Low-Latency HLS** (~3–8s) bilan YT/Twitch'dan past kechikish.

## 2. Asosiy qarorlar (tasdiqlangan)

| Qaror | Tanlov |
|---|---|
| Provider | **Cloudflare Stream Live** |
| Yozuv (eSport) | **Faqat jonli, yozuvsiz** (`recording.mode="off"`) — eng arzon |
| Yozuv (Nexus) | Nexusda abadiy — mavjud `nexusLiveId` yo'li (bu spec doirasidan tashqari) |
| Kechikish | **Low-Latency HLS** (toggle, xarajatsiz "yaxshiroq" lever) |
| Pleyer | Cloudflare `<stream>` web-komponenti (brendlash/overlay nazorati) |
| Tashqi embed | YouTube/Twitch **saqlanadi** (alternativa sifatida) |
| Kalit yo'q holati | Stub provider (test qiymat) — kalitsiz ham quriladi, keyin yoqiladi |

## 3. Arxitektura

### 3.1 Provider qatlami — `src/lib/esport-stream.ts`
Kodbazadagi `PaymentProvider`/`testProvider` naqshiga mos. Interfeys:

```ts
interface StreamProvider {
  createLiveInput(name: string): Promise<{
    liveInputId: string;   // Cloudflare live input uid
    rtmpUrl: string;       // OBS ingest (rtmps://...)
    streamKey: string;     // OBS maxfiy kalit
    playbackId: string;    // HLS/iframe playback uid
  }>;
  liveInputStatus(liveInputId: string): Promise<{ live: boolean }>;
  deleteLiveInput(liveInputId: string): Promise<void>;
}
```

- **Cloudflare impl:** `POST /accounts/{acct}/stream/live_inputs` (`recording:{mode:"off"}`, `meta:{name}`); LL-HLS yoqilgan. Status: `GET .../live_inputs/{id}` → `status.current.state === "connected"`.
- **Stub impl:** `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_STREAM_TOKEN` bo'lmasa — test qiymat qaytaradi (`rtmps://test...`, `streamKey:"test-..."`), `live:false`. UI dev'da ishlaydi.
- `getStreamProvider()` — kalit bor/yo'qligiga qarab tanlaydi (`isStreamLive()`).
- Playback URL: `https://customer-{CODE}.cloudflarestream.com/{playbackId}/iframe` (yoki `<stream>` komponenti `src={playbackId}`). `CLOUDFLARE_STREAM_CODE` env.

### 3.2 Ma'lumot modeli — `EsBroadcast` kengaytirish
Yangi maydonlar:
- `source String @default("EXTERNAL")` — `EXTERNAL` | `CLOUDFLARE` (Nexus uchun mavjud `nexusLiveId`).
- `liveInputId String?` — Cloudflare input uid.
- `playbackId String?` — Cloudflare playback uid.
- `streamKey String?` — **maxfiy**; faqat admin/ega ko'radi.
- `ingestUrl String?` — RTMP ingest URL.

Mavjud maydonlar (`streamUrl`, `nexusLiveId`, `posterUrl`, `status`, `scheduledAt`, `endsAt`, `viewers`) o'zgarmaydi.

### 3.3 API
- **`POST /api/esport/broadcasts`** (admin) — `source:"CLOUDFLARE"` bo'lsa `createLiveInput` chaqiriladi, natija (liveInputId/playbackId/streamKey/ingestUrl) saqlanadi. `EXTERNAL` — hozirgидек.
- **`GET /api/esport/broadcasts/[id]/ingest`** (admin/ega only) — `{ rtmpUrl, streamKey }` (OBS sozlash). Maxfiy, alohida endpoint.
- **`PATCH /api/esport/broadcasts/[id]`** — status (Jonli/Tugadi), maydonlar (mavjud).
- **`DELETE /api/esport/broadcasts/[id]`** — `liveInputId` bo'lsa Cloudflare input'ni ham o'chiradi (tozalash).
- **Public GET** (`/home`, broadcasts) — `CLOUDFLARE` uchun playback iframe URL beradi; **`streamKey` hech qachon qaytarilmaydi**. Status — vaqt-asosli avto + admin toggle (Cloudflare har so'rovда chaqirilmaydi).

### 3.4 UI — `esport-broadcast.tsx`
- Schedule forma: **manba tanlovi** — "Tashqi havola (YouTube/Twitch)" | "Saytdan stream (Cloudflare)".
- Cloudflare tanlanса: yaratilgach **RTMP URL + stream kalit** (nusxa tugmasi) + qisqa OBS yo'riqномаси + "Jonli/Tugatish" tugmasi.
- Pleyer: `source==="CLOUDFLARE"` → Cloudflare `<stream>` komponenti (yoki iframe) inline 16:9. `EXTERNAL`/Nexus — hozirgидек.
- **Xavfsizlik:** `useEmbedSrc`dagi `return u` (ixtiyoriy URL) fallback **olib tashlanadi** — faqat YouTube/Twitch/Nexus/Cloudflare.

### 3.5 i18n
Yangi UI matnlari (`bc.*` kalitlar: manba tanlovi, OBS yo'riqnomasi, nusxa, jonli/tugatish) `esport-i18n.ts`ga uz/ru/en qo'shiladi.

### 3.6 Env (CLAUDE.md'ga hujjatlash)
```
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_STREAM_TOKEN     # Stream:Edit ruxsatli API token
CLOUDFLARE_STREAM_CODE      # customer-{CODE}.cloudflarestream.com
```

## 4. Xatoliklar va chetki holatlar
- Kalit yo'q → stub (UI ishlaydi, "test rejim").
- Cloudflare API xato (create) → 502, jamoaga aniq xabar; broadcast yaratilmaydi.
- `streamKey` faqat admin/ega GET'ida; public javobda hech qachon yo'q.
- DELETE'да Cloudflare o'chirish xato bersa — DB yozuvi baribir o'chadi (fail-safe), input keyin Cloudflare panelida tozalanadi.
- Status: jonli aniqlash asosan vaqt+admin toggle; Cloudflare `liveInputStatus` ixtiyoriy sync (kelajak).

## 5. Xarajat
`recording.mode="off"` → **saqlash xarajati 0**. Faqat yetkazib berish (tomoshabin daqiqasi). LL-HLS qo'shimcha xarajatsiz. Eng arzon model.

## 6. Doiradan tashqari (kelajak)
- **Live chat** (eSport tomonida, 16:9 ostida) — alohida ish.
- Real bir vaqtdagi tomoshabin soni (Cloudflare analytics/heartbeat).
- WebRTC sub-soniya kechikish (Cloudflare Realtime/LiveKit) — qimmatroq.
- Nexus abadiy yozuv yo'li (alohida Nexus Live ishi).

## 7. Muvaffaqiyat mezoni
- Admin panel/efirдан "Saytdan stream" yaratadi → RTMP URL+kalit oladi → OBS bilan stream qiladi → efir 16:9 oynada **inline, o'z brendimizda** o'ynaydi.
- YouTube/Twitch'dan past kechikish (LL-HLS).
- `streamKey` hech qachon ommaga chiqmaydi.
- Kalit yo'q bo'lsa stub bilan UI buzilmaydi.
