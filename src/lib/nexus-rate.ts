// Nexus yaratish endpointlari uchun oddiy DB-asosli tezlik cheklovi.
// Serverless'da in-memory ishonchsiz — oxirgi oynada yaratilgan yozuvlarni sanaymiz.
// true = cheklangan (429 qaytaring).

import { prisma } from "@/lib/prisma";

const MIN = 60_000;

type RateKind =
    | "post" | "comment" | "videoComment"
    | "video" | "track" | "story"
    | "dm" | "live" | "liveChat" | "tip" | "channel" | "channelMsg"
    | "payTransfer" | "payWithdraw";

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
    tip: [30, 10 * MIN],
    channel: [10, 60 * MIN],
    channelMsg: [60, 5 * MIN],
    payTransfer: [20, 10 * MIN],
    payWithdraw: [5, 60 * MIN],
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
            case "tip":
                count = await prisma.nexusTip.count({ where: { donorId: profileId, createdAt: { gt: since } } });
                break;
            case "channel":
                count = await prisma.nexusChannel.count({ where: { ownerId: profileId, createdAt: { gt: since } } });
                break;
            case "channelMsg":
                count = await prisma.nexusChannelMessage.count({ where: { senderId: profileId, createdAt: { gt: since } } });
                break;
            case "payTransfer":
                count = await prisma.zijTransaction.count({ where: { wallet: { profileId }, type: "TRANSFER_OUT", createdAt: { gt: since } } });
                break;
            case "payWithdraw":
                count = await prisma.payoutRequest.count({ where: { wallet: { profileId }, createdAt: { gt: since } } });
                break;
        }
    } catch {
        return false; // xato bo'lsa bloklamaymiz (fail-open)
    }
    return count >= max;
}

export const RATE_MSG = "Juda tez — biroz kutib, qayta urinib ko'ring";
