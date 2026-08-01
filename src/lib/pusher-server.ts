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
