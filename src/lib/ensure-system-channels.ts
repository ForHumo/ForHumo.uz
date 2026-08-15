// Rasmiy For Humo kanal + guruhlarini DB'da mavjudligini ta'minlaydi (upsert)
// va har foydalanuvchini a'zo qiladi.
//
// - NexusChannel (isSystem=true, handle unique)
// - Har GET /api/nexus/channels chaqiruvida foydalanuvchi tizim
//   channel/guruhlarga avto-membership qo'shiladi
// - Delete/leave block: isSystem=true bo'lgan channel uchun rad etiladi
//   (faqat mute qilish mumkin)

import { prisma } from "@/lib/prisma";
import { FOUNDER_HUMO_IDS } from "@/lib/founders";

interface SystemChannelSpec {
    handle: string;
    type: "CHANNEL" | "GROUP";
    name: string;
    description: string;
    avatarUrl: string;
}

export const OFFICIAL_CHANNELS: SystemChannelSpec[] = [
    {
        handle: "forhumo",
        type: "CHANNEL",
        name: "For Humo",
        description: "For Humo rasmiy kanali — yangiliklar, yangilanishlar, e'lonlar.",
        avatarUrl: "/logo.png",
    },
    {
        handle: "forhumo_chat",
        type: "GROUP",
        name: "For Humo hamjamiyat",
        description: "For Humo foydalanuvchilari uchun rasmiy suhbat guruhi.",
        avatarUrl: "/logo.png",
    },
    {
        handle: "id_news",
        type: "CHANNEL",
        name: "Humo ID yangiliklari",
        description: "Humo ID moduli yangilanishlari va e'lonlari.",
        avatarUrl: "/logos/humo-id.png",
    },
    {
        handle: "nexus_news",
        type: "CHANNEL",
        name: "Humo Nexus yangiliklari",
        description: "Nexus platform yangilanishlari.",
        avatarUrl: "/logos/humo-nexus.png",
    },
    {
        handle: "market_deals",
        type: "CHANNEL",
        name: "Humo Market — chegirmalar",
        description: "Humo Market'dagi eng foydali takliflar va aksiyalar.",
        avatarUrl: "/logos/humo-market.png",
    },
];

let cachedOnce = false;
const cachedChannelIds: string[] = [];

async function seedChannelsIfNeeded(): Promise<string[]> {
    if (cachedOnce) return cachedChannelIds;

    const founder = await prisma.userProfile.findFirst({
        where: { humoId: { in: FOUNDER_HUMO_IDS } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
    });
    if (!founder) return [];

    const ids: string[] = [];
    for (const spec of OFFICIAL_CHANNELS) {
        try {
            const existing = await prisma.nexusChannel.findUnique({
                where: { handle: spec.handle },
                select: { id: true, isSystem: true, type: true },
            });
            if (existing) {
                // Type yoki isSystem noto'g'ri bo'lsa tuzatamiz
                if (!existing.isSystem || existing.type !== spec.type) {
                    await prisma.nexusChannel.update({
                        where: { id: existing.id },
                        data: { isSystem: true, type: spec.type, name: spec.name, description: spec.description, avatarUrl: spec.avatarUrl },
                    });
                } else {
                    // Metadata yangilash
                    await prisma.nexusChannel.update({
                        where: { id: existing.id },
                        data: { name: spec.name, description: spec.description, avatarUrl: spec.avatarUrl },
                    });
                }
                ids.push(existing.id);
            } else {
                const created = await prisma.nexusChannel.create({
                    data: {
                        ownerId: founder.id,
                        type: spec.type,
                        name: spec.name,
                        handle: spec.handle,
                        description: spec.description,
                        avatarUrl: spec.avatarUrl,
                        isSystem: true,
                        memberCount: 1,
                        // Owner avto-membership
                        members: { create: { profileId: founder.id, role: "OWNER" } },
                    },
                });
                ids.push(created.id);
            }
        } catch (e) {
            console.error("[ensureSystemChannels]", spec.handle, e instanceof Error ? e.message : e);
        }
    }
    cachedChannelIds.push(...ids);
    cachedOnce = ids.length > 0;
    return cachedChannelIds;
}

// Har foydalanuvchida tizim kanal/guruhlarga avto-membership.
// GET /api/nexus/channels?scope=mine chaqirilganda avval bu chaqiriladi.
export async function ensureSystemChannelsAndMembership(userId: string): Promise<void> {
    const channelIds = await seedChannelsIfNeeded();
    if (channelIds.length === 0) return;

    // Foydalanuvchi qaysi tizim kanallarga hali a'zo emas — topamiz
    const existing = await prisma.nexusChannelMember.findMany({
        where: { profileId: userId, channelId: { in: channelIds } },
        select: { channelId: true },
    });
    const has = new Set(existing.map(m => m.channelId));
    const toJoin = channelIds.filter(id => !has.has(id));
    if (toJoin.length === 0) return;

    // A'zo qilish (atomik) — memberCount ni ham ko'paytiramiz
    for (const cid of toJoin) {
        try {
            await prisma.$transaction([
                prisma.nexusChannelMember.create({
                    data: { channelId: cid, profileId: userId, role: "MEMBER" },
                }),
                prisma.nexusChannel.update({
                    where: { id: cid },
                    data: { memberCount: { increment: 1 } },
                }),
            ]);
        } catch { /* member allaqachon bor bo'lsa unique constraint */ }
    }
}
