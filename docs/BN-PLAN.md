# BOZOR NARXIDA — To'liq loyiha rejasi

> **Holat:** v1.0 reja — 2026-08-03
> **Qoida:** Bu reja yagona manba. Rejada yo'q narsa qilinmaydi.
> Yangi g'oya chiqsa — avval shu faylga yoziladi, keyin bajariladi.

---

## 1. LOYIHA HAQIDA

**Bozor Narxida (BN)** — **For Humo loyihalaridan biri** (hamkorlik EMAS).
Domen: `bozornarxida.uz`

### Nima uchun kerak

O'zbekistonda ikki xil savdo bor va ular hech qachon bir joyda birlashmagan:

| | Jismoniy bozorlar | Onlayn marketplace'lar |
|---|---|---|
| Misol | Sergeli avto bozor, Chorsu, Malika, Abu Sahiy | Uzum, Olcha, Asaxiy |
| Kuchi | Narx arzon, savdolashish, ko'rib olish | Qulay, yetkazish, kafolat |
| Zaifligi | Onlayn yo'q, narx noma'lum, borish kerak | Ombor modeli, bozorlar yo'q, narx qimmat |

**BN ikkalasini bir joyga qo'yadi.** Bozordagi do'kon ham, ko'chadagi do'kon ham, faqat onlayn ishlaydigan sotuvchi ham — bitta platformada, bitta qidiruvda, bitta savatda.

### Brend va'dasi

Nomi aytadi: **"Bozor Narxida"** = eng adolatli narx.
Shuning uchun har mahsulotda **bozor o'rtacha narxi** ko'rsatiladi:

> Bu mahsulotning bozordagi o'rtacha narxi: **450 000 so'm**
> Bu do'konda: **420 000 so'm** — bozor narxidan **7% arzon** ✓

Bu va'dani bajarmasak, nom yolg'on bo'ladi. Shuning uchun bu **majburiy funksiya**, bezak emas.

---

## 2. ASOSIY G'OYA — "Bozor / Do'kon / Mahsulot"

Bu rejaning eng muhim qismi. Chalkashlik shu yerda hal bo'ladi.

### Muammo

"Bozorlarni ham, do'konlarni ham bitta joyga qo'yamiz" desak, tabiiy savol chiqadi:
*"Bozor nima — sotuvchimi? Do'kon nima — sotuvchimi? Ikkalasi bir vaqtda bo'lsa nima bo'ladi?"*

### Yechim: Bozor = JOY, Do'kon = BIZNES

```
BOZOR (joy)                    DO'KON (biznes)              MAHSULOT
─────────────                  ───────────────              ────────
Sergeli avto bozor      ┌────  Jalol Motors        ────┐    Nexia tormoz kolodka
  12-qator              │      (YaTT: 12345678901)      │    Damas radiator
  45-do'kon             │                               │
                        │                               │
Chorsu bozor            ├────  Aziz Elektronika   ────┤    iPhone 13 128GB
  Elektronika rasta     │      (MChJ: ...)              │    Samsung zaryadchi
  8-do'kon              │                               │
                        │                               │
(bozorsiz)              ├────  Malika Kiyim       ────┤    Ayollar ko'ylagi
  Chilonzor, Bunyodkor  │      (YaTT: ...)              │
  ko'chasi 12           │                               │
                        │                               │
(faqat onlayn)          └────  Tez Yetkazish      ────┘    Sport oziqlanish
                               (MChJ: ...)
```

**Qoidalar:**

1. **Har sotuvchining aynan bitta do'koni bor.** (Bitta Humo ID = bitta do'kon)
2. **Har do'kon uchta joydan birida bo'ladi:**
   - `IN_MARKET` — bozor ichida (bozor + qator + do'kon raqami)
   - `STANDALONE` — o'z manzilida (ko'cha, uy)
   - `ONLINE` — jismoniy nuqta yo'q, ombordan yetkaziladi
3. **Bozor sotuvchi emas — u konteyner.** Bozorning o'zi hech narsa sotmaydi.
4. **Mahsulot doim do'konga tegishli**, bozorga emas.

### Bu nima beradi

**Xaridor uchun** — uchta tabiiy yo'l, hammasi bir xil mahsulotlarga olib boradi:
1. **Qidiruv** — "Nexia tormoz kolodka" → barcha do'konlardan
2. **Kategoriya** — Avto → Tormoz tizimi → Kolodkalar
3. **Bozor** — "Sergeli bozorda nima bor?" → o'sha bozordagi do'konlar

**Sotuvchi uchun** — bitta oqim, bitta savol:
> "Do'koningiz qayerda?" → Bozorda / Alohida manzilda / Faqat onlayn

