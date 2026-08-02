"use client";

// Global presence — kim onlayn (Pusher presence-nexus kanali orqali).
// Har foydalanuvchi Nexus'ga kirganda subscribe qiladi. Boshqalar shu kanalga
// kirganida o'shalarning identity'sini oladi ("kim kelmoqda").
//
// Ishlatish:
//   const { onlineIds, isOnline, sendTyping, onTyping } = usePresence();
//   isOnline(profileId) → boolean

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { getPusherClient } from "./pusher-client";
import type { PresenceChannel } from "pusher-js";

interface PresenceMember {
    id: string;
    info: { name: string | null; username: string | null; image: string | null };
}

interface TypingEvent {
    fromId: string;
    fromName: string | null;
    toId: string;      // qaysi foydalanuvchiga qaratilgan
}

let cachedChannel: PresenceChannel | null = null;

// Yagona kanal — bir marta subscribe qilinadi
function getPresenceChannel(): PresenceChannel | null {
    const p = getPusherClient();
    if (!p) return null;
    if (cachedChannel) return cachedChannel;
    cachedChannel = p.subscribe("presence-nexus") as PresenceChannel;
    return cachedChannel;
}

export function usePresence() {
    const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
    const listenersRef = useRef<Set<(e: TypingEvent) => void>>(new Set());

    useEffect(() => {
        const ch = getPresenceChannel();
        if (!ch) return;

        const onSubscriptionSucceeded = () => {
            const ids = new Set<string>();
            ch.members.each((m: PresenceMember) => ids.add(m.id));
            setOnlineIds(ids);
        };
        const onAdded = (member: PresenceMember) => {
            setOnlineIds(prev => {
                const next = new Set(prev);
                next.add(member.id);
                return next;
            });
        };
        const onRemoved = (member: PresenceMember) => {
            setOnlineIds(prev => {
                const next = new Set(prev);
                next.delete(member.id);
                return next;
            });
        };
        const onTyping = (data: TypingEvent) => {
            listenersRef.current.forEach(fn => fn(data));
        };

        ch.bind("pusher:subscription_succeeded", onSubscriptionSucceeded);
        ch.bind("pusher:member_added", onAdded);
        ch.bind("pusher:member_removed", onRemoved);
        ch.bind("client-typing", onTyping);

        // Agar kanal allaqachon subscribed bo'lsa (yana subscribe qilinsa) — hozirgi holatni olamiz
        if ((ch as unknown as { subscribed?: boolean }).subscribed) {
            onSubscriptionSucceeded();
        }

        return () => {
            ch.unbind("pusher:subscription_succeeded", onSubscriptionSucceeded);
            ch.unbind("pusher:member_added", onAdded);
            ch.unbind("pusher:member_removed", onRemoved);
            ch.unbind("client-typing", onTyping);
        };
    }, []);

    const isOnline = useCallback((profileId: string) => onlineIds.has(profileId), [onlineIds]);

    const sendTyping = useCallback((toId: string, fromId: string, fromName: string | null) => {
        const ch = getPresenceChannel();
        if (!ch) return;
        try {
            ch.trigger("client-typing", { fromId, fromName, toId });
        } catch { /* Pusher client-event faqat presence/private kanalda ishlaydi — fail-safe */ }
    }, []);

    const onTyping = useCallback((handler: (e: TypingEvent) => void) => {
        listenersRef.current.add(handler);
        return () => { listenersRef.current.delete(handler); };
    }, []);

    return useMemo(() => ({ onlineIds, isOnline, sendTyping, onTyping }), [onlineIds, isOnline, sendTyping, onTyping]);
}
