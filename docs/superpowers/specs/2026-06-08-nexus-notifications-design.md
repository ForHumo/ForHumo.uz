# Nexus Bildirishnomalar — Dizayn (N4, 3-bo'lak)

**Sana:** 2026-06-08
**Modul:** Nexus
**Holat:** Tasdiqlangan, amalga oshirilmoqda

## Kontekst
`nx-notifications` panel mock (`notifOpen` orqali ochiladi). Like/izoh/follow route'lar
bildirishnoma yaratmaydi. `NexusNotification` modeli yo'q (Market'da `MarketNotification`
+ `lib/market-notify.ts` namuna). Core feed/profil/follow real.

## Model (yangi)
```prisma
model NexusNotification {
  id          String   @id @default(cuid())
  recipientId String                 // kim oladi (UserProfile.id)
  actorId     String                 // kim qildi
  type        NexusNotifType         // LIKE | COMMENT | FOLLOW | REPLY
  postId      String?
  commentId   String?
  read        Boolean  @default(false)
  createdAt   DateTime @default(now())
  @@index([recipientId, read])
  @@index([recipientId, createdAt])
}
enum NexusNotifType { LIKE COMMENT FOLLOW REPLY }
```
Relation yo'q (MarketNotification kabi — `profileId` string). db push **additive** (data-loss yo'q).

## Yaratish — `lib/nexus-notify.ts`
`nexusNotify({ recipientId, actorId, type, postId?, commentId? })` — `recipient===actor` bo'lsa o'tkazib yuboradi; try/catch (hech qachon amalни buzmaydi). Yaratish route'larida `after()` bilan:
- **like** route: like **qo'shilganda** (delete emas) → post egasiga LIKE (postId).
- **comment** route: `parentId` yo'q → post egasiga COMMENT; `parentId` bor → ota-izoh egasiga REPLY (postId + commentId).
- **follow** route: follow **qo'shilganda** → kuzatilganga FOLLOW.

## API
- `GET /api/nexus/notifications` → `{ notifications: [{id,type,read,createdAt, actor:{name,username,image,verified}, postText?}], unreadCount }` (take 30, yangi birinchi). Kirmagan → bo'sh.
- `POST /api/nexus/notifications/read` → body `{ id? }`: `id` bo'lsa bittasini, aks holda hammasini o'qilgan (recipient=men).
- `GET /api/nexus/notifications/count` → `{ unread }` (qo'ng'iroq badge uchun yengil).

## UI
### `nx-notifications` (qayta yoziladi — real)
Ochilganda GET. Real ro'yxat: actor avatar + type ikonka + matn (type'dan: "postingizni yoqtirdi" / "izoh qoldirdi" / "izohingizga javob berdi" / "sizni kuzatdi") + post parchasi (bor bo'lsa) + vaqt. Filtr chiplar: hammasi/like/izoh/follow (klient). "Hammasini o'qi" → POST read. Bosilganda → o'qilgan + **actor profiliga** (`/nexus/u/[username]`), panel yopiladi.

### Header qo'ng'iroq (`nx-header` BellButton)
Real o'qilmagan badge (raqam). `count` endpoint'dan; `notifOpen` yopilganda qayta yuklanadi (o'qilgach yangilanishi uchun). 0 bo'lsa belgi yo'q.

## Bosqichlar
1. **Yadro:** schema + db push + `nexus-notify` + 3 route'ga ulash + GET/read API + `nx-notifications` real.
2. **Badge:** `count` endpoint + BellButton real badge.

## YAGNI (tashqarida)
- Alohida "bitta post" sahifasi yo'q → bosish actor profiliga.
- "live"/"system" turlari yo'q. Like spam-dedup yo'q (test rejim).
- Bildirishnoma sozlamalari (footer havola) — funksiyasiz qoladi.
