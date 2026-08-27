// eSport EsTeam ↔ NexusChannel avtomatik sinxron.
// Team yaratilganda channel yaratiladi. Owner, staff, athletes → channel a'zolari.
// Barcha o'zgarishlarda `syncEsTeamChannel` chaqiriladi (idempotent + fail-safe).

import { prisma } from "@/lib/prisma";

// Team bilan bog'liq barcha profil ID'larini yig'adi
export async function collectEsTeamMemberIds(teamId: string): Promise<Set<string>> {
    const team = await prisma.esTeam.findUnique({
        where: { id: teamId },
        select: {
            ownerId: true,
            staff: { select: { profileId: true } },
            rosters: {
                select: {
                    members: {
                        select: {
                            athlete: { select: { humoProfileId: true } },
                        },
                    },
                },
            },
        },
    });
    if (!team) return new Set();
    const ids = new Set<string>([team.ownerId]);
    for (const s of team.staff) ids.add(s.profileId);
    for (const r of team.rosters) for (const m of r.members) ids.add(m.athlete.humoProfileId);
    return ids;
}

// Team uchun channel yaratish yoki yangilash + a'zolarni sinxronlash.
// Yangi channel: name = team.name, avatar = team.logo, cover = team.coverImage
// Fail-safe: xatolar log qilinmaydi, ilova crash bo'lmaydi.
export async function syncEsTeamChannel(teamId: string): Promise<{
    channelId: string | null;
    added: number;
    removed: number;
    created: boolean;
} | null> {
    try {
        const team = await prisma.esTeam.findUnique({
            where: { id: teamId },
            select: { id: true, name: true, tag: true, logo: true, coverImage: true, bio: true, ownerId: true },
        });
        if (!team) return null;

        const wantMemberIds = await collectEsTeamMemberIds(teamId);
        if (wantMemberIds.size === 0) return null;

        let channel = await prisma.nexusChannel.findUnique({ where: { esTeamId: teamId } });
        let created = false;

        if (!channel) {
            channel = await prisma.nexusChannel.create({
                data: {
                    ownerId: team.ownerId,        // texnik yozuv — real boshqaruv team owner tomonidan
                    type: "GROUP",
                    name: team.name,
                    handle: null,                  // esTeamId bor, handle shart emas
                    description: team.bio ? team.bio.slice(0, 500) : `${team.name} — eSport jamoasi`,
                    avatarUrl: team.logo ?? null,
                    coverUrl: team.coverImage ?? null,
                    isPrivate: true,               // jamoa-only
                    memberCount: 0,
                    esTeamId: teamId,
                    systemOwned: true,
                },
            });
            created = true;
        } else {
            // Team metadatasi o'zgargan bo'lsa channel'ni yangilash
            if (channel.name !== team.name || channel.avatarUrl !== team.logo || channel.coverUrl !== team.coverImage) {
                await prisma.nexusChannel.update({
                    where: { id: channel.id },
                    data: {
                        name: team.name,
                        avatarUrl: team.logo ?? null,
                        coverUrl: team.coverImage ?? null,
                    },
                });
            }
        }

        const channelId = channel.id;

        // Hozirgi a'zolarni olamiz
        const currentMembers = await prisma.nexusChannelMember.findMany({
            where: { channelId }, select: { id: true, profileId: true, role: true },
        });
        const currentIds = new Set(currentMembers.map(m => m.profileId));

        // Qo'shilishi kerak bo'lganlar
        const toAdd = [...wantMemberIds].filter(id => !currentIds.has(id));
        // Chiqarilishi kerak bo'lganlar (system-owned: hech kim qo'lda qo'shilmaydi,
        // shuning uchun mavjud a'zolar Ma'lumotlar bazasida yo'q bo'lsa — o'chiriladi)
        const toRemove = currentMembers.filter(m => !wantMemberIds.has(m.profileId));

        if (toAdd.length > 0) {
            await prisma.nexusChannelMember.createMany({
                data: toAdd.map(profileId => ({
                    channelId,
                    profileId,
                    role: profileId === team.ownerId ? "OWNER" as const : "MEMBER" as const,
                })),
                skipDuplicates: true,
            });
        }
        if (toRemove.length > 0) {
            await prisma.nexusChannelMember.deleteMany({
                where: { id: { in: toRemove.map(m => m.id) } },
            });
        }

        // memberCount yangilash
        const finalCount = await prisma.nexusChannelMember.count({ where: { channelId } });
        await prisma.nexusChannel.update({
            where: { id: channelId }, data: { memberCount: finalCount },
        });

        return { channelId, added: toAdd.length, removed: toRemove.length, created };
    } catch { return null; }
}

// Team o'chirilganda channel'ni ham o'chirish (bog'lanish tozalash).
export async function deleteEsTeamChannel(teamId: string): Promise<void> {
    try {
        const ch = await prisma.nexusChannel.findUnique({
            where: { esTeamId: teamId }, select: { id: true },
        });
        if (ch) await prisma.nexusChannel.delete({ where: { id: ch.id } });
    } catch { /* fail-safe */ }
}
