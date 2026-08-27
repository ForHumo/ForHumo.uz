// Turnir chat auto-sync — EsTournament ↔ NexusChannel (systemOwned GROUP).
// Ishtirokchi jamoalarning barcha owner/staff/athletes a'zo bo'ladi.
// Faqat @humo_esport system profil post qiladi (isSystem=true group).

import { prisma } from "@/lib/prisma";
import { collectEsTeamMemberIds } from "./esport-nexus-sync";
import { getEsportSystemProfileId } from "./system-profiles";

// Barcha turnirdagi jamoalar a'zolarini yig'adi
async function collectTournamentMembers(tournamentId: string): Promise<Set<string>> {
    const teams = await prisma.esTournamentTeam.findMany({
        where: { tournamentId }, select: { teamId: true },
    });
    const all = new Set<string>();
    for (const t of teams) {
        const ids = await collectEsTeamMemberIds(t.teamId);
        for (const id of ids) all.add(id);
    }
    return all;
}

// Turnir uchun channel yaratish + a'zolar sinxron
export async function syncEsTournamentChannel(tournamentId: string): Promise<{
    channelId: string | null;
    created: boolean;
    added: number;
} | null> {
    try {
        const t = await prisma.esTournament.findUnique({
            where: { id: tournamentId },
            select: { id: true, name: true, status: true, gameId: true },
        });
        if (!t) return null;

        const wantMembers = await collectTournamentMembers(tournamentId);

        let channel = await prisma.nexusChannel.findUnique({ where: { esTournamentId: tournamentId } });
        let created = false;
        const systemProfileId = await getEsportSystemProfileId();

        if (!channel) {
            channel = await prisma.nexusChannel.create({
                data: {
                    ownerId: systemProfileId,
                    type: "GROUP",
                    name: `Turnir: ${t.name}`,
                    description: `${t.name} — Humo eSport turniri`,
                    isPrivate: true,
                    memberCount: 0,
                    esTournamentId: tournamentId,
                    systemOwned: true,
                    // Faqat admin (system profile) yozadi — permissions defaults'da sendMessages: false
                    defaultPermissions: {
                        sendMessages: false, sendMedia: false, sendLinks: false,
                        embedLinks: false, addMembers: false, pinMessages: false, changeInfo: false,
                    },
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
        const toRemove = existing.filter(e => !wantMembers.has(e.profileId));

        if (toAdd.length > 0) {
            await prisma.nexusChannelMember.createMany({
                data: toAdd.map(profileId => ({ channelId, profileId, role: "MEMBER" as const })),
                skipDuplicates: true,
            });
        }
        if (toRemove.length > 0) {
            await prisma.nexusChannelMember.deleteMany({
                where: { id: { in: toRemove.map(e => e.id) } },
            });
        }
        const finalCount = await prisma.nexusChannelMember.count({ where: { channelId } });
        await prisma.nexusChannel.update({ where: { id: channelId }, data: { memberCount: finalCount } });

        return { channelId, created, added: toAdd.length };
    } catch { return null; }
}

// System profile'dan turnir chat'ga xabar postlaydi
export async function postToTournamentChannel(tournamentId: string, text: string): Promise<void> {
    try {
        const channel = await prisma.nexusChannel.findUnique({
            where: { esTournamentId: tournamentId }, select: { id: true },
        });
        if (!channel) return;
        const systemProfileId = await getEsportSystemProfileId();
        await prisma.nexusChannelMessage.create({
            data: {
                channelId: channel.id,
                senderId: systemProfileId,
                text: text.slice(0, 2000),
            },
        });
    } catch { /* fail-safe */ }
}

export async function deleteEsTournamentChannel(tournamentId: string): Promise<void> {
    try {
        const ch = await prisma.nexusChannel.findUnique({
            where: { esTournamentId: tournamentId }, select: { id: true },
        });
        if (ch) await prisma.nexusChannel.delete({ where: { id: ch.id } });
    } catch { /* fail-safe */ }
}
