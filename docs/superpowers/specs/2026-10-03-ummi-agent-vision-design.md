# Ummi — For Humo AI personaji va agent vizyoni

**Sana:** 2026-10-03
**Holat:** Strategik vizyon (kelishilgan). Dizayn va qurilish keyinroq — pastdagi "Qamrov intizomi"ga qarang.
**Qaror qabul qiluvchi:** Founder (Abduvohid). Tahlil: Claude.

---

## 1. Maqsad

Ummi — For Humo super-app'ining **yagona AI personaji va yuzi**. U bezak (u yer-bu yerda chiqib turadigan animator) **emas** — foydalanuvchi uchun aniq ish bajaradigan **agentning tanasi**.

## 2. Nega aynan hozir (raqobat manzarasi, 2026-10)

2026-yil sentabrda jiddiy o'yinchilar bir xil modelga keldi: **"momiq/do'stona yuz = mustaqil agentning tanasi"**. Bu endi sanoat standarti, bezak emas.

| Kompaniya | Personaj | Aslida nima qiladi |
|---|---|---|
| Meta | **Jolly** | "Muse" agenti — ilovalarda user uchun ish bajaradi; Connect'da "markaziy nuqta" |
| OpenAI | **Dots** (2026-09-29) | ChatGPT ichida 24/7 fonda ishlaydigan agentlar; har biri bulut-kompyuter + 4000 ilova (GPT-6 Astra) |
| Microsoft | **Mico** | Copilot'ning ovozli yuzi |
| Grok (xAI) | **Ani / Rudi** | **Chetda** — o'yin-kulgi/hamroh (18+). Biz bu yo'lni NUSXALAMAYMIZ |

Yumshoq yuzning vazifasi — AI'dan qo'rquvni ("AI-doomerism") kamaytirish, ishonch berish. Mascotli brendlar bozor ulushini oshirishda ~37% ustun (marketing tadqiqoti).

## 3. Ummi — ta'rif va vazifa

> **Ummi = For Humo'ning yagona ishonchli yuzi va orkestratori.** U foydalanuvchini o'rganadi, har joyda unga mos eng yaxshi takliflarni beradi, va **ruxsat/buyruq berilganda** ishni o'zi bajaradi — to'lov, sotib olish, rasmiylashtirish, yaratish kabi.

Bu founder'ning eski rejasining davomi: *AI userni to'liq o'rganadi → har joyda mos takliflar → user ruxsat berganda mustaqil bajaradi.*

## 4. Halol pozitsiya (qayerda yutamiz, qayerda yo'q)

- ❌ **Model/infra kuchida Meta/OpenAI bilan raqobat — imkonsiz.** Ularda frontier modellar va milliardlab dollar bor. "Bizning AI aqlliroq" — yutqaziladigan jang.
- ✅ **Native integratsiya + mahalliy ishonchda yutamiz.** Dots/Muse 4000 ta **begona** ilovaga plagin orqali ulanishga majbur (ruxsat, ishonch, tartibsizlik). For Humo o'z modullariga **ega** — Ummi Market/BN/eSport/to'lovda ishlashi uchun hech qanday integratsiya kerak emas. Native, to'liq ishonch, to'liq ma'lumot, ona tilda.
- **Yutiladigan jang:** "internetdagi hamma narsani qiladigan agent" emas — **"O'zbek kundalik hayotining hammasini (ovqat, to'lov, o'yin, xarid, xabar) bir joyda, ona tilda, ishonch bilan bajaradigan yagona yuz."**

## 5. Arxitektura

**Pattern:** multi-agent orchestration (orkestrator + mutaxassis sub-agentlar).

