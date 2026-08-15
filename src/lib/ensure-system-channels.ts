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
    welcome: string;   // birinchi xabar (pinned)
}

export const OFFICIAL_CHANNELS: SystemChannelSpec[] = [
    {
        handle: "forhumo",
        type: "CHANNEL",
        name: "For Humo",
        description: "For Humo rasmiy kanali — yangiliklar, yangilanishlar, e'lonlar.",
        avatarUrl: "/logo.png",
        welcome: "Assalomu alaykum va For Humo super-app'ga xush kelibsiz!\n\nBu kanal orqali platformamizning barcha yangi funksiyalari, muhim e'lonlar va tizim yangilanishlari haqida birinchilardan bo'lib xabardor bo'lasiz.\n\nHumo ID, Humo AI, Humo Nexus, Humo eSport, Humo Market, For Pay, Bozor Narxida — hammasi bir joyda. Har bir modulning o'z rasmiy kanali ham mavjud.",
    },
    {
        handle: "forhumo_chat",
        type: "GROUP",
        name: "For Humo hamjamiyat",
        description: "For Humo foydalanuvchilari uchun rasmiy suhbat guruhi.",
        avatarUrl: "/logo.png",
        welcome: "For Humo hamjamiyati guruhiga xush kelibsiz!\n\nBu yerda foydalanuvchilar bilan tanishish, taklif va fikr-mulohazalar almashish, savol berish mumkin. Iltimos hurmat bilan muomala qiling.\n\nQoidalar: hurmatsiz muomala, spam, reklama, siyosiy/diniy tortishuvlar taqiq. Buzganlar admin tomonidan ogohlantiriladi.",
    },
    {
        handle: "id_news",
        type: "CHANNEL",
        name: "Humo ID yangiliklari",
        description: "Humo ID moduli yangilanishlari va e'lonlari.",
        avatarUrl: "/logos/humo-id.png",
        welcome: "Humo ID — For Humo super-app'ining yagona identity tizimi.\n\nBu kanalda: yangi tasdiqlash darajalari, xavfsizlik yangilanishlari, profil tahrirlash imkoniyatlari va boshqa Humo ID bilan bog'liq e'lonlar chiqadi.",
    },
    {
        handle: "nexus_news",
        type: "CHANNEL",
        name: "Humo Nexus yangiliklari",
        description: "Nexus platform yangilanishlari.",
        avatarUrl: "/logos/humo-nexus.png",
        welcome: "Humo Nexus — ijtimoiy tarmoq va messenger platformasi.\n\nYangi post turlari, video/audio funksiyalar, DM yangilanishlari, kanal/guruh imkoniyatlari va boshqa Nexus xususiyatlari haqida shu yerda bilib olasiz.",
    },
    {
        handle: "market_deals",
        type: "CHANNEL",
        name: "Humo Market — chegirmalar",
        description: "Humo Market'dagi eng foydali takliflar va aksiyalar.",
        avatarUrl: "/logos/humo-market.png",
        welcome: "Humo Market chegirmalar kanaliga xush kelibsiz!\n\nBu yerda: eng foydali takliflar, aksiyalar, yangi mahsulotlar, promo-kodlar va sotuvchilar bilan bog'liq maxsus e'lonlar bo'ladi.\n\nSotib olish uchun havolalar to'g'ridan-to'g'ri Humo Market'ga olib boradi.",
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

            // Welcome xabar seed — agar kanal hali bo'sh bo'lsa
            const channelId = ids[ids.length - 1];
            const hasMessages = await prisma.nexusChannelMessage.count({ where: { channelId } });
            if (hasMessages === 0) {
                await prisma.nexusChannelMessage.create({
                    data: {
                        channelId,
                        senderId: founder.id,
                        text: spec.welcome,
                        pinnedAt: new Date(),
                    },
                });
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
