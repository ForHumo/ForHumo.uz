// Transfer ijrosi — haq (ALKH Pay) + sportchini yangi tarkibga ko'chirish (atomik).
// Haq: sotuvchi jamoa egasi oladi; erkin sportchi bo'lsa — sportchining o'zi (signing bonus).
import { prisma } from "@/lib/prisma";
import { roundMoney, convert, currencyForCountry, type Currency } from "@/lib/money";

const cur = (c: string): Currency => (c === "USD" ? "USD" : "UZS");
const ROSTER_EXTRA = 5;

export type TransferResult = "ok" | "not_found" | "no_funds" | "roster_full" | "invalid";

export async function executeTransfer(transferId: string): Promise<TransferResult> {
    try {
        return await prisma.$transaction(async tx => {
            const tr = await tx.esTransfer.findUnique({ where: { id: transferId } });
            if (!tr || ["DONE", "CANCELLED", "REJECTED"].includes(tr.status)) return "not_found" as const;

            const athlete = await tx.esAthlete.findUnique({ where: { id: tr.athleteId }, select: { id: true, gameId: true, humoProfileId: true, game: { select: { teamSize: true } } } });
            const toTeam = await tx.esTeam.findUnique({ where: { id: tr.toTeamId }, select: { id: true, ownerId: true } });
            if (!athlete || !toTeam) return "invalid" as const;

            const buyerId = toTeam.ownerId;
            const fromTeam = tr.fromTeamId ? await tx.esTeam.findUnique({ where: { id: tr.fromTeamId }, select: { ownerId: true } }) : null;
            const recipientId = fromTeam?.ownerId ?? athlete.humoProfileId;
            const fee = Math.max(0, Math.round(Number(tr.fee ?? 0)));
            const feeCur = cur(tr.currency);

            // ── Haq to'lovi (o'ziga o'tkazma bo'lsa o'tkazib yuboramiz) ──
            if (fee > 0 && buyerId !== recipientId) {
                const bw = await tx.zijWallet.findUnique({ where: { profileId: buyerId } });
                if (!bw) return "no_funds" as const;
                const bCur = cur(bw.currency);
                const buyerPays = convert(fee, feeCur, bCur);
                const debit = await tx.zijWallet.updateMany({ where: { id: bw.id, balance: { gte: buyerPays } }, data: { balance: { decrement: buyerPays } } });
                if (debit.count === 0) return "no_funds" as const;
                const afterB = await tx.zijWallet.findUnique({ where: { id: bw.id }, select: { balance: true } });
                await tx.zijTransaction.create({ data: { walletId: bw.id, type: "TRANSFER_OUT", amount: buyerPays, currency: bCur, balanceAfter: roundMoney(Number(afterB?.balance ?? 0), bCur), description: "eSport transfer to'lovi", ref: `transfer:${tr.id}` } });

                // Qabul qiluvchi
                const recProfile = await tx.userProfile.findUnique({ where: { id: recipientId }, select: { country: true } });
                let rw = await tx.zijWallet.findUnique({ where: { profileId: recipientId } });
                if (!rw) rw = await tx.zijWallet.create({ data: { profileId: recipientId, currency: currencyForCountry(recProfile?.country) } });
                const rCur = cur(rw.currency);
                const received = convert(fee, feeCur, rCur);
                await tx.zijWallet.update({ where: { id: rw.id }, data: { balance: { increment: received } } });
                const afterR = await tx.zijWallet.findUnique({ where: { id: rw.id }, select: { balance: true } });
                await tx.zijTransaction.create({ data: { walletId: rw.id, type: "TRANSFER_IN", amount: received, currency: rCur, balanceAfter: roundMoney(Number(afterR?.balance ?? 0), rCur), description: "eSport transfer daromadi", ref: `transfer:${tr.id}` } });
            }

            // ── Tarkibni ko'chirish ──
            await tx.esRosterMember.deleteMany({ where: { athleteId: athlete.id } });   // eski tarkibdan chiqarish
            let roster = await tx.esRoster.findUnique({ where: { teamId_gameId: { teamId: toTeam.id, gameId: athlete.gameId } } });
            if (!roster) roster = await tx.esRoster.create({ data: { teamId: toTeam.id, gameId: athlete.gameId } });
            const count = await tx.esRosterMember.count({ where: { rosterId: roster.id } });
            if (count >= athlete.game.teamSize + ROSTER_EXTRA) return "roster_full" as const;
            await tx.esRosterMember.create({ data: { rosterId: roster.id, athleteId: athlete.id, role: count === 0 ? "CAPTAIN" : "STARTER" } });

            await tx.esTransfer.update({ where: { id: tr.id }, data: { status: "DONE" } });
            return "ok" as const;
        });
    } catch {
        return "invalid";
    }
}

export const TRANSFER_MSG: Record<TransferResult, string> = {
    ok: "Transfer amalga oshdi",
    not_found: "Taklif topilmadi yoki yopilgan",
    no_funds: "Mablag' yetarli emas — ALKH Pay hamyonni to'ldiring",
    roster_full: "Yangi tarkib to'lgan",
    invalid: "Transfer amalga oshmadi",
};