- **Yuzda — faqat Ummi.** User doim faqat Ummi bilan gaplashadi. Bitta tanish, ishonchli yuz.
- **Orqada — ko'rinmas mutaxassis agentlar** (Market-agent, BN-agent, eSport-agent, To'lov-agent...). Har biri o'z sohasini chuqur biladi va kuzatib boradi. **Ular yuzsiz** — foydalanuvchiga ko'rinmaydi.
- **Oqim:** user Ummi'ga buyruq beradi → Ummi vazifani bo'laklaydi, ko'rinmas mutaxassislardan ma'lumot yig'adi/topshiradi → mutaxassislar o'z bo'limida ishlaydi va hisobot qaytaradi → Ummi tahlil qiladi va **yakuniy qarorni** chiqaradi.
- **Barcha qaytmas qarorlar (to'lov, sotib olish, rasmiylashtirish) FAQAT Ummi'da**, bitta nazorat nuqtasida, qat'iy gated (limit + tasdiq + undo + audit).

> ⚠️ Brend qoidasi: har modulga **alohida ko'rinadigan mascot BERILMAYDI** (brend parchalanishi — 6 mascot = 0 mascot). Mutaxassis agentlar — texnik, yuzsiz. Keyinchalik ayrim modulga alohida personaj *ataylab brend kengaytmasi* sifatida qo'shilishi mumkin, lekin agent-mexanizmi sifatida emas.

## 6. Avtonomiya zinapoyasi

| Daraja | Ummi nima qiladi | Pul |
|---|---|---|
| **L0** | Yuz — javob beradi, yo'l ko'rsatadi | yo'q |
| **L1** | Userni o'rganadi → shaxsiy taklif beradi (hamma modulda) | yo'q |
| **L2** | Harakatni tayyorlaydi, user bir bosishda tasdiqlaydi | tasdiq bilan |
| **L3** | Kam xavfli, qaytariladigan ishni o'zi bajaradi (user limiti ichida) | hali gated |
| **L4** | To'liq delegatsiya — qat'iy byudjet/qoida + audit + darhol undo | avtonom, cheklangan |

Eski reja = **L1-L2**. Dots/Muse darajasi = **L4** (yillar narida). **Birinchi real qadam = L1.**

## 7. Qamrov intizomi (YAGNI — nima HOZIR EMAS)

- To'liq agent-to'dasi (bir-biriga hisobot beradigan swarm) — **hozir emas.** Bu 2-3 yillik shimoliy yulduz. Katta laboratoriyalar ham swarm'ni "mo'rt va qimmat" deydi.
- **Mustaqil pul harakati (L3-L4 to'lov) — eng oxirida va eng qattiq nazorat bilan.** Sabab: xavfsizlik (bug/prompt-injection hisobni bo'shatishi mumkin), ishonch (yangi user qo'rqadi), huquqiy (MChJ bor, bank/e-imzo yo'q). Sanoat ham bu yerda qoqildi ("safety setbacks"). Industry hard-line: AI mustaqil pul ko'chirmaydi — avval "tayyorlaydi → user tasdiqlaydi".
- Dizayn/animatsiya — founder $100 dizayn paketini olgach boshlanadi (parked).

## 8. Yaqin muddat ketma-ketligi

1. **HOZIR:** shu vizyonni yozib qotirish (bu hujjat). ✅
2. **KEYIN ($100 dizayn paketi bilan):** Ummi'ning to'liq vizual tizimi + animatsiya (Rive — ilova mascotlari uchun eng mos; yoki keyin 3D). Hozirgi CSS-animatsiya 404/offline'da test sifatida turibdi.
3. **SO'NG:** L1 bo'lagini qurish — "taklif beruvchi Ummi" va quyidagi onboarding (eng kichik real qadam, pulsiz).

## 8a. Birinchi real yuza — Ummi-yo'lboshchi onboarding (L0–L1)

**Vazifa:** yangi foydalanuvchiga super-app bo'yicha bazaviy tushuncha berish; Ummi — yo'lboshchi. Bu Yo'nalish 2 (yo'lboshchi)ning birinchi, kichik ko'rinishi va L0→L1 ga ko'prik. Super-app ko'p modulli bo'lgani uchun "discovery" muammosini yechadi.

