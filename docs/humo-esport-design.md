# Humo eSport — v1 Dizayn Hujjati

> Status: **Tasdiqlangan model — qurish kutilmoqda** · Sana: 2026-06-13
> CEO: Abduvoris (Ramon M.C.) · Direktor: Claude
> Bu hujjat 0dan qurishга asos. Schema o'zgarsa — shu hujjatни yangila.

## 1. Maqsad va falsafa

Humo eSport — For Humo ekotizimining **birinchi va asos loyihasi**. Ko'p-o'yinli kibersport platformasi: jamoalar (tashkilot), sportchilar, **divizionlar (futboldek)**, turnirlar, **transferlar** (pul aylanmasi → biznes).

**Falsafa:**
- **Ixtisoslashuv** — bir sportchi = bitta o'yin (qattiq qulf) → kuchli raqobat, yuqori daraja.
- **Identity = Humo ID** — har sportchi Humo ID ochadi → butun ekotizim foydalanuvchisi (acquisition mashinasi).
- **Doimiy** — bir martalik turnir emas; divizion + mavsum + transfer = tirik liga.

## 2. Identity modeli (ENG MUHIM)

Ikki qatlam ajratiladi:
- **Humo ID (shaxs)** — *muxlis*: HAMMA o'yinни tomosha qiladi, jamoaларни kuzatadi. Cheklov yo'q.
- **Athlete (sportchi profili)** — *raqobatchi*: **BITTA o'yin, QATTIQ QULF.**

**Qattiq qulf qoidalari:**
- Bir Humo ID → ko'pi bilan **1 ta** athlete profil (`@@unique(humoProfileId)`).
- `gameId` **immutable** — yaratilgandan keyin hech qachon o'zgarmaydi.
- "O'yin o'zgartirish" funksiyasi YO'Q. Bir marta tanlangan o'yin — umrbod.

## 3. Entitilar (Prisma eskizi, `Es` prefiks — eski esport modellaridan ajratish uchun)

```prisma
model EsGame {            // disiplina (JADVAL — yangi o'yin koddа o'zgarishsiz qo'shiladi)
  id        String  @id @default(cuid())
  slug      String  @unique          // "mlbb", "pubgm"
  name      String                   // "Mobile Legends: Bang Bang"
  teamSize  Int                      // MLBB=5, PUBGM=4
  active    Boolean @default(true)
  rosters   EsRoster[]
  athletes  EsAthlete[]
  divisions EsDivision[]
  tournaments EsTournament[]
}

model EsTeam {            // tashkilot — o'yinга bog'liq EMAS
  id        String  @id @default(cuid())
  name      String  @unique
  tag       String  @unique          // qisqa teg (3-5 belgi), masalan "RMC"
  logo      String?
  ownerId   String                   // UserProfile.id (Humo ID egasi)
  bio       String?
  createdAt DateTime @default(now())
  rosters   EsRoster[]
  @@index([ownerId])
}

model EsRoster {          // har (jamoa × o'yin) bitta tarkib
  id       String @id @default(cuid())
  teamId   String
  gameId   String
  team     EsTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)
  game     EsGame @relation(fields: [gameId], references: [id])
  members  EsRosterMember[]
  @@unique([teamId, gameId])         // jamoa har o'yinда bitta tarkib
}

model EsAthlete {         // Humo ID + bitta o'yin (qattiq qulf)
  id            String  @id @default(cuid())
  humoProfileId String  @unique      // bir Humo ID = bitta athlete
  gameId        String                // IMMUTABLE — o'zgarmaydi
  ign           String                // in-game nom
  gameUserId    String                // in-game ID (MLBB raqami)
  gameServer    String?               // server/zona
  role          String?               // asosiy pozitsiya
  game          EsGame  @relation(fields: [gameId], references: [id])
  memberships   EsRosterMember[]
  @@index([gameId])
}

model EsRosterMember {    // sportchini tarkibга bog'laydi (transfer shu yerda)
  id         String @id @default(cuid())
  rosterId   String
  athleteId  String
  role       String   @default("STARTER")  // CAPTAIN/STARTER/SUB
  joinedAt   DateTime @default(now())
  roster     EsRoster  @relation(fields: [rosterId], references: [id], onDelete: Cascade)
  athlete    EsAthlete @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  @@unique([athleteId])              // sportchi bir vaqtда bitta tarkibда (o'z o'yinида)
  @@index([rosterId])
}

model EsDivision {        // futboldek tier (1/2/3)
  id      String @id @default(cuid())
  gameId  String
  name    String                     // "Pro Division", "Division 1"
  tier    Int                        // 1 = eng yuqori
  game    EsGame @relation(fields: [gameId], references: [id])
  @@unique([gameId, tier])
}

model EsSeason {          // mavsum (divizion + standings shu davrда)
  id        String   @id @default(cuid())
  gameId    String
  name      String                   // "2026 Season 1"
  startsAt  DateTime
  endsAt    DateTime?
  active    Boolean  @default(true)
}

model EsTournament {      // turnir (har o'yin uchun)
  id         String   @id @default(cuid())
  gameId     String
  divisionId String?                  // ixtiyoriy — divizion turniri
  seasonId   String?
  name       String
  format     String                   // SINGLE_ELIM/DOUBLE_ELIM/GROUPS
  prizePool  Decimal? @db.Decimal(18,2)
  currency   String   @default("UZS")
  status     String   @default("UPCOMING")  // UPCOMING/REGISTRATION/LIVE/ENDED
  startsAt   DateTime?
  game       EsGame   @relation(fields: [gameId], references: [id])
  participants EsTournamentTeam[]
  matches    EsMatch[]
}

model EsTournamentTeam {  // ro'yxatdan o'tgan jamoa (o'z o'yin-tarkibi bilan)
  id           String @id @default(cuid())
  tournamentId String
  teamId       String
  rosterId     String                 // qaysi tarkib bilan kirgan
  seed         Int?
  tournament   EsTournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  @@unique([tournamentId, teamId])
}

model EsMatch {           // bracket o'yini
  id           String   @id @default(cuid())
  tournamentId String
  round        Int
  teamAId      String?
  teamBId      String?
  scoreA       Int?
  scoreB       Int?
  winnerId     String?
  status       String   @default("PENDING")  // PENDING/LIVE/DONE
  streamUrl    String?                        // Nexus/Twitch havola
  scheduledAt  DateTime?
  tournament   EsTournament @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
  @@index([tournamentId, round])
}

model EsStanding {        // divizion/mavsum jadvali
  id         String @id @default(cuid())
  seasonId   String
  divisionId String
  teamId     String
  points     Int    @default(0)
  wins       Int    @default(0)
  losses     Int    @default(0)
  @@unique([seasonId, divisionId, teamId])
}

model EsTransfer {        // sportchi jamoadan jamoага (ALKH Pay haq)
  id          String   @id @default(cuid())
  athleteId   String
  fromTeamId  String?
  toTeamId    String
  fee         Decimal? @db.Decimal(18,2)     // 0/null = bepul
  currency    String   @default("UZS")
  status      String   @default("PENDING")   // PENDING/DONE/CANCELLED
  createdAt   DateTime @default(now())
  @@index([athleteId, createdAt])
}
```

