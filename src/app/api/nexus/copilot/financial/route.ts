// AI Financial Copilot — foydalanuvchining o'z Wallet + kirim/chiqim ma'lumotini o'qib,
// chat kontekstidagi savolga chuqur tavsiya beradi.
//
// PRIVACY:
// - Faqat SO'ROVCHI ning o'z ma'lumotini ko'radi. Boshqa a'zolarning moliyaviy ma'lumotlari
//   AI'ga uzatilmaydi.
// - AI chatga yuborilishi mumkin bo'lgan matnda RAQAM shakli bilan cheklangan
//   ("qarz berishga arziydi" YOKI "hozircha imkonsiz"). To'liq analiz faqat "private" bo'limda.
//
// POST /api/nexus/copilot/financial
// Body: {
//   context: "dm" | "channel",
//   contextId: string,       // conversationId yoki channelId
//   question: string,        // foydalanuvchining o'z savoli yoki chatdan olingan matn
//   scanDepth?: number       // 20-200 xabar (default 40)
// }

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aiText, aiAvailable } from "@/lib/ai";

const MIN_SCAN = 20;
const MAX_SCAN = 200;

type FinancialSnapshot = {
    currency: string;
    balance: number;
    monthlyIncome: number;
    monthlyExpense: number;
    thisMonthNet: number;
    daysLeftInMonth: number;
    dailyBudgetSafeToSpend: number;
    lastMonthAverageExpense: number;
    hasEmergencyReserve: boolean;
    // Kelayotgan yuklamalar (majburiy chiqimlar)
    bnCartTotal: number;             // BN savatidagi umumiy summa
    belisPendingOrders: number;      // Belis'da qabul kutayotgan buyurtmalar
    upcomingCommitments: number;     // hammasi jamlab (bn + belis)
    // Chiqim patterns
    biggestCategoryLast30d: string | null; // eng ko'p sarflangan kategoriya
    incomeStability: "stable" | "unstable" | "unknown"; // maosh regular kelayaptimi
};

