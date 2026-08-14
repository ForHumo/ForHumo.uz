# ForHumo Agent — Node.js namuna

Express-asosli webhook server. Barcha event turlarini namoyish etadi.

## O'rnatish

```bash
npm install
cp .env.example .env
# .env ichida FORHUMO_AGENT_API_KEY ni to'ldiring
npm start
```

Server `http://localhost:8080/webhook` da tinglaydi.

## Nexus'da ulash

Agent yaratish ekranida:
- **Webhook URL**: `https://your-tunnel.example.com/webhook` (production'da o'z domeningiz; test uchun ngrok/cloudflared)
- **API Kalit**: agent yaratganda beriladi, uni `.env` ga qo'ying

## Nima qiladi

- `message.created` — foydalanuvchi matnini takrorlaydi, `/help` bo'lsa yordam menyusi
- `callback.query` — inline tugma bosilganda javob beradi
- `invoice.paid` — to'lov muvaffaqiyatli bo'lganda tasdiqlash yuboradi
- `inline.query` — `@bot query` yozganda 3 ta namuna natija qaytaradi
- `message.edited/deleted/pinned/unpinned` — log qiladi (agent xohlagan reaksiya qo'sha oladi)

## Proaktiv xabar

`sendProactive.js` — mustaqil script, foydalanuvchiga (`profileId`) yoki botga
DM yuboradi (masalan cron/tashqi event orqali).

```bash
node sendProactive.js <recipientProfileId> "Salom, bu jonli xabar"
```
