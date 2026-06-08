# AI Moderatsiya tizimi — Dizayn

**Sana:** 2026-06-08
**Modul:** Market + Nexus (umumiy)
**Holat:** Tasdiqlangan, amalga oshirilmoqda

## Muammo

Shikoyatlar (`POST /api/market/report`) DB'ga tushadi-yu, hech kim ko'rmaydi —
admin sahifa, hal qilish oqimi va AI yo'q. `lib/ai-moderator.ts` faqat eSport
o'yin natijalarini tekshiradi (kontentga aloqasi yo'q). Nexus'da umuman shikoyat
tugmasi yo'q. Real launch'ga to'siq.

## Qarorlar (foydalanuvchi tanlovi)

1. **Tetik:** Gibrid — pre-publish (yaratishda tez tekshiruv) + reaktiv (shikoyatda chuqur tahlil).
2. **Harakat:** Maslahat + avto-bloklash — odatda admin hal qiladi; FAQAT jiddiy + yuqori ishonchli holatda avto-yashirish.
3. **Qamrov:** Market + Nexus.

## Arxitektura

### `lib/ai-moderate.ts` (yangi)
```ts
moderateContent({ kind, text, imageUrl? }) → {
  verdict: "OK" | "REVIEW" | "BLOCK",
  categories: string[],   // scam, adult, hate, violence, illegal, spam, offtopic
  severity: number,       // 0..1
  reason: string,         // qisqa o'zbekcha
} | null   // AI o'chiq/xato → null (fail-open)
```
- `aiVisionJSON` ustiga (matn + ixtiyoriy rasm). O'zbek + madaniy kontekstga moslangan prompt.
- Oddiy diniy/madaniy kontentni noto'g'ri bloklamaydi.
- Fail-open: AI yo'q/xato → `null`, kontent bloklanmaydi.

### `lib/moderation.ts` (yangi) — server yordamchilari
- `applyModeration({ module, targetType, targetId, text, imageUrl })` — moderateContent → ModerationFlag upsert → kerak bo'lsa avto-yashirish. Pre-publish va reaktiv ikkalasi ishlatadi.
- `hideTarget(module, targetType, targetId, hidden)` — to'g'ri maydonni o'rnatadi (mahsulot=`isActive`, qolgani=`hidden`). target→model xaritasi shu yerda markazlashgan.
- `AUTO_HIDE_SEVERITY = 0.8`.

### `lib/founders.ts` (yangi)
- `FOUNDER_USERNAMES`, `FOUNDER_HUMO_IDS`, `isFounderProfile(p)`. Takrorlangan ro'yxatni birlashtiradi (nexus.ts shuni import qiladi).

### Ma'lumotlar bazasi
**`ModerationFlag`** (yangi, `MarketReport`ni almashtiradi):
`module, targetType, targetId, reportCount, lastReason, aiVerdict, aiCategories[], aiSeverity, aiReason, status(PENDING|KEPT|HIDDEN|AUTO_HIDDEN), reviewedById, reviewedAt, createdAt, updatedAt`. `@@unique([module, targetType, targetId])`, `@@index([status])`.
Enum: `ModerationStatus`, `ModerationVerdict`.

**`hidden Boolean @default(false)`** qo'shiladi: `MarketReview`, `MarketReviewReply`, `MarketProductQuestion`, `MarketProductAnswer`, `NexusPost`, `NexusComment`. O'qish so'rovlari `hidden:false` bilan filtrlanadi. Soft-hide (o'chirmaymiz).

### Tetiklar
- **Pre-publish:** yangi mahsulot/sharh/Q&A + Nexus post/izoh yaratilganda `moderateContent` (~1s, await, fail-open). BLOCK+severity≥0.8 → yashirish + AUTO_HIDDEN. REVIEW/past BLOCK → PENDING flag. OK → hech narsa.
- **Reaktiv:** shikoyatda flag `reportCount++` → AI tahlil → aiVerdict saqlash → jiddiy bo'lsa avto-yashirish, aks holda PENDING.

### Admin navbat
- `/admin/moderation` — founder-gated.
- `GET /api/admin/moderation` (flaglar + kontent ko'rinishi), `POST /api/admin/moderation/[id]/action` (`keep`/`hide`).
- UI: kontent ko'rinishi, muallif, AI verdict badge + kategoriya + severity, shikoyat soni, [Saqlash]/[Yashirish]. Filtr: status × modul.

### Nexus shikoyat
- `nx-social-feed.tsx` post+izohga flag tugma → `POST /api/nexus/report`.

## Amalga oshirish bosqichlari
1. **Yadro:** schema + libs + founder guard + reaktiv report + admin navbat (API+UI) + Market hidden filtr/yashirish.
2. **Pre-publish:** Market yaratishda tekshiruv.
3. **Nexus:** shikoyat route+UI + post/izoh moderatsiyasi + navbatga ulanish + hidden filtr.

## YAGNI (tashqarida)
- "Kontentingiz yashirildi" bildirishnomasi (Nexus'da bildirishnoma tizimi yo'q) — keyinroq.
