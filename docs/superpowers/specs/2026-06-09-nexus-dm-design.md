# Nexus Xabarlar / DM — Dizayn (N4, 5-bo'lak)

**Sana:** 2026-06-09
**Modul:** Nexus
**Holat:** Tasdiqlangan, amalga oshirilmoqda

## Kontekst
`nx-messages` panel mock (chat ro'yxat + thread + auto-javob + emoji/call), `messagesOpen`
orqali ochiladi. SocialView "chat" tab mock `CHAT_LIST`. Header `MessageCircle` ikonkasi.
Core feed/profil/follow/bildirishnoma/stories real.

## Model (yangi)
```prisma
model NexusConversation {
  id              String   @id @default(cuid())
  user1Id         String                 // normalizatsiya: user1Id < user2Id
  user2Id         String
  lastMessageAt   DateTime @default(now())
  lastMessageText String?
  lastSenderId    String?
  user1ReadAt     DateTime?
  user2ReadAt     DateTime?
  createdAt       DateTime @default(now())
  messages        NexusMessage[]
  @@unique([user1Id, user2Id])
  @@index([user1Id, lastMessageAt])
  @@index([user2Id, lastMessageAt])
}
model NexusMessage {
  id             String   @id @default(cuid())
  conversationId String
  conversation   NexusConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  text           String
  createdAt      DateTime @default(now())
  @@index([conversationId, createdAt])
}
```
db push **additive**.

**O'qilmagan (suhbat darajasida):** `lastSenderId != men && (mening readAt == null || lastMessageAt > readAt)`.
Badge = o'qilmagan suhbatlar soni (har xabarni sanamaymiz — yengil).

## API
- `GET /api/nexus/messages` — suhbatlarim (`user1Id=men OR user2Id=men`), `lastMessageAt` desc. Har biri: `{conversationId, other:{name,username,image,verified}, lastMessageText, lastMessageAt, lastMine, unread}`. + `totalUnread`.
- `POST /api/nexus/messages` — `{username|profileId}` → normalizatsiya → conversation upsert → `{conversationId, other}`.
- `GET /api/nexus/messages/[id]` — ishtirokchi tekshiruvi; xabarlar (asc, take 50) + `other`; **mening readAt = now**.
- `POST /api/nexus/messages/[id]` — `{text}` → xabar yaratish + conversation yangilash (`lastMessageAt/Text/SenderId`, mening readAt=now).
- `GET /api/nexus/messages/count` — `{unread}` (o'qilmagan suhbatlar soni — header badge).

Hamma route ishtirokchini tekshiradi.

## UI — `nx-messages` (qayta yoziladi)
- **Ro'yxat:** suhbatlar (avatar/ism/oxirgi xabar/o'qilmagan nuqta), qidiruv (ism), **`+` yangi xabar** → foydalanuvchi qidirish (mavjud `api/nexus/search` users) → tanlash → `POST open` → thread.
- **Thread:** xabar puffaklari (mening/uning), composer (matn → `POST [id]`); header orqaga + avatar + ism→profil. **Polling:** thread 4s, ro'yxat 6s.
- Olib tashlanadi: auto-javob, emoji-picker (UI emoji qoidasi), qo'ng'iroq/video/ovoz, info paneli.

## Bosqichlar
1. **Yadro:** modellar + 5 API + `nx-messages` panel real.
2. **Kirish:** header ikonka real unread badge; SocialView chat tab real (panelni ochadi); profil "Xabar" → `/nexus?dm=username` ko'prigi (shell `window.location.search` o'qib panelni shu suhbatga ochadi).

## YAGNI (tashqarida)
- Faqat 1:1 (guruh yo'q); media/ovoz xabar yo'q (matn); websocket yo'q (polling); xabar tahrir/o'chirish yo'q; "online"/presence yo'q; yozilyapti (typing) indikatori yo'q.
