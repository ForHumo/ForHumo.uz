"use client";

// /dokonlar sahifasi — tier chip filtri + do'konlar ro'yxati.
// URL ?tier=verified bilan sinxron, dinamik SEO uchun.

import { useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { BN, TIER_META } from "@/lib/bn-theme";
import { BnShopsRanked } from "./bn-sections";
import type { BnShopDTO } from "@/lib/bn-data";

type Tier = "NEW" | "TRUSTED" | "VERIFIED" | "PREMIUM";
const TIERS: Tier[] = ["TRUSTED", "VERIFIED", "PREMIUM"];   // "NEW" default (barcha yangi do'konlar) — filtrga kirmasin

export function BnShopsWithFilter({ shops }: { shops: BnShopDTO[] }) {
    const t = useTranslations("bn.shops");
    const sp = useSearchParams();
    const router = useRouter();
    const path = usePathname();
    const active = (sp.get("tier") ?? "").toUpperCase() as Tier | "";

    const counts = useMemo(() => {
        const m: Record<Tier, number> = { NEW: 0, TRUSTED: 0, VERIFIED: 0, PREMIUM: 0 };
        for (const s of shops) m[s.tier as Tier] = (m[s.tier as Tier] ?? 0) + 1;
        return m;
    }, [shops]);

    const filtered = useMemo(() => {
        if (!active || !TIERS.includes(active as Tier)) return shops;
        return shops.filter(s => s.tier === active);
    }, [shops, active]);

    function selectTier(tier: string) {
        const params = new URLSearchParams(sp.toString());
        if (tier) params.set("tier", tier.toLowerCase());
        else params.delete("tier");
        const qs = params.toString();
        router.push(qs ? `${path}?${qs}` : path, { scroll: false });
    }

    return (
        <div>
            {/* Tier chiplari — hech qanday tanlangan tier bo'lmasa "Barchasi" active */}
            <div className="mx-auto max-w-[1280px] px-4 pt-6 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
                data-no-swipe>
                <button onClick={() => selectTier("")}
                    className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold flex-shrink-0 transition-colors"
                    style={{
                        background: active === "" ? BN.gold : BN.surface,
                        color: active === "" ? BN.onGold : BN.text2,
                        border: `1px solid ${active === "" ? BN.gold : BN.border}`,
                    }}>
                    {t("allTiers")}
                    <span className="tabular-nums opacity-70">{shops.length}</span>
                </button>
                {TIERS.map(tier => {
                    const n = counts[tier] ?? 0;
                    if (n === 0) return null;
                    const isActive = active === tier;
                    const meta = TIER_META[tier];
                    return (
                        <button key={tier} onClick={() => selectTier(tier)}
                            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold flex-shrink-0 transition-colors"
                            style={{
                                background: isActive ? meta.color : BN.surface,
                                color: isActive ? "#000" : BN.text2,
                                border: `1px solid ${isActive ? meta.color : BN.border}`,
                            }}>
                            <ShieldCheck className="w-3 h-3" style={{ color: isActive ? "#000" : meta.color }} />
                            {meta.label}
                            <span className="tabular-nums opacity-70">{n}</span>
                        </button>
                    );
                })}
            </div>

            <BnShopsRanked shops={filtered} />
        </div>
    );
}
