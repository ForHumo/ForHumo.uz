// eSport tizim xabarlarini team channel(lar)iga yuborish.
// Xabar Humo eSport tizim profili nomidan yoziladi.

import { prisma } from "@/lib/prisma";
import { getEsportSystemProfileId } from "@/lib/system-profiles";
import { syncEsTeamChannel } from "@/lib/esport-nexus-sync";
import { pusherTrigger, userChannel } from "@/lib/pusher-server";

async function ensureTeamChannel(teamId: string): Promise<string | null> {
    let ch = await prisma.nexusChannel.findUnique({
        where: { esTeamId: teamId }, select: { id: true },
    });
    if (!ch) {
        // Team bor lekin channel hali yaratilmagan → tez sinxron
        await syncEsTeamChannel(teamId);
        ch = await prisma.nexusChannel.findUnique({
            where: { esTeamId: teamId }, select: { id: true },
        });
    }
    return ch?.id ?? null;
}

// Bitta team channel'iga tizim xabar
export async function postToEsTeamChannel(teamId: string, text: string, options?: {
    pin?: boolean;
    silent?: boolean;
}): Promise<string | null> {
    try {
        const channelId = await ensureTeamChannel(teamId);
        if (!channelId) return null;
        const systemId = await getEsportSystemProfileId();
        const msg = await prisma.nexusChannelMessage.create({
            data: {
                channelId, senderId: systemId,
                text: text.slice(0, 4000),
                pinnedAt: options?.pin ? new Date() : null,
                anonymous: false, // Sender profil bilan ko'rinadi — Humo eSport
            },
        });

        // Push xabarnoma — a'zolarga (silent bo'lmasa)
        if (!options?.silent) {
            const members = await prisma.nexusChannelMember.findMany({
                where: { channelId, profileId: { not: systemId } },
                select: { profileId: true, mutedUntil: true }, take: 500,
            });
            const now = Date.now();
            for (const m of members) {
                if (m.mutedUntil && m.mutedUntil.getTime() > now) continue;
                await pusherTrigger(userChannel(m.profileId), "nx:msg:new", {
                    channelId,
                    message: {
                        id: msg.id, text: msg.text, media: [], createdAt: msg.createdAt,
                        senderId: systemId, mine: false, anonymous: false,
                        author: { name: "Humo eSport", username: "humo_esport", image: "/logos/esport.png", verified: true },
                        reactions: [],
                    },
                }).catch(() => {});
            }
        }

        return msg.id;
    } catch { return null; }
}

// Bir necha team channel'iga
export async function postToEsTeamChannels(teamIds: string[], text: string, options?: {
    pin?: boolean;
    silent?: boolean;
}): Promise<{ posted: number; skipped: number }> {
    let posted = 0, skipped = 0;
    for (const teamId of teamIds) {
        const id = await postToEsTeamChannel(teamId, text, options);
        if (id) posted++; else skipped++;
    }
    return { posted, skipped };
}
