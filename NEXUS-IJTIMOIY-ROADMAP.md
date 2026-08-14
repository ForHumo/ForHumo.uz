# Nexus Ijtimoiy — WhatsApp/Telegram darajasiga chiqarish rejasi

> **Muallif**: Claude (Opus 4.7) — Founder @abduvoris nomidan tayyorlangan
> **Sana**: 2026-08-14
> **Maqsad**: Nexus'ning Ijtimoiy bo'limini WhatsApp/Telegram bilan raqobatlashadigan platforma darajasiga chiqarish. Emoji o'rniga faqat Lucide ikonalar. Har bir detal professional.

---

## 0. Xulosa (TL;DR)

**Hozirgi holat**: 55 Prisma model, 78 komponent, 30 API guruh, ~50 ishlaydigan xususiyat. Asosiy DM, kanal, guruh, video/audio call, story, feed, agent — hammasi real.

**Boshqa platformalarga nisbatan**: Telegram bilan **~65% parity**, WhatsApp bilan **~75% parity**. Discord/Slack ta'sirlari ham bor.

**Yo'l xaritasi**: 6 faza × 2-4 hafta = **~5-6 oy full-time yoki 12 oy part-time**. Har faza mustaqil deploy qilinadi.

**Ustuvorlik**: Faza 1 (Real-time & UX) — bu foydalanuvchi darhol sezadigan farq. Qolganlar — kengaytiruv.

---

## 1. Hozirgi holat — to'liq audit

### 1.1 Nima real ishlaydi (Ijtimoiyda)

| Sub-bo'lim | Xususiyatlar | Holat |
|---|---|---|
| **Feed (Postlar)** | Post yaratish (matn/rasm×9/video×1), poll, tag, joylashuv, maxfiylik (public/followers/private), tavsiya (pgvector+Gemini), permalink `/nexus/p/[id]` | ✅ |
| **DM** | 50+ xususiyat — reply, edit, delete, forward, reaction, pin, bookmark, poll, live location, transfer, schedule, self-destruct, TTS, tarjima, voice waveform, mention @, markdown, watermark, undo-send, theme, forward badge, edit history | ✅ |
| **Kanal (broadcast)** | Deep-link, moderatsiya inbox, markdown, TTS, tarjima, poll, bookmark, edit history, push notif, drafts, qidiruv, reaksiya | ✅ |
| **Guruh** | Kanal `type=GROUP` infratuzilmasi + do'stlar multi-select yaratish | ✅ (bugun) |
| **Chaqiruv** | 1:1 WebRTC (audio/video), guruh (LiveKit), screen-share, effektlar, mini window | ✅ |
| **Story** | 24 soatlik, poll/reaction, viewers, highlights (doimiy) | ✅ |
| **Agent (bot)** | @create, webhook (HMAC), inbox endpoint, API key rotatsiya | ✅ (bugun) |
| **Papka** | Telegram-style folders, filter (private/channel/group), chat ID append | ✅ |
| **Bildirishnoma** | Real-time (Pusher), Web Push (VAPID) | ✅ |
| **Qidiruv/Kashf** | Global qidiruv (odam/post/tag), trending, tavsiya | ✅ |
| **Verified badge** | Founder + verified profil so'rovi | ✅ |
| **Moderatsiya** | AI (Gemini) pre-publish + reaktiv, admin queue | ✅ |
| **Presence** | Pusher presence-nexus kanali (kim onlayn) | 🟡 Qisman — UI kam ishlatilgan |
| **Founder analytics** | 30 kun chart, top sender/kanal | ✅ (bugun) |

### 1.2 Yetishmayotgan yoki qisman xususiyatlar

**Kritik (WhatsApp/Telegram standarti)**:
1. ❌ **Real-time xabar** — hozir 4s polling. WebSocket/Pusher push emas.
2. ❌ **Yozmoqda (typing) indikatori** — infra bor (Pusher), lekin UI'da yo'q
3. ❌ **Delivered/Read status** — faqat "o'qildi" (conversation-level). Per-xabar tick (✓, ✓✓) yo'q
4. ❌ **Last seen / online** — presence bor, ProfileView'da minor ko'rinadi, DM/kanalda yo'q
5. ❌ **Muddatli invitatsiya havolasi** — guruhga havola bilan qo'shilish yo'q
6. ❌ **Global qidiruv** — chat ichida bor, global yo'q (barcha suhbatlarim bo'yicha)
7. ❌ **Global media galereya** — chat ichida rasm/video/fayl alohida ko'rinmaydi
8. ❌ **Stikerlar/GIF** — foydalanuvchi shaxsiy rejasi bor (skip)
9. ❌ **Multi-device / QR sync** — bir odam ko'p qurilmada session yo'q
10. ❌ **Chat backup/export** — DM export mavjud, lekin universal backup yo'q

