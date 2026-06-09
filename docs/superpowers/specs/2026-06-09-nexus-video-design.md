# Nexus Video — Dizayn (real backend, bosqichli)

**Sana:** 2026-06-09
**Modul:** Nexus
**Holat:** Tasdiqlangan (foydalanuvchi to'liq vakolat berdi), amalga oshirilmoqda

## Strategiya
Video hozir 100% mock (backend yo'q). Uni **real** qilamiz, lekin **test rejimida** (pul/launch'siz).
**Bosqichli, transcoding'siz:** oddiy MP4 Vercel Blob'da saqlanadi, to'g'ridan `<video>` orqali o'ynaydi.
HLS/adaptive streaming KEYIN (faqat kerak bo'lsa). Bu arzon va kam xavf.

## Model (yangi)
```prisma
model NexusVideo {
  id          String         @id @default(cuid())
  profileId   String                          // kanal/yuklovchi
  title       String
  description String?
  videoUrl    String                          // Vercel Blob URL (MP4)
  thumbUrl    String?                         // client'da kadrdan olingan thumbnail
  durationSec Int            @default(0)
  kind        NexusVideoKind @default(LONG)    // LONG | SHORT
  category    String?                         // gaming/tech/talim... ixtiyoriy
  views       Int            @default(0)
  hidden      Boolean        @default(false)   // moderatsiya
  createdAt   DateTime       @default(now())
  likes       NexusVideoLike[]
  comments    NexusVideoComment[]
  @@index([kind, createdAt])
  @@index([profileId, createdAt])
}
enum NexusVideoKind { LONG SHORT }
model NexusVideoView    { id, videoId, profileId?, createdAt; @@unique([videoId, profileId]) }   // dedup ko'rish
model NexusVideoLike    { id, videoId, profileId, createdAt; @@unique([videoId, profileId]) }
model NexusVideoComment { id, videoId, profileId, text, createdAt; @@index([videoId, createdAt]) }
```
**Kanal/obuna** = mavjud `NexusFollow` (profilni follow = kanalga obuna). db push **additive**.

## API
- `POST /api/nexus/videos` — `{title, description, videoUrl, thumbUrl, durationSec, kind, category}`. Pre-publish moderatsiya (title+desc+thumb).
- `GET /api/nexus/videos` — ro'yxat: `?kind=LONG|SHORT&sort=new|trend&q=&category=&scope=all|following&author=`. Enriched (author, likeCount, commentCount).
- `GET /api/nexus/videos/[id]` — bitta video (player) + author + isLiked + likeCount + isSubscribed + tavsiya (recommended).
- `POST /api/nexus/videos/[id]/view` — dedup ko'rish (+views).
- `POST /api/nexus/videos/[id]/like` — like toggle. *(Faza 2)*
- `GET/POST /api/nexus/videos/[id]/comments` — izohlar. *(Faza 2)*
- `DELETE /api/nexus/videos/[id]` — o'z videosini o'chirish.

## Moderatsiya
`ModTargetType` += `VIDEO`; `lib/moderation.ts hideTarget` += NexusVideo case (`hidden`). Yaratishda `moderateOnCreate` (title+desc matn + thumbnail vision). O'qish so'rovlari `hidden:false` filtrlaydi.

## UI
- **`nx-video-create`** (yangi): video tanlash → `<video>`+`<canvas>` bilan **client thumbnail** olish + `videoUrl`/`thumbUrl` blob client upload + sarlavha/tavsif/kategoriya/kind (LONG/SHORT) → POST.
- **`VideoView`** (qayta yoziladi): header (qidiruv real + filtr real: Trendda=trend, Yangi=new, Gaming/Tech/Ta'lim=category + **"Video yuklash"**). Qidiruv/filtr → grid; aks holda qatorlar: Tavsiya (trend), Shorts (kind=SHORT), Obunalar (scope=following).
- **`NxVideoPlayer`** (qayta yoziladi): haqiqiy `<video controls>` (videoUrl), real meta/views (POST view), obuna (NexusFollow), tavsiya (real). Like/izoh — Faza 2.
- **`VideoCard`/`ShortCard`**: real `id` bilan; `openVideo({id,...})` → player `id` bo'yicha yuklaydi.

## Bosqichlar (fazalar)
1. **Yadro:** schema + create/list/[id]/view/delete + moderation + uploader + VideoView real + real player + views/obuna/tavsiya.
2. **Like + izoh:** API + player'ga ulash.
3. **Shorts:** SHORT kind real, `NxShortsPlayer` real `videoSrc`, Shorts qatori real.

## YAGNI / keyin
- Transcoding / adaptive streaming (HLS) yo'q — to'g'ridan MP4.
- Pleylist, monetizatsiya, jonli efir yo'q.
- View dedup foydalanuvchi bo'yicha (anonim = profileId null, lekin auth odatda bor).