**Ijro qoidasi (muhim — aks holda foydasiz bo'ladi):**
- **Qisqa + o'tkazib yuborsa bo'ladigan (skip) + kontekstual.** Boshida uzun slayd/karusel EMAS.
- Ummi har modulga **birinchi kirganda, o'sha joyda** qisqa ko'rsatma beradi; bo'sh holatlar ham o'rgatadi.

**Ovoz va uslub (founder taklifi):**
- Matn Ummi nomidan beriladi — `Ummi: ...` yoki speech-bubble, birinchi shaxs, do'stona ohang.
- Ummi gaplari uchun **"yoqimtoy" (rounded/do'stona) display shrift** — LEKIN faqat Ummi ovozi uchun. Ilovaning asosiy matni odatdagi o'qishli shriftda qoladi (rounded shrift uzun matnda o'qishni qiyinlashtiradi, noprofessional ko'rinadi). Shrift O'zbek harflarini (oʻ, gʻ, ʼ) to'liq qo'llashi shart.

**Pozalar (pack'dan):** salom (qo'l silkish — yaratiladi), ishora (barmoq — yaratiladi), Ummi-16 ("?"), Ummi-17 (lampochka/taklif), Ummi-21 (bayram/tamom), Ummi-3 (hero).

## 8b. Mini-ilovalar = Ummi qobiliyatlari (2026-10-05, founder qarori)

**Prinsip:** mini-ilovalar (Kalendar, Sheet...) Google nusxasi EMAS — ular Ummi o'qib/yozadigan **ma'lumot + harakat qatlamlari** (capabilities). Sodda bo'ladi; maqsad — Ummi'ga tuzilgan ma'lumot berish, Google bilan xususiyat-jangi emas. "Google'ni ilovada yutib bo'lmaydi; biz bog'liqlikда yutamiz."

**Sehr = modullararo fikrlash** (Ummi ma'lumotga EGA). Founder misoli: Nexus chatда uchrashuv belgilanadi → Kalendarга tushadi → keyin Humo Live'да user "eslatma qo'y" deganда Ummi: *"o'sha kuni falon joyда falon bilan uchrashuvingiz bor (Nexus'да belgilangan), yo'l uzoq — ulgurmasligingiz mumkin"*. Google buni O'zbekistonда qila olmaydi (uning Kalendari Nexus/BN/joylashuvni bilmaydi).

**Qoida — bittadan (YAGNI):** hammasi birvarakayiga EMAS. Bitta patternni ("Ummi modul ma'lumotini o'qiydi va yozadi") mukammal qilib, keyin kengaytiramiz.

**BIRINCHI = Kalendar (proof-of-concept):**
- **v1 (sodda):** tadbir yaratish (Ummi Live/chatда "ertaga soat 3da uchrashuv" → kalendar), o'qish, eslatma. Modullararo: Nexus chatда aytilgan uchrashuvni Ummi ko'radi va eslatadi.
- **v2 (shimoliy yulduz):** yo'l-vaqt / joy xabardorligi (xarita) → "ulgurmaysiz" ogohlantirishi. v1'да VA'DA QILINMAYDI.

**Excel/Sheets (sotuvchilar):** DEPRIORITIZED — to'liq Excel ulkan ish; sotuvchilarga oddiy jadval yoki BN'ning o'z vositalari yetadi. Aniq ehtiyoj paydo bo'lsa, yengil "sheet" keyin.

**Texnik asos:** bog'liqlik uchun Ummi'ga **modullararo yagona retrieval** (Nexus/Kalendar/BN/Pay ma'lumotini o'qish) qatlami kerak — bu L2-L3 agent qurilishining o'zagi, arzimas emas. Maxfiylik: proaktiv o'qish **ruxsat/ishonch modeli** bilan (anti-spam qoidasi). Har mini-ilova orkestrator chaqiradigan "capability" sifatida ro'yxatdan o'tadi (4-bo'lim).

## 9. Ochiq savollar (keyin hal qilinadi)

- L1 qaysi moduldan boshlanadi (Humo AI chat ichidami yoki butun app bo'ylab)?
- Mutaxassis agentlar texnik ravishda qanday quriladi (model, tool-calling, xotira) — $100 dizayndan keyin, alohida texnik spec.
- Ummi'ning "userni o'rganishi" — qaysi ma'lumot, qanday ruxsat, qanday maxfiylik chegarasi (anti-spam va ishonch qoidalariga mos).

---

*Aloqador: Humo AI dizayni (sof qora monoxrom), Humo AI roadmap, anti-spam qoida.*
