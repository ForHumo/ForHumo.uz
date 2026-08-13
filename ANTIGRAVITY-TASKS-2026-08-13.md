# Antigravity uchun to'liq vazifa hujjati — 2026-08-13

> **Muallif**: Claude (Opus 4.7) — Founder @abduvoris nomidan tayyorlangan
> **Ijrochi**: Antigravity IDE
> **Sana**: 2026-08-13
> **Nazoratchi**: Ertaga (2026-08-14) ertalab Claude ushbu hujjat va Antigravity otchetini birgalikda tekshiradi

---

## 0. Kontekst — nima uchun bu hujjat kerak

Founder Claude bilan Nexus (DM/kanal messaging) modulida 41 ta xususiyat tugatdi. Claude'ning 5-soatlik token oynasi tugab qoldi. Bugun Antigravity davom ettiradi. Ertaga ertalab Claude qaytadi, Antigravity ishini audit qiladi va keyingi bosqichga o'tadi.

**Bu hujjat 3 qismdan iborat**:
1. **Qoidalar** (buzilmaydigan qonun-qoidalar)
2. **Vazifalar** (bugungi konkret ish — 4 ta blok)
3. **Otchet formati** (Antigravity oxirida to'ldiradi)

---

## 1. Loyiha holati

- **Path**: `C:\Users\abduv\Desktop\ForHumo.uz`
- **Repo**: `https://github.com/ForHumo/ForHumo.uz` (branch: `main`)
- **Deploy**: Vercel (avtomatik `main`ga push bo'lganda)
- **Prod URL**: `https://www.forhumo.uz`
- **Oxirgi commit**: `93117ea` — "Nexus: waveform ijro animatsiyasi + voice reply + kanal markdown + mobil reaksiya"

### Stack
- **Framework**: Next.js 15.1.6 App Router + React 19.2.3 + TypeScript
- **DB**: Prisma 5.19.1 + PostgreSQL (Neon, Singapore)
- **Auth**: NextAuth v4 (Google-only, JWT)
- **UI**: Tailwind CSS v4 (`@custom-variant dark` in globals.css)
- **i18n**: next-intl v4 (locale prefix always — uz/ru/en)
- **Storage**: Vercel Blob (client upload via `/api/market/upload/client-token`)
- **Realtime**: Pusher (typing/presence), LiveKit (group calls), Web Push (VAPID)
- **AI**: Gemini via `lib/ai.ts`

### Nexus modulining hozirgi ahvoli (41 xususiyat)
- DM + kanal xabarlari (matn/rasm/video/voice/fayl/joylashuv)
- Reaksiyalar, javob berish, pin, forward, bookmark, edit, o'chirish
- Draft (localStorage), server-side qidiruv, chat statistika
- @mention avtokomplet, keyboard shortcuts (Ctrl+K/F, Esc, ArrowUp)
- Custom status, chat theme, undo-send, self-destruct, schedule, live location
- Multi-select + bulk delete/forward, date separators, unread counter
- Chat archive/mute, link preview, HTML/JSON export
- Tarjima (uz/ru/en), TTS, AI transcript (Gemini voice-to-text)
- Voice player waveform animatsiya (Web Audio AnalyserNode)
- Voice reply, kanal markdown, mobil quick reaction bar
- Web Push (VAPID), service worker, screen share, mini call window
- Moderatsiya inboxi (owner/admin uchun), deep-link permalinks

---

## 2. QONUN-QOIDALAR — hech qachon buzilmaydi

Bu qoidalar Founder tomonidan qat'iy belgilangan. **Har bir qoida buzilishi = ish qaytariladi.**

### 2.1 UI qoidalari
- **EMOJI TAQIQ**: UI code ichida hech qachon emoji ishlatmang. Faqat **Lucide React** ikonlari (`import { Icon } from "lucide-react"`).
  - Sababi: Founder qat'iy talab + diniy sezgirlik (masalan, cho'chqa ikonasi mumkin emas)
  - **Istisno**: Faqat foydalanuvchi kiritgan matn ichidagi emoji (chat xabari) render qilinishi mumkin
- **Native `<select>` TAQIQ**: Har doim custom-styled dropdown yozing. Lucide `ChevronDown` bilan.
- **Dark mode**: `dark:` prefiks bilan har bir komponent light + dark qo'llab-quvvatlashi shart

### 2.2 Auth qoidalari
- **Auth faqat Google**. Telegram, Apple, GitHub va boshqa provider TAQIQ.
- **Sababi**: [[forhumo-auth-google-only]] memory

### 2.3 Locale/routing
- Link import qilish: **`@/i18n/routing` dan** (avtomatik locale qo'shadi)
  ```tsx
  import { Link } from "@/i18n/routing"; // TO'G'RI
  // import Link from "next/link";      // NOTO'G'RI
  ```
- Redirect ham: `redirect` from `@/i18n/routing`

### 2.4 Money/currency
- **HECH QACHON** `Ƶ` yoki "Zij" so'zini yozmang (huquqiy sabab)
- Har doim `formatMoney(amount, currency)` funksiyasidan foydalaning (`lib/money.ts`)
- Currency stringlari: `"UZS"`, `"USD"`

### 2.5 Environment
- `.env.local` **hech qachon git'ga commit qilinmaydi** (`.gitignore`da bor)
- **PRIVATE_KEY** va boshqa maxfiy kalitlarni logga chiqarmang
- Yangi env variable qo'shsa, faqat `.env.local`ga yozing va foydalanuvchini ogohlantiring — u Vercel'ga alohida qo'shadi

### 2.6 Database
- **`npx prisma db push`** ishlating (`migrate dev` interaktiv — CLI'da tirakib turadi)
  ```powershell
  DATABASE_URL="..." npx prisma db push
  ```
- Yoki `.env.local` yuklangan shartda oddiy `npx prisma db push`

### 2.7 Vercel cron
- **Faqat kunlik cron** (Hobby plan cheklashi): `"0 3 * * *"` shakli
- Vaqtli (soatlik/daqiqalik) cron TAQIQ

### 2.8 Workflow (har o'zgarishdan keyin)
```powershell
git add -A
git commit -m "..."
git push origin main
```
Vercel avtomatik deploy qiladi. Deploy log'ni tekshiring.

### 2.9 Kod uslubi
- Kommentariyalar — **kam yozing**, faqat "nima uchun" (WHY) noaniq bo'lsa. "Nima qilyapti" (WHAT) — kod o'zi aytadi.
- Backward-compat hacklar TAQIQ (rename `_unused`, `// removed` kommentlar)
- Yangi feature'lar orasida ortiqcha abstraksiya yaratmang — 3 marta takrorlansa keyin refactor
- Type-safe: `any` iloji boricha kam, faqat 3rd party API bilan

### 2.10 Test qilish
Har vazifa oxirida:
```powershell
npm run build
```
`build` muvaffaqiyatli o'tishi shart. TypeScript xatolar TAQIQ.

---

## 3. BUGUNGI VAZIFALAR — 4 blok

Har blok mustaqil. Blok tartibi bilan bajaring (A→B→C→D). Har blok oxirida **alohida commit + push** qiling.

---

### 🔷 BLOK A — Xabar edit tarixi (Message Edit History)

**Nima**: Foydalanuvchi xabarni tahrirlaganda, oldingi versiyalar saqlanadi. "Tahrirlangan" belgisiga bosilsa modal ochiladi va oldingi versiyalarni ko'rsatadi.

**Nima uchun**: Telegram/Discord'da bor. Shaffoflik + moderatsiya uchun kerak.

#### A.1 Schema o'zgarishi
Fayl: `prisma/schema.prisma`

Yangi model qo'shing:
```prisma
model NexusMessageEdit {
    id         String   @id @default(cuid())
    messageId  String
    message    NexusMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
    previousText String
    editedAt   DateTime @default(now())

    @@index([messageId, editedAt])
}

model NexusChannelMessageEdit {
    id         String   @id @default(cuid())
    messageId  String
    message    NexusChannelMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
    previousText String
    editedAt   DateTime @default(now())

    @@index([messageId, editedAt])
}
```

`NexusMessage` va `NexusChannelMessage` modellarga back-relation qo'shing:
```prisma
model NexusMessage {
    // ... mavjud maydonlar
    edits NexusMessageEdit[]
}

model NexusChannelMessage {
    // ... mavjud maydonlar
    edits NexusChannelMessageEdit[]
}
```

Push:
```powershell
npx prisma db push
npx prisma generate
```

#### A.2 API o'zgartirish
Fayl: `src/app/api/nexus/messages/[id]/edit/route.ts` (mavjud)

PATCH endpoint ichida, `text`ni yangilashdan **oldin**:
```ts
// Eski matnni tarixiga saqlash
await prisma.nexusMessageEdit.create({
    data: { messageId: msg.id, previousText: msg.text ?? "" }
});
```

Xuddi shu kanal message uchun: `src/app/api/nexus/channels/[id]/messages/[messageId]/route.ts` PATCH handler.

#### A.3 Yangi endpoint — tarixni ko'rish
Fayl (yangi): `src/app/api/nexus/messages/[id]/history/route.ts`

```ts
// GET /api/nexus/messages/[id]/history
// — bu xabarning barcha oldingi versiyalari, eng yangisi birinchi

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const me = await prisma.userProfile.findUnique({ where: { email: session.user.email }, select: { id: true } });
    if (!me) return NextResponse.json({ error: "Profil topilmadi" }, { status: 404 });

    const msg = await prisma.nexusMessage.findUnique({
        where: { id },
        select: { conversationId: true, conversation: { select: { user1Id: true, user2Id: true } } }
    });
    if (!msg) return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });

    // Faqat suhbat qatnashchilari ko'ra oladi
    if (msg.conversation.user1Id !== me.id && msg.conversation.user2Id !== me.id) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    const edits = await prisma.nexusMessageEdit.findMany({
        where: { messageId: id },
        orderBy: { editedAt: "desc" },
        take: 50,
    });

    return NextResponse.json({ edits });
}
```

Xuddi shu kanal uchun: `src/app/api/nexus/channels/[id]/messages/[messageId]/history/route.ts`. Bu yerda faqat kanal a'zolari ko'ra oladi.

#### A.4 UI — "Tahrirlangan" bosilsa modal
Fayl: `src/components/nexus/nx-social-desktop.tsx`

Xabar bubble'ida `editedAt` mavjud bo'lsa "tahrirlangan" ko'k matn ko'rsatiladi. Uni **bosiladigan** qiling. Bosilsa:

```tsx
const [historyModalMsgId, setHistoryModalMsgId] = useState<string | null>(null);
const [historyItems, setHistoryItems] = useState<Array<{ id: string; previousText: string; editedAt: string }>>([]);

async function openHistory(msgId: string) {
    const r = await fetch(`/api/nexus/messages/${msgId}/history`);
    if (r.ok) {
        const d = await r.json();
        setHistoryItems(d.edits);
        setHistoryModalMsgId(msgId);
    }
}
```

Modal komponenti — mavjud modal uslubida (masalan `NxReactionUsersModal`ga o'xshab). Har item:
- Vaqt (formatDistanceToNow bilan — "3 daqiqa oldin")
- Oldingi matn (grey background)

Xuddi shu narsani `nx-channels.tsx`da ham qiling.

#### A.5 Testlash
1. DM'da xabar yuborib, tahrirlang → "tahrirlangan" ko'rinishi
2. Uni bosing → oldingi matn modal'da ko'rinishi
3. Kanal xabarida ham xuddi shunday

**Commit xabari**:
```
Nexus: xabar edit tarixi (DM + kanal)

- NexusMessageEdit + NexusChannelMessageEdit modellari
- PATCH edit endpoint'da eski matn avtomatik saqlanadi
- Yangi GET /history endpoint'lari (DM/kanal)
- "Tahrirlangan" belgisi bosilsa modal — barcha oldingi versiyalar
```

---

### 🔷 BLOK B — Guruh DM asosi (Group DM foundation)

**Nima**: 2+ foydalanuvchi bitta xabar oqimida yozishishi. Kanal'dan farqi — private (invite-only), maksimal 20 kishi, hech kim "obuna bo'la olmaydi".

**Nima uchun**: Do'stlar guruhi (WhatsApp/Signal uslubi). Kanal — bir yo'nalishli broadcast, guruh DM — o'zaro suhbat.

#### B.1 Schema
Fayl: `prisma/schema.prisma`

```prisma
model NexusGroupChat {
    id          String   @id @default(cuid())
    title       String
    avatarUrl   String?
    createdById String
    createdBy   UserProfile @relation("GroupChatCreator", fields: [createdById], references: [id])
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    members     NexusGroupMember[]
    messages    NexusGroupMessage[]

    @@index([createdById])
}

model NexusGroupMember {
    id         String   @id @default(cuid())
    groupId    String
    group      NexusGroupChat @relation(fields: [groupId], references: [id], onDelete: Cascade)
    profileId  String
    profile    UserProfile @relation("GroupMemberProfile", fields: [profileId], references: [id], onDelete: Cascade)
    role       String   @default("MEMBER") // OWNER | ADMIN | MEMBER
    joinedAt   DateTime @default(now())
    lastReadAt DateTime?
    muted      Boolean  @default(false)

    @@unique([groupId, profileId])
    @@index([profileId])
}

model NexusGroupMessage {
    id          String   @id @default(cuid())
    groupId     String
    group       NexusGroupChat @relation(fields: [groupId], references: [id], onDelete: Cascade)
    senderId    String
    sender      UserProfile @relation("GroupMessageSender", fields: [senderId], references: [id])
    text        String?  @db.Text
    attachmentUrl String?
    attachmentType String? // image | video | audio | file
    createdAt   DateTime @default(now())
    editedAt    DateTime?
    replyToId   String?
    replyTo     NexusGroupMessage? @relation("GroupReply", fields: [replyToId], references: [id])
    replies     NexusGroupMessage[] @relation("GroupReply")

    @@index([groupId, createdAt])
}
```

`UserProfile`ga back-relations qo'shing:
```prisma
model UserProfile {
    // ...
    createdGroups NexusGroupChat[] @relation("GroupChatCreator")
    groupMemberships NexusGroupMember[] @relation("GroupMemberProfile")
    groupMessages NexusGroupMessage[] @relation("GroupMessageSender")
}
```

Push: `npx prisma db push && npx prisma generate`

#### B.2 API endpoints

**B.2.1** `POST /api/nexus/groups` — guruh yaratish
- Body: `{ title: string, memberIds: string[] (2..19), avatarUrl?: string }`
- Yaratuvchi avtomatik OWNER bo'ladi
- `title` majburiy, `2..64` belgi

**B.2.2** `GET /api/nexus/groups` — foydalanuvchi qatnashadigan guruhlar
- Response: `[{ id, title, avatarUrl, lastMessage: {text, createdAt, senderName} | null, unreadCount, memberCount }]`
- Sort: eng oxirgi xabar bo'yicha DESC

**B.2.3** `GET /api/nexus/groups/[id]` — guruh detali + a'zolar
- Faqat a'zolar ko'ra oladi
- Response: `{ id, title, avatarUrl, createdBy, members: [{profile: {id, name, username, image}, role, joinedAt}] }`

**B.2.4** `GET /api/nexus/groups/[id]/messages?before=<cursor>&limit=50`
- Pagination — cursor-based
- Faqat a'zolar

**B.2.5** `POST /api/nexus/groups/[id]/messages`
- Body: `{ text?, attachmentUrl?, attachmentType?, replyToId? }`
- Rate limit: `RateKind.DM_SEND` (mavjud)
- `after()` bilan push notification (bkarcha muted=false a'zolarga)

**B.2.6** `POST /api/nexus/groups/[id]/members` — a'zo qo'shish
- Faqat OWNER yoki ADMIN
- Body: `{ profileIds: string[] }`
- Limit tekshiring — jami 20 kishidan oshmasin

**B.2.7** `DELETE /api/nexus/groups/[id]/members/[profileId]` — chiqarish
- OWNER hech kim tomonidan chiqarilmaydi (transfer kerak)
- ADMIN'ni faqat OWNER chiqara oladi
- MEMBER — o'zi chiqishi ham mumkin (agar ID == meniki)

**B.2.8** `PATCH /api/nexus/groups/[id]` — sarlavha/avatar o'zgartirish
- Faqat OWNER/ADMIN

**B.2.9** `POST /api/nexus/groups/[id]/leave` — chiqish
- Agar OWNER va boshqalar bor bo'lsa — 400 xatolik "Avval egalikni o'tkazing"

**B.2.10** `POST /api/nexus/groups/[id]/read` — oxirgi o'qilgan vaqtni belgilash
- `lastReadAt = now()` — unread count uchun

#### B.3 UI — 2 komponenta

**B.3.1** `nx-group-create-modal.tsx` (yangi)
- Sarlavha input
- Do'stlar ro'yxati (checkbox bilan tanlash) — `/api/user/friends` endpoint'ni ishlatib (agar yo'q bo'lsa, `/api/nexus/messages` ro'yxatidan foydalaning — foydalanuvchi yozishgan odamlar)
- Avatar upload (Vercel Blob) — ixtiyoriy
- "Yaratish" — POST /groups → yangi group ID qaytadi → chatni ochish

**B.3.2** Sidebar'da yangi tab
Fayl: `src/components/nexus/nx-social-desktop.tsx`

Hozirgi tabs (DM + Kanallar) yoniga **Guruhlar** tab qo'shing. Lucide `Users` ikonasi bilan.

Guruh chat oynasi — DM oynasidek, lekin:
- Sarlavha ostida "N a'zo" ko'rinadi
- Har xabar tepasida sender'ning ismi (kanaldek)
- A'zolar tugmasi (yon panel'da a'zolar ro'yxati)

**B.3.3** Mobil variant
Fayl: `src/components/nexus/nx-messages.tsx` yoki alohida `nx-groups-mobile.tsx`

Mobilda ham xuddi shunday. Sidebar tab o'rniga top segmented control (DM / Guruh / Kanal).

#### B.4 Testlash
1. Guruh yaratish (3 kishi bilan)
2. Xabar yuborish — barcha a'zolar ko'radi
3. A'zo qo'shish (admin)
4. A'zo chiqarish
5. O'zi chiqish (leave)
6. Push notification tekshirish

**Commit xabari**:
```
Nexus: Guruh DM asosi (3-20 kishi)

- NexusGroupChat/Member/Message modellari
- 10 API endpoint (CRUD + a'zolar + xabarlar + read tracking)
- Group create modal + sidebar tab
- Push notification muted=false a'zolarga
- Rate limiting mavjud RateKind.DM_SEND bilan
```

---

### 🔷 BLOK C — Nexus admin dashboard (analytics)

**Nima**: Founder (@abduvoris) uchun ichki analytics sahifa — Nexus foydalanish trendlarini ko'rish uchun.

**Nima uchun**: Product decision'lar uchun data kerak. Kim faol, qanday xabarlar ko'p, moderatsiya qanday ishlayapti.

#### C.1 Endpoint
Fayl (yangi): `src/app/api/nexus/admin/analytics/route.ts`

```ts
// GET /api/nexus/admin/analytics
// Faqat founder (email == "abduvoriskakhramonov@gmail.com") uchun

// Qaytaradi:
// {
//   dm: { total, today, week, month },
//   channel: { total, today, week, month, activeChannels: number },
//   group: { total, today, week, month },
//   users: { totalActive7d, totalActive30d, newSignups7d },
//   moderation: { pendingFlags, hiddenLast7d, banHammer7d },
//   topSenders7d: [{ profileId, name, username, count }] (10 ta),
//   topChannels7d: [{ channelId, handle, msgCount, memberCount }] (10 ta),
//   messagesByDay: [{ date: "YYYY-MM-DD", dm, channel, group }] (30 kun)
// }
```

Founder tekshirish:
```ts
const FOUNDER_EMAIL = "abduvoriskakhramonov@gmail.com";
if (session.user.email !== FOUNDER_EMAIL) {
    return NextResponse.json({ error: "Faqat founder" }, { status: 403 });
}
```

`messagesByDay` — Prisma raw query bilan:
```ts
const rows: Array<{ date: string; dm: bigint; channel: bigint; group: bigint }> = await prisma.$queryRaw`
    SELECT
        to_char(d, 'YYYY-MM-DD') as date,
        COALESCE(dm.cnt, 0) as dm,
        COALESCE(ch.cnt, 0) as channel,
        COALESCE(gr.cnt, 0) as group
    FROM generate_series(NOW() - INTERVAL '29 days', NOW(), INTERVAL '1 day') d
    LEFT JOIN (
        SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as cnt
        FROM "NexusMessage"
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY day
    ) dm ON dm.day = DATE_TRUNC('day', d)
    LEFT JOIN (
        SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as cnt
        FROM "NexusChannelMessage"
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY day
    ) ch ON ch.day = DATE_TRUNC('day', d)
    LEFT JOIN (
        SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as cnt
        FROM "NexusGroupMessage"
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY day
    ) gr ON gr.day = DATE_TRUNC('day', d)
    ORDER BY date ASC;
`;
```
BigInt'larni JSON'ga aylantirishdan oldin `Number()` qiling.

#### C.2 UI sahifa
Fayl (yangi): `src/app/[locale]/nexus/admin/page.tsx`

Server component + client child.

- Server tomonda session tekshiring, founder emas — redirect `/nexus`
- Client komponenta `/api/nexus/admin/analytics` chaqiradi
- **4 KPI kartochka** yuqorida: DM (bugungi), Kanal (bugungi), Guruh (bugungi), Faol foydalanuvchilar (7 kun)
- **Chart** (30 kun) — recharts o'rniga oddiy SVG bar chart (dependencies qo'shmang, mavjudlarini ishlating). Yoki `<canvas>` bilan. Yoki grid + `bg-gradient` bilan CSS bar chart.
  - **Muhim**: 3 turdagi ma'lumot (DM / kanal / guruh) — stacked bar yoki 3 chiziq
- **Top 10 senders** jadval (avatar + ism + soni)
- **Top 10 channels** jadval (handle + msg count + member count)
- **Moderatsiya** kartasi: pending flags, hidden last 7d, banned 7d

Uslub: mavjud Nexus komponentlar uslubida (dark theme, Tailwind v4).

#### C.3 Navigatsiya
`nx-social-desktop.tsx`da sidebar oxirida (founder bo'lsa) "Admin" tugma qo'shing:
```tsx
{session?.user?.email === "abduvoriskakhramonov@gmail.com" && (
    <Link href="/nexus/admin" className="...">
        <Shield className="w-4 h-4" /> Admin
    </Link>
)}
```

#### C.4 Testlash
1. Sahifani founder emas foydalanuvchi ochsa → redirect
2. Founder ochsa → 4 kartochka + chart + jadvallar
3. Ma'lumotlar to'g'ri (test uchun bir nechta test xabari yuborib ko'ring)

**Commit xabari**:
```
Nexus: founder admin analytics dashboard

- GET /api/nexus/admin/analytics — DM/kanal/guruh/user/moderation statistikasi
- 30 kunlik chart (raw SQL generate_series bilan)
- Top 10 sender/channel jadval
- /nexus/admin sahifasi (faqat founder — abduvoriskakhramonov@gmail.com)
- Sidebar'da Admin tugmasi (faqat founder ko'radi)
```

---

### 🔷 BLOK D — Voice message forward + xabar sifat yaxshilash

**Nima**: Voice xabar forward qilish mumkin bo'lmagan (faqat matn/media forward ishlaydi). Uni tuzatish + kichik UX yaxshilashlar.

#### D.1 Forward — voice qo'llab-quvvatlash
Fayl: `nx-social-desktop.tsx` — `forwardMsg` funksiyasi

Mavjud forward flow'da attachment (voice) URL'ini ham ko'chirish:
```ts
// Forward payload
const payload = {
    text: msg.text,
    replyToId: null,
    // Yangi:
    attachmentUrl: msg.attachmentUrl,
    attachmentType: msg.attachmentType,
    audioDurationMs: msg.audioDurationMs, // voice uchun
};
```

Server tomon `POST /api/nexus/messages` bu maydonlarni allaqachon qabul qilyapti (tekshiring). Agar yo'q bo'lsa qo'shing.

#### D.2 Forward indikatori
Xabar forward qilinganda **"Yuborildi: <ism>dan"** ko'rsatgichi. Buning uchun:

Schema:
```prisma
model NexusMessage {
    // ...
    forwardedFromId String?
    forwardedFrom   UserProfile? @relation("MessageForwardedFrom", fields: [forwardedFromId], references: [id])
    forwardedFromRel UserProfile[] @relation("MessageForwardedFrom") // (unnecessary — remove)
}
```
(Aslida faqat scalar `forwardedFromId` + optional relation kifoya, back-relation kerak emas)

Forward qilganda `forwardedFromId = originalMessage.senderId` yozing.

UI: xabar tepasida grey matn:
```tsx
{msg.forwardedFrom && (
    <div className="flex items-center gap-1 text-[10px] opacity-60 mb-0.5">
        <CornerUpRight className="w-3 h-3" />
        <span>Yuborildi: {msg.forwardedFrom.name}</span>
    </div>
)}
```

#### D.3 Xabar copy tugmasi — clipboard.writeText qo'llab-quvvatlash tekshirish
`navigator.clipboard.writeText`ni try/catch bilan o'rab qo'ying. HTTPS emas kontekstda `document.execCommand('copy')` fallback (mavjud bo'lsa saqlang).

#### D.4 Testlash
1. Voice xabar forward qiling → boshqa suhbatda voice ko'rinishi
2. Forward qilingan xabar tepasida "Yuborildi: X" ko'rinishi
3. Copy tugmasi HTTPS'da ham HTTP'da ham ishlashi

**Commit xabari**:
```
Nexus: voice forward + forward indikatori + copy fallback

- Forward payload'ga attachmentUrl/Type/audioDurationMs qo'shildi
- NexusMessage.forwardedFromId + UI indikatori
- Copy tugmasi document.execCommand fallback
```

---

## 4. UMUMIY WORKFLOW

### Har blok uchun:
1. Schema o'zgarish bo'lsa: `npx prisma db push && npx prisma generate`
2. Kod yozing
3. `npm run build` — build o'tishi shart
4. Test qiling (localhost:3000)
5. Commit:
   ```powershell
   git add -A
   git commit -m "..." 
   git push origin main
   ```
6. Vercel deploy'ni kutib turing (~2 daqiqa). Deploy muvaffaqiyatli bo'lganini `vercel.com` yoki GitHub commit status'idan tekshiring.

### Xatolik bo'lsa:
- **Build xato** → yozgan kodni tekshiring, `any` type ishlatishdan qochib type-safe qiling
- **Prisma xato** → schema.prisma sintaksisini tekshiring, `db push` qayta ishlating
- **Runtime xato** → console log qo'shing, keyin olib tashlang
- **Push muvaffaqiyatsiz** (409 conflict) → `git pull --rebase origin main` va qayta push

### Nima **QILMANG**:
- Boshqa modullarga tegmang (eSport, Market, ID, AI, Pay) — bugun faqat Nexus
- Yangi npm package o'rnatmang — mavjudlari yetadi
- `--force`, `--no-verify` flag'larsiz git commands ishlating
- Emoji ishlatmang
- `console.log`larni prod'ga qoldirmang

---

## 5. OTCHET FORMATI

Ish tugagach, quyidagi fayl yarating:
**`ANTIGRAVITY-REPORT-2026-08-13.md`** (loyiha rootida)

```markdown
# Antigravity ish otchoti — 2026-08-13

## Umumiy
- Boshlanish vaqti: HH:MM
- Tugash vaqti: HH:MM
- Bloklardan nechtasi tugadi: X/4
- Umumiy commitlar soni: N

## Blok A — Xabar edit tarixi
- **Holat**: [ ] Tugadi / [ ] Qisman / [ ] Boshlanmadi
- **Commit hash**: 
- **Fayllar o'zgargan**:
  - `prisma/schema.prisma` (+X qator)
  - ...
- **Sinov natijalari**:
  - [ ] DM edit → tarixda saqlanadi
  - [ ] Kanal edit → tarixda saqlanadi
  - [ ] "Tahrirlangan" bosilsa modal ochiladi
- **Muammolar**:
- **Eslatmalar**:

## Blok B — Guruh DM asosi
(xuddi shunday struktura)

## Blok C — Admin analytics
(xuddi shunday struktura)

## Blok D — Voice forward
(xuddi shunday struktura)

## Umumiy xatolar/echilmagan muammolar
- (agar bor bo'lsa)

## Vercel deploy holati
- Oxirgi deploy hash: 
- Deploy status: [ ] READY / [ ] ERROR
- Deploy URL: 

## Ertaga Claude uchun tavsiya
- (Antigravity fikri — nima keyingi bosqichda qilish kerak?)
```

---

## 6. Ertaga Claude nima qiladi

Claude 2026-08-14 ertalab qaytib:
1. Ushbu hujjatni + `ANTIGRAVITY-REPORT-2026-08-13.md`ni o'qiydi
2. Har blok uchun git diff ko'rib chiqadi (`git log --oneline -20`)
3. Har blokni **sinovdan o'tkazadi** (localhost + prod)
4. Xato yoki qoida buzilishi bo'lsa — tuzatadi
5. Founder bilan keyingi bosqichni belgilaydi

**Antigravity — kod sifatiga alohida e'tibor bering**. Claude ish stiliga mos yozing:
- Fayl tepasida qisqa kommentariy (WHY)
- Barcha handler'larda authorization tekshirish
- Rate limiting mavjud bo'lgan joyda ishlatish
- `after()` hook bilan async work (push notification kabi)
- TypeScript strict — `any` kam
- UI'da Lucide ikon + Tailwind v4 dark:

---

## 7. Yordamchi ma'lumotlar

### Foydali fayllar
- `lib/auth.ts` — NextAuth config
- `lib/prisma.ts` — Prisma client
- `lib/ai.ts` — Gemini AI
- `lib/push.ts` — Web Push (VAPID)
- `lib/nexus-rate.ts` — Rate limiting
- `lib/money.ts` — formatMoney
- `src/i18n/routing.ts` — locale Link

### Env variables (allaqachon bor)
- `DATABASE_URL` — Neon PostgreSQL
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
- `BLOB_READ_WRITE_TOKEN`
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `GEMINI_API_KEY`

### Founder ma'lumoti
- Email: `abduvoriskakhramonov@gmail.com`
- Username: `@abduvoris`
- Humo ID: `UZ6889574`
- Rol: Sole founder, Direktor, kod muallifi

---

**Muvaffaqiyat tilaymiz, Antigravity!** 🚀 
(Bu emoji hujjatda, kod ichida emas — ruxsat berilgan)
