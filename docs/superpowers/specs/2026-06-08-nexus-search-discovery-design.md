# Nexus Qidiruv + Kashf — Dizayn (N4, 2-bo'lak)

**Sana:** 2026-06-08
**Modul:** Nexus
**Holat:** Tasdiqlangan, amalga oshirilmoqda

## Kontekst

Core feed + profil real. `nx-search` (header'dan ochiluvchi to'liq ekran overlay) va
`nx-explore` (Compass "Kashfiyot" paneli) hozir **mock** (video/musiqa/kreator). Feed API
`?tag=` va `?author=` ni qo'llaydi. NexusPost'da `hashtags[]`. Bularni real qilamiz.

## API (yangi)

### `GET /api/nexus/search?q=X`
`{ users, posts, tags }`:
- **users:** `name`/`username` `q` ni o'z ichiga olganlar (max 8). Har biri: name, username, image, verified, isFollowing.
- **posts:** `text` `q` ni o'z ichiga olgan (hidden:false, max 8, yangi birinchi). Snippet + muallif (username) + like/izoh soni.
- **tags:** so'nggi ~300 postdagi hashtaglardan `q` substring moslari, soni bo'yicha (max 8) → `[{tag, count}]`.
- `q` bo'sh → bo'sh natijalar.

### `GET /api/nexus/discover`
`{ trendingTags, suggestedUsers }`:
- **trendingTags:** so'nggi ~300 postdagi eng ko'p uchragan hashtaglar (max 10) → `[{tag, count}]`.
- **suggestedUsers:** so'nggi postlar mualliflari (distinct), **men emas** va **men kuzatmaganlar** (max 8). name/username/image/verified. Test rejimda ham bo'sh bo'lmaydi.

## Komponentlar

### `nx-search` (qayta yoziladi — real)
Header qidiruv ulagichi (`searchOpen`) saqlanadi. Mock o'rniga:
- **Bo'sh holat** → `discover`: trenddagi hashtaglar (chiplar) + tavsiya odamlar (kuzatish tugmasi bilan).
- **Yozilganda** (debounce 300ms) → `search`: 3 bo'lim — Odamlar (→ `/nexus/u/[username]`), Hashtaglar (→ `/nexus/tag/[tag]`), Postlar (matn parchasi + muallif → muallif profili).
- Link bosilganda overlay yopiladi (`setSearchOpen(false)`).

### `nx-explore` (qayta yoziladi — real)
Compass tugmasi (`exploreOpen`). `discover` ma'lumoti: trenddagi hashtaglar grid + tavsiya odamlar (kuzatish) + so'nggi postlar (ixtiyoriy). To'liq ekran panel (mavjud overlay naqshi).

### Hashtag sahifa: `/nexus/tag/[tag]`
- `NxSocialFeed`ga `tag?: string` prop (mavjud `authorUsername` kabi — `?tag=` yuklaydi, composer+tablar yashirin).
- Sahifa `NexusProfile` naqshi bilan: `NxPlayerProvider` + header (`#tag` + orqaga) + `NxShare`.

### Post hashtaglari bosiladigan
`nx-social-feed` PostCard'dagi `#hashtag` spanlari → `/nexus/tag/[tag]` Link.

## Bosqichlar
1. **API + Qidiruv:** `search` + `discover` API + `nx-search` real.
2. **Kashf + Teglar:** `nx-explore` real + `/nexus/tag/[tag]` route + PostCard hashtag linklari.

## YAGNI (tashqarida)
- Alohida "bitta post" sahifasi yo'q — post natijasi muallif profiliga olib boradi.
- Qidiruv tarixi (recent searches) saqlanmaydi (v1).
- Trending hisobi — so'nggi 300 post (global trend hisoblash emas).
