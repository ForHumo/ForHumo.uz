// Match chat auto-sync — EsMatch ↔ NexusChannel (isPrivate GROUP).
// Faqat 2 jamoa a'zolari + system profile. Match LIVE bo'lganda ochiladi, DONE bo'lganda arxiv (allowComments=false).
// Match natijasi bilan ikkala jamoa channel'iga ham post ketadi.

import { prisma } from "@/lib/prisma";
import { collectEsTeamMemberIds } from "./esport-nexus-sync";
import { getEsportSystemProfileId } from "./system-profiles";

async function collectMatchMembers(match: {
    teamAId: string | null; teamBId: string | null;
}): Promise<Set<string>> {
    const all = new Set<string>();
    if (match.teamAId) {
        const a = await collectEsTeamMemberIds(match.teamAId);
        for (const id of a) all.add(id);
    }
    if (match.teamBId) {
        const b = await collectEsTeamMemberIds(match.teamBId);
        for (const id of b) all.add(id);
    }
    return all;
}

// Match uchun channel yaratish (LIVE holatida). DONE bo'lsa ham qoladi (tarix).
export async function syncEsMatchChannel(matchId: string): Promise<{
    channelId: string | null;
    created: boolean;
} | null> {
    try {
        const match = await prisma.esMatch.findUnique({
            where: { id: matchId },
            select: {
                id: true, tournamentId: true, round: true, slot: true, status: true,
                teamAId: true, teamBId: true,
                tournament: { select: { name: true } },
            },
        });
        if (!match || !match.teamAId || !match.teamBId) return null;

        const teams = await prisma.esTeam.findMany({
            where: { id: { in: [match.teamAId, match.teamBId] } },
            select: { id: true, name: true, tag: true },
        });
        const tA = teams.find(t => t.id === match.teamAId);
        const tB = teams.find(t => t.id === match.teamBId);
        if (!tA || !tB) return null;

        const wantMembers = await collectMatchMembers(match);
        const systemProfileId = await getEsportSystemProfileId();

        let channel = await prisma.nexusChannel.findUnique({ where: { esMatchId: matchId } });
        let created = false;

        if (!channel) {
            channel = await prisma.nexusChannel.create({
                data: {
                    ownerId: systemProfileId,
                    type: "GROUP",
                    name: `${tA.tag ?? tA.name} vs ${tB.tag ?? tB.name}`,
                    description: `${match.tournament.name} · Round ${match.round} · Match ${match.slot}`,
                    isPrivate: true,
                    memberCount: 0,
                    esMatchId: matchId,
                    systemOwned: true,
                },
            });
            created = true;
        }
        const channelId = channel.id;

        // Members diff
        const existing = await prisma.nexusChannelMember.findMany({
            where: { channelId }, select: { id: true, profileId: true },
        });
        const existingIds = new Set(existing.map(e => e.profileId));
        const toAdd = [...wantMembers].filter(id => !existingIds.has(id));

        if (toAdd.length > 0) {
            await prisma.nexusChannelMember.createMany({
                data: toAdd.map(profileId => ({ channelId, profileId, role: "MEMBER" as const })),
                skipDuplicates: true,
            });
        }
        const finalCount = await prisma.nexusChannelMember.count({ where: { channelId } });
        await prisma.nexusChannel.update({ where: { id: channelId }, data: { memberCount: finalCount } });

        return { channelId, created };
    } catch { return null; }
}

