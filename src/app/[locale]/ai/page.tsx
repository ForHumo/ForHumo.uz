"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

/**
 * Humo AI — integrated with Humo ID
 *
 * Strategy: the ai-static app reads its profile from
 * localStorage["humo_profile"]. Since both are same-origin,
 * we write the real session data to that key BEFORE rendering
 * the iframe. The AI app boots up already knowing the real user.
 */
export default function AIPage() {
    const { data: session } = useSession();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!session?.user) return;

        const u = session.user as {
            name?:          string | null;
            email?:         string | null;
            image?:         string | null;
            humoId?:        string | null;
            username?:      string | null;
            onboardingDone?: boolean;
        };

        // Build the profile object the AI app expects
        const profile = {
            name:      u.name ?? u.username ?? "Foydalanuvchi",
            username:  u.username ?? "",          // stored separately for @handle display
            email:     u.email ?? "",
            humoId:    u.humoId ?? "",
            avatar:    u.image ?? "",             // Google profile photo URL
            joinedAt:  new Date().toISOString().slice(0, 10),
            // lock flag — ai-static edit form won't persist over this
            _humoIdLinked: true,
        };

        try {
            localStorage.setItem("humo_profile", JSON.stringify(profile));
        } catch {
            // localStorage blocked (private mode) — still show the iframe
        }

        setReady(true);
    }, [session]);

    // AuthBarrier (in layout.tsx) already handles loading + sign-in screens.
    // Here we just wait for the localStorage write to complete.
    if (!ready) return null;

    return (
        <iframe
            key="ai-frame"
            src="/ai-static/"
            style={{
                position: "fixed",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
                zIndex: 9999,
            }}
            allow="microphone; camera"
        />
    );
}
