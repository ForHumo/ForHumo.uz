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
            },
        });
    } catch { /* fail-safe */ }
}
