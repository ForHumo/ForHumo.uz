# Ummi poza tizimi — kontekstga mos shaffof poza tanlash

**Sana:** 2026-10-14
**Holat:** Dizayn tasdiqlandi (founder chatda). Qurilish boshlanadi.
**Qaror qabul qiluvchi:** Founder (Abduvohid). Dizayn/ijro: Claude.
**Aloqador:** [[2026-10-03-ummi-agent-vision-design]], [[forhumo-mascot-ummi]], [[2026-10-13-ummi-suggestions-l1-design]].

---

## 1. Maqsad

Ummi har joyda **kontekstga mos shaffof poza**da ko'rinsin. Founder misoli: AI Ramazon haqida gapirsa → avtomatik `211` (do'ppi+fonar+oy). Oldingi ko'k-fonli avatar RAD etildi — **shaffof fon** + mavzuga moslash kerak. Manba: `C:\For Humo\Ummi\Sticker\001..217.png` (217 poza, 512² shaffof).

## 2. Poza katalogi (217 — kategoriya bo'yicha, kalit anchorlar)

- **Classic 001-035:** 001 For-Humo belgi, 003/027 hero/default, 004/005 happy, 010/011 uchish/loading, 012/013/014 love/rahmat, 015 yulduz, 016 "?"/404, 017 lampochka/g'oya, 018 musiqa, 019 gaming, 020 laptop/ish, 024-026 uyqu/offline, 028 cool, 030/031 kitob/bilim, 034 kamera, 035 market-xarid.
- **Emotions 036-065:** kayfiyat — 036/037/050 surprise, 038/039 angry, 040/043/058 sad, 041/065 confused, 045/052 love, 046/064 kulgi, 051/062 wow(yulduz-ko'z), 053 determined, 055 qo'shiq, 057/061 nervous, 060 calm.
- **Gestures 066-095:** 066 salom(wave), 067/086 xush kelibsiz, 071 jim, 074/075/082 ko'rsatish, 085 ta'zim/rahmat, 087 meditatsiya/zen, 089 kuch/muskul, 095 cheer.
- **Apps 096-125:** 096 telefon, 097 qahva, 098 kubok/eSport, 099 xarita/joylashuv, 100 karta/Pay, 101 mikrofon/musiqa, 102 sovg'a, 103 kalit, 104 cho'chqa-hamyon, 105 tangalar, 106 qo'ng'iroq, 107 rasm/art, 108 karnay/e'lon, 109 savat/Market, 110 checklist, 111 bitiruv/bilim, 112 qalqon, 113 kalendar, 114 chat, 115 xarid-sumkalar, 116 raketa, 117 hujjat, 118 lupa/qidiruv, 119 quti/buyurtma, 120 hamyon, 121 soyabon, 122 medal, 123 ID, 124 QR, 125 telefon-bildirishnoma.
- **Status 126-155:** 126 ta'mirlash, 127 chek, 128 sekundomer, 129 past-batareya, 130 bookmark, 131 ogohlantirish, 132 sozlama, 133 xato(X), 134 cloud-sync, 135 100%, 136 5-yulduz/reyting, 137/139 loading, 138/154 qulf, 140 bildirishnoma, 141 trash/o'chirish, 142 success(✓), 143/148/151 analitika, 144 offline(wifi-off), 145 upload, 146 bo'sh(empty box), 147 to'la-batareya, 149 verified, 150 filtr, 152 like, 153 download, 155 share.
- **Daily 156-187:** 156 skeyt, 157 aviabilet/sayohat, 158 velosiped, 159 selfi, 160 asbob/ta'mir, 161 muzqaymoq, 162/185 arqon/fitnes, 163 ovqat, 164/166 basketbol, 165 gantel, 167 planshet, 168 kino/popcorn, 169 mashina, 170 yoga, 171 vanna, 172 samokat, 173 bubble-tea, 174 yozish/eslatma, 175 chamadon, 176 futbol, 177 uyqu/tun, 178 gul-parvarish, 179 oshpaz, 182 gitara, 183 baliq ovlash, 184 gazeta/yangilik, 186 teleskop/kashf, 187 videokamera.
- **Seasons 188-217:** 188 yangi yil(archa), 189 gulxan, 190 sharlar, 191 Santa/sovg'a, 192 lola-guldasta/bahor, 193 yomg'ir-plash, 194 qor-odam/qish, 195 uzum-anor/hosil, 196 do'ppi+sovg'a, 197 yoz-shlyapa, 198 choynak/choy, 199 fonar, 200 osh/plov, 201 ko'rpa/issiq-ichimlik, 202 quloqchin/sovuq, 203 varrak/Navruz, 204 meva-savat, 205 tarvuz/yoz, 206 non, 207 do'ppi, 208 tug'ilgan-kun, 209 chopon, 210 Navruz/sumalak, **211 Ramazon(do'ppi+fonar+oy)**, 212 atirgul/love, 213 lola-guldasta, 214 piknik, 215 guldasta, 216 konfeti/tabrik, 217 kuz/barg.

