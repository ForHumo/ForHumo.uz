# Ummi takliflari (L1 v1) — in-app taklif yuzasi

**Sana:** 2026-10-13
**Holat:** Dizayn tasdiqlandi (founder chatda). Qurilish boshlanadi.
**Qaror qabul qiluvchi:** Founder (Abduvohid). Dizayn/ijro: Claude.
**Aloqador:** [[2026-10-03-ummi-agent-vision-design]] (L1 bosqichi), anti-spam qoida, Humo AI roadmap.

---

## 1. Maqsad va kontekst

Ummi-vizyonining **L1 bosqichi**: Ummi foydalanuvchini o'rganadi va unga **shaxsiy takliflar** beradi (pulsiz, ruxsat/anti-spam bilan). Vizyon §6: L1 = "userni o'rganadi → shaxsiy taklif beradi (hamma modulda)".

**Muhim — ko'pi allaqachon bor:** o'rganish va taklif-generatsiya dvigateli qurilgan va ishlayapti:
- `UserKnowledge` (shifrlangan faktlar) + `UserSignals` (kunlik cross-module xatti-harakat) + chatda avto-ekstraksiya.
- `ai-daily-recommendation` cron (kunlik 18:00) — KB+signallardan taklif generatsiya qilib **push** yuboradi (Belis/Nexus/BN/profil-to'ldirish qoidalari).

**Haqiqiy bo'shliq (bu spec yopadi):** taklif faqat **push** orqali yetadi → push obunasi yo'q foydalanuvchi (web'da ko'pchilik) **hech narsa ko'rmaydi**; va ilovada taklifni ko'rish/rad etish/nazorat yo'q. L1 v1 = **in-app "Ummi taklif" yuzasi** (hamma ko'radi) + nazorat, mavjud dvigatelni qayta ishlatib.

**Muvaffaqiyat mezoni:** push obunasi bo'lmagan faol foydalanuvchi ham bosh sahifa yoki Humo AI chatda nozik, rad etiladigan shaxsiy taklifni ko'radi; rad etsa — o'sha kuni qaytmaydi; AI Sozlamalardan butunlay o'chira oladi.

## 2. Qamrov intizomi (YAGNI)

**v1'DA BOR:** bitta qayta-ishlatiladigan komponent + markaziy saqlagich + bitta lib (cron bilan umumiy) + API + nazorat toggle; 2 yuzaga ulanadi (bosh sahifa + Humo AI chat).

