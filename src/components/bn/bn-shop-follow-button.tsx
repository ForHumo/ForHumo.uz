"use client";

// Do'konga obuna tugmasi (shop page header).

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2, Check } from "lucide-react";
import { BN } from "@/lib/bn-theme";

export function BnShopFollowButton({ shopSlug }: { shopSlug: string }) {
    const [following, setFollowing] = useState(false);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const r = await fetch(`/api/bn/shops/${shopSlug}/follow`, { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setFollowing(!!j.following);
                setCount(j.count ?? 0);
            }
        } finally { setLoading(false); }
    }, [shopSlug]);

    useEffect(() => { void load(); }, [load]);

    const toggle = useCallback(async () => {
        setBusy(true);
        try {
            const r = await fetch(`/api/bn/shops/${shopSlug}/follow`, {
                method: following ? "DELETE" : "POST",
            });
            if (r.status === 401) {
                window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`;
                return;
            }
            if (r.ok) {
                const wasFollowing = following;
                setFollowing(!wasFollowing);
                setCount(c => c + (wasFollowing ? -1 : 1));
            }
        } finally { setBusy(false); }
    }, [shopSlug, following]);

    if (loading) {
        return (
            <div className="h-8 w-24 rounded-lg animate-pulse" style={{ background: BN.surfaceUp }} />
        );
    }

    return (
        <button
            onClick={toggle}
            disabled={busy}
            className="h-8 px-3 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5 transition-colors"
            style={{
                background: following ? BN.surfaceUp : BN.gold,
                color: following ? BN.text2 : BN.onGold,
                border: following ? `1px solid ${BN.border}` : "none",
                opacity: busy ? 0.6 : 1,
            }}
        >
            {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : following ? (
                <><Check className="w-3.5 h-3.5" /> Obuna</>
            ) : (
                <><Bell className="w-3.5 h-3.5" /> Obuna bo&apos;lish</>
            )}
            {count > 0 && (
                <span className="text-[10px] opacity-70">{count}</span>
            )}
        </button>
    );
}