## 3. Arxitektura

**Asset pipeline:** 217 PNG → `public/ummi/001.webp..217.webp` (256², shaffof, ~8MB). Statik, keshlanadi.

**Registri (`lib/ummi-poses.ts`):**
- `ummiPoseUrl(id)` → `/ummi/NNN.webp`.
- Nomli konstantalar: `UMMI = { hero:3, greet:66, idea:17, love:13, question:16, sleep:25, loading:139, offline:144, empty:146, error:133, warn:131, success:142, verified:149, like:152, ramadan:211, navruz:210, newyear:188, ... }`.
- **Kalit-so'z indeksi** `KEYWORD_POSES` (uz/ru/en) — matndan mavzu topadi. Masalan: ramazon|ramadan|hayit|ro'za|iftor→211; navruz|sumalak→210; yangi yil|new year|rojdestvo→188; to'y|wedding|nikoh→192; pul|to'lov|payment|karta→100; musiqa|music|qo'shiq→101; sport|futbol|o'yin→176/098; kitob|o'qish|bilim→111; sayohat|travel→157; ob-havo|yomg'ir→193; oshpaz|ovqat|retsept→179; video|kino→168; gitara→182; qidiruv|search→118; ... (keng ro'yxat kodda).
- `kind`/modul xaritasi: belis→102, nexus→114, market→109, bn→119, pay→100, esport→098, id→123, profile→66, calendar→113.
- Holat xaritasi: loading→139, offline→144, empty→146, error→133, warn→131, success→142, 404→16.

**Selektor `pickUmmiPose(ctx)`** — ctx: `{ pose?, topic?, kind?, mood?, state?, date?, fallback? }`. Prioritet:
1. aniq `pose` → 2. `state` → 3. `topic` (kalit-so'z) → 4. `kind`/modul → 5. `mood` → 6. mavsum (`date`/bugun) → 7. `fallback` yoki `UMMI.hero`.
Deterministik; bir mavzuга bir nechta mos poza bo'lsa, barqaror tanlov (keyin xohlasa variatsiya).

**Komponent `<UmmiPose>`** (`src/components/ummi/ummi-pose.tsx`): `pose` id yoki `ctx` oladi, shaffof webp render qiladi (`object-contain`, `alt="Ummi"`). Fon YO'Q — har joyда tabiiy "suzadi".

## 4. Integratsiya

- **UmmiTip:** avatar = `pickUmmiPose({ kind })` (taklif turiga mos; ko'k tile EMAS — shaffof poza). Suggestion.kind → poza.
- **AI chat (flagman):** kichik Ummi header/bo'sh-holatда, poza = `pickUmmiPose({ topic: oxirgi xabarlar matni, fallback: greet })`. Suhbat mavzusiga qarab o'zgaradi (Ramazon→211). Monoxrom dizaynga xalaqit bermaydi (kichik, burchak).
- **404** (`not-found.tsx`) → `question`(16). **offline** (`offline.html`) → `offline`(144). **Bo'sh holatlar** → `empty`(146) (kerakli joyларда).
- **Mavsumiy avto:** sana oralig'iда (masalan Ramazon oyi, Navruz ~21-mart, yangi yil ~1-yanvar) default poza mavsumga suriladi (ixtiyoriy ctx.date).

## 5. Qamrov (YAGNI)

**v1:** asset pipeline + registri + selektor + `<UmmiPose>` + UmmiTip ulanishi + AI topic-match + 404/offline/empty holatlar + mavsumiy sana-avtomatikasi.
**v1 EMAS:** animatsiya (Rive/3D — $100 paket), onboarding poza ketma-ketligi, AI javobidan LLM-asosli mood (hozir kalit-so'z yetarli), server-side topic-detection (client keyword yetarli).

## 6. Test

- `tsc` toza. Node: `pickUmmiPose` turli ctx (topic "ramazon"→211, kind "market"→109, state "offline"→144, bo'sh→hero).
- Qo'lda: UmmiTip pozasi turга mos; AI'да mavzu yozsang Ummi o'zgaradi; 404/offline to'g'ri poza.
- Asset: `/ummi/211.webp` → 200.
- Deploy: GitHub push → real prod. Katta asset to'plami (217) — bitta commit.

## 7. Ketma-ketlik

1. Asset: 217 PNG → `public/ummi/*.webp` (sharp).
2. `lib/ummi-poses.ts` (url + konstantalar + kalit-so'z indeksi + kind/holat/mavsum xaritasi + `pickUmmiPose`).
3. `<UmmiPose>` komponenti.
4. UmmiTip → `pickUmmiPose({kind})`, shaffof poza (ko'k tile olib tashlanadi).
5. AI chat → topic-reaktiv kichik Ummi.
6. 404 / offline / empty holatlar.
7. tsc + Node test + deploy.
