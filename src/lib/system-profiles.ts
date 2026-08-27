// Tizim profillari — modul nomidan avto-postlar uchun.
// Bu profillar login qilinmaydi (email/googleId yo'q). Faqat NexusChannelMessage senderId
// sifatida ishlatiladi.
//
// Foydalanish:
//   const esportSystemId = await getEsportSystemProfileId();
//   await prisma.nexusChannelMessage.create({ data: { channelId, senderId: esportSystemId, text } });

import { prisma } from "@/lib/prisma";

const ESPORT_SYSTEM_USERNAME = "humo_esport";
const BELIS_SYSTEM_USERNAME = "humo_belis";
const BN_SYSTEM_USERNAME = "humo_bn";

async function getOrCreateSystemProfile(opts: {
    username: string;
    name: string;
    image: string;
}): Promise<string> {
    const existing = await prisma.userProfile.findUnique({
        where: { username: opts.username }, select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.userProfile.create({
        data: {
            username: opts.username,
            name: opts.name,
            image: opts.image,
            country: "UZ",
            emailVerified: true,
            onboardingDone: true,
            accountType: "SYSTEM",
        },
        select: { id: true },
    });
    return created.id;
}

export async function getEsportSystemProfileId(): Promise<string> {
    return getOrCreateSystemProfile({
        username: ESPORT_SYSTEM_USERNAME,
        name: "Humo eSport",
        image: "/logos/esport.png",
    });
}

export async function getBelisSystemProfileId(): Promise<string> {
    return getOrCreateSystemProfile({
        username: BELIS_SYSTEM_USERNAME,
        name: "Belis",
        image: "/belis/belis.png",
    });
}

export async function getBnSystemProfileId(): Promise<string> {
    return getOrCreateSystemProfile({
        username: BN_SYSTEM_USERNAME,
        name: "Bozor Narxida",
        image: "/logos/bn.png",
    });
}
