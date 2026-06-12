# Humo ID SSO — "Humo ID bilan kirish"

For Humo hamkor ilovalari foydalanuvchini Humo ID hisobi bilan autentifikatsiya qilishi mumkin (OAuth authorization-code uslubi).

## 1. Ro'yxatdan o'tish

Hamkor `SSO_CLIENTS` env (Vercel) ga qo'shiladi — JSON massiv:

```json
[
  {
    "id": "sevinch",
    "name": "Sevinch Sweets",
    "secret": "<tasodifiy-hmac-kaliti>",
    "redirects": ["https://sevinchsweets.uz/auth/humo/callback"]
  }
]
```

- `redirects` — ruxsat etilgan `redirect_uri` **prefikslari** (ochiq-redirect himoyasi).
- `secret` — token-exchange uchun HMAC kaliti (faqat hamkor serverida).

## 2. Foydalanuvchini yo'naltirish (browser)

```
https://forhumo.uz/sso/authorize
  ?client_id=sevinch
  &redirect_uri=https://sevinchsweets.uz/auth/humo/callback
  &scope=profile%20email%20nexus
  &state=<csrf-token>
```

Scope'lar: `profile` (doim), `email`, `nexus` (tasdiq holati + kuzatuvchi soni).

Foydalanuvchi Humo ID'ga kiradi va rozilik beradi → `redirect_uri` ga qaytariladi:

```
https://sevinchsweets.uz/auth/humo/callback?code=<code>&state=<state>
```

Rad etilsa: `?error=access_denied&state=<state>`.

## 3. Kodni profilga almashtirish (server-aro)

`POST https://forhumo.uz/api/partner/sso/token` — HMAC imzo bilan.

Sarlavhalar (partner-auth bilan bir xil):
- `X-Partner-Timestamp: <ms>`
- `X-Partner-Signature: HMAC_SHA256("${ts}.${rawBody}", secret)` (hex)

Tana:
```json
{ "clientId": "sevinch", "code": "<code>", "redirectUri": "https://sevinchsweets.uz/auth/humo/callback" }
```

Javob:
```json
{
  "ok": true,
  "scope": "profile email nexus",
  "profile": {
    "sub": "<barqaror-id>",
    "humoId": "UZ4829341",
    "username": "ali",
    "name": "Ali Valiyev",
    "image": "https://...",
    "country": "UZ",
    "email": "ali@example.com",
    "nexus": { "verified": true, "followers": 1240, "posts": 87 }
  }
}
```

Kod **bir martalik** va **5 daqiqada** muddati tugaydi.

## Xavfsizlik
- `redirect_uri` har doim ro'yxatdagi prefiksga mos kelishi tekshiriladi.
- `state` ni hamkor yaratadi va callback'da solishtiradi (CSRF).
- `secret` hech qachon brauzerga uzatilmaydi — faqat server-aro token-exchange'da.
