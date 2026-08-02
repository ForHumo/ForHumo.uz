import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin, ESPORT_OWNER_HUMO_ID } from "@/lib/esport";
import { getOrCreateWallet, walletCurrency } from "@/lib/wallet";
import { convert, roundMoney, type Currency } from "@/lib/money";

const SPLIT = [0.6, 0.25, 0.15]; // 1-o'rin / 2-o'rin / 3-o'rin

// POST /api/esport/admin/tournaments/[id]/payout — yutuqни g'oliblarga ALKH Pay orqali to'lash
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;

    const t = await prisma.esTournament.findUnique({ where: { id }, select: { id: true, name: true, status: true, prizePool: true, prizeFunded: true, currency: true, endsAt: true } });
    if (!t) return NextResponse.json({ error: "Turnir topilmadi" }, { status: 404 });
    const dateEnded = t.endsAt ? t.endsAt.getTime() < Date.now() : false;
    if (t.status !== "ENDED" && !dateEnded) return NextResponse.json({ error: "Turnir tugamagan" }, { status: 400 });
    const pool = Number(t.prizePool ?? 0);
    if (pool <= 0) return NextResponse.json({ error: "Yutuq fondi yo'q" }, { status: 400 });

    // Ikki marta to'lashni to'sish
    const already = await prisma.walletTransaction.count({ where: { ref: `tour:${id}` } });
    if (already) return NextResponse.json({ error: "Yutuq allaqachon to'langan" }, { status: 400 });

    // Joylar: chempion + finalist (final) + 3-o'rin g'olibi
    const final = await prisma.esMatch.findFirst({ where: { tournamentId: id, bracket: "MAIN" }, orderBy: { round: "desc" } });
    if (!final || final.status !== "DONE" || !final.winnerId) return NextResponse.json({ error: "Final tugamagan" }, { status: 400 });
    const third = await prisma.esMatch.findFirst({ where: { tournamentId: id, bracket: "THIRD", status: "DONE" } });

    const placements: string[] = [
        final.winnerId,                                                    // 1
        final.winnerId === final.teamAId ? (final.teamBId ?? "") : (final.teamAId ?? ""), // 2
        third?.winnerId ?? "",                                             // 3
    ];

    const cur = (t.currency === "USD" ? "USD" : "UZS") as Currency;

    // Escrow: mukofot fondi to'ldirilgan bo'lishi shart (g'oliblar yo'qdan emas, escrow'dan to'lanadi)
    const funded = Number(t.prizeFunded ?? 0);
    let expected = 0;
    for (let i = 0; i < placements.length; i++) if (placements[i]) expected += pool * SPLIT[i];
    expected = roundMoney(expected, cur);
    if (funded < expected) return NextResponse.json({ error: `Mukofot fondi to'ldirilmagan — kerak ${expected.toLocaleString()}, to'langan ${funded.toLocaleString()}` }, { status: 400 });

    const paid: { place: number; teamId: string; amount: number; currency: string }[] = [];
    let distributed = 0; // turnir valyutasida haqiqatda to'langan

    for (let i = 0; i < placements.length; i++) {
        const teamId = placements[i];
        if (!teamId) continue;
        const team = await prisma.esTeam.findUnique({ where: { id: teamId }, select: { name: true, ownerId: true } });
        if (!team) continue;
        const owner = await prisma.userProfile.findUnique({ where: { id: team.ownerId }, select: { id: true, country: true } });
        if (!owner) continue;

        const wallet = await getOrCreateWallet(owner.id, owner.country);
        const wCur = walletCurrency(wallet);
        const amount = roundMoney(convert(pool * SPLIT[i], cur, wCur), wCur);
        if (amount <= 0) continue;
        const newBal = roundMoney(Number(wallet.balance) + amount, wCur);

        await prisma.$transaction([
            prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } }),
            prisma.walletTransaction.create({
                data: { walletId: wallet.id, type: "TRANSFER_IN", amount, currency: wCur, balanceAfter: newBal, description: `Turnir yutug'i: ${t.name} (${i + 1}-o'rin)`, ref: `tour:${id}` },
            }),
        ]);
        paid.push({ place: i + 1, teamId, amount, currency: wCur });
        distributed += pool * SPLIT[i];
    }

    // Taqsimlanmagan qoldiqni (masalan 3-o'rin o'ynalmasa 15%) egaga qaytaramiz
    const leftover = roundMoney(funded - distributed, cur);
    if (leftover > 0) {
        const owner = await prisma.userProfile.findUnique({ where: { humoId: ESPORT_OWNER_HUMO_ID }, select: { id: true, country: true } });
        if (owner) {
            const w = await getOrCreateWallet(owner.id, owner.country);
            const wCur = walletCurrency(w);
            const back = roundMoney(convert(leftover, cur, wCur), wCur);
            if (back > 0) {
                const newBal = roundMoney(Number(w.balance) + back, wCur);
                await prisma.$transaction([
                    prisma.wallet.update({ where: { id: w.id }, data: { balance: { increment: back } } }),
                    prisma.walletTransaction.create({ data: { walletId: w.id, type: "TRANSFER_IN", amount: back, currency: wCur, balanceAfter: newBal, description: `Turnir fondi qoldig'i: ${t.name}`, ref: `tourfund-refund:${id}` } }),
                ]);
            }
        }
    }

    return NextResponse.json({ ok: true, paid });
}
