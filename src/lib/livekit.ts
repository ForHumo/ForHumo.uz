// LiveKit server SDK wrapper. Env yo'q bo'lsa null qaytaradi.
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export interface LiveKitConfig { url: string; apiKey: string; apiSecret: string }

export function getLiveKitConfig(): LiveKitConfig | null {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!url || !apiKey || !apiSecret) return null;
    return { url, apiKey, apiSecret };
}

export function isLiveKitEnabled(): boolean { return getLiveKitConfig() !== null; }

/** Ishtirokchi uchun ulanish tokeni yaratish. */
export async function createLiveKitToken(opts: {
    roomName: string;
    identity: string;             // UserProfile.id
    name?: string;                // ekranda ko'rinadigan ism
    canPublish?: boolean;         // default true
    canSubscribe?: boolean;       // default true
    ttlHours?: number;            // default 6
}): Promise<string | null> {
    const cfg = getLiveKitConfig();
    if (!cfg) return null;
    const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
        identity: opts.identity,
        name: opts.name,
        ttl: `${opts.ttlHours ?? 6}h`,
    });
    at.addGrant({
        roomJoin: true,
        room: opts.roomName,
        canPublish: opts.canPublish ?? true,
        canSubscribe: opts.canSubscribe ?? true,
    });
    return await at.toJwt();
}

/** Xonani majburiy o'chirish (host tugatganda). */
export async function deleteLiveKitRoom(roomName: string): Promise<void> {
    const cfg = getLiveKitConfig();
    if (!cfg) return;
    // ws:// → http:// / wss:// → https:// (RoomServiceClient HTTP endpoint kutadi)
    const httpUrl = cfg.url.replace(/^ws/, "http");
    const svc = new RoomServiceClient(httpUrl, cfg.apiKey, cfg.apiSecret);
    await svc.deleteRoom(roomName).catch(() => { });
}
