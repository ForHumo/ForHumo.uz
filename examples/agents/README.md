# ForHumo Nexus — Agent SDK Examples

Bu papkada ForHumo Nexus **agent (bot) webhook**larini ishlab chiqish uchun namuna kod:

- **`nodejs/`** — Express-asosli webhook server (Node 18+)
- **`python/`** — FastAPI-asosli webhook server (Python 3.10+)

Ikkalasi ham quyidagilarni namoyish etadi:

1. **HMAC-SHA256 imzo tekshiruvi** (replay window ±5 daq)
2. **Barcha eventlar**: `message.created`, `message.edited`, `message.deleted`, `message.pinned`, `message.unpinned`, `callback.query`, `invoice.paid`, `inline.query`
3. **Javob turlari**: matn, media (image/video/audio/file), inline tugmalar, invoice (to'lov so'rovi), inline mode natijalari
4. **Proaktiv xabar** — agent tomonidan foydalanuvchiga `POST /api/nexus/agents/webhook-inbox` orqali

## Agent yaratish (Nexus'da)

1. `/nexus` → Ijodkor markazi → **Agent yaratish**
2. Webhook URL: sizning agent serveringiz manzili (masalan `https://your-bot.example.com/webhook`)
3. Yaratganda **`apiKey`** olasiz (`agk_…`) — bu HMAC secret'i. Xavfsiz saqlang.

## Ishga tushirish

Har bir papkadagi `README.md` ga qarang.
