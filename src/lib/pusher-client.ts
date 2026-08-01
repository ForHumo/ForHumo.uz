// Pusher client SDK singleton. Env yo'q bo'lsa null — client polling fallback qiladi.
"use client";

import Pusher from "pusher-js";
import type { Channel } from "pusher-js";

let cached: Pusher | null | undefined;

export function getPusherClient(): Pusher | null {
    if (typeof window === "undefined") return null;
    if (cached !== undefined) return cached;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) {
        cached = null;
        return null;
    }
    cached = new Pusher(key, {
        cluster,
        authEndpoint: "/api/pusher/auth",
        forceTLS: true,
    });
    return cached;
}

export function isPusherClientEnabled(): boolean {
    return getPusherClient() !== null;
}

export function subscribeUserChannel(profileId: string): Channel | null {
    const p = getPusherClient();
    if (!p) return null;
    return p.subscribe(`private-user-${profileId}`);
}
