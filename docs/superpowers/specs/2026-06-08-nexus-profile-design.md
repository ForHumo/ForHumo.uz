# Nexus Profil — Dizayn (N4, 1-bo'lak)

**Sana:** 2026-06-08
**Modul:** Nexus
**Holat:** Tasdiqlangan, amalga oshirilmoqda

## Muammo / kontekst

Nexus core feed real (post/like/izoh/follow + shoppable). Ammo:
- Feed muallifini bosib bo'lmaydi — profil sahifa yo'q.
- `ProfileView` (Profil tab) o'z profilini ko'rsatadi, lekin follower/following/post sonlari **mock** ("8.4K"/"312"/"47").
- Boshqa foydalanuvchi profilini ko'rish imkoni yo'q.

`NexusFollow` va `NexusPost` real; feed API `?author=` ni allaqachon qo'llaydi. UserProfile'da `bio`, `coverImage` bor.

## Marshrutlash

- **`/nexus/u/[username]`** — yangi real route, har qanday foydalanuvchi profili (ulashiladigan). Nexus mavzosida, orqaga tugma. Nexus layout faqat `fixed inset-0` o'rovchi — sahifa o'z chrome'i bilan to'liq ekran.
- Feed muallifi (ism/avatar) → shu route'ga Link.
- Dock "Profil" tab → mavjud `ProfileView` (shaxsiy markaz) qoladi; sonlari real bo'ladi + "Ommaviy profilim" havolasi.

## API (yangi)

### `GET /api/nexus/profile?username=X`
`username` berilmasa — sessiya egasi. Javob:
```
{ profile: { name, username, image, coverImage, bio, humoId, verified },
  stats: { posts, followers, following },
  isFollowing: boolean, isMe: boolean }
```
404 agar foydalanuvchi topilmasa. `verified` = `isVerifiedProfile()`.

### `GET /api/nexus/follows?username=X&type=followers|following&offset=&limit=`
Foydalanuvchilar ro'yxati: `{ users: [{ name, username, image, verified, isFollowing }], hasMore }`.
`isFollowing` — joriy sessiya egasi shu odamni kuzatadimi.

### Mavjud (reuse)
- `GET /api/nexus/posts?author=X` — foydalanuvchi postlari (pagination + hidden filtr bor).
- `POST /api/nexus/follow` — follow toggle (username bilan).

## Komponentlar

- **`NexusProfile`** (yangi, client) — `/nexus/u/[username]` da. Header: cover banner, avatar, ism, `@username`, verified belgi, bio, **3 real son** (postlar/kuzatuvchilar/kuzatilmoqda). Tugma: o'zimники bo'lsa "Tahrirlash" → `/id/edit`, aks holda **Kuzatish/Kuzatilmoqda**. Postlar: `<NxSocialFeed authorUsername={username} />`. Sonni bosish → `NexusFollowList` modal.
- **`NxSocialFeed`** ga `authorUsername?: string` prop — berilsa: `?author=` yuklaydi, **composer va tablar yashirin** (faqat postlar ro'yxati). Bo'sh holatda "Hali post yo'q".
- **PostCard muallifi** (ism+avatar) → `Link href="/nexus/u/[username]"`.
- **`NexusFollowList`** (yangi) — modal: followers yoki following ro'yxati, har birida avatar+ism+`@`+kuzatish tugma; bosilsa profilga o'tadi.

## Bosqichlar

1. **Backend + profil sahifa:** profile + follows API; `NexusProfile`; `/nexus/u/[username]` route; `NxSocialFeed` author prop; feed muallif linking; `NexusFollowList` modal.
2. **O'z profilni real qilish:** `ProfileView` mock sonlar → real (profile API'dan); stat kartalar `NexusFollowList`ga bog'lanadi; "Ommaviy profilim" havolasi → `/nexus/u/[me]`.

## YAGNI (tashqarida)
- Profil tahriri Nexus'da emas — mavjud Humo ID (`/id/edit`) ishlatiladi.
- Bloklash/yashirin profil — keyinroq.
- Postlar grid (Instagram uslubi) emas — feed kartalari (postlar matn+media).
