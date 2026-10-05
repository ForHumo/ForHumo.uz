# Telegram botlar poydevori — 10 bot "tirik" (design)

**Sana:** 2026-10-05
**Holat:** Tasdiqlangan yo'nalish (founder: "Avval poydevor — 10 bot ham tirik")
**Aloqador:** `2026-10-03-ummi-agent-vision-design.md` (Ummi vizyoni), CLAUDE.md (bot infra)

## 1. Maqsad

Founder 10 ta Telegram botning har biriga **Mini App** (web_app) tugmasini BotFather'da
qo'ygan — har bot tegishli web sahifaga qarab turibdi. Mini App tayyor. Yetishmayotgani —
**botning o'z xatti-harakati:** `/start`, salom, buyruqlar, Humo ID bog'lash, Mini App'ni
ichkaridan ochuvchi tugma. Bu spec shu "poydevor"ni (hamma 10 bot bazoviy ishlashini)
belgilaydi. Maxsus funksiyalar (AI chat, biznes CRM, bildirishnoma, commerce) — keyingi fazalar.

## 2. Mavjud holat (kod bilan tasdiqlangan)

Infra allaqachon **ko'p-bot** va bot-agnostik — qayta yozilmaydi, kengaytiriladi:

- `src/lib/telegram-bots.ts` — `BotKey` registri, hozir **2 bot**: `humo_ai`, `bozor_narxida`.
  `tgCall`, `sendMessage`, `sendVoice`, `sendChatAction`, `setWebhook`, `tgGetFileBytes`, `getMe`.
- `src/lib/telegram-bot-common.ts` — `tryHandleLinkCommand` (`/link KOD`, `/start link_KOD`),
  `forHumoEcosystemBlock`, `personalGreet`, uz/ru/en matnlar. **Bot-agnostik (BotKey oladi).**
- `src/lib/telegram-link.ts` — `claimLinkCode`, `findLinkedProfile` (Humo ID ↔ Telegram).
- `src/lib/telegram-bot-chat.ts` — `generateBotAiReply` (Humo AI mirror, 10-turn kontekst).
- Webhooklar: `humo-bot/webhook` (AI + Business rejim), `bn-bot/webhook`.
- Model: `TelegramLinkCode` (10 daq kod), `TelegramBotChat` (botKey+tg user, tarix).

Qolgan **8 bot** — faqat BotFather Mini App tugmasi bor, **backend yo'q** → `/start`ga javob
bermaydi, Humo ID bog'lamaydi.

## 3. Qarorlar (qulflangan)

- **Auth:** Google asosiy identity bo'lib qoladi. Telegram bot faqat mavjud Humo ID'ga
  **bog'lanadi** (`TelegramLinkCode`). "Faqat Google" qoidasi buzilmaydi (Telegram auth-provider EMAS).
- **Poydevor avval:** registr kengaytirish + umumiy handler + setup skripti → 10 bot bazoviy tirik.
- **@ForHumo_AIBot** = oddiy shaxsiy AI chat (Business rejim keyin olib tashlanadi/ko'chiriladi).
- **@ForHumo_UmmiBot** = biznes bot (Telegram Business CRM) — **keyingi faza** (bugungi doirada emas).
- Ichki model nomlari (`HumoBot*`) o'zgarmaydi (foydalanuvchiga ko'rinmaydi) — bekorga migratsiya yo'q.

## 4. Arxitektura (poydevor)

### 4.1 Registrni 10 botga kengaytirish (`telegram-bots.ts`)
`BotKey`ga 8 yangi kalit + `BotInfo`ga `miniAppUrl` maydoni.