**Platforma uchun** — bu **raqobat ustunligi**. Uzum ham, Olcha ham bozorlarni ko'rsatmaydi. BN — jismoniy bozorlarning raqamli qatlami.

---

## 3. UNIVERSAL KATEGORIYALAR (eng katta o'zgarish)

### Muammo

Hozirgi kod faqat avto ehtiyot qismlar uchun yozilgan. `BnProduct` jadvalida qattiq yozilgan maydonlar bor:
`carBrand`, `carModel`, `carYearFrom`, `carYearTo`, `partCondition`

Telefon sotmoqchi bo'lgan sotuvchi nima qiladi? Kiyim-chi?

### Yechim: Atribut sxemasi (attribute schema)

Har kategoriya o'zi qanday maydonlar kerakligini **aytadi**. Mahsulot ularni JSON'da saqlaydi.

**Kategoriya sxemasi misoli** (`BnCategory.attributeSchema`):

```json
[
  { "key": "brand",  "label": "Marka",  "labelRu": "Марка",
    "type": "select", "options": ["Chevrolet","Daewoo","Kia","Hyundai","Toyota"],
    "required": true, "filterable": true },

  { "key": "model",  "label": "Model",  "labelRu": "Модель",
    "type": "text",   "required": true,  "filterable": true },

  { "key": "yearFrom", "label": "Yildan", "type": "number", "filterable": true },
  { "key": "yearTo",   "label": "Yilgacha","type": "number", "filterable": true },

  { "key": "condition", "label": "Holati", "labelRu": "Состояние",
    "type": "select", "options": ["Yangi","Ishlatilgan","Ta'mirlangan"],
    "required": true, "filterable": true }
]
```

**Mahsulot qiymatlari** (`BnProduct.attributes`):

```json
{ "brand": "Chevrolet", "model": "Nexia 3", "yearFrom": 2015, "yearTo": 2020, "condition": "Yangi" }
```

**Natija:** avto uchun ham, telefon uchun ham, kiyim uchun ham bir xil kod ishlaydi.
Yangi kategoriya qo'shish = yangi kod emas, faqat sxema yozish.

### Atribut turlari (faqat shular, boshqa yo'q)

| Turi | Ma'nosi | UI |
|---|---|---|
| `text` | Erkin matn | Input |
| `number` | Raqam | Number input |
| `select` | Bittasini tanlash | Custom dropdown (native `<select>` EMAS) |
| `multiselect` | Bir nechtasini tanlash | Chip'lar |
| `boolean` | Ha/Yo'q | Toggle |

### Kategoriya daraxti (v1 — 10 ta asosiy)

```
1. Avto                      6. Oziq-ovqat
   ├── Ehtiyot qismlar          ├── Quruq mahsulotlar
   ├── Moy va suyuqliklar       ├── Ichimliklar
   ├── Shina va disk            └── Shirinliklar
   ├── Aksessuar
   └── Avtokimyo             7. Bolalar uchun
                                ├── O'yinchoqlar
2. Elektronika                  ├── Bolalar kiyimi
   ├── Telefonlar               └── Aravacha va mebel
   ├── Kompyuter va noutbuk
   ├── Maishiy texnika       8. Sport va hordiq
   ├── TV va audio              ├── Sport anjomlari
   └── Aksessuar                ├── Velosiped
                                └── Turizm
3. Kiyim va poyabzal
   ├── Erkaklar              9. Go'zallik va salomatlik
   ├── Ayollar                  ├── Parfyumeriya
   ├── Poyabzal                 ├── Kosmetika
   └── Aksessuar                └── Tibbiy tovarlar

4. Uy va bog'               10. Xizmatlar
   ├── Mebel                    ├── Ta'mirlash
   ├── Oshxona                  ├── Yetkazib berish
   ├── Tekstil                  └── Boshqa
   └── Bog' anjomlari

5. Qurilish
   ├── Qurilish materiallari
   ├── Asboblar
   ├── Santexnika
   └── Elektr mollari
```

**Muhim:** v1'da faqat **Avto** kategoriyasi to'liq atribut sxemasi bilan to'ldiriladi (Jalol'ning Sergeli bozori uchun). Qolganlari bo'sh sxema bilan turadi, keyin to'ldiriladi.

---

## 4. FOYDALANUVCHI TURLARI VA OQIMLAR

### 4.1 Xaridor (mijoz)

```
Kirish (Humo ID orqali, Google)
  │
  ├─→ Qidiruv ────────────┐
  ├─→ Kategoriya ─────────┼─→ Mahsulotlar ro'yxati
  └─→ Bozor tanlash ──────┘        │
                                    ↓
                            Mahsulot sahifasi
                              │
                              ├─→ Savatga qo'shish → Savat → Buyurtma → To'lov
                              ├─→ "Ko'rib sotib olish" → Band qilish → Bozorga borish → To'lash
                              └─→ Sotuvchiga qo'ng'iroq / yozish
```