// Match yakunlangach: 3 joyga post — tournament chat + team A chat + team B chat.
export async function announceMatchResult(matchId: string): Promise<void> {
    try {
        const match = await prisma.esMatch.findUnique({
            where: { id: matchId },
            select: {
                id: true, tournamentId: true, round: true, slot: true,
                teamAId: true, teamBId: true, scoreA: true, scoreB: true, winnerId: true,
                tournament: { select: { name: true } },
            },
        });
        if (!match || !match.winnerId) return;

        const systemProfileId = await getEsportSystemProfileId();

        const teams = await prisma.esTeam.findMany({
            where: { id: { in: [match.teamAId, match.teamBId].filter(Boolean) as string[] } },
            select: { id: true, name: true, tag: true },
        });
        const tA = teams.find(t => t.id === match.teamAId);
        const tB = teams.find(t => t.id === match.teamBId);
        const winner = teams.find(t => t.id === match.winnerId);
        if (!tA || !tB || !winner) return;

        const nameA = tA.tag ?? tA.name;
        const nameB = tB.tag ?? tB.name;
        const scoreText = `${match.scoreA ?? 0}—${match.scoreB ?? 0}`;

        // 1) Tournament chat
        const tournamentChat = await prisma.nexusChannel.findUnique({
            where: { esTournamentId: match.tournamentId }, select: { id: true },
        });
        if (tournamentChat) {
            await prisma.nexusChannelMessage.create({
                data: {
                    channelId: tournamentChat.id,
                    senderId: systemProfileId,
                    text: `**Round ${match.round} · Match ${match.slot}**\n${nameA} ${scoreText} ${nameB}\n\nG'olib: **${winner.tag ?? winner.name}**`,
                },
            });
        }

        // 2) Winner team chat — tabriklash
        const winnerChat = await prisma.nexusChannel.findUnique({
            where: { esTeamId: winner.id }, select: { id: true },
        });
        if (winnerChat) {
            await prisma.nexusChannelMessage.create({
                data: {
                    channelId: winnerChat.id,
                    senderId: systemProfileId,
                    text: `**Tabriklaymiz!**\n${match.tournament.name} — Round ${match.round}\n${nameA} ${scoreText} ${nameB}\n\nKeyingi bosqichga o'tdingiz.`,
                },
            });
        }

        // 3) Loser team chat — motivatsiya
        const loserId = match.winnerId === match.teamAId ? match.teamBId : match.teamAId;
        if (loserId) {
            const loserChat = await prisma.nexusChannel.findUnique({
                where: { esTeamId: loserId }, select: { id: true },
            });
            if (loserChat) {
                const loser = teams.find(t => t.id === loserId);
                if (loser) {
                    await prisma.nexusChannelMessage.create({
                        data: {
                            channelId: loserChat.id,
                            senderId: systemProfileId,
                            text: `**${match.tournament.name}** — Round ${match.round}\n${nameA} ${scoreText} ${nameB}\n\nKeyingi turnirda muvaffaqiyat!`,
                        },
                    });
                }
            }
        }
    } catch { /* fail-safe */ }
}

// Match LIVE bo'lganda: tournament chat'ga bildirish
export async function announceMatchLive(matchId: string): Promise<void> {
    try {
        const match = await prisma.esMatch.findUnique({
            where: { id: matchId },
            select: {
                id: true, tournamentId: true, round: true, slot: true, streamUrl: true,
                teamAId: true, teamBId: true,
                tournament: { select: { name: true } },
            },
        });
        if (!match || !match.teamAId || !match.teamBId) return;

        const teams = await prisma.esTeam.findMany({
            where: { id: { in: [match.teamAId, match.teamBId] } },
            select: { id: true, name: true, tag: true },
        });
        const tA = teams.find(t => t.id === match.teamAId);
        const tB = teams.find(t => t.id === match.teamBId);
        if (!tA || !tB) return;

        const systemProfileId = await getEsportSystemProfileId();
        const stream = match.streamUrl ? `\n\nEfir: ${match.streamUrl}` : "";

        const tournamentChat = await prisma.nexusChannel.findUnique({
            where: { esTournamentId: match.tournamentId }, select: { id: true },
        });
        if (tournamentChat) {
            await prisma.nexusChannelMessage.create({
                data: {
                    channelId: tournamentChat.id,
                    senderId: systemProfileId,
                    text: `**MATCH LIVE**\n${tA.tag ?? tA.name} vs ${tB.tag ?? tB.name}\nRound ${match.round} · Match ${match.slot}${stream}`,
                },
            });
        }
    } catch { /* fail-safe */ }
}

// Match chat'ga xabar postlash (istalgan matn, ixtiyoriy pin).
export async function postToMatchChannel(
    matchId: string,
    text: string,
    opts: { pin?: boolean } = {},
): Promise<void> {
    try {
        const channel = await prisma.nexusChannel.findUnique({
            where: { esMatchId: matchId }, select: { id: true },
        });
        if (!channel) return;
        const systemProfileId = await getEsportSystemProfileId();
        const msg = await prisma.nexusChannelMessage.create({
            data: {
                channelId: channel.id,
                senderId: systemProfileId,
                text: text.slice(0, 2000),
                pinnedAt: opts.pin ? new Date() : null,
            },
        });
        void msg;
    } catch { /* fail-safe */ }
}

