// Pusher server SDK — chaqiruv signaling uchun. Env yo'q bo'lsa null qaytaradi.
import Pusher from "pusher";

let cached: Pusher | null | undefined;

export function getPusher(): Pusher | null {
    if (cached !== undefined) return cached;
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!appId || !key || !secret || !cluster) {
        cached = null;
        return null;
    }
    cached = new Pusher({ appId, key, secret, cluster, useTLS: true });
    return cached;
}

export function isPusherEnabled(): boolean {
    return getPusher() !== null;
}

/** Foydalanuvchining shaxsiy kanal nomi (private-user-<humoProfileId>). */
export function userChannel(profileId: string): string {
    return `private-user-${profileId}`;
}

/** Signal turi — chaqiruv boshqaruvi + WebRTC signal'lar bir kanalda uchraydi. */
export type NxCallEvent =
    | "call:incoming"     // yangi RINGING chaqiruv (callee'ga)
    | "call:accepted"     // callee accept qildi (caller'ga)
    | "call:rejected"     // rejected (caller'ga)
    | "call:ended"        // peer end qildi (ikkalasiga)
    | "signal:offer"      // WebRTC offer
    | "signal:answer"     // WebRTC answer
    | "signal:ice";       // WebRTC ICE candidate

/** DM / kanal xabar hodisalari — foydalanuvchining private-user-<id> kanaliga triggerlanadi. */
export type NxMsgEvent =
    | "nx:msg:new"        // yangi xabar (DM yoki kanal)
    | "nx:msg:edit"       // xabar tahrirlandi
    | "nx:msg:delete"     // xabar o'chirildi
    | "nx:msg:read"       // suhbat o'qildi (peerReadAt yangilandi)
    | "nx:msg:delivered"  // xabar yetkazildi (per-message tick)
    | "nx:msg:reaction"   // reaksiya qo'shildi/olib tashlandi
    | "nx:conv:updated";  // suhbat metadata (pin/archive/mute)

// Non-blocking Pusher trigger — xato bo'lsa silent (asilib qolmasin).
export async function pusherTrigger(
    channel: string,
    event: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
): Promise<void> {
    const p = getPusher();
    if (!p) return;
    try {
        await p.trigger(channel, event, data);
    } catch {
        // Fail-safe — real-time xato foydalanuvchini bloklamaydi
    }
}