| botKey | @username | Mini App URL | token env |
|---|---|---|---|
| `forhumo` | ForHumoBot | forhumo.uz | FORHUMO_BOT_TOKEN |
| `humo_id` | ForHumo_IDBot | forhumo.uz/id | HUMO_ID_BOT_TOKEN |
| `humo_ai` | ForHumo_AIBot | forhumo.uz/ai | HUMO_BOT_TOKEN *(mavjud)* |
| `nexus` | ForHumo_NexusBot | forhumo.uz/nexus | NEXUS_BOT_TOKEN |
| `esport` | ForHumo_eSportBot | forhumo.uz/esport | ESPORT_BOT_TOKEN |
| `market` | ForHumo_MarketBot | forhumo.uz/market | MARKET_BOT_TOKEN |
| `pay` | ForHumo_PayBot | forhumo.uz/pay | PAY_BOT_TOKEN |
| `bozor_narxida` | BozorNarxidaBot | bozornarxida.uz | BN_BOT_TOKEN *(mavjud)* |
| `ummi` | ForHumo_UmmiBot | forhumo.uz/ummi *(404 — 7-bo'lim)* | UMMI_BOT_TOKEN |
| `support` | ForHumo_SupportBot | forhumo.uz/support | SUPPORT_BOT_TOKEN |

Har bot uchun `<KEY>_WEBHOOK_SECRET` ham. (Mini App URL'lari locale prefiksssiz — next-intl
middleware `/ai` → `/uz/ai` ga redirect qiladi, Mini App ichida ishlaydi.)

### 4.2 Umumiy webhook handler
Bitta dinamik route: `src/app/api/telegram/[bot]/webhook/route.ts` — path'dan `botKey` oladi,
`BOTS`da yo'q bo'lsa 404, secret header tekshiradi. Mavjud `humo-bot`/`bn-bot` o'z route'larida
qoladi (boy logika) — yangi 8 bot dinamik route'dан foydalanadi. (Keyin hammasi birlashtirilishi mumkin.)

Handler mantig'i (`src/lib/telegram-bot-generic.ts`):
1. `/start link_KOD` yoki `/link KOD` → `tryHandleLinkCommand` (mavjud).
2. `/start` → `personalGreet` (bog'langan bo'lsa) + bot haqida qisqa matn + **inline web_app
   tugma "Ilovani ochish"** (shu botning `miniAppUrl`) + bog'lanmagan bo'lsa Humo ID taklifi
   (`/link` yo'riqnomasi) + `forHumoEcosystemBlock`.
3. `/help` → buyruqlar + ulash yo'riqnomasi.
4. `/link` (kodsiz) → forhumo.uz/id dan kod olish yo'riqnomasi.
5. Oddiy xabar (default):
   - `humo_ai` → `generateBotAiReply` (AI chat).
   - Qolganlar → yumshoq yo'naltirish: "Men <Bot> yordamchisiman — ilovani oching" + web_app tugma.
     (Maxsus javob keyingi fazada.)

> Telegram web_app inline tugma: `reply_markup: { inline_keyboard: [[{ text, web_app: { url } }]] }`.
> `setMessage` yordamchisi `replyMarkup` oladi — tayyor.

### 4.3 Setup skripti (`scripts/tg-setup-bots.mjs`)
Har bot uchun (token mavjud bo'lganlar): `setWebhook` (secret bilan) + `setMyCommands`
(start/help/link uz/ru/en) + `setChatMenuButton` (web_app — pastki doimiy tugma Mini App ochadi).
Idempotent, token yo'q botni jim o'tkazadi, natijani log qiladi.

## 5. Umumiy handler — til va matnlar
`pickLang(from.language_code)` (mavjud) → uz/ru/en. Har bot uchun qisqa label/tavsif
(`BOTS[bot].label` + yangi `blurb` matnlari). Emoji ishlatilmaydi (founder qoidasi; HTML + oddiy matn).

## 6. Doiradan tashqari (keyingi fazalar)
- eSport/Support → bildirishnoma (roster, o'yin vaqti; support operator oqimi).
- Ummi → biznes CRM (alohida spec; bugun emas).
- Pay → hamyon tarixi (ichki ALKH; tashqi karta EMAS — litsenziya).
- Market/Nexus/ID/Pay → modul-maxsus buyruqlar.
- @ForHumo_AIBot'dan Business rejimни olib tashlash/ko'chirish.
- Guruh rejimi (faol tinglash) — keyin, maxfiylik+xarajat bilan.

## 7. Ochiq masalalar (founder hal qiladi)
1. **`/ummi` sahifasi YO'Q (404).** @ForHumo_UmmiBot Mini App'i `forhumo.uz/ummi`ga qaraydi.
   Variantlar: (a) minimal `/ummi` landing qurish, (b) biznes sozlama sahifasiga yo'naltirish
   (Ummi = biznes bot), (c) vaqtincha `forhumo.uz` (hub)ga qaytarish. **Tavsiya:** (c) poydevor
   uchun, Ummi fazasida (b)/(a).
2. **Tokenlar (blocker):** 8 yangi bot token + webhook secret `.env.local` + Vercel env'ga kerak.
   Founder BotFather'dan oladi va env'ga qo'yadi (chatga tashlamaydi). Registratsiya shundan keyin.

## 8. Xavf / e'tibor
- Har webhook `X-Telegram-Bot-Api-Secret-Token` tekshiradi (mavjud naqsh).
- Default AI-chat faqat `humo_ai` uchun — boshqa botlar har xabarni AIga yubormaydi (xarajat/abuse).
- `drop_pending_updates: true` setWebhook'da (eski navbat tozalanadi).
- `tryHandleLinkCommand` success matni "ikkala bot" deydi — 10 botga moslab yangilansin.