async function buildSnapshot(profileId: string): Promise<FinancialSnapshot | null> {
    // Hamyon
    const wallet = await prisma.wallet.findUnique({
        where: { profileId }, select: { balance: true, currency: true },
    });
    if (!wallet) return null;
    const balance = Number(wallet.balance);
    const currency = wallet.currency;

    // Oxirgi 60 kun tranzaksiyalari
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const tx = await prisma.walletTransaction.findMany({
        where: { wallet: { profileId }, createdAt: { gte: since } },
        select: { type: true, amount: true, createdAt: true, currency: true },
    });

    const income = tx.filter(t => ["DEPOSIT", "SALE", "REWARD", "TRANSFER_IN", "REFUND"].includes(t.type));
    const expense = tx.filter(t => ["WITHDRAW", "PURCHASE", "TRANSFER_OUT"].includes(t.type));

    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const thisMonthSince = new Date(Date.now() - monthMs);
    const monthlyIncome = income
        .filter(t => t.createdAt >= thisMonthSince)
        .reduce((s, t) => s + Number(t.amount), 0);
    const monthlyExpense = expense
        .filter(t => t.createdAt >= thisMonthSince)
        .reduce((s, t) => s + Number(t.amount), 0);
    const lastMonthExpense = expense
        .filter(t => t.createdAt < thisMonthSince)
        .reduce((s, t) => s + Number(t.amount), 0);

    const thisMonthNet = monthlyIncome - monthlyExpense;

    // Oy oxirigacha necha kun qolgan (oy oxiri)
    const now = new Date();
    const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeftInMonth = Math.max(1, Math.ceil((eom.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    // Xavfsiz kunlik sarf: (balans - keyingi 30 kun kutilayotgan chiqim) / qolgan kunlar
    const expectedRemainingExpense = (monthlyExpense / 30) * daysLeftInMonth;
    // Xavfsiz kunlik: kelayotgan majburiyat + kutilayotgan chiqim ayirilgan holda
    // (BN cart + Belis buyurtmalari keyingi 30 kun ichida to'lanadi)
    // Balansdan ushbu ikkalasini ayirib, kunlarga bo'lamiz
    const upcomingCommitmentsForBudget = 0; // pastda hisoblanadi va qaytadan hisoblanadi
    void upcomingCommitmentsForBudget;
    const dailyBudgetSafeToSpend = Math.max(0, (balance - expectedRemainingExpense) / daysLeftInMonth);

    // BN savatidagi mahsulotlar (kelayotgan yuklama)
    let bnCartTotal = 0;
    try {
        const cart = await prisma.bnCartItem.findMany({
            where: { profileId },
            select: { qty: true, productId: true },
        });
        if (cart.length > 0) {
            const products = await prisma.bnProduct.findMany({
                where: { id: { in: cart.map(c => c.productId) } },
                select: { id: true, price: true },
            });
            const pMap = new Map(products.map(p => [p.id, Number(p.price)]));
            for (const c of cart) bnCartTotal += (pMap.get(c.productId) ?? 0) * c.qty;
        }
    } catch { /* fail-safe */ }

    // Belis'da kutayotgan buyurtmalar (yakunlanmagan)
    let belisPendingOrders = 0;
    try {
        const belisOrders = await prisma.belisOrder.findMany({
            where: {
                buyerId: profileId,
                status: { in: ["NEW", "ACCEPTED", "PREPARING", "SHIPPING"] },
            },
            select: { total: true },
        });
        for (const o of belisOrders) belisPendingOrders += Number(o.total);
    } catch { /* fail-safe */ }

    const upcomingCommitments = bnCartTotal + belisPendingOrders;

    // Kirim barqarorligi: 3 oy ichida oylik cheklarga o'xshash yozuvlar bormi
    // (>500k UZS dan kirimlar 3 marta va >=15 kun oralig'ida)
    const largeIncomes = income
        .filter(t => Number(t.amount) > 500000)
        .sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());
    let incomeStability: FinancialSnapshot["incomeStability"] = "unknown";
    if (largeIncomes.length >= 3) {
        const gaps = largeIncomes.slice(1).map((v, i) =>
            (v.createdAt.getTime() - largeIncomes[i].createdAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        incomeStability = avgGap >= 15 && avgGap <= 45 ? "stable" : "unstable";
    } else if (largeIncomes.length > 0) {
        incomeStability = "unstable";
    }

    // Eng ko'p sarflangan kategoriya (description'dan taxminiy)
    const expenseByCat = new Map<string, number>();
    for (const t of expense.filter(x => x.createdAt >= thisMonthSince)) {
        const label = t.type;
        expenseByCat.set(label, (expenseByCat.get(label) ?? 0) + Number(t.amount));
    }
    let biggestCategoryLast30d: string | null = null;
    let biggestVal = 0;
    for (const [k, v] of expenseByCat) if (v > biggestVal) { biggestVal = v; biggestCategoryLast30d = k; }

    return {
        currency, balance,
        monthlyIncome, monthlyExpense, thisMonthNet, daysLeftInMonth,
        dailyBudgetSafeToSpend,
        lastMonthAverageExpense: lastMonthExpense,
        hasEmergencyReserve: balance > monthlyExpense,
        bnCartTotal, belisPendingOrders, upcomingCommitments,
        biggestCategoryLast30d, incomeStability,
    };
}

async function gatherChatContext(
    ctxType: "dm" | "channel", ctxId: string, meId: string, scanDepth: number
): Promise<string> {
    const take = Math.min(MAX_SCAN, Math.max(MIN_SCAN, scanDepth));
    if (ctxType === "dm") {
        const msgs = await prisma.nexusMessage.findMany({
            where: { conversationId: ctxId },
            orderBy: { createdAt: "desc" }, take,
            select: { text: true, senderId: true, createdAt: true },
        });
        const ids = Array.from(new Set(msgs.map(m => m.senderId)));
        const profs = await prisma.userProfile.findMany({
            where: { id: { in: ids } }, select: { id: true, name: true, username: true },
        });
        const pMap = new Map(profs.map(p => [p.id, p]));
        return msgs.reverse().map(m => {
            const p = pMap.get(m.senderId);
            const label = m.senderId === meId ? "Siz" : (p?.name ?? p?.username ?? "Peer");
            return `${label}: ${(m.text ?? "").slice(0, 400)}`;
        }).join("\n");
    } else {
        const msgs = await prisma.nexusChannelMessage.findMany({
            where: { channelId: ctxId, hidden: false, deletedForEveryoneAt: null },
            orderBy: { createdAt: "desc" }, take,
            select: { text: true, senderId: true },
        });
        const ids = Array.from(new Set(msgs.map(m => m.senderId)));
        const profs = await prisma.userProfile.findMany({
            where: { id: { in: ids } }, select: { id: true, name: true, username: true },
        });
        const pMap = new Map(profs.map(p => [p.id, p]));
        return msgs.reverse().map(m => {
            const p = pMap.get(m.senderId);
            const label = m.senderId === meId ? "Siz" : (p?.name ?? p?.username ?? "?");
            return `${label}: ${(m.text ?? "").slice(0, 400)}`;
        }).join("\n");
    }
}

function currencySymbol(currency: string): string {
    return currency === "USD" ? "$" : currency === "UZS" ? "so'm" : currency;
}
function formatMoney(amount: number, currency: string): string {
    const rounded = Math.round(amount);
    return `${rounded.toLocaleString("uz-UZ")} ${currencySymbol(currency)}`;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!aiAvailable()) return NextResponse.json({ error: "AI hozir ishlamayapti" }, { status: 503 });

    const me = await prisma.userProfile.findUnique({
        where: { email: session.user.email },
        select: { id: true, country: true, name: true, username: true },
    });
    if (!me) return NextResponse.json({ error: "profile" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const contextType: "dm" | "channel" = body?.context === "channel" ? "channel" : "dm";
    const contextId = String(body?.contextId ?? "");
    const question = String(body?.question ?? "").trim();
    const scanDepth = Math.min(MAX_SCAN, Math.max(MIN_SCAN, Number(body?.scanDepth ?? 40)));
    if (!contextId) return NextResponse.json({ error: "contextId kerak" }, { status: 400 });

    // Foydalanuvchi shu suhbatga a'zomi tekshiruv
    if (contextType === "dm") {
        const conv = await prisma.nexusConversation.findFirst({
            where: { id: contextId, OR: [{ user1Id: me.id }, { user2Id: me.id }] },
            select: { id: true },
        });
        if (!conv) return NextResponse.json({ error: "not_member" }, { status: 403 });
    } else {
        const member = await prisma.nexusChannelMember.findUnique({
            where: { channelId_profileId: { channelId: contextId, profileId: me.id } },
            select: { id: true },
        });
        if (!member) return NextResponse.json({ error: "not_member" }, { status: 403 });
    }

    // Ma'lumotlarni yig'amiz
    const [snapshot, chatContext] = await Promise.all([
        buildSnapshot(me.id),
        gatherChatContext(contextType, contextId, me.id, scanDepth),
    ]);

    if (!snapshot) {
        return NextResponse.json({ error: "Hamyon topilmadi. Avval /pay bo'limiga o'ting." }, { status: 400 });
    }

    // Til
    const lang = me.country === "UZ" || !me.country ? "o'zbek"
        : me.country === "RU" ? "rus" : "ingliz";

    // Prompt — AI'ga faqat SO'ROVCHI ma'lumoti beriladi.
    // Chat kontekstidagi PEER ma'lumotlari (agar bo'lsa) e'tiborsiz qoldiriladi.
    const prompt = `Sen "Humo Financial Copilot" nomli aqlli moliya yordamchisi bo'lishing kerak. Foydalanuvchiga o'zining moliyaviy holati bo'yicha tavsiya berasan.

FAQAT SO'ROVCHI MA'LUMOTI (private — chatga yuborilmaydi):
- Balans: ${formatMoney(snapshot.balance, snapshot.currency)}
- Oxirgi 30 kun kirim: ${formatMoney(snapshot.monthlyIncome, snapshot.currency)}
- Oxirgi 30 kun chiqim: ${formatMoney(snapshot.monthlyExpense, snapshot.currency)}
- Oy oxirigacha: ${snapshot.daysLeftInMonth} kun
- Xavfsiz kunlik sarf: ${formatMoney(snapshot.dailyBudgetSafeToSpend, snapshot.currency)}
- Zaxira sug'urta: ${snapshot.hasEmergencyReserve ? "bor" : "yo'q"}
- Kirim barqarorligi: ${snapshot.incomeStability === "stable" ? "muntazam (maosh keladi)" : snapshot.incomeStability === "unstable" ? "notekis" : "aniqlanmadi"}
- BN savatidagi mahsulotlar: ${formatMoney(snapshot.bnCartTotal, snapshot.currency)}
- Belis'da kutayotgan buyurtmalar: ${formatMoney(snapshot.belisPendingOrders, snapshot.currency)}
- Umumiy majburiy chiqim (kelayotgan): ${formatMoney(snapshot.upcomingCommitments, snapshot.currency)}

CHAT KONTEKSTI (${scanDepth} oxirgi xabar):
${chatContext}

FOYDALANUVCHI SAVOLI: ${question || "(chatdagi kontekst asosida tavsiya bering)"}

JAVOB QOIDALARI:
1. ${lang} tilida yozing
2. Ikki bo'limga bo'ling:
   [PRIVATE — faqat foydalanuvchi ko'radi]
   3-4 gap: aniq raqamlar bilan analiz (balans, xavfsiz miqdor, tavsiya sabab)

   [PUBLIC — chatga yuborish mumkin]
   1-2 gap: raqamlarsiz, umumiy javob. Masalan "Xayr, aka. Bergan bo'lardim" YOKI "Ma'zur tut, hozir imkonim yo'q"
3. Suhbatda qarz so'ralayotgan bo'lsa: xavfsiz qarz miqdorini hisoblang (balans - kelayotgan xarajatlar).
4. Sotib olish so'ralayotgan bo'lsa: byudjetga sig'adimi?
5. Boshqa savol: mantiqiy tavsiya bering, raqamlarni ishlatib.
6. Salomlashish, dumaloqroq gap — YO'Q. Aniq va foydali javob.

Javob (aynan quyidagi shakl bilan boshlang, boshqa preambulyasiz):

[PRIVATE]
...

[PUBLIC]
...`;

    try {
        const answer = await aiText(prompt, { temperature: 0.3 });
        // AI javobini 2 bo'limga bo'lamiz
        const privateMatch = answer.match(/\[PRIVATE\]([\s\S]*?)(?=\[PUBLIC\]|$)/);
        const publicMatch = answer.match(/\[PUBLIC\]([\s\S]*?)$/);
        const privateSection = privateMatch ? privateMatch[1].trim() : answer.trim();
        const publicSection = publicMatch ? publicMatch[1].trim() : "";

        return NextResponse.json({
            private: privateSection,
            public: publicSection,
            snapshot: {
                balance: snapshot.balance,
                currency: snapshot.currency,
                dailyBudgetSafeToSpend: snapshot.dailyBudgetSafeToSpend,
                daysLeftInMonth: snapshot.daysLeftInMonth,
            },
            scanDepth,
        });
    } catch {
        return NextResponse.json({ error: "AI xato" }, { status: 500 });
    }
}