// Match DONE bo'lganda match chat'ni arxivga o'tkazish + yakuniy xabar pin.
// defaultPermissions.sendMessages=false qilib qo'yamiz — hech kim yozolmaydi (arxiv).
export async function announceMatchDone(matchId: string): Promise<void> {
    try {
        const match = await prisma.esMatch.findUnique({
            where: { id: matchId },
            select: {
                id: true, teamAId: true, teamBId: true, scoreA: true, scoreB: true, winnerId: true,
                tournament: { select: { name: true } },
            },
        });
        if (!match || !match.winnerId) return;
        const channel = await prisma.nexusChannel.findUnique({
            where: { esMatchId: matchId }, select: { id: true },
        });
        if (!channel) return;

        const teams = await prisma.esTeam.findMany({
            where: { id: { in: [match.teamAId, match.teamBId, match.winnerId].filter(Boolean) as string[] } },
            select: { id: true, name: true, tag: true },
        });
        const winner = teams.find(t => t.id === match.winnerId);
        const tA = teams.find(t => t.id === match.teamAId);
        const tB = teams.find(t => t.id === match.teamBId);
        if (!winner || !tA || !tB) return;

        const systemProfileId = await getEsportSystemProfileId();

        // Match chat'ga yakuniy pin xabar
        await prisma.nexusChannelMessage.create({
            data: {
                channelId: channel.id,
                senderId: systemProfileId,
                text: `**MATCH YAKUNLANDI**\n${tA.tag ?? tA.name} ${match.scoreA ?? 0}—${match.scoreB ?? 0} ${tB.tag ?? tB.name}\n\nG'olib: **${winner.tag ?? winner.name}**\n\nChat arxivda — yozish yopiq.`,
                pinnedAt: new Date(),
            },
        });

        // Arxiv rejim — hech kim yozolmaydi
        await prisma.nexusChannel.update({
            where: { id: channel.id },
            data: {
                defaultPermissions: {
                    sendMessages: false, sendMedia: false, sendLinks: false,
                    embedLinks: false, addMembers: false, pinMessages: false, changeInfo: false,
                },
            },
        });
    } catch { /* fail-safe */ }
}

// EsBroadcast (Nexus Live) yoki tashqi stream URL bilan match chat'ga embed banner.
export async function announceMatchStream(matchId: string, streamUrl: string): Promise<void> {
    try {
        await postToMatchChannel(matchId,
            `**Efir yoqildi**\n${streamUrl}\n\nJonli tomosha uchun havolani oching.`,
            { pin: true });
    } catch { /* fail-safe */ }
}

// Turnir boshlangan / bracket tayyor bo'lganda
export async function announceTournamentStart(tournamentId: string): Promise<void> {
    try {
        const t = await prisma.esTournament.findUnique({
            where: { id: tournamentId },
            select: {
                id: true, name: true, format: true, maxTeams: true,
                participants: { select: { id: true } },
            },
        });
        if (!t) return;

        const systemProfileId = await getEsportSystemProfileId();
        const channel = await prisma.nexusChannel.findUnique({
            where: { esTournamentId: tournamentId }, select: { id: true },
        });
        if (!channel) return;

        await prisma.nexusChannelMessage.create({
            data: {
                channelId: channel.id,
                senderId: systemProfileId,
                text: `**Turnir boshlandi!**\n${t.name}\n\n${t.participants.length} jamoa · Format: ${t.format}\n\nOmad!`,
                pinnedAt: new Date(),
            },
        });
    } catch { /* fail-safe */ }
}

// Tournament chat'ga info banner post + pin. Yaratilganda 1 marta chaqiriladi.
export async function pinTournamentBanner(tournamentId: string): Promise<void> {
    try {
        const t = await prisma.esTournament.findUnique({
            where: { id: tournamentId },
            select: {
                id: true, name: true, format: true, maxTeams: true,
                prizePool: true, currency: true, startsAt: true, endsAt: true,
                game: { select: { name: true } },
            },
        });
        if (!t) return;

        const channel = await prisma.nexusChannel.findUnique({
            where: { esTournamentId: tournamentId }, select: { id: true },
        });
        if (!channel) return;

        const systemProfileId = await getEsportSystemProfileId();

        const prizeText = t.prizePool
            ? `Mukofot: ${Number(t.prizePool).toLocaleString("uz-UZ")} ${t.currency}`
            : "Mukofot: sozlangan emas";
        const dates = t.startsAt
            ? `Boshlanish: ${new Date(t.startsAt).toLocaleDateString("uz-UZ")}`
            : "";

        await prisma.nexusChannelMessage.create({
            data: {
                channelId: channel.id,
                senderId: systemProfileId,
                text: [
                    `**${t.name}**`,
                    `O'yin: ${t.game.name}`,
                    `Format: ${t.format} · Max jamoa: ${t.maxTeams || "∞"}`,
                    prizeText,
                    dates,
                    "",
                    "Ushbu chat @humo_esport tomonidan boshqariladi.",
                ].filter(Boolean).join("\n"),
                pinnedAt: new Date(),
            },
        });
    } catch { /* fail-safe */ }
}
