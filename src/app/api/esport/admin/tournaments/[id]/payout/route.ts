import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEsportAdmin, ESPORT_OWNER_HUMO_ID } from "@/lib/esport";
import { getOrCreateWalletTx, walletCurrency } from "@/lib/wallet";
import { convert, roundMoney, type Currency } from "@/lib/money";

const SPLIT = [0.6, 0.25, 0.15]; // 1-o'rin / 2-o'rin / 3-o'rin

// POST /api/esport/admin/tournaments/[id]/payout — yutuqni g'oliblarga For Pay orqali to'lash.
// BUTUN to'lov (barcha o'rinlar + qoldiq) BITTA $transaction'da — atomik va idempotent.
//   - Atomiklik: avval har o'rin ALOHIDA $transaction edi → jarayon o'rtada uzilsa yoki ikki
//     so'rov bir vaqtda kelsa QISMAN to'lov bo'lardi (2-3-o'rin to'lanmay qolar, count guard
//     qayta urinishni bloklardi). Endi hammasi bir tranzaksiyada — all-or-nothing.
//   - Idempotentlik: har o'rin uchun ref `tour:<id>:p<n>` (WalletTransaction @@unique(walletId,ref)).
//     Qayta yuborilsa birinchi create P2002 → butun tranzaksiya rollback → "allaqachon to'langan".
//     Place-specific ref bir ega ikki top-3 jamoaga ega bo'lgan holatni ham to'g'ri boshqaradi.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!await getEsportAdmin()) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    const { id } = await params;

    const t = await prisma.esTournament.findUnique({ where: { id }, select: { id: true, name: true, status: true, prizePool: true, prizeFunded: true, currency: true, endsAt: true } });
    if (!t) return NextResponse.json({ error: "Turnir topilmadi" }, { status: 404 });
    const dateEnded = t.endsAt ? t.endsAt.getTime() < Date.now() : false;
    if (t.status !== "ENDED" && !dateEnded) return NextResponse.json({ error: "Turnir tugamagan" }, { status: 400 });
    const pool = Number(t.prizePool ?? 0);
    if (pool <= 0) return NextResponse.json({ error: "Yutuq fondi yo'q" }, { status: 400 });

    // Tez chiqish (asosiy himoya — tranzaksiya ichidagi unique ref P2002)
    const already = await prisma.walletTransaction.count({ where: { ref: `tour:${id}:p1` } });
    if (already) return NextResponse.json({ error: "Yutuq allaqachon to'langan" }, { status: 400 });

    // Joylar: chempion + finalist (final) + 3-o'rin g'olibi
    const final = await prisma.esMatch.findFirst({ where: { tournamentId: id, bracket: "MAIN" }, orderBy: { round: "desc" } });
    if (!final || final.status !== "DONE" || !final.winnerId) return NextResponse.json({ error: "Final tugamagan" }, { status: 400 });
    const third = await prisma.esMatch.findFirst({ where: { tournamentId: id, bracket: "THIRD", status: "DONE" } });

    const placements: string[] = [
        final.winnerId,                                                                     // 1
        final.winnerId === final.teamAId ? (final.teamBId ?? "") : (final.teamAId ?? ""),   // 2
        third?.winnerId ?? "",                                                              // 3
    ];

    const cur = (t.currency === "USD" ? "USD" : "UZS") as Currency;

    // Escrow: mukofot fondi to'ldirilgan bo'lishi shart (g'oliblar yo'qdan emas, fonddan to'lanadi)
    const funded = Number(t.prizeFunded ?? 0);
    let expected = 0;
    for (let i = 0; i < placements.length; i++) if (placements[i]) expected += pool * SPLIT[i];
    expected = roundMoney(expected, cur);
    if (funded < expected) return NextResponse.json({ error: `Mukofot fondi to'ldirilmagan — kerak ${expected.toLocaleString()}, to'langan ${funded.toLocaleString()}` }, { status: 400 });

    // Qabul qiluvchilarni oldindan aniqlaymiz (o'qishlar tranzaksiyadan tashqarida — lock qisqa)
    const recipients: { place: number; teamId: string; ownerId: string; country: string | null; gross: number }[] = [];
    for (let i = 0; i < placements.length; i++) {
        const teamId = placements[i];
        if (!teamId) continue;
        const team = await prisma.esTeam.findUnique({ where: { id: teamId }, select: { ownerId: true } });
        if (!team) continue;
        const owner = await prisma.userProfile.findUnique({ where: { id: team.ownerId }, select: { id: true, country: true } });
        if (!owner) continue;
        recipients.push({ place: i + 1, teamId, ownerId: owner.id, country: owner.country, gross: pool * SPLIT[i] });
    }
    const houseOwner = await prisma.userProfile.findUnique({ where: { humoId: ESPORT_OWNER_HUMO_ID }, select: { id: true, country: true } });

    try {
        const paid = await prisma.$transaction(async (tx) => {
            const out: { place: number; teamId: string; amount: number; currency: string }[] = [];
            let distributed = 0; // turnir valyutasida haqiqatda taqsimlangan

            for (const r of recipients) {
                const wallet = await getOrCreateWalletTx(tx, r.ownerId, r.country);
                const wCur = walletCurrency(wallet);
                const amount = roundMoney(convert(r.gross, cur, wCur), wCur);
                if (amount <= 0) continue;
                await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
                const after = await tx.wallet.findUnique({ where: { id: wallet.id }, select: { balance: true } });
                await tx.walletTransaction.create({
                    data: { walletId: wallet.id, type: "TRANSFER_IN", amount, currency: wCur, balanceAfter: roundMoney(Number(after?.balance ?? 0), wCur), description: `Turnir yutug'i: ${t.name} (${r.place}-o'rin)`, ref: `tour:${id}:p${r.place}` },
                });
                out.push({ place: r.place, teamId: r.teamId, amount, currency: wCur });
                distributed += r.gross;
            }

            // Taqsimlanmagan qoldiqni (masalan 3-o'rin o'ynalmasa 15%) egaga qaytaramiz
            const leftover = roundMoney(funded - distributed, cur);
            if (leftover > 0 && houseOwner) {
                const w = await getOrCreateWalletTx(tx, houseOwner.id, houseOwner.country);
                const wCur = walletCurrency(w);
                const back = roundMoney(convert(leftover, cur, wCur), wCur);
                if (back > 0) {
                    await tx.wallet.update({ where: { id: w.id }, data: { balance: { increment: back } } });
                    const after = await tx.wallet.findUnique({ where: { id: w.id }, select: { balance: true } });
                    await tx.walletTransaction.create({
                        data: { walletId: w.id, type: "TRANSFER_IN", amount: back, currency: wCur, balanceAfter: roundMoney(Number(after?.balance ?? 0), wCur), description: `Turnir fondi qoldig'i: ${t.name}`, ref: `tourfund-refund:${id}` },
                    });
                }
            }
            return out;
        });
        return NextResponse.json({ ok: true, paid });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
            return NextResponse.json({ error: "Yutuq allaqachon to'langan" }, { status: 400 });
        throw e;
    }
}
