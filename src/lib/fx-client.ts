// Client-side FX hook + narx formatlash.
"use client";

import { useEffect, useState } from "react";

export interface FxState { rate: number; updatedAt: number; source: string }

let cache: FxState | null = null;
let inflight: Promise<FxState> | null = null;

async function fetchFx(): Promise<FxState> {
    if (cache && Date.now() - cache.updatedAt < 5 * 60_000) return cache;
    if (inflight) return inflight;
    inflight = fetch("/api/fx/rate").then(r => r.json()).then((d: FxState) => {
        cache = d;
        inflight = null;
        return d;
    }).catch(() => {
        inflight = null;
        return { rate: 12900, updatedAt: Date.now(), source: "fallback" } as FxState;
    });
    return inflight;
}

/** Hook — birinchi renderdan keyin kurs keladi. Cache 5 daq. */
export function useFxRate(): FxState | null {
    const [fx, setFx] = useState<FxState | null>(cache);
    useEffect(() => {
        if (!fx) fetchFx().then(setFx);
    }, [fx]);
    return fx;
}

/** So'mni USDda referens ko'rsatish uchun ($1.23 shaklida). */
export function toUsdRef(uzs: number, rate: number): string {
    if (!rate || rate <= 0) return "";
    const usd = uzs / rate;
    if (usd < 0.01) return "";
    return `$${usd.toFixed(2)}`;
}
