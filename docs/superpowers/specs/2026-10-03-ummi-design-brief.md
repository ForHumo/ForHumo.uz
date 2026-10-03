# Ummi — dizayn brifi ($100 paket uchun)

**Sana:** 2026-10-03 · **Holat:** paketga tayyor topshiriq · Aloqador: Ummi agent vizyoni, Ummi shaxsiyat va ovoz.

**Maqsad:** Ummi'ni bir nechta tarqoq rasmdan — Meta Jolly / OpenAI Dots darajasidagi **izchil mascot-tizimga** chiqarish (lekin o'z identitetida: ko'k qush, nusxa emas).

## 1. Mavjud material (input)
- **35-poza shaffof pack:** `C:\For Humo\Ummi\Ummi-1..35.png` (hammasi alpha, brend izchil; katalog — tahlil xabarida).
- Brend rang: **#1D77DE / #68C1ED**; peshona **"F"** belgisi.
- Turnaround: old (Ummi-3), yon (Ummi-9), orqa (Ummi-33) — rig uchun.
- Shaxsiyat/ovoz hujjati (shu papkada).

## 2. Kutilgan natijalar (deliverables)
1. **Kanonik Ummi** — bitta yakuniy hero (old ko'rinish), **≥1024px**, toza render yoki vektor. Peshona belgisi yagonalashtiriladi, bitta ko'z uslubi.
2. **Holatlar to'plami** — bir xil uslub va masshtabda: idle · think (lampochka) · "?" · loading (uchish) · success (bayram) · error · sleep (offline) · love/rahmat · listening (audio). Shaffof `.webp`, 512 va 1024.
3. **Onboarding pozalari** (pack'da yo'q — yangi kerak): qo'l silkib **salom**, barmoq bilan **ishora**.
4. **Rive rig (animatsiya)** — turnaround'dan 2D suyak-rig: idle (nafas/suzish), ko'z pirpiratish, qanot qoqish, reaksiyalar (happy / think / success / error), **holat-mashinasi (state machine)**. Eksport: `.riv` + web runtime. *(Alternativa: Lottie JSON.)*
5. **Modul yuzlari** (ixtiyoriy, keyin): Market, eSport, Bilim, audio...
6. **Shrift jufti** — Ummi ovozi uchun yoqimtoy display (O'zbek harflarini qo'llaydigan, tanlangan) + ilova body shrifti.

## 3. Texnik talablar
- Shaffof fon (alpha); **cho'zmasdan** (contain + padding), bir xil character scale.
- Canvas: 512 (UI) va 1024 (hero); hero ≥1024.
- Dark/light ikkalasida ishlaydi. Ummi rangli → ko'k brend joylarda; AI monoxrom dizaynига hurmat.
- Fayl nomlash: `ummi-<holat>.webp`, `ummi.riv`.

## 4. Uslub qoidalari (do / don't)
- ✅ Ummi = **KO'K QUSH**. ⚠️ Bejeviy/krem momiq = **Meta Muse** — adashmaslik.
- ✅ Bitta kanonik belgi, bitta ko'z uslubi, izchil rang.
- ✅ Rounded/yoqimtoy shrift **faqat Ummi ovozi**; body matni o'qishli shriftda.
- ❌ Har pozada boshqa render uslubi; aralash belgi/ko'z.
- ❌ Flirt/18+ yo'nalish (Grok Ani/Rudi) — bizga mos emas.

## 5. Referens va sifat darajasi
- Meta **Jolly**, OpenAI **Dots** — sifat/polish darajasi uchun namuna (nusxa emas).
- Rive mascot namunalari (idle + state machine) — animatsiya darajasi uchun.

## 6. Ustuvorlik (paket kelganда)
1) Kanonik hero → 2) holatlar to'plami → 3) onboarding pozalari → 4) Rive rig → 5) modul yuzlari.
