// Transfer ijrosi — haq (For Pay) + sportchini yangi tarkibga ko'chirish (atomik).
// Haq: sotuvchi jamoa egasi oladi; erkin sportchi bo'lsa — sportchining o'zi (signing bonus).
import { prisma } from "@/lib/prisma";
import { roundMoney, convert, currencyForCountry, type Currency } from "@/lib/money";
import { isTeamLockedForGame } from "@/lib/esport-lock";
import { addMonths } from "@/lib/esport-contract";

const cur = (c: string): Currency => (c === "USD" ? "USD" : "UZS");
const ROSTER_EXTRA = 5;

export type TransferResult = "ok" | "not_found" | "no_funds" | "roster_full" | "locked" | "invalid";

export async function executeTransfer(transferId: string): Promise<TransferResult> {
    try {
        // Roster lock: taklifдан keyin turnir boshlangan bo'lsa — ijro etilmaydi
        const pre = await prisma.esTransfer.findUnique({ where: { id: transferId }, select: { toTeamId: true, fromTeamId: true, athlete: { select: { gameId: true } } } });
        if (pre) {
            if (await isTeamLockedForGame(pre.toTeamId, pre.athlete.gameId)) return "locked";
            if (pre.fromTeamId && await isTeamLockedForGame(pre.fromTeamId, pre.athlete.gameId)) return "locked";
        }
        return await prisma.$transaction(async tx => {
            const tr = await tx.esTransfer.findUnique({ where: { id: transferId } });
            if (!tr || ["DONE", "CANCELLED", "REJECTED"].includes(tr.status)) return "not_found" as const;

            const athlete = await tx.esAthlete.findUnique({ where: { id: tr.athleteId }, select: { id: true, gameId: true, humoProfileId: true, game: { select: { teamSize: true } } } });
            const toTeam = await tx.esTeam.findUnique({ where: { id: tr.toTeamId }, select: { id: true, ownerId: true } });
            if (!athlete || !toTeam) return "invalid" as const;

            // Eskirgan taklif himoyasi: sotuvchi jamoa belgilangan bo'lsa, o'yinchi hali ham o'shanda bo'lishi shart
            if (tr.fromTeamId) {
                const cur = await tx.esRosterMember.findUnique({ where: { athleteId: tr.athleteId }, select: { roster: { select: { teamId: true } } } });
                if (cur?.roster.teamId !== tr.fromTeamId) return "invalid" as const;
            }

            // Kapasitet tekshiruvini TO'LOVDAN OLDIN qilamiz — aks holda haq to'langach
            // "roster_full" qaytsa, $transaction COMMIT bo'lib pul yo'qoladi (return rollback qilmaydi).
            const destRoster = await tx.esRoster.findUnique({ where: { teamId_gameId: { teamId: toTeam.id, gameId: athlete.gameId } }, select: { id: true } });
            if (destRoster) {
                const destCount = await tx.esRosterMember.count({ where: { rosterId: destRoster.id } });
                if (destCount >= athlete.game.teamSize + ROSTER_EXTRA) return "roster_full" as const; // hali yozuv yo'q — xavfsiz
            }

            const buyerId = toTeam.ownerId;
            const fromTeam = tr.fromTeamId ? await tx.esTeam.findUnique({ where: { id: tr.fromTeamId }, select: { ownerId: true } }) : null;
            const recipientId = fromTeam?.ownerId ?? athlete.humoProfileId;
            const fee = Math.max(0, Math.round(Number(tr.fee ?? 0)));
            const feeCur = cur(tr.currency);

            // ── Haq to'lovi (o'ziga o'tkazma bo'lsa o'tkazib yuboramiz) ──
            if (fee > 0 && buyerId !== recipientId) {
                const bw = await tx.wallet.findUnique({ where: { profileId: buyerId } });
                if (!bw) return "no_funds" as const;
                const bCur = cur(bw.currency);
                const buyerPays = convert(fee, feeCur, bCur);
                const debit = await tx.wallet.updateMany({ where: { id: bw.id, balance: { gte: buyerPays } }, data: { balance: { decrement: buyerPays } } });
                if (debit.count === 0) return "no_funds" as const;
                const afterB = await tx.wallet.findUnique({ where: { id: bw.id }, select: { balance: true } });
                await tx.walletTransaction.create({ data: { walletId: bw.id, type: "TRANSFER_OUT", amount: buyerPays, currency: bCur, balanceAfter: roundMoney(Number(afterB?.balance ?? 0), bCur), description: "eSport transfer to'lovi", ref: `transfer:${tr.id}` } });

                // Qabul qiluvchi
                const recProfile = await tx.userProfile.findUnique({ where: { id: recipientId }, select: { country: true } });
                let rw = await tx.wallet.findUnique({ where: { profileId: recipientId } });
                if (!rw) rw = await tx.wallet.create({ data: { profileId: recipientId, currency: currencyForCountry(recProfile?.country) } });
                const rCur = cur(rw.currency);
                const received = convert(fee, feeCur, rCur);
                await tx.wallet.update({ where: { id: rw.id }, data: { balance: { increment: received } } });
                const afterR = await tx.wallet.findUnique({ where: { id: rw.id }, select: { balance: true } });
                await tx.walletTransaction.create({ data: { walletId: rw.id, type: "TRANSFER_IN", amount: received, currency: rCur, balanceAfter: roundMoney(Number(afterR?.balance ?? 0), rCur), description: "eSport transfer daromadi", ref: `transfer:${tr.id}` } });
            }

            // ── Tarkibni ko'chirish ──
            await tx.esRosterMember.deleteMany({ where: { athleteId: athlete.id } });   // eski tarkibdan chiqarish
            let roster = await tx.esRoster.findUnique({ where: { teamId_gameId: { teamId: toTeam.id, gameId: athlete.gameId } } });
            if (!roster) roster = await tx.esRoster.create({ data: { teamId: toTeam.id, gameId: athlete.gameId } });
            const count = await tx.esRosterMember.count({ where: { rosterId: roster.id } });
            // Bu yerga yetganda to'lov allaqachon bo'lgan — to'lalik (race) bo'lsa THROW qilib
            // butun tranzaksiyani (jumladan haqni) bekor qilamiz, return EMAS (return commit qiladi).
            if (count >= athlete.game.teamSize + ROSTER_EXTRA) throw new Error("roster_full_after_pay");
            await tx.esRosterMember.create({ data: { rosterId: roster.id, athleteId: athlete.id, role: count === 0 ? "CAPTAIN" : "STARTER" } });

            // Shartnoma: eski faol shartnomalarni bekor + (shartlar bo'lsa) yangi shartnoma
            await tx.esContract.updateMany({ where: { athleteId: athlete.id, status: "ACTIVE" }, data: { status: "TERMINATED" } });
            if (tr.salary != null || tr.contractMonths != null) {
                await tx.esContract.create({
                    data: {
                        athleteId: athlete.id, teamId: toTeam.id, salary: tr.salary ?? null, currency: tr.currency,
                        endsAt: tr.contractMonths ? addMonths(new Date(), tr.contractMonths) : null, status: "ACTIVE",
                    },
                });
            }

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
    no_funds: "Mablag' yetarli emas — For Pay hamyonni to'ldiring",
    roster_full: "Yangi tarkib to'lgan",
    locked: "Jamoa turnirda — transfer turnir tugagach mumkin",
    invalid: "Transfer amalga oshmadi",
};