**v1'DA YO'Q:** LLM-generatsiya (qoidalar yetarli); suzuvchi mascot/animatsiya (dizayn paketi — parked); cross-module "sehr" (Calendar PoC alohida); har modulga birvarakay ulash (komponent qayta-ishlatiladigan — keyin bir qatorda qo'shiladi); FAB/bildirishnoma-markazi shakllari (1-yondashuv tanlandi).

## 3. Arxitektura

Bitta dvigatel, ko'p yuza. Mavjud `ai-daily-recommendation` route ichidagi `generateRecommendation` mantiqi `lib/ummi-suggestions.ts`ga ko'chiriladi; **ham cron (push), ham in-app yuza shu bitta libdan** foydalanadi (ikki xil mantiq bo'lmaydi).

```
UserKnowledge + UserSignals ──▶ lib/ummi-suggestions.ts ──▶ UmmiSuggestion (saqlagich)
                                        │                           │
                           ai-daily-recommendation cron       /api/ai/suggestions (GET/PATCH)
                                   (push + saqlash)                  │
                                                             <UmmiTip/> komponenti
                                                          (bosh sahifa, AI chat, ...)
```

## 4. Ma'lumot modeli — `UmmiSuggestion` (yangi)

```prisma
model UmmiSuggestion {
  id         String   @id @default(cuid())
  profileId  String                          // owner (faqat o'zi)
  kind       String                          // "belis"|"nexus"|"bn"|"profile"|...
  title      String
  body       String
  url        String                          // ichki ("/nexus/...") yoki tashqi (https://...)
  status     String   @default("NEW")        // NEW|SEEN|DISMISSED|ACTED
  dedupeKey  String                          // bir xil taklifni takrorlamaslik uchun (kind+resurs)
  createdAt  DateTime @default(now())
  expiresAt  DateTime                         // odatda +3 kun; o'tgach ko'rinmaydi
  updatedAt  DateTime @updatedAt

  @@index([profileId, status, expiresAt])
  @@unique([profileId, dedupeKey])            // idempotent — qayta generatsiyada dublikat bo'lmaydi
}
```
Saqlash sabablari: rad etishni eslab qolish, har yuklanishda qayta generatsiya qilmaslik, push va in-app bir xil taklifni ko'rsatishi.
**Migratsiya:** `prisma db push` (yangi model — data-loss yo'q; prod'da founder ishga tushiradi, [[forhumo-telegram-bots]] muhit tuzog'i: lokal `vercel` CLI ishlatma).

## 5. Lib — `lib/ummi-suggestions.ts`

- `buildSuggestion(profileId): Promise<Draft|null>` — KB+signallardan taklif qoralamasi (mavjud qoidalar ko'chiriladi: Belis→Nexus→BN→profil-to'ldirish), `dedupeKey` bilan. LLM yo'q.
- `getActiveSuggestion(profileId): Promise<UmmiSuggestion|null>` — toggle o'chiq bo'lsa `null`; aks holda faol (status≠DISMISSED, expiresAt>now) taklifni qaytaradi; bo'lmasa va bugun rad etilmagan bo'lsa `buildSuggestion`→upsert (dedupeKey bo'yicha)→qaytaradi. **Kunlik cap:** bugun DISMISSED bo'lsa yangi generatsiya qilmaydi.
- `setSuggestionStatus(id, profileId, status)` — faqat egaси; dismiss/acted.
- `ummiTipsEnabled(profile): boolean` — `notifPrefs.ummiTips !== false` (default yoniq).

Cron (`ai-daily-recommendation`) shu libni chaqiradi: `buildSuggestion` → saqlaydi → push (mavjud oqim). Bitta manba.

## 6. API — `/api/ai/suggestions`

- `GET /api/ai/suggestions` — joriy foydalanuvchi faol taklifi (`getActiveSuggestion`) yoki `null`. Auth majburiy, faqat o'ziniki. `force-dynamic`.
- `PATCH /api/ai/suggestions/[id]` — `{ status: "DISMISSED" | "ACTED" | "SEEN" }`. Faqat egasi (profileId tekshiruvi). 403 begona id'da.

## 7. UI — `UmmiTip` komponenti (`src/components/ai/ummi-tip.tsx`)

- Qayta-ishlatiladigan, o'zi ma'lumotini oladi (`GET /api/ai/suggestions`).
- Nozik karta: statik Ummi avatar (`/mascot/ummi.webp`, kvadrat-yumaloq) + sarlavha + matn + "Ochish" (→url, ichki `Link`/tashqi `a`; ochilganda `PATCH status=ACTED`) + "Kerakmas" (`PATCH status=DISMISSED`, karta yo'qoladi).
- **Ko'rinmaydi** (hech qanday joy egallamaydi) agar: toggle o'chiq / taklif yo'q / yuklanmoqda / rad etilgan. Hech qachon bo'sh karta yoki skelet ko'rsatmaydi (anti-spam — jim).
- Ochilganda bir marta `PATCH status=SEEN` (ko'rildi).
- i18n: `aiT` (ai-i18n.ts lug'atiga "Kerakmas"/"Ochish"/sarlavha-shablon kalitlari qo'shiladi, uz/ru/en). Taklif matni (title/body) dvigatelda yaratiladi — hozircha o'zbekcha (mavjud cron ham o'zbekcha); i18n kengaytmasi keyin.
- Dizayn: mavjud AI monoxrom/BN uslubiga mos, emoji yo'q (Lucide + Ummi rasm).

**v1 mount:** `home-content.tsx` (hero ostida, nozik) + Humo AI chat (`ai-chat-page.tsx`, bo'sh/yuqori holatda). Ikkalasi ham `<UmmiTip/>` — qayta-ishlatiladigan.

## 8. Nazorat + anti-spam ([[forhumo-ai-antispam]] hurmat)

- Toggle: `UserProfile.notifPrefs.ummiTips` (JSON kaliti; default yoniq). AI Sozlamalar panelida ("Shaxsiylashtirish" bo'limi) + o'chirish imkoni. O'chiq → GET `null`, hech joyda ko'rinmaydi, cron ham push yubormaydi.
- Bir vaqtda **1 faol taklif**; rad etilsa o'sha kuni yangisi yo'q (kunlik cap, `getActiveSuggestion` ichida). Push + in-app bir cap'ni baham ko'radi (mavjud `aiUsage` kind="daily-recommendation" + UmmiSuggestion createdAt).
- `expiresAt` (+3 kun) — eski taklif o'zi yo'qoladi.

## 9. Maxfiylik

Takliflar faqat foydalanuvchining **o'z** KB/signalidan (allaqachon AES-GCM shifrlangan, faqat-o'ziniki). Yangi ma'lumot ochilmaydi, boshqa foydalanuvchiga ko'rinmaydi. `UmmiSuggestion.url`/`title`/`body` — hosil qilingan matn (maxfiy xom-fakt emas). GET/PATCH qat'iy `profileId` gated.

## 10. Test (repo'da framework yo'q)

- `npx tsc --noEmit` toza.
- Node skript bilan: `buildSuggestion` turli KB holatlarida (bo'sh/Belis/Nexus/BN) to'g'ri qoralama qaytarishi; `getActiveSuggestion` cap (dismiss→null o'sha kun); PATCH begona id→403.
- Qo'lda: bosh sahifa/AI chatда karta ko'rinishi, rad etish, toggle o'chirish → yo'qolishi.
- Deploy: GitHub push → real prod (lokal `vercel` CLI ishlatma); `UmmiSuggestion` uchun `prisma db push` founder ishga tushiradi.

## 11. Ketma-ketlik (qurilish)

1. `UmmiSuggestion` modeli + `db push` (founder).
2. `lib/ummi-suggestions.ts` (buildSuggestion cron'dan refactor + getActiveSuggestion + status + toggle).
3. `ai-daily-recommendation` cron'ni libга o'tkazish (saqlash + push bir manbadan).
4. `/api/ai/suggestions` GET + `[id]` PATCH.
5. `UmmiTip` komponenti + i18n kalitlari.
6. Mount: bosh sahifa + AI chat.
7. AI Sozlamalar toggle.
8. tsc + Node tekshiruv + deploy.
