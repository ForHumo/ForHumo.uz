// Nexus yaratish endpointlari uchun oddiy DB-asosli tezlik cheklovi.
// Serverless'da in-memory ishonchsiz — oxirgi oynada yaratilgan yozuvlarni sanaymiz.
// true = cheklangan (429 qaytaring).

import { prisma } from "@/lib/prisma";

const MIN = 60_000;

type RateKind =
    | "post" | "comment" | "videoComment"
    | "video" | "track" | "story"
    | "dm" | "live" | "liveChat";

// kind -> [maks. son, oyna ms]
const RULES: Record<RateKind, [number, number]> = {
    post: [20, 10 * MIN],
    comment: [30, 10 * MIN],
    videoComment: [30, 10 * MIN],
    video: [10, 60 * MIN],
    track: [10, 60 * MIN],
    story: [20, 60 * MIN],
    dm: [60, 10 * MIN],
    live: [6, 60 * MIN],
    liveChat: [40, 5 * MIN],
};

export async function nexusRateLimited(profileId: string, kind: RateKind): Promise<boolean> {
    const [max, windowMs] = RULES[kind];
    const since = new Date(Date.now() - windowMs);
    let count = 0;
    try {
        switch (kind) {
            case "post":
                count = await prisma.nexusPost.count({ where: { profileId, createdAt: { gt: since } } });
                break;
            case "comment":
                count = await prisma.nexusComment.count({ where: { profileId, createdAt: { gt: since } } });
                break;
            case "videoComment":
                count = await prisma.nexusVideoComment.count({ where: { profileId, createdAt: { gt: since } } });
                break;
            case "video":
                count = await prisma.nexusVideo.count({ where: { profileId, createdAt: { gt: since } } });
                break;
            case "track":
                count = await prisma.nexusTrack.count({ where: { profileId, createdAt: { gt: since } } });
                break;
            case "story":
                count = await prisma.nexusStory.count({ where: { profileId, createdAt: { gt: since } } });
                break;
            case "dm":
                count = await prisma.nexusMessage.count({ where: { senderId: profileId, createdAt: { gt: since } } });
                break;
            case "live":
                count = await prisma.nexusLiveStream.count({ where: { profileId, createdAt: { gt: since } } });
                break;
            case "liveChat":
                count = await prisma.nexusLiveMessage.count({ where: { profileId, createdAt: { gt: since } } });
                break;
        }
    } catch {
        return false; // xato bo'lsa bloklamaymiz (fail-open)
    }
    return count >= max;
}

export const RATE_MSG = "Juda tez — biroz kutib, qayta urinib ko'ring";
