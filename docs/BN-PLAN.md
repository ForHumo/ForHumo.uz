# BOZOR NARXIDA — To'liq loyiha rejasi

> **Holat:** v1.0 reja — 2026-08-03 (qarorlar tasdiqlangan)
> **Qoida:** Bu reja yagona manba. Rejada yo'q narsa qilinmaydi.
> Yangi g'oya chiqsa — avval shu faylga yoziladi, keyin bajariladi.

**Tasdiqlangan qarorlar:**
| Savol | Qaror |
|---|---|
| BN rahbari | **Jalol — BN OWNER** (to'liq BN admin). Tizim/kod/integratsiya — founder (Abduvoris) |
| v1 qamrov | **Barcha 10 kategoriya** to'liq atribut sxemasi bilan |
| Komissiya | **5%** (Market bilan bir xil), naqddan olinmaydi |
| Integratsiyalar | **Humo ID · Humo AI · Humo Nexus · Humo Support · ALKH Pay** |
| Til | uz/ru majburiy, en — oxirida (foydalanuvchi qarori) |
| Humo Support | `forhumo.uz/{til}/support/bn/chat` — **eng oxirida** |
| Poweredby | Har loyihada "Powered by [logo] **For Humo**" ("For Humo" qalin, brend rangida) |

**Navbar (yakuniy tartib):** Asosiy → Katalog → Sevimlilar → Savat → Media
(Scan olib tashlandi, header qidiruvida tugmasi sifatida bor. Profil header'da.)

**Header qidiruv paneli — 2 tugma:**
- **Mikrofon** — Ovozli AI qidiruv (shunchaki matn diktovka emas — AI bilan
  suhbat: "Nexia 2015 uchun old tormoz, Sergelida" degan gapdan qidiruvni
  o'zi tuzadi)
- **Kamera/Skaner** — Rasmdan qidiruv: mahsulot rasmga olinadi yoki fayl
  yuboriladi, AI shu asosda topadi. Chatda ham yozish mumkin.

**Media bo'limi (yangi navbar):** BN ichida Nexus'ga o'xshash lenta —
reels/rasmli postlar + chat. FAQAT sotuv/xarid kontenti. Nexus bilan
ikki tomonlama integratsiya:
- BN sotuvchisining Nexus kanali BN media bo'limiga avtomatik ko'chadi
- Nexus'da BN'ga tegishli sotuvchi kontent qo'ysa (masalan #bn tegi yoki
  BnShop bilan bog'langan post), BN media'ga takrorlanadi
- Kontent Nexus'da bor, BN faqat ko'zoyna (filtr + qayta chiqarish) —
  ma'lumot ikki marta saqlanmaydi

**Mahsulot kartasi kontekst matni (foydalanuvchi so'rovi):**

| Sotuvchi turi | Kartada ko'rinishi |
|---|---|
| Bozorda | "Sergeli avto bozori · Toshkent" (bozor + shahar) |
| Ko'chadagi filial | "Chilonzor Mebel · Toshkent, Shayxontohur" (nom · shahar, tuman) |
| Nomlangan filial | `"Shedevr" · Toshkent, Shayxontohur` |
| Onlayn | "Onlayn do'kon · Toshkent" (yoki faqat shahar) |

Bozor kartasida: `"Malika savdo majmuasi · Toshkent"` (bozor · shahar).

**Do'konlar sahifasi ikonkasi:** navbar va katta kartada — **savat shakli**
(`ShoppingBag`), bozor ikonkasidan farq qiladi.

**For Humo saytida:** ALKH Pay kartasidan keyin **Bozor Narxida** loyiha
kartasi qo'shiladi.

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

**Foydalanuvchi qarori:** v1'da **barcha 10 kategoriya** to'liq atribut sxemasi bilan ishlanadi.
Sabab: sotuvchi jalb qilish osonroq, kengroq boshlanish.

Har kategoriyaga o'z sxemasi yoziladi — seed'da (`scripts/seed-bn.mjs`). Misollar:

| Kategoriya | Atributlar |
|---|---|
| Avto → Ehtiyot qismlar | marka, model, yildan, yilgacha, holati, original/analog |
| Elektronika → Telefonlar | brend, model, xotira, RAM, rang, holati, kafolat |
| Kiyim → Erkaklar | o'lcham, rang, material, mavsum, brend |
| Uy → Mebel | material, rang, o'lcham (uzunlik×kenglik×balandlik), yig'ilganmi |
| Qurilish → Materiallar | brend, o'lchov birligi (dona/m²/kg), miqdor |
| Oziq-ovqat | og'irlik/hajm, ishlab chiqarilgan sana, muddat |
| Bolalar | yosh oralig'i, jins, material, xavfsizlik sertifikati |
| Sport | turi, o'lcham, brend, holati |
| Go'zallik | brend, hajm, turi, muddat |
| Xizmatlar | turi, narx birligi (soat/kun/loyiha), joyi |

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

### 4.3 Boshqaruv rollari

BN — For Humo loyihalaridan biri. Ikki daraja boshqaruv bor:

| Rol | Kim | Nima qiladi | Nima qilmaydi |
|---|---|---|---|
| **For Humo founder** | Abduvoris (`UZ6889574`, `@abduvoris`) | Tizim: kod, schema, env, integratsiyalar, yangilanishlar, boshqa modullar | — |
| **BN OWNER** | Jalol — BN loyiha rahbari | BN ichidagi **hamma narsa**: do'kon arizalari, bozorlar, kategoriyalar, moderatsiya, nizolar, qoidalar, statistika | Kod, env, integratsiya, boshqa modullar |
| **BN MODERATOR** | (kelajakda) | Moderatsiya + do'kon arizalari | Bozor/kategoriya sozlash |

**Foydalanuvchi qarori:** *"Bu loyiha rahbari u bo'ladi... To'liq adminlikni unga beramiz. Faqat tizimni yurishi, o'zgartirishlar, yangilanishlar, integratsiyalarni esa men amalga oshiraman. U BNdagi barcha qoidalarni u o'rnatadi."*

**Texnik amalga oshirish:**

```prisma
model BnAdmin {
  id        String       @id @default(cuid())
  profileId String       @unique          // UserProfile.id
  role      BnAdminRole                   // OWNER | MODERATOR
  addedById String?                       // kim qo'shdi (audit)
  note      String?
  createdAt DateTime     @default(now())
}
enum BnAdminRole { OWNER  MODERATOR }
```

`lib/bn-admin.ts`:
- `requireBnAdmin()` — founder YOKI `BnAdmin` yozuvi bor
- `requireBnOwner()` — founder YOKI `role = OWNER`
- Founder **doim** o'tadi (`isFounderProfile()` orqali), alohida yozuv shart emas

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

### 5.6 BnAdmin — boshqaruv rollari

```prisma
model BnAdmin {
  id        String      @id @default(cuid())
  profileId String      @unique
  role      BnAdminRole                    // OWNER (Jalol) | MODERATOR
  addedById String?                        // kim qo'shdi
  note      String?                        // "BN loyiha rahbari"
  createdAt DateTime    @default(now())
}
enum BnAdminRole { OWNER  MODERATOR }
```

### 5.7 BnInspectHold — "Ko'rib sotib olish" bandi

```prisma
model BnInspectHold {
  id        String    @id @default(cuid())
  code      String    @unique              // "BN-4821" — xaridor aytadi
  productId String
  profileId String                         // xaridor
  qty       Int       @default(1)
  expiresAt DateTime                       // +24 soat
  usedAt    DateTime?                      // sotuvchi tasdiqladi
  cancelledAt DateTime?
  createdAt DateTime  @default(now())
  @@index([productId, expiresAt])
  @@index([profileId, createdAt])
}
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

### Uch rejim (foydalanuvchi so'rovi)

`bn-styles.tsx` da CSS o'zgaruvchilari, `next-themes` boshqaradi.
**Komponentlarda hech qachon hex yozilmaydi** — doim `BN.*` (`bn-theme.ts`).

| | Kunduzgi | Tungi |
|---|---|---|
| Fon | `#FAF6EE` och bejiviy / molochniy | `#17171B` to'q kulrang (qora EMAS) |
| Panel | `#FFFFFF` | `#1F1F25` |
| Panel+ | `#F4EFE3` | `#28282F` |
| Matn | `#1C1913` | `#F6F4F0` |
| Oltin | `#B8860B` (och fonda kontrast) | `#F5B301` |

**Tizim** rejimi OS sozlamasiga ergashadi.

**Jonli fon:** 3 ta gradient shar sekin suzadi (`.bn-aurora`), rangi rejimga
moslashadi, `prefers-reduced-motion` da to'xtaydi.

### Logo

`scripts/bn-logo.mjs` — manba `public/bn/2-version.png` (1024×1024) dan sharp
bilan generatsiya qilinadi. **Manba o'zgarsa skriptni qayta ishga tushiring.**

| Fayl | O'lcham | Qayerda |
|---|---|---|
| `logo.png` | 512 | Kunduzgi rejim |
| `logo-dark.png` | 512 | Tungi rejim (qora "B" → oq, oltin "N" saqlanadi) |
| `logo-mark.png` / `-dark.png` | 256 | Belgi |
| `favicon.png` | 64 | Brauzer tab |
| `apple-icon.png` | 180 | iOS |
| `og.png` | 1200×630 | Ulashuv |

### Tipografiya

- Sarlavha: `font-black` (900), `-0.02em` letter-spacing
- Narx: `font-black` + `tabular-nums`

### Qoidalar (buzilmaydi)

1. **Emoji YO'Q.** Faqat Lucide ikonlar.
2. **Native `<select>` YO'Q.** Doim custom dropdown.
3. **Hex YO'Q.** Doim `BN.*` (CSS o'zgaruvchisi) — aks holda rejim buziladi.
4. **Havolalar `BnLink` orqali** (`@/i18n/routing` Link EMAS) — toza URL uchun.
5. **Mobil birinchi.** Har sahifa 360px'da ishlashi shart.
6. uz / ru majburiy, en ixtiyoriy — **eng oxirida qilinadi** (foydalanuvchi qarori).

### URL siyosati

`BnBaseProvider` layout'da host'ni o'qib `base` beradi:

| Domen | Havola kodda | Foydalanuvchi ko'radi |
|---|---|---|
| bozornarxida.uz | `/bozorlar` | `bozornarxida.uz/bozorlar` |
| forhumo.uz | `/bozorlar` | `forhumo.uz/uz/bn/bozorlar` |

### Pastki navbar (muallaq)

`bn-navbar.tsx` — `fixed` pastda, hech narsaga tegmaydi, foni xira shaffof
(`backdrop-blur 20px`), safe-area hisobga olingan.

**Asosiy · Katalog · Sevimlilar · Scan · Profil**

### Bosh sahifa tuzilishi

1. Ikki katta karta: **Bozorlar** / **Do'konlar**
   (hero matn va ikkinchi qidiruv YO'Q — qidiruv faqat header'da)
2. **TOP 10 ishonchli do'kon** — AI reytingi (`baho × log10(baho soni)`)
   + "Barchasini ko'rish" tugmasi
3. To'rt mahsulot bo'limi — **Bozor narxidan arzon · Yangi · Top · Mavsumiy**
   Har biri **5 ustun × 2 qator = 10 ta**, "Yana yuklash" **5 qatordan** qo'shadi
4. Sotuvchi CTA

**Kategoriyalar bosh sahifada ko'rsatilmaydi** — `/katalog` sahifasida.

### Header

O'ng ustun: `[Til] [Rejim] [Bildirishnoma] [Savat] [Profil]`,
aynan ostida bir xil kenglikda **"Sotuvchi bo'lish"**.

Ikkinchi qator: Katalog · Bozorlar · Do'konlar · Buyurtmalarim ·
Mening joylashuvim · Topshirish punkti · **Humo Support**
(→ `forhumo.uz/{locale}/support/bn/chat`, yangi oynada ochiladi).

## 7. SAHIFALAR RO'YXATI

### Ommaviy (kirish shart emas)

| Yo'l | Nomi | Tavsif |
|---|---|---|
| `/` | Bosh sahifa | 2 karta + TOP 10 do'kon + 4 mahsulot bo'limi |
| `/katalog` | Katalog | Barcha kategoriyalar (bosh sahifadan ko'chirildi) |
| `/qidiruv` | Qidiruv natijalari | Filtr paneli bilan |
| `/k/[slug]` | Kategoriya | Kategoriya mahsulotlari + atribut filtrlari |
| `/m/[slug]` | Bozor | Bozor haqida + ichidagi do'konlar |
| `/bozorlar` | Bozorlar ro'yxati | Xarita + ro'yxat |
| `/dokonlar` | Do'konlar | **Reyting bo'yicha saralangan**, 3 tab: Umumiy / Bozordagi / Boshqa |
| `/d/[slug]` | Do'kon | Do'kon profili + mahsulotlari |
| `/p/[slug]` | Mahsulot | Rasm, narx, bozor narxi, sotuvchi, sharhlar |
| `/scan` | Scan | Shtrix-kod/QR skaner → mahsulotni sotayotgan do'konlar |
| `/punktlar` | Topshirish punktlari | Olib ketish nuqtalari |

### Xaridor (kirish kerak)

| Yo'l | Nomi |
|---|---|
| `/savat` | Savat |
| `/buyurtma` | Rasmiylashtirish (checkout) |
| `/buyurtmalarim` | Buyurtmalarim |
| `/buyurtmalarim/[code]` | Buyurtma tafsiloti |
| `/sevimlilar` | Sevimlilar |
| `/profil` | Profil (Humo ID) |
| `/bildirishnomalar` | Bildirishnomalar |
| `/joylashuv` | Mening joylashuvim |
| `/sozlamalar` | Sozlamalar |

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

### Boshqaruv (BN OWNER — Jalol, va founder)

Domen ichida: `bozornarxida.uz/boshqaruv/*`

| Yo'l | Nomi | Kim |
|---|---|---|
| `/boshqaruv` | Umumiy ko'rinish, statistika | OWNER, MODERATOR |
| `/boshqaruv/dokonlar` | Do'kon arizalari (tasdiqlash/rad) | OWNER, MODERATOR |
| `/boshqaruv/bozorlar` | Bozorlar boshqaruvi | OWNER |
| `/boshqaruv/kategoriyalar` | Kategoriya va atribut sxemalari | OWNER |
| `/boshqaruv/moderatsiya` | AI belgilagan mahsulotlar | OWNER, MODERATOR |
| `/boshqaruv/nizolar` | Nizolar (xaridor ↔ sotuvchi) | OWNER |
| `/boshqaruv/adminlar` | Moderator qo'shish/olib tashlash | OWNER |

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

### Komissiya — 5%

**Foydalanuvchi qarori:** Market bilan bir xil — bitta qoida, tushuntirish oson.

| Do'kon darajasi | Komissiya |
|---|---|
| NEW | 5% |
| TRUSTED | 5% |
| VERIFIED | 4.5% |
| PREMIUM | 4% |

`BN_COMMISSION` env'da, default `0.05`.
Naqd to'lovdan komissiya **olinmaydi** (platforma faqat uchrashtiradi).

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

### FAZA 0 — Tozalash (0 holatga qaytarish) ✅ BAJARILDI

- [x] Eski BN komponentlarini o'chirish (6 fayl)
- [x] Eski BN sahifalarini o'chirish (5 fayl)
- [x] Eski BN API'larini o'chirish (3 fayl)
- [x] Eski BN schema modellarini o'chirish (5 model + 4 enum)
- [x] `public/bn/` ga logo joylash
- [x] DB'dan eski BN jadvallarini tozalash

### FAZA 1 — Ko'rinish (UI skelet) ✅ BAJARILDI

> Foydalanuvchi so'rovi: *"oldin ko'rinishni qurib olaylik"*
> Bu fazada **mock ma'lumot** ishlatiladi, backend yo'q.

- [x] `bn-theme.ts` — rang, konstanta, yordamchi funksiyalar
- [x] `bn-header.tsx` — logo, qidiruv, savat, profil (mobil menyu bilan)
- [x] `bn-footer.tsx`
- [x] `bn-product-card.tsx` — mahsulot kartasi (bozor narxi belgisi bilan)
- [x] `bn-shop-card.tsx` — do'kon kartasi
- [x] `bn-market-card.tsx` — bozor kartasi
- [x] Bosh sahifa — hero qidiruv, kategoriyalar, bozorlar, mahsulotlar
- [x] Kategoriya sahifasi — filtr paneli (atributlarga moslanuvchi)
- [x] Mahsulot sahifasi — galereya, narx bloki, sotuvchi bloki, sharhlar
- [x] Bozor sahifasi — bozor haqida, do'konlar ro'yxati
- [x] Do'kon sahifasi — profil, mahsulotlar
- [x] Savat sahifasi
- [x] Checkout sahifasi (3 usul: pickup / delivery / inspect)
- [x] Sotuvchi ariza sahifasi
- [x] Sotuvchi kabinet skeleti
- [x] Mobil tekshiruv (360px)

### FAZA 2 — Ma'lumot bazasi

- [ ] Yangi schema yozish (yuqoridagi modellar)
- [ ] `prisma db push`
- [ ] Seed: 6 ta bozor (Sergeli avto, Chorsu, Malika, Abu Sahiy, Yangiobod, Qo'yliq)
- [ ] Seed: **10 kategoriya + barchasiga to'liq atribut sxemasi** (~45 pastki kategoriya)
- [ ] `BnAdmin` yozuvi: Jalol → `OWNER`

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
- [ ] `lib/bn-admin.ts` — `requireBnAdmin()` / `requireBnOwner()`
- [ ] Boshqaruv: umumiy ko'rinish + statistika
- [ ] Boshqaruv: do'kon arizalari
- [ ] Boshqaruv: bozorlar
- [ ] Boshqaruv: kategoriya/atribut
- [ ] Boshqaruv: moderatsiya navbati
- [ ] Boshqaruv: nizolar
- [ ] Boshqaruv: adminlar (OWNER moderator qo'sha oladi)

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