**Muhim (professional daraja)**:
11. ❌ **E2E shifrlash** — DM uchun kerak
12. ❌ **Message thread (Slack-uslub)** — reply zanjiri to'liq thread emas
13. ❌ **Broadcast list** — bir vaqtda ko'p odamga (guruh EMAS)
14. ❌ **Slow mode** — guruh xabarlar tezligini cheklash
15. ❌ **Bot inline mode** — `@bot query` orqali natija
16. ❌ **View-once xabar** — 1 martalik rasm/video
17. ❌ **Chat lock** — biometric/PIN bilan alohida chat yashirish
18. ❌ **Kontaktlar sinxronizatsiyasi** — telefondan
19. ❌ **Business profil** — biznes uchun mahsulot katalog + soatlar
20. ❌ **Guruh ruxsatlari (fine-grained)** — kim media yubora oladi, kim link
21. ❌ **Anonim admin** (Telegram) — guruh admin ismi ko'rinmaydi
22. ❌ **Kanal komment (Telegram)** — kanal xabariga izoh guruhi
23. ❌ **Auto-delete timer per chat** (WhatsApp) — hozir per-message

**Yaxshi bo'lardi**:
24. ❌ **Voice message chat** — bitta ovozli xabarga javob zanjiri
25. ❌ **Chat wallpaper library** — foydalanuvchi rasm yuklab qo'yishi
26. ❌ **Reaction pop-up animation**
27. ❌ **Voice call in group** (LiveKit bor lekin UI oddiyroq bo'lishi kerak)
28. ❌ **Nearby people/groups** (Telegram)
29. ❌ **Public group discovery** — mavjud discover, lekin group yo'q
30. ❌ **Advanced privacy** — kim menga xabar yozadi (hamma/kontakt/hech kim)
31. ❌ **Ovozli xabarga speed control** (1x, 1.5x, 2x)

---

## 2. WhatsApp/Telegram vs Nexus — xususiyat matritsasi

Legend: ✅ bor · 🟡 qisman · ❌ yo'q

| # | Xususiyat | WhatsApp | Telegram | Nexus |
|---|---|:-:|:-:|:-:|
| **DM asosiy** ||||
| 1 | Matn/rasm/video/audio/fayl | ✅ | ✅ | ✅ |
| 2 | Ovozli xabar (waveform) | ✅ | ✅ | ✅ |
| 3 | Video-doiralar (video-circle) | ❌ | ✅ | ✅ |
| 4 | Joylashuv (jonli) | ✅ | ✅ | ✅ |
| 5 | Poll | ❌ | ✅ | ✅ |
| 6 | Reply | ✅ | ✅ | ✅ |
| 7 | Reaction (bir necha emoji) | ✅ | ✅ | ✅ |
| 8 | Forward (asl manba badge) | ✅ | ✅ | ✅ (bugun) |
| 9 | Edit | ❌ | ✅ | ✅ |
| 10 | Edit history | ❌ | ✅ | ✅ (kecha) |
| 11 | Delete (o'zim + hamma uchun) | ✅ | ✅ | 🟡 (faqat o'zi) |
| 12 | Pin | ✅ | ✅ | ✅ |
| 13 | Bookmark | ❌ | ✅ | ✅ |
| 14 | Search chat ichida | ✅ | ✅ | ✅ |
| 15 | Draft | 🟡 | ✅ | ✅ |
| 16 | Undo-send | ❌ | ❌ | ✅ |
| 17 | Schedule message | ❌ | ✅ | ✅ |
| 18 | Self-destruct | ✅ | ✅ | ✅ |
| 19 | View-once | ✅ | ❌ | ❌ |
| 20 | Transfer (pul) | ✅ (India) | 🟡 (bot) | ✅ (Zij) |
| **Real-time** ||||
| 21 | Instant deliver (WS/push) | ✅ | ✅ | ❌ (polling 4s) |
| 22 | Typing indicator | ✅ | ✅ | ❌ (infra bor) |
| 23 | Online/Last seen | ✅ | ✅ | 🟡 |
| 24 | Delivered ✓ / Read ✓✓ | ✅ | ✅ | 🟡 (conv-level) |
| 25 | Multi-device sync | ✅ | ✅ | ❌ |
| **Guruh** ||||
| 26 | Guruh yaratish | ✅ | ✅ | ✅ |
| 27 | Max a'zolar | 1024 | 200000 | 20 (limit) |
| 28 | Invite havola | ✅ | ✅ | ❌ |
| 29 | QR bilan qo'shilish | ✅ | ✅ | ❌ |
| 30 | Rol (admin/member) | 🟡 | ✅ | ✅ |
| 31 | Fine-grained ruxsat | 🟡 | ✅ | ❌ |
| 32 | Slow mode | ❌ | ✅ | ❌ |
| 33 | Anonim admin | ❌ | ✅ | ❌ |
| 34 | Guruh haqida (about) | ✅ | ✅ | 🟡 |
| 35 | Guruh emoji/rangi | ❌ | ✅ | 🟡 |
| **Kanal (broadcast)** ||||
| 36 | Kanal yaratish | ✅ (WA Channel) | ✅ | ✅ |
| 37 | Ommaviy @handle | ❌ | ✅ | ✅ |
| 38 | Reaksiya | ✅ | ✅ | ✅ |
| 39 | Komment (bog'liq guruh) | ❌ | ✅ | ❌ |
| 40 | Obuna | ✅ | ✅ | ✅ (membership) |
| **Story/Status** ||||
| 41 | 24 soatlik | ✅ | ✅ | ✅ |
| 42 | Reaction | ✅ | ✅ | ✅ |
| 43 | Viewers | ✅ | ✅ | ✅ |
| 44 | Highlights (doimiy) | ❌ | 🟡 | ✅ |
| **Chaqiruv** ||||
| 45 | 1:1 audio/video | ✅ | ✅ | ✅ |
| 46 | Guruh chaqiruv | ✅ | ✅ | ✅ (LiveKit) |
| 47 | Screen share | ✅ | ✅ | ✅ |
| 48 | Video effekt/fon | ❌ | ❌ | ✅ |
| 49 | Kanal jonli efir | ❌ | ✅ | ✅ |
| **Bot/Agent** ||||
| 50 | Bot yaratish (BotFather) | 🟡 (Business API) | ✅ | ✅ (bugun) |
| 51 | Webhook | ✅ | ✅ | ✅ (bugun) |
| 52 | Inline mode | ❌ | ✅ | ❌ |
| 53 | Bot commands menyu | ❌ | ✅ | ❌ |
| 54 | Payment (invoice) | ✅ | ✅ | 🟡 (transfer) |
| **Privacy/Security** ||||
| 55 | E2E shifrlash | ✅ | 🟡 (secret) | ❌ |
| 56 | Block/Unblock | ✅ | ✅ | ✅ |
| 57 | Mute | ✅ | ✅ | ✅ |
| 58 | Ikki bosqichli auth | ✅ | ✅ | 🟡 (Google) |
| 59 | Chat lock (biometric) | ✅ | 🟡 | ❌ |
| 60 | Kim menga yozadi (privacy) | ✅ | ✅ | ❌ |
| **UX/Tashkiliy** ||||
| 61 | Papkalar | ❌ | ✅ | ✅ |
| 62 | Global qidiruv | ✅ | ✅ | ❌ |
| 63 | Media galereya (per chat) | ✅ | ✅ | ❌ |
| 64 | Chat wallpaper | ✅ | ✅ | 🟡 |
| 65 | Chat theme | 🟡 | ✅ | ✅ |
| 66 | Stikerlar | ✅ | ✅ | ❌ (skip) |
| 67 | GIF | ✅ | ✅ | ❌ (skip) |
| 68 | Kontakt sinxronizatsiya | ✅ | ✅ | ❌ |
| 69 | Chat backup | ✅ | ✅ (cloud) | 🟡 (export) |
| 70 | QR login | ❌ | ✅ | ❌ |
| **Boshqa** ||||
| 71 | Broadcast list | ✅ | ❌ | ❌ |
| 72 | Business profil | ✅ | ❌ | ❌ |
| 73 | Business katalog | ✅ | ❌ | ❌ (Market bor) |
| 74 | Nearby | ❌ | ✅ | ❌ |
| 75 | Verified badge | ✅ | ✅ | ✅ |

**Xulosa**: 75 ta xususiyatdan **~52 ta bor**, **~23 ta yetishmaydi**. 8 tasi kritik.

---

## 3. FAZA REJA — 6 FAZA

Har faza 2-4 haftalik iterativ ish. Har faza oxirida deploy qilinadi va foydalanuvchi darhol foyda ko'radi.

---

### 🔵 FAZA 1 — Real-time & Presence (2-3 hafta)

**Maqsad**: Xabarlar darhol yetsin, kim yozayotgani ko'rinsin, kim onlayn bilinsin. Bu foydalanuvchi darhol sezadigan **eng katta farq**.

| # | Xususiyat | Baholash | Ish |
|---|---|:-:|---|
| 1.1 | **Pusher DM push** — 4s polling o'rniga real-time | 2 kun | `channel: dm-{convId}`, event: `msg.new`, `msg.edit`, `msg.delete`. Client subscribe. Polling fallback. |
| 1.2 | **Typing indikator** | 1 kun | Client `sendTyping(convId)` → Pusher event. UI'da "yozmoqda..." animatsiya (3 nuqta). Debounce 2s. |
| 1.3 | **Online / Last seen** | 2 kun | UserProfile += `lastSeenAt`. Presence trigger. Header'da avatar tepasida yashil nuqta / "5 daqiqa oldin". Privacy toggle. |
| 1.4 | **Per-message delivery tick** | 2 kun | NexusMessage += `deliveredAt`. Client Pusher event yuborganda serverga bildiradi. UI: ✓ (yuborildi), ✓✓ (yetdi), ✓✓ moviy (o'qildi). |
| 1.5 | **Kanal/guruh push** | 1 kun | Kanal xabarlariga ham Pusher, member subscribe. |
| 1.6 | **Global unread badge** — Nexus tab | 1 kun | Header ikonasida umumiy o'qilmagan raqami (DM+kanal+bildirishnoma). |

**Deliverables**: 6 xususiyat, ~2 hafta.
**User impact**: 🔥🔥🔥 Eng katta.

---

### 🟣 FAZA 2 — Guruh professional darajaga (2 hafta)

**Maqsad**: Guruh Telegram/Discord darajasida bo'lsin. 20 → 500 kishi, invite link, ruxsatlar.

| # | Xususiyat | Ish |
|---|---|---|
| 2.1 | **Guruh limitini oshirish** | 20 → 500 (Neon plan cheklanmaydi). UI performansini tekshirish (virtual scroll). |
| 2.2 | **Invite link** | `NexusChannelInvite` model: `code`, `expiresAt`, `maxUses`, `usesCount`. `POST /invite` yaratish, `GET /join/{code}` sahifasi. |
| 2.3 | **QR bilan qo'shilish** | Yuqoridagi invite kodi QR kod (mavjud `qrcode` npm). Mobile'da skanerlash — camera + `jsQR`. |
| 2.4 | **Fine-grained ruxsatlar** | NexusChannelMember += `permissions: {sendMessages, sendMedia, sendLinks, embedLinks, pin, changeInfo}`. Owner ADMIN'ga bir-birlab beradi. |
| 2.5 | **Slow mode** | NexusChannel += `slowModeSeconds`. Server tomonda tekshirish (oxirgi xabar vaqti). |
| 2.6 | **Anonim admin** | NexusChannelMember += `isAnonymous`. Xabar sender name o'rniga guruh nomi ko'rinadi. |
| 2.7 | **Guruh haqida** | Kengaytirilgan modal — description, rules, avatar, cover, media count, member count. |
| 2.8 | **Guruh statistika (owner)** | Kunlik xabar count, top 5 aktiv a'zo, o'sish grafigi. |

**Deliverables**: 8 xususiyat, ~2 hafta.

---

### 🟢 FAZA 3 — Kontent & Media (2-3 hafta)

**Maqsad**: Chat ichidagi kontent WhatsApp/Telegram darajasida topilsin.

| # | Xususiyat | Ish |
|---|---|---|
| 3.1 | **Media galereya (per chat)** | Chat ichida 3 tab: Media (rasm+video), Fayl, Havola. `/api/nexus/messages/{convId}/media?type=` — SQL filter. Grid UI. |
| 3.2 | **Global qidiruv** | `/api/nexus/messages/search?q=` — barcha suhbatlarim bo'yicha. Postgres FTS index. |
| 3.3 | **View-once xabar** | NexusMessage += `viewOnce: bool`. Ochilgach `viewedAt` yoziladi, keyingi GET'da matn null. UI blur + "Ko'rilgan" belgi. |
| 3.4 | **Voice speed control** | NxVoicePlayer'da 1x/1.5x/2x tugma. `audio.playbackRate` bilan. |
| 3.5 | **Chat wallpaper library** | Statik 12 fon + foydalanuvchi Vercel Blob'ga yuklashi. Per-chat saqlash (mavjud theme kengaytmasi). |
| 3.6 | **Reaksiya animatsiyasi** | Framer Motion — emoji chiqib katta ko'rinishga tushadi. |
| 3.7 | **Delete for everyone** (WhatsApp) | Xabarni 60 daqiqa ichida hamma uchun o'chirish. `deletedForEveryoneAt`. UI: "Bu xabar o'chirildi". |
| 3.8 | **Auto-delete per chat** | NexusConversation += `autoDeleteAfterSeconds`. Cron kunlik tozalab turadi. |

**Deliverables**: 8 xususiyat, ~2.5 hafta.

---

### 🟡 FAZA 4 — Xavfsizlik & Maxfiylik (3 hafta)

**Maqsad**: WhatsApp darajasida xavfsizlik. E2E, privacy, chat lock.

| # | Xususiyat | Ish |
|---|---|---|
| 4.1 | **E2E shifrlash (DM)** | Signal Protocol (yoki soddaroq: ECDH X25519 + AES-GCM). Har foydalanuvchi kalit juftligi (client-side, IndexedDB). Server faqat public key va shifrlangan matn ko'radi. Sekin faza — 2 hafta. |
| 4.2 | **Kim menga xabar yozadi** (privacy) | UserProfile += `privacyDm: "all" \| "contacts" \| "none"`. Kontakt = bir-birini follow qilgan. |
| 4.3 | **Last seen privacy** | UserProfile += `privacyLastSeen: "all" \| "contacts" \| "none"`. |
| 4.4 | **Profile photo privacy** | Sama - `privacyProfilePhoto`. |
| 4.5 | **Chat lock (biometric/PIN)** | Har chat uchun `isLocked` bit. Ochish uchun `navigator.credentials` (WebAuthn) yoki 4-raqamli PIN. Client-side hashed PIN, IndexedDB. Lock qilingan chat sarlavhasi yashiriladi ("Yopiq suhbat"). |
| 4.6 | **Guruh xabar block** | Blok qilingan foydalanuvchi guruhda ham ko'rinmaydi (hozir DM'da bor). |
| 4.7 | **Ikki bosqichli auth (2FA)** | Google + TOTP (authenticator app). `speakeasy` npm. |

**Deliverables**: 7 xususiyat, ~3 hafta.

---

### 🟠 FAZA 5 — Bot ekosistema (2 hafta)

**Maqsad**: Agentlar to'la Telegram Bot API darajasida.

| # | Xususiyat | Ish |
|---|---|---|
| 5.1 | **Bot commands menyu** | NexusAgent += `commands: JSON [{cmd, description}]`. Chat composer'ida `/` bosilsa autocomplete. Foydalanuvchi bosishi = xabar yuboradi. |
| 5.2 | **Inline mode** | `@bot query` — composer'da mention paytida bot inline results (agent webhook: `event=inline.query`). |
| 5.3 | **Xabarga inline tugma** | Agent javobida `buttons: [[{text, callbackData}]]`. Bosilsa yangi webhook event `event=callback.query`. |
| 5.4 | **Bot invoice (payment)** | ALKH Pay bilan integratsiya — bot xabarga "To'lash 50 000 UZS" tugma qo'yadi. Bosilsa transfer flow. |
| 5.5 | **Sistem eventlar** | `member.joined`, `member.left`, `message.pinned`, `message.deleted` — bot ularga ham reaksiya bera oladi. |
| 5.6 | **Agent statistika (owner)** | Nechta xabar qabul qilingan, nechta javob berilgan, webhook error rate. |
| 5.7 | **Agent kutubxonasi** | GitHub'da `forhumo-agent-sdk` (Node.js + Python) namunalar. `/create` sahifasida linklar. |

**Deliverables**: 7 xususiyat, ~2 hafta.

---

### 🔴 FAZA 6 — Multi-device & Kengaytmalar (3 hafta)

**Maqsad**: Katta arxitektura yaxshilanishlari — long-term.

| # | Xususiyat | Ish |
|---|---|---|
| 6.1 | **Multi-device sync** | Bir foydalanuvchi ko'p qurilmada — mavjud NextAuth JWT + Pusher user channel. Har qurilmada session ID, ko'rish. |
| 6.2 | **QR login (yangi qurilma)** | Mavjud sessiya QR generatsiya qiladi, yangi qurilma skanerlaydi. Backend WebSocket authorization. |
| 6.3 | **Cloud backup (chat export)** | Har foydalanuvchi barcha xabarlarini ZIP olishi (mavjud DM export + kanal + guruh). Vercel Blob'da 30 kun saqlab qo'yish. |
| 6.4 | **Kontakt sinxronizatsiya (mobil)** | PWA'da `navigator.contacts` API (Chrome Android). Foydalanuvchi ruxsat berib telefondagi kontaktlarni yuboradi — mos keluvchi Nexus foydalanuvchilari topiladi. |
| 6.5 | **Kanal komment** | Kanal xabarlariga izohlash uchun avtomatik guruh. NexusChannel += `commentsGroupId`. |
| 6.6 | **Broadcast list** | Foydalanuvchi shaxsiy tanlangan odamlarga bir vaqtda xabar. `NexusBroadcast` model + qabul qiluvchilar bilmaydi bir vaqtda kimlarga borgan. |
| 6.7 | **Business profil** | Foydalanuvchi profili biznes hisobiga aylanish. Katalog (Market'dan tortish), soatlar, avto-javob (agent bilan). |
| 6.8 | **Nearby people/groups** | Ixtiyoriy joylashuv ulashish → geohashing → yaqin atrofdagi ochiq guruhlar. |

**Deliverables**: 8 xususiyat, ~3 hafta.

---

## 4. Umumiy jadval

| Faza | Vazifalar | Vaqt | Kumulativ |
|---|---|---|---|
| 1 — Real-time & Presence | 6 | 2-3 hafta | 3 hafta |
| 2 — Guruh professional | 8 | 2 hafta | 5 hafta |
| 3 — Kontent & Media | 8 | 2.5 hafta | 7.5 hafta |
| 4 — Xavfsizlik & Maxfiylik | 7 | 3 hafta | 10.5 hafta |
| 5 — Bot ekosistema | 7 | 2 hafta | 12.5 hafta |
| 6 — Multi-device & Kengaytmalar | 8 | 3 hafta | 15.5 hafta |

**Jami**: 44 yangi xususiyat, **~4 oy full-time (8 oy part-time)**.

Bugungi 44 xususiyat + 44 yangi = **88 xususiyat** — bu WhatsApp/Telegram ning ~85%'i.

---

## 5. Bosh dizayn tamoyillari (buzilmaydi)

1. **Faqat Lucide ikonalari** — hech qayerda emoji ishlatilmaydi (foydalanuvchi kiritgan matn ichidagilardan tashqari). Bu qat'iy.
2. **Custom dropdown** — hech qachon native `<select>`.
3. **Dark + Light mode** — har komponent ikkalasini qo'llab-quvvatlaydi.
4. **Locale routing** — `@/i18n/routing` Link; uz/ru/en.
5. **formatMoney** — pul har doim yagona util'dan.
6. **Rate limiting** — barcha yaratish endpointlarida `RateKind`.
7. **AI moderatsiya** — barcha yangi kontentda `after()` bilan.
8. **Push notification** — har xabar/eventda `after()` bilan.
9. **Kod uslubi** — kam kommentariy (faqat WHY), TypeScript strict, no `any`.
10. **Har faza deploy** — real foydalanuvchi darhol foydalanishi.

---

## 6. Har hafta ish tartibi

Har hafta boshida (dushanba):
1. Faza vazifalari ro'yxatidan **3-5 ta** vazifa tanlash
2. Har birini alohida commit (kunlik 1-2 xususiyat)
3. Har commit oxirida `npm run build` + `git push origin main` → Vercel avtomatik deploy
4. Real qurilmada sinov (mobile + desktop)
5. Founder foydalanuvchi bo'lib real xabar/chat/guruh sinovi

**Kod-review** (haftalik bir marta):
- `/code-review high` komandasi bilan avto-review
- Founder qo'lda ham 5-10 daqiqa ko'zdan kechirish

---

## 7. Muhim texnik qarorlar

### 7.1 Real-time transport — nima ishlatamiz?
**Qaror**: Pusher (allaqachon integratsiya qilingan) — TALQIN. Kelajakda self-hosted (SocketCluster/Ably) migratsiya.
- **Sabab**: Pusher hozir call/presence uchun ishlatiladi. Bepul plan 100 concurrent = MVP uchun yetadi. Katta o'lchamda self-host.

### 7.2 E2E shifrlash — qanday?
**Qaror**: Web Crypto API (native brauzer) + X25519 ECDH + AES-GCM. Signal Protocol'ning soddalashtirilgan varianti.
- **Sabab**: External npm kerakmas. Signal to'liq protokoli murakkab (Double Ratchet), MVP uchun oddiy PFS yetadi.
- **Kalit saqlash**: IndexedDB (client-only). Server hech qachon ko'rmaydi.
- **Kalit tiklash**: Foydalanuvchi qurilmani yo'qotsa, eski xabarlar o'qilmaydi (WhatsApp modeli). Cloud backup ixtiyoriy (mavjud parol bilan).

### 7.3 Guruh limitini nima?
**Qaror**: 500 kishi (Faza 2). Katta guruhlar (10000+) — Faza 6 dan keyin (partition/shard).

### 7.4 Bot payment
**Qaror**: ALKH Pay integratsiya (mavjud). Bot xabaridagi "To'lash" tugmasi mavjud transfer flow'ni ochadi.

---

## 8. Xavflar va bartaraf etish

| Xavf | Ehtimoli | Bartaraf |
|---|:-:|---|
| Pusher connection limit (100) | O'rta | Bepul plan Faza 3 gacha, keyin $49/oy plan (500 conn) |
| Neon DB write burst (500 kishi guruh) | Past | Prisma batch, indexed columns |
| E2E kalit yo'qolishi | Yuqori | Foydalanuvchini oldindan ogohlantirish + optional cloud backup |
| WebPush cross-browser | O'rta | iOS'da 16.4+ kerak — fallback in-app badge |
| Bot spam | Yuqori | Rate limit + AI moderatsiya + block sistemasi |
| Mobil PWA offline | Yuqori | Service worker cache (mavjud), IndexedDB queue |

---

## 9. Success metrics (KPI)

Har faza oxirida o'lchash:
- **DAU** (kunlik faol foydalanuvchi)
- **Xabar/kun** — DM + kanal + guruh (Admin dashboard)
- **Xabar javob vaqti** — real-time tekshiruv (Faza 1)
- **Media ulush** — matn vs rasm/video/audio
- **Agent xabar %** — total xabarlardan
- **Guruh o'rtacha kattaligi**
- **7-kunlik retention**
- **Xato rate** (Sentry integratsiya keyingi qadam)

---

## 10. Kelajakda (Faza 7+, 1 yildan keyin)

- **Federatsiya** (ActivityPub / Matrix bridge)
- **Kanal reklama tizimi** — mavjud tavsiya algoritmi asosida
- **Marketplace** — agentlar (bot)ni sotish/sotib olish
- **AI Copilot** — DM'da "menga uxlash yordamida" — AI yordamchi
- **Voice call → post** — real-time konferensiya audiotranskript → post
- **Nexus TV** — jonli efirlar 24/7 (Twitch uslubi)
- **Kanal Premium** — pullik obuna (mavjud NexusSubscription kengaytmasi)
- **Sponsor xabarlar** — kanal egalari pullik xabar joylash imkoniyati

---

## 11. Boshlash bugun

**Bugungi (2026-08-14) qolgan yarim kunda**:
- **Faza 1.1 — Pusher DM push** — 4s polling o'rniga real-time. Bu bitta xususiyat, lekin butun tajribani o'zgartiradi.

Yoki agar chuqurroq boshlaymiz desangiz:
- **Faza 1 to'liq** — 3 kunda 6 xususiyat (real-time bo'lish uchun).

**Ustuvorlik tavsiyasi**: Faza 1 (Real-time) → Faza 2 (Guruh) → Faza 3 (Media) — bu foydalanuvchi tajribasini maksimal o'zgartiradi. Faza 4 (E2E) va Faza 5 (Bot) uzoq muddatli chuqurlik. Faza 6 keyin.

---

**Muallif**: Claude Opus 4.7 · **Muallif haqi**: bu hujjatni har hafta boshida qayta o'qib, holatga qarab yangilash. Faza tugagach — tik qo'shish, muddat aniqlash.
