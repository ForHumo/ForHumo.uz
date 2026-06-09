# Nexus Stories — Dizayn (N4, 4-bo'lak)

**Sana:** 2026-06-09
**Modul:** Nexus
**Holat:** Tasdiqlangan, amalga oshirilmoqda

## Kontekst
`nx-stories` (feed tepasi qatori), `nx-stories-viewer` (to'liq ekran), `nx-story-create`
hozir mock. Core feed/profil/follow/bildirishnoma real. Blob client upload naqshi
postlarda bor (`@vercel/blob/client` `upload()` + `/api/market/upload/client-token`).

## Model (yangi)
```prisma
model NexusStory {
  id        String   @id @default(cuid())
  profileId String
  mediaUrl  String
  mediaType NexusStoryMediaType @default(IMAGE)
  caption   String?
  createdAt DateTime @default(now())
  expiresAt DateTime              // = createdAt + 24 soat
  views     NexusStoryView[]
  @@index([profileId, expiresAt])
  @@index([expiresAt])
}
enum NexusStoryMediaType { IMAGE VIDEO }

model NexusStoryView {
  id        String   @id @default(cuid())
  storyId   String
  story     NexusStory @relation(fields: [storyId], references: [id], onDelete: Cascade)
  profileId String                // kim ko'rdi
  createdAt DateTime @default(now())
  @@unique([storyId, profileId])
  @@index([storyId])
}
```
db push **additive**.

## API
- `POST /api/nexus/stories` — `{mediaUrl, mediaType, caption?}` → 24 soatlik story. Media oldindan blob client bilan yuklanadi.
- `GET /api/nexus/stories` — faol (`expiresAt>now`) storylar, **muallif bo'yicha guruh**: `[{author:{name,username,image,verified}, isMe, stories:[{id,mediaUrl,mediaType,caption,createdAt,seen}], allSeen}]`. Auditoriya: **men + kuzatganlarim**. Tartib: o'zim birinchi, keyin ko'rilmaganlar, keyin ko'rilganlar (har birida vaqt bo'yicha).
- `POST /api/nexus/stories/[id]/view` — ko'rildi (upsert `storyId+profileId`).
- `GET /api/nexus/stories/[id]/viewers` — faqat ega: `{count, viewers:[...]}` (o'zini hisobламaйди).
- `DELETE /api/nexus/stories/[id]` — faqat ega o'chiradi (cascade views).

## UI
- **`nx-story-create`** (qayta yoziladi): rasm/video tanlash → blob upload → ko'rinish + caption → "Joylash" → POST → yopiladi.
- **`nx-stories` qatori** (qayta yoziladi): `GET` dan; "Sizning hikoyangiz" (`+` create; story bo'lsa halqa+viewer) + kuzatganlar (ko'rilmagan=rangli halqa, ko'rilgan=kulrang). Bosish → `openStoriesViewer(groupIndex)`. Mount + `storyCreateOpen`/`storiesViewerOpen` yopilganda qayta yuklanadi (halqa/seen yangilanishi uchun).
- **`nx-stories-viewer`** (qayta yoziladi): `GET` dan (storiesViewerIndex = boshlang'ich guruh); segmentli progress (rasm 5s, video=davomiyligi), tap chap/o'ng, pauza, video mute, caption, muallif→profil; ochilganda `view` POST; o'z storysida ko'rganlar soni + o'chirish. Reply/emoji yo'q (mock olib tashlanadi).

## Bosqichlar
1. **Yadro:** schema + db push + create/list/view/viewers/delete API + `nx-story-create` + `nx-stories` qatori.
2. **Viewer:** `nx-stories-viewer` real.

## YAGNI (tashqarida)
- Javob/emoji reaksiya yo'q (viewer mock olib tashlanadi).
- Highlights (saqlangan story to'plamlari) yo'q.
- Eski storyni avto-o'chirish (cron) yo'q — faqat so'rovda `expiresAt>now` filtri (DB'da qoladi, ko'rinmaydi).
- Story moderatsiyasi yo'q (24 soatda o'chadi; `hideTarget` STORY'ni qamramaydi).
- Index-alignment: qator va viewer alohida `GET` qiladi; tartib deterministik, lekin oraliqda seen o'zgarsa boshlang'ich guruh siljishi mumkin (test rejimda ahamiyatsiz).
