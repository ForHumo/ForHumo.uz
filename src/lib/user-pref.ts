// Foydalanuvchi displey sozlamalarini olish uchun kichik hook (bir marta fetch, cache).
"use client";

import { useEffect, useState } from "react";

interface Pref { showUsdRef: boolean }

let cache: Pref | null = null;
let inflight: Promise<Pref> | null = null;

async function fetchPref(): Promise<Pref> {
    if (cache) return cache;
    if (inflight) return inflight;
    inflight = fetch("/api/user/profile").then(r => r.ok ? r.json() : null).then((p: { showUsdRef?: boolean } | null) => {
        cache = { showUsdRef: !!p?.showUsdRef };
        inflight = null;
        return cache;
    }).catch(() => {
        cache = { showUsdRef: false };
        inflight = null;
        return cache;
    });
    return inflight;
}

export function useShowUsdRef(): boolean {
    const [pref, setPref] = useState<Pref | null>(cache);
    useEffect(() => {
        if (!pref) fetchPref().then(setPref);
    }, [pref]);
    return pref?.showUsdRef ?? false;
}

/** Session'da o'zgargan pref'ni tozalash (sozlamada saqlangach). */
export function invalidateUserPref(): void { cache = null; }