**Kirish shart emas:** ko'rish, qidirish, narx solishtirish.
**Kirish shart:** savat, buyurtma, sotuvchiga yozish, sevimlilar.

### 4.2 Sotuvchi

```
Humo ID bilan kirish (majburiy)
  │
  ↓
Sotuvchi bo'lish arizasi
  ├── Yuridik shakl: YaTT yoki MChJ   ← MAJBURIY
  ├── INN/STIR raqami
  ├── F.I.SH. yoki MChJ nomi
  ├── Telefon (SMS tasdiq)
  └── Bank rekvizitlari (payout uchun)
  │
  ↓
Do'kon yaratish
  ├── Nomi, logo, tavsif
  └── Joylashuv: Bozorda? / Alohida? / Onlayn?
  │
  ↓
AI + Admin tasdiqlash → APPROVED
  │
  ↓
Kabinet: mahsulot qo'shish, buyurtmalar, statistika, pul
```

### 4.3 Admin (founder)

- Sotuvchi arizalarini tasdiqlash/rad etish
- Bozorlar boshqaruvi (yangi bozor qo'shish)
- Kategoriya va atribut sxemalari
- Moderatsiya navbati (AI belgilagan mahsulotlar)
- Nizolar (xaridor ↔ sotuvchi)
- Statistika

---

## 5. MA'LUMOT MODELI (Prisma schema)

> Eski `BnSeller`, `BnProduct` va boshqalar **butunlay qayta yoziladi**.

### 5.1 BnMarket — Bozor (JOY)

```prisma
model BnMarket {
  id          String   @id @default(cuid())
  slug        String   @unique              // "sergeli-avto-bozor"
  name        String                        // "Sergeli avtomobil bozori"
  nameRu      String?
  description String?
  city        String   @default("Toshkent")
  district    String?                       // "Sergeli tumani"
  address     String?                       // to'liq manzil
  lat         Float?                        // xarita uchun
  lng         Float?
  coverUrl    String?                       // bozor rasmi
  logoUrl     String?
  workHours   String?                       // "Dush-Yak 08:00-18:00"
  phone       String?
  sections    String[] @default([])         // ["12-qator", "Elektronika rastasi", ...]
  isActive    Boolean  @default(true)
  order       Int      @default(0)          // ro'yxatdagi tartib
  createdAt   DateTime @default(now())
  shops       BnShop[]

  @@index([city, isActive, order])
}
```

### 5.2 BnShop — Do'kon (BIZNES)

```prisma
model BnShop {
  id           String        @id @default(cuid())
  profileId    String        @unique          // UserProfile.id — bitta odam bitta do'kon
  slug         String        @unique          // "jalol-motors"
  name         String
  description  String?
  logoUrl      String?
  coverUrl     String?

  // Yuridik ma'lumot (MAJBURIY)
  legalType    BnLegalType                    // YATT | MCHJ
  innNumber    String        @unique          // STIR/INN 9 raqam
  legalName    String                         // F.I.SH yoki MChJ to'liq nomi
  phone        String
  phoneVerified Boolean      @default(false)

  // Joylashuv
  locationType BnLocationType                 // IN_MARKET | STANDALONE | ONLINE
  marketId     String?
  market       BnMarket?     @relation(fields: [marketId], references: [id], onDelete: SetNull)
  marketSection String?                       // "12-qator"
  marketShopNo String?                        // "45"
  address      String?                        // STANDALONE uchun
  city         String        @default("Toshkent")
  lat          Float?
  lng          Float?

  // Bank (payout)
  bankName     String?
  bankAccount  String?
  bankMfo      String?

  // Holat va reyting
  status       BnShopStatus  @default(PENDING)
  tier         BnShopTier    @default(NEW)    // NEW | TRUSTED | VERIFIED | PREMIUM
  rating       Float         @default(0)
  ratingCount  Int           @default(0)
  orderCount   Int           @default(0)
  approvedAt   DateTime?
  approvedById String?
  rejectReason String?
  suspendedAt  DateTime?

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  products     BnProduct[]
  orders       BnOrder[]
  reviews      BnShopReview[]

  @@index([status, createdAt])
  @@index([marketId, status])
  @@index([city, status])
}

enum BnLegalType     { YATT  MCHJ }
enum BnLocationType  { IN_MARKET  STANDALONE  ONLINE }
enum BnShopStatus    { PENDING  APPROVED  REJECTED  SUSPENDED }
enum BnShopTier      { NEW  TRUSTED  VERIFIED  PREMIUM }
```

### 5.3 BnCategory — Kategoriya (atribut sxemasi bilan)

```prisma
model BnCategory {
  id              String       @id @default(cuid())
  slug            String       @unique
  name            String
  nameRu          String?
  parentId        String?
  parent          BnCategory?  @relation("BnCatTree", fields: [parentId], references: [id], onDelete: SetNull)
  children        BnCategory[] @relation("BnCatTree")
  icon            String?                       // Lucide ikon nomi (emoji EMAS)
  attributeSchema Json         @default("[]")   // yuqoridagi sxema
  order           Int          @default(0)
  isActive        Boolean      @default(true)
  productCount    Int          @default(0)      // kesh
  createdAt       DateTime     @default(now())
  products        BnProduct[]

  @@index([parentId, order])
}
```

### 5.4 BnProduct — Mahsulot

```prisma
model BnProduct {
  id           String      @id @default(cuid())
  shopId       String
  shop         BnShop      @relation(fields: [shopId], references: [id], onDelete: Cascade)
  categoryId   String?
  category     BnCategory? @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  title        String
  slug         String      @unique
  description  String?
  images       String[]    @default([])        // maks 10
  videos       String[]    @default([])        // maks 2

  price        Int                             // so'm (butun)
  oldPrice     Int?
  isNegotiable Boolean     @default(false)     // "Kelishilgan narxda"

  attributes   Json        @default("{}")      // kategoriya sxemasiga mos

  stock        Int         @default(1)
  sold         Int         @default(0)

  // Olish usullari
  allowPickup   Boolean    @default(true)      // do'kondan olib ketish
  allowDelivery Boolean    @default(false)     // yetkazib berish
  allowInspect  Boolean    @default(true)      // "ko'rib sotib olish"

  // Bozor narxi (BN'ning asosiy va'dasi)
  marketAvgPrice Int?                          // AI/agregatsiya hisoblaydi
  priceRank      String?                       // "cheap" | "fair" | "expensive"

  isActive     Boolean     @default(true)
  hidden       Boolean     @default(false)     // moderatsiya
  views        Int         @default(0)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  orderItems   BnOrderItem[]
  reviews      BnProductReview[]

  @@index([shopId, createdAt])
  @@index([categoryId, isActive, hidden])
  @@index([isActive, hidden, createdAt])
}
```

### 5.5 Buyurtma, savat, sharh

```prisma
model BnCartItem {
  id        String    @id @default(cuid())
  profileId String
  productId String
  qty       Int       @default(1)
  createdAt DateTime  @default(now())
  @@unique([profileId, productId])
  @@index([profileId])
}

model BnOrder {
  id            String          @id @default(cuid())
  code          String          @unique          // "BN-2026-000123" — inson o'qiydigan
  buyerId       String
  shopId        String
  shop          BnShop          @relation(fields: [shopId], references: [id])
  items         BnOrderItem[]

  subtotal      Int
  deliveryFee   Int             @default(0)
  commission    Int             @default(0)      // For Humo ulushi
  total         Int

  fulfillType   BnFulfillType                    // PICKUP | DELIVERY | INSPECT
  address       String?
  phone         String
  note          String?

  paymentMethod BnPayMethod     @default(WALLET) // WALLET | CASH
  paymentStatus BnPayStatus     @default(PENDING)
  escrowHeld    Boolean         @default(false)  // pul ushlanganmi
  settledAt     DateTime?                        // sotuvchiga to'langan vaqt

  status        BnOrderStatus   @default(PLACED)
  cancelReason  String?

  placedAt      DateTime        @default(now())
  confirmedAt   DateTime?
  readyAt       DateTime?
  completedAt   DateTime?
  cancelledAt   DateTime?

  @@index([shopId, placedAt])
  @@index([buyerId, placedAt])
  @@index([status, placedAt])
}

model BnOrderItem {
  id        String    @id @default(cuid())
  orderId   String
  order     BnOrder   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   BnProduct @relation(fields: [productId], references: [id])
  title     String                              // snapshot
  price     Int                                 // snapshot
  qty       Int       @default(1)
  imageUrl  String?
  @@index([orderId])
}

model BnProductReview {
  id        String    @id @default(cuid())
  productId String
  product   BnProduct @relation(fields: [productId], references: [id], onDelete: Cascade)
  profileId String
  orderId   String?                             // xarid tasdig'i
  rating    Int                                 // 1-5
  text      String?
  images    String[]  @default([])
  hidden    Boolean   @default(false)
  createdAt DateTime  @default(now())
  @@unique([productId, profileId])
  @@index([productId, hidden])
}

model BnShopReview {
  id        String   @id @default(cuid())
  shopId    String
  shop      BnShop   @relation(fields: [shopId], references: [id], onDelete: Cascade)
  profileId String
  orderId   String?
  rating    Int
  text      String?
  hidden    Boolean  @default(false)
  createdAt DateTime @default(now())
  @@unique([shopId, profileId])
  @@index([shopId, hidden])
}

enum BnFulfillType  { PICKUP  DELIVERY  INSPECT }
enum BnPayMethod    { WALLET  CASH }
enum BnPayStatus    { PENDING  HELD  PAID  REFUNDED }
enum BnOrderStatus  { PLACED  CONFIRMED  READY  COMPLETED  CANCELLED  DISPUTED }
```

**Buyurtma holatlari izohi:**

| Holat | Ma'nosi |
|---|---|
| `PLACED` | Xaridor buyurtma berdi, sotuvchi ko'rmadi |
| `CONFIRMED` | Sotuvchi tasdiqladi, tayyorlamoqda |
| `READY` | Tayyor (olib ketishga / jo'natildi) |
| `COMPLETED` | Xaridor qabul qildi → pul sotuvchiga o'tdi |
| `CANCELLED` | Bekor qilindi → pul qaytdi |
| `DISPUTED` | Nizo — admin ko'rib chiqadi |

---

## 6. DIZAYN TIZIMI

### Ranglar

```
Asosiy (oltin):     #F5B301
Asosiy och:         #FFCE3D
Asosiy to'q:        #C98F00
Fon:                #0A0A0A
Panel:              #141414
Panel ochroq:       #1C1C1C
Chegara:            rgba(245,179,1,0.14)
Matn:               #FAFAFA
Matn ikkilamchi:    #A1A1AA
Matn xira:          #71717A
Muvaffaqiyat:       #22C55E
Ogohlantirish:      #F59E0B
Xato:               #EF4444
```

**Nima uchun oltin+qora:** For Humo ko'k (#2B3EE8) — BN aniq farqlanishi kerak.
Oltin = savdo, boylik, bozor. O'zbek bozorlarining rangi.

### Tipografiya

- Sarlavha: `font-black` (900), `-0.02em` letter-spacing
- Matn: `font-medium` (500)
- Narx: `font-black` + `tabular-nums`

### Qoidalar (buzilmaydi)

1. **Emoji YO'Q.** Faqat Lucide ikonlar.
2. **Native `<select>` YO'Q.** Doim custom dropdown.
3. **Narx doim `formatMoney()` orqali.** Qo'lda `so'm` yozilmaydi.
4. **Mobil birinchi.** Har sahifa 360px'da ishlashi shart.
5. **uz/ru majburiy**, en ixtiyoriy. (Bozorda ruscha ko'p)

---

## 7. SAHIFALAR RO'YXATI

### Ommaviy (kirish shart emas)

| Yo'l | Nomi | Tavsif |
|---|---|---|
| `/` | Bosh sahifa | Qidiruv, kategoriyalar, bozorlar, tavsiya mahsulotlar |
| `/qidiruv` | Qidiruv natijalari | Filtr paneli bilan |
| `/k/[slug]` | Kategoriya | Kategoriya mahsulotlari + atribut filtrlari |
| `/m/[slug]` | Bozor | Bozor haqida + ichidagi do'konlar |
| `/bozorlar` | Bozorlar ro'yxati | Xarita + ro'yxat |
| `/d/[slug]` | Do'kon | Do'kon profili + mahsulotlari |
| `/p/[slug]` | Mahsulot | Rasm, narx, bozor narxi, sotuvchi, sharhlar |

### Xaridor (kirish kerak)

| Yo'l | Nomi |
|---|---|
| `/savat` | Savat |
| `/buyurtma` | Rasmiylashtirish (checkout) |
| `/buyurtmalarim` | Buyurtmalarim |
| `/buyurtmalarim/[code]` | Buyurtma tafsiloti |
| `/sevimlilar` | Sevimlilar |

### Sotuvchi

| Yo'l | Nomi |
|---|---|
| `/sotuvchi` | Sotuvchi bo'lish (ariza) |
| `/kabinet` | Boshqaruv paneli |
| `/kabinet/mahsulotlar` | Mahsulotlarim |
| `/kabinet/mahsulot/yangi` | Yangi mahsulot (AI yordamida) |
| `/kabinet/mahsulot/[id]` | Tahrirlash |
| `/kabinet/buyurtmalar` | Buyurtmalar |
| `/kabinet/dokon` | Do'kon sozlamalari |
| `/kabinet/pul` | Daromad va yechish |

### Admin (founder)

| Yo'l | Nomi |
|---|---|
| `/admin/bn/dokonlar` | Do'kon arizalari |
| `/admin/bn/bozorlar` | Bozorlar boshqaruvi |
| `/admin/bn/kategoriyalar` | Kategoriya va atributlar |
| `/admin/bn/moderatsiya` | AI belgilagan mahsulotlar |
| `/admin/bn/nizolar` | Nizolar |

**Eslatma:** URL'lar o'zbekcha — bu mahalliy bozor uchun mahsulot, `bozornarxida.uz/p/nexia-tormoz` `bozornarxida.uz/product/...` dan tabiiyroq.

---

## 8. HUMO AI INTEGRATSIYASI

Uchta yo'nalish. Har biri `src/lib/ai.ts` dagi mavjud funksiyalardan foydalanadi.

### 8.1 Sotuvchi uchun — "Rasmdan mahsulot"

**Oqim:** Sotuvchi rasm yuklaydi → AI to'ldiradi → sotuvchi tekshiradi/tuzatadi → saqlaydi

```
Rasm → aiVisionJSON() → {
  title:       "Chevrolet Nexia 3 old tormoz kolodkasi",
  description: "Original sifatli tormoz kolodkasi...",
  categoryId:  "avto-tormoz-kolodka",
  attributes:  { brand: "Chevrolet", model: "Nexia 3", condition: "Yangi" },
  priceHint:   { min: 180000, max: 260000, avg: 210000 }
}
```

**Nima uchun muhim:** bozordagi sotuvchi kompyuter bilan ishlamaydi. Telefonda rasmga oladi — 10 soniyada e'lon tayyor. Bu **eng katta sotuvchi jalb qiluvchi omil**.

### 8.2 Xaridor uchun — Tabiiy til qidiruvi

```
"Nexia 2015 uchun arzon tormoz, Sergelida bo'lsin"
        ↓ aiJSON()
{ query: "tormoz kolodka", attributes: { brand: "Chevrolet", model: "Nexia", year: 2015 },
  sort: "price_asc", marketSlug: "sergeli-avto-bozor" }
```

Va yordamchi chat: "Damas uchun qaysi moy yaxshi?" → tavsiya + mahsulot havolalari.

### 8.3 Xavfsizlik — AI moderatsiya

Foydalanuvchi qoidasi: **"Havfsizlik nazoratini tizim ichidagi AIga topshiramiz."**

| Tekshiruv | Qachon | Harakat |
|---|---|---|
| Kontent moderatsiya | Mahsulot yaratilganda (`after()`) | `moderateOnCreate()` — mavjud tizim |
| Narx anomaliyasi | Narx bozor o'rtachasidan 3x arzon | Bayroq → admin ko'radi |
| Takroriy e'lon | Bir xil rasm/matn boshqa do'konda | Bayroq |
| Soxta hujjat | INN formati/tekshiruv | Ariza rad |
| Sotuvchi xulqi | Nizo/bekor qilish ko'p | Tier pasayadi → SUSPENDED |

**Muhim qoida (o'zgarmaydi):** Odam shaxsiy yozishmalarni o'qimaydi. Faqat AI tekshiradi.

---

## 9. TO'LOV — ALKH PAY (escrow)

### Oqim

```
1. Xaridor buyurtma beradi
   └─→ ALKH Pay hamyondan pul YECHILADI va USHLAB TURILADI (escrow)
       BnOrder.escrowHeld = true, paymentStatus = HELD

2. Sotuvchi tasdiqlaydi → tayyorlaydi → tayyor

3. Xaridor qabul qiladi ("Oldim" tugmasi) yoki 7 kun o'tadi
   └─→ Pul sotuvchiga o'tadi (komissiya ayirib)
       WalletTransaction: PURCHASE (xaridor) + SALE (sotuvchi)
       BnOrder.settledAt = now, paymentStatus = PAID

4. Bekor qilinsa yoki nizo xaridor foydasiga hal bo'lsa
   └─→ Pul qaytadi: WalletTransaction REFUND
```

### Komissiya

| Do'kon darajasi | Komissiya |
|---|---|
| NEW | 3% |
| TRUSTED | 3% |
| VERIFIED | 2.5% |
| PREMIUM | 2% |

`BN_COMMISSION` env'da, default 0.03.
(Market 5% — BN arzonroq, chunki bozor savdosi marjasi kichik.)

### Naqd variant

Bozorda naqd savdo ustun. Shuning uchun `BnPayMethod.CASH` qoladi:
- Escrow yo'q, komissiya yo'q
- Platforma faqat uchrashtiradi
- Buyurtma `PICKUP` yoki `INSPECT` bo'lsa mumkin

### MChJ kutilmoqda (~1 oy)

Hozir **test rejim** (`test-provider.ts`). MChJ ochilgach:
```
PAYME_MERCHANT_ID / PAYME_KEY
CLICK_MERCHANT_ID / CLICK_SECRET
```
env'ga qo'shiladi → `isLiveMode()` true bo'ladi → **kod o'zgarmaydi**.

---

## 10. "KO'RIB SOTIB OLISH" (INSPECT) — ishonch mexanizmi

O'zbek xaridori qimmat narsani ko'rmasdan sotib olmaydi. Ayniqsa avto qismlar.

```
1. Xaridor "Ko'rib olaman" bosadi
2. Mahsulot 24 soatga BAND qilinadi (stock kamayadi)
3. Xaridorga kod beriladi: "BN-4821"
4. Bozorga boradi, do'konni topadi (bozor + qator + do'kon raqami ko'rsatiladi)
5. Ko'radi:
   ├─ Yoqdi  → kodni aytadi → sotuvchi kabinetda tasdiqlaydi → naqd/karta to'laydi
   └─ Yoqmadi → hech narsa, 24 soatdan keyin band avtomatik ochiladi
```

**Nima uchun bu g'alaba:** Uzum bu funksiyani bera olmaydi (ombor modeli).
BN bozorlar ustida qurilgani uchun — bu tabiiy. Bu **BN ning asosiy farqi**.

---

## 11. FAZALAR

### FAZA 0 — Tozalash (0 holatga qaytarish)

- [ ] Eski BN komponentlarini o'chirish (6 fayl)
- [ ] Eski BN sahifalarini o'chirish (5 fayl)
- [ ] Eski BN API'larini o'chirish (3 fayl)
- [ ] Eski BN schema modellarini o'chirish (5 model + 4 enum)
- [ ] `public/bn/` ga logo joylash
- [ ] DB'dan eski BN jadvallarini tozalash

### FAZA 1 — Ko'rinish (UI skelet)

> Foydalanuvchi so'rovi: *"oldin ko'rinishni qurib olaylik"*
> Bu fazada **mock ma'lumot** ishlatiladi, backend yo'q.

- [ ] `bn-theme.ts` — rang, konstanta, yordamchi funksiyalar
- [ ] `bn-header.tsx` — logo, qidiruv, savat, profil (mobil menyu bilan)
- [ ] `bn-footer.tsx`
- [ ] `bn-product-card.tsx` — mahsulot kartasi (bozor narxi belgisi bilan)
- [ ] `bn-shop-card.tsx` — do'kon kartasi
- [ ] `bn-market-card.tsx` — bozor kartasi
- [ ] Bosh sahifa — hero qidiruv, kategoriyalar, bozorlar, mahsulotlar
- [ ] Kategoriya sahifasi — filtr paneli (atributlarga moslanuvchi)
- [ ] Mahsulot sahifasi — galereya, narx bloki, sotuvchi bloki, sharhlar
- [ ] Bozor sahifasi — bozor haqida, do'konlar ro'yxati
- [ ] Do'kon sahifasi — profil, mahsulotlar
- [ ] Savat sahifasi
- [ ] Checkout sahifasi (3 usul: pickup / delivery / inspect)
- [ ] Sotuvchi ariza sahifasi
- [ ] Sotuvchi kabinet skeleti
- [ ] Mobil tekshiruv (360px)

### FAZA 2 — Ma'lumot bazasi

- [ ] Yangi schema yozish (yuqoridagi modellar)
- [ ] `prisma db push`
- [ ] Seed: 6 ta bozor (Sergeli avto, Chorsu, Malika, Abu Sahiy, Yangiobod, Qo'yliq)
- [ ] Seed: 10 asosiy kategoriya + Avto uchun to'liq atribut sxemasi

### FAZA 3 — Sotuvchi backend

- [ ] `POST /api/bn/shops` — ariza
- [ ] `GET/PATCH /api/bn/shops/me` — o'z do'koni
- [ ] `POST/GET /api/bn/products` — mahsulot CRUD
- [ ] `PATCH/DELETE /api/bn/products/[id]`
- [ ] Rasm yuklash (Vercel Blob client upload)
- [ ] `banGuard` + `moderateOnCreate` har yaratishda

### FAZA 4 — Xaridor backend

- [ ] `GET /api/bn/catalog` — qidiruv + filtr + saralash
- [ ] `GET /api/bn/products/[slug]`
- [ ] `GET /api/bn/markets`, `/api/bn/markets/[slug]`
- [ ] `GET /api/bn/shops/[slug]`
- [ ] Savat API
- [ ] Sevimlilar API

### FAZA 5 — Buyurtma va ALKH Pay

- [ ] `POST /api/bn/orders` — buyurtma (escrow bilan, atomik)
- [ ] `GET /api/bn/orders` — xaridor/sotuvchi ro'yxati
- [ ] `PATCH /api/bn/orders/[id]` — holat o'zgartirish
- [ ] `lib/bn-settle.ts` — escrow yechish (market-settle.ts naqshi)
- [ ] INSPECT oqimi (band qilish + kod + 24 soat)
- [ ] Bekor qilish + refund

### FAZA 6 — Humo AI

- [ ] `POST /api/bn/ai/from-image` — rasmdan mahsulot kartasi
- [ ] `POST /api/bn/ai/search` — tabiiy til qidiruv
- [ ] `POST /api/bn/ai/assistant` — yordamchi chat
- [ ] `lib/bn-price.ts` — bozor o'rtacha narxi hisoblash
- [ ] Narx anomaliyasi detektori

### FAZA 7 — Sharh, reyting, admin

- [ ] Mahsulot va do'kon sharhlari
- [ ] Do'kon darajasi (tier) avtomatik hisoblash
- [ ] Admin: do'kon arizalari
- [ ] Admin: bozorlar
- [ ] Admin: kategoriya/atribut
- [ ] Admin: moderatsiya navbati
- [ ] Admin: nizolar

### FAZA 8 — Launch tayyorgarligi

- [ ] i18n uz/ru to'liq
- [ ] SEO (metadata, sitemap, OG rasm)
- [ ] Tezlik (rasm optimizatsiya, lazy load)
- [ ] Xatolik holatlari (bo'sh, xato, yuklanmoqda)
- [ ] Jalol bilan sinov (Sergeli bozor, 10 ta haqiqiy mahsulot)

---

## 12. TEXNIK QARORLAR

| Savol | Qaror | Sabab |
|---|---|---|
| Alohida repo? | **Yo'q** — bir kodbaza, `/bn` prefiks | Middleware allaqachon ishlaydi, Humo ID/Pay/AI umumiy |
| Alohida auth? | **Yo'q** — Humo ID (Google) | Foydalanuvchi talabi |
| Valyuta | **Faqat UZS** | Mahalliy bozor, `formatMoney(x,"UZS")` |
| Sotuvchi soni | **1 profil = 1 do'kon** | Chalkashlik bo'lmasin |
| Yetkazish | **v1: Yandex tarifi** (Toshkent 20k, viloyat 40k) | API keyin |
| SMS | **Eskiz.uz** (MChJ'dan keyin) | Mavjud integratsiya |
| Rasm | **Vercel Blob** client upload | 4.5MB limitni chetlab o'tadi |
| Kesh | **1 daqiqa** kategoriya/bozor uchun | Kam o'zgaradi |

---

## 13. NIMA QILMAYMIZ (v1 doirasidan tashqari)

Bu ro'yxat rejadan chetga chiqmaslik uchun:

- ❌ Sotuvchilar orasida chat (v1'da telefon yetadi)
- ❌ Auksion / savdolashish tizimi
- ❌ Yetkazib berish API integratsiyasi (qo'lda tarif)
- ❌ Sotuvchi ilovasi (mobil web yetadi)
- ❌ Bir do'konda bir necha filial
- ❌ Ombor boshqaruvi (WMS)
- ❌ Kupon/promokod (Market'da bor, BN'da keyin)
- ❌ Obuna/premium do'kon (tier bor, lekin pullik emas)
- ❌ Boshqa shaharlar (v1 faqat Toshkent)

---

## 14. MUVAFFAQIYAT MEZONI

**FAZA 1 tugaganda:** butun sayt ko'rinadi va bosib yuriladi (mock ma'lumot bilan).
**FAZA 5 tugaganda:** haqiqiy buyurtma berish va pul o'tkazish ishlaydi.
**Launch tayyor:** Jalol Sergeli bozorida 10 ta haqiqiy mahsulot qo'yadi, 1 ta haqiqiy buyurtma to'liq o'tadi.

---

## 15. LOGO

Fayllarni shu yerga joylang: `public/bn/`

| Fayl | O'lcham | Ishlatiladi |
|---|---|---|
| `logo.svg` yoki `logo.png` | 512×512 | Header, umumiy |
| `logo-mark.png` | 256×256 | Faqat belgi (matn siz) |
| `favicon.png` | 64×64 | Brauzer tab |
| `og.png` | 1200×630 | Ijtimoiy tarmoq ulashuvi |

Kodda: `<img src="/bn/logo.png" />` (Next.js `public/` ni root'dan beradi)

---

*Reja tugadi. O'zgarish kerak bo'lsa — avval shu faylni yangilang.*
