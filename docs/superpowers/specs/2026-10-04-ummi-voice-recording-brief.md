# Ummi — ovoz yozib olish brifi va stsenariy (aktyor uchun)

**Sana:** 2026-10-04 · Aloqador: Ummi shaxsiyat va ovoz, Ummi agent vizyoni.

> Bu hujjatni ovoz ustasiga bering. Maqsad: bu yozuvlardan AI **ovoz kloni** yasaladi — keyin Ummi **istalgan matnni, istalgan tilda** shu ovozda gapiradi (aniq so'zlarni oldindan yozmaymiz; klon yangi gaplarni o'zi o'qiydi).

## 1. Personaj — Ummi
- For Humo super-app'ining AI yordamchisi (ko'k qush).
- Ovoz: **yosh, yorqin, yengil, o'ynoqi, iliq — lekin aniq va aqlli.** Pixar uslubi: cute, lekin ishonchli.
- ❌ Kattalar diktori emas. ❌ Chaqaloq/erkalovchi ovoz emas.
- "Ovozda tabassum" eshitilsin — do'stona, suhbatdek, robot emas.

## 2. Texnik talablar
- **Muhit:** tinch xona, **aks-sado (echo) yo'q** (yumshoq mebel/parda yordam beradi); konditsioner/ventilyator/ko'cha shovqini o'chiq.
- **Mikrofon:** kondensator/USB (telefon emas) + **pop-filtr**; og'izdan **doim bir xil masofa** (~15–20 sm).
- **Format:** **WAV, 48 kHz, 24-bit, mono** — effekt/EQ/kompressiyasiz, **xom va toza**.
- Har gap orasida 1–2 soniya jimlik; xato bo'lsa to'xtab, qaytadan o'qing.
- Butun sessiyada bir xil masofa, energiya, character.
- **Miqdor:** minimal ~15–20 daqiqa toza; yaxshisi **30–60 daqiqa** (ko'proq variant = barqarorroq klon).
- Fayllar nomlangan: `ummi-uz-01.wav`, `ummi-uz-02.wav`... + zaxira nusxa.

## 3. Ijro (eng muhim)
Har bo'limni **tegishli hissiyot bilan**, Ummi bo'lib o'qing. Tabiiy, iliq, o'rtacha tezlik, aniq artikulyatsiya.

---

## 4. STSENARIY (o'zbekcha)

### A. Tanishuv / salom — *iliq, ochiq*
- Salom! Men Ummi — For Humo yordamchingizman.
- Xush kelibsiz! Keling, bugun nimadan boshlaymiz?
- Salom, yana uchrashganimdan xursandman.
- Men shu yerdaman — nima kerak bo'lsa, bemalol ayting.

### B. Yo'l ko'rsatish / taklif — *yordamchi, bosimsiz*
- Sizga shu mos keladi deb o'ylayman — bir ko'rib chiqaylikmi?
- Kichik maslahat: buni shunday qilsangiz, ancha tezroq bo'ladi.
- Xohlasangiz, men buni siz uchun tayyorlab qo'yaman.
- Mana bu variant sizga qiziq bo'lishi mumkin.

### C. Muvaffaqiyat / quvonch — *yorqin, lekin ortiqcha emas*
- Zo'r! Hammasi bajarildi.
- Ajoyib — bu sizda juda yaxshi chiqdi!
- Tayyor! Yana bir qadam bosib o'tdik.
- Barakalla, shunday davom etamiz.

### D. Xato / uzr — *muloyim, tinch*
- Uzr, biror narsa noto'g'ri ketdi. Qayta urinamizmi?
- Hmm, bu safar bo'lmadi — xavotir olmang, hal qilamiz.
- Kechirasiz, bir oz kuting — tekshirib ko'ryapman.

### E. Savol / tasdiq — *aniq, ishonchli*
- Tasdiqlang: hammasi to'g'rimi?
- Shuni xohlagan edingizmi?
- Davom etaveraymi?
- Bitta narsani aniqlasak: qaysi birini tanlaysiz?

### F. Qisqa / kundalik — *tabiiy*
- Albatta. · Tayyor. · Bir soniya... · Marhamat. · Xo'p, bo'ldi. · Rahmat sizga!

### G. Raqam va vaqt — *artikulyatsiya uchun*
- Bugun soat to'qqizda uchrashuvingiz bor.
- Jami qirq besh ming so'm.
- Uch, ikki, bir — boshladik!
- Yuz foiz tayyor.

### H. Fonetik qamrov — *o'zbek tovushlari (o', g', ng, sh, ch, q, x, ')*
- O'zbek tilida chiroyli so'zlar: yomg'ir, tog', qushcha, chaqmoq, shoshqaloq.
- Ajoyib bahorda bog'da qushlar sayraydi, shabada esadi.
- E'lon, ta'sir, ma'no — bu so'zlar tutuq belgisi bilan yoziladi.

---

## 5. (Ixtiyoriy) boshqa tillar — ko'p tilli sifat uchun
Imkon bo'lsa, shu jumlalarni ham yozing (bir xil character bilan):
- **EN:** Hi! I'm Ummi, your For Humo assistant. Let's take the first step together.
- **RU:** Привет! Я Умми, ваш помощник For Humo. Давайте сделаем первый шаг вместе.

## 6. Huquqiy (YOZUVDAN OLDIN imzolanadi)
Aktyor bilan yozma rozilik/shartnoma, unda aniq: **AI ovoz klonlash + yangi nutq sintezi (nafaqat yozilgan gaplar) + barcha tillar + tijorat foydalanish + muddat/ko'lam.** Adolatli to'lov (buyout yoki litsenziya).

## 7. Yakuniy chek-list
- [ ] Shartnoma/rozilik imzolangan
- [ ] Tinch xona, echo yo'q, shovqin o'chiq
- [ ] WAV 48 kHz / 24-bit / mono, effektsiz
- [ ] Character bir xil: yosh · iliq · yorqin · aqlli
- [ ] A–H bo'limlar o'qilgan (+ ixtiyoriy EN/RU)
- [ ] ~30+ daqiqa toza material
- [ ] Fayllar nomlangan, zaxira nusxa saqlangan

> Keyingi qadam: bu toza WAV'lar → ElevenLabs "Professional Voice Clone" (yoki shunga o'xshash) → Ummi kloni → API orqali istalgan matn/til shu ovozda.