## 4. Asosiy qoidalar (biznes mantiq)

1. **Team = ko'p o'yinli, Athlete = bir o'yinli.** Jamoaning MLBB va PUBG tarkiblari — boshqa odamlar.
2. **Turnir muvofiqligi:** jamoa o'z **o'yin-tarkibi** bilan ro'yxatdan o'tadi; faqat o'sha o'yin sportchilari o'ynaydi. Tarkib `game.teamSize`га yetmasa — ro'yxatga kira olmaydi.
3. **Jadval to'qnashuvi YO'Q:** sportchi bitta o'yinли → ikki turnir orasида tanlamaydi. Jamoa ikki turnirда bo'lsa — har tarkib boshqa odamlar, bir vaqtда o'ynaydi.
4. **Transfer:** sportchi **faqat o'z o'yini** ichида jamoa o'zgartiradi (cross-game yo'q — qattiq qulf). Haq = ALKH Pay (`EsTransfer.fee` → to'lov).
5. **Ko'tarilish/tushish:** mavsum oxiрида divizionlar orasида (standings bo'yicha).
6. **Egalik:** jamoani Humo ID yaratadi/boshqaradi (tarkib, transfer, ro'yxat).

## 5. Asosiy oqimlar

- **Athlete onboarding:** Humo ID → "Sportchi bo'lish" → **o'yin tanlash (BIR MARTA, qaytarib bo'lmaydi)** → IGN + in-game ID/server → profil tayyor.
- **Jamoa qurish:** Humo ID → jamoa yaratish → o'yin uchun tarkib ochish → sportchilarni taklif/qabul (yoki transfer).
- **Transfer:** jamoa egasi sportchiга taklif → haq (ALKH Pay) → sportchi roziligi → `EsRosterMember` ko'chadi.
- **Turnir:** admin yaratadi → jamoalar tarkib bilan ro'yxat → bracket avto-generatsiya → matchlar (natija admin/CEO kiritadi) → standings yangilanadi → g'oliblar payout (ALKH Pay).
- **Mavsum:** divizionlar bo'ylab turnirlar/o'yinlar → standings → ko'tarilish/tushish.

## 6. Sahifalar

**Ommaviy:** jamoa profili, sportchi profili, divizion + standings jadvali, turnir sahifasi + **bracket vizualizatsiyasi**, transfer bozori/yangiликlari.
**Admin (CEO):** o'yinlar, divizionlar, mavsumlar, turnir yaratish + natija kiritish, sportchi/jamoa tasdiqlash.

## 7. Integratsiya (ekotizim)

- **Humo ID** — barcha identity (athlete/owner = UserProfile).
- **ALKH Pay** — turnir yutug'i + transfer haqi (real pul qatlami).
- **Nexus** — turnir e'loni, match stream havolasi, highlight.
- **Humo AI** — moderatsiya (jamoa nomi/logotip/kontent).

## 8. Eski eSport bilan nima qilamiz

Hozirgi esport `User` (nickname'li, Humo ID'ga bog'lanmagan) + eski `Team`/`Tournament`/`PlayerProfile` modellари **olib tashlanadi** (test ma'lumot). Yangi `Es*` modellари Humo ID ustида quriladi. Bu — "0dan" ning ma'nosi va eng katta integratsiya.

## 9. Qurish tartibi (ichki — "to'liq qurib, keyin reveal")

1. Schema (`Es*`) + eski esport tozalash.
2. Athlete onboarding + Humo ID bog'lash.
3. Jamoa + tarkib boshqaruvi.
4. Divizion + mavsum + standings.
5. Turnir + bracket + natija + payout.
6. Transfer bozori (ALKH Pay).
7. Ommaviy sahifalar + admin.
8. Dry-run (tarmoqdan 2-3 jamoa).
9. Reveal (28-avg — yopiq early-access).

## 10. Ochiq/keyingi

- Reveal sanasi: 28-avg (1-yosh) — yopiq early-access (turnir emas).
- Homiy (yutuq qoplash) — CEO tarmog'i.
- v2: jamoa byudjeti/valuatsiya, shartnoma muddati, ko'p o'yin (PUBG to'ldirish).
