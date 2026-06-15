import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin } from "@/lib/esport";
import { getOrCreateWallet, walletCurrency } from "@/lib/wallet";
import { convert, roundMoney, type Currency } from "@/lib/money";

const SPLIT = [0.6, 0.25, 0.15]; // 1-o'rin / 2-o'rin / 3-o'rin

// POST /api/esport/admin/tournaments/[id]/payout — yutuqни g'oliblarga ALKH Pay orqali to'lash
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;

    const t = await prisma.esTournament.findUnique({ where: { id }, select: { id: true, name: true, status: true, prizePool: true, currency: true, endsAt: true } });
    if (!t) return NextResponse.json({ error: "Turnir topilmadi" }, { status: 404 });
    const dateEnded = t.endsAt ? t.endsAt.getTime() < Date.now() : false;
    if (t.status !== "ENDED" && !dateEnded) return NextResponse.json({ error: "Turnir tugamagan" }, { status: 400 });
    const pool = Number(t.prizePool ?? 0);
    if (pool <= 0) return NextResponse.json({ error: "Yutuq fondi yo'q" }, { status: 400 });

    // Ikki marta to'lashni to'sish
    const already = await prisma.zijTransaction.count({ where: { ref: `tour:${id}` } });
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
    const paid: { place: number; teamId: string; amount: number; currency: string }[] = [];

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
            prisma.zijWallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } }),
            prisma.zijTransaction.create({
                data: { walletId: wallet.id, type: "TRANSFER_IN", amount, currency: wCur, balanceAfter: newBal, description: `Turnir yutug'i: ${t.name} (${i + 1}-o'rin)`, ref: `tour:${id}` },
            }),
        ]);
        paid.push({ place: i + 1, teamId, amount, currency: wCur });
    }

    return NextResponse.json({ ok: true, paid });
}
