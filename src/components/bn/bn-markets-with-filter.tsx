"use client";

// /bozorlar sahifasi — tuman chip filtri + bozorlar ro'yxati.
// Tumanlar server tomondan hisoblanadi (distinct district BnMarket'dan),
// URL ?tuman=chilonzor bilan sinxronlashadi (SEO + navigation state).

import { useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnMarketsList } from "./bn-catalog";
import type { BnMarketDTO } from "@/lib/bn-data";

interface Props {
    markets: BnMarketDTO[];
    districts: string[];   // ["Chilonzor", "Sergeli", ...] — bo'sh bo'lmasligi kerak
}

function slugifyDistrict(d: string): string {
    return d.toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "");
}

export function BnMarketsWithFilter({ markets, districts }: Props) {
    const t = useTranslations("bn.markets");
    const sp = useSearchParams();
    const router = useRouter();
    const path = usePathname();
    const activeSlug = sp.get("tuman") ?? "";

    const districtOptions = useMemo(() => {
        return districts.map(d => ({ slug: slugifyDistrict(d), name: d }));
    }, [districts]);

    const filtered = useMemo(() => {
        if (!activeSlug) return markets;
        const activeName = districtOptions.find(o => o.slug === activeSlug)?.name;
        if (!activeName) return markets;
        return markets.filter(m => (m.district || "Toshkent") === activeName);
    }, [markets, districtOptions, activeSlug]);

    function selectTuman(slug: string) {
        const params = new URLSearchParams(sp.toString());
        if (slug) params.set("tuman", slug);
        else params.delete("tuman");
        const qs = params.toString();
        router.push(qs ? `${path}?${qs}` : path, { scroll: false });
    }

    // Tuman chiplari — sarlavha ostida (BnMarketsList `filter` slot'i).
    // sm+ da qatorlarga o'raladi: ilgari desktop'da 2000px+ qator yashirin scrollbar bilan
    // kesilib, oxirgi tumanlarga sichqoncha bilan yetib bo'lmasdi. Mobil'da gorizontal
    // scroll qoladi — ekran chetigacha cho'zilgan, chetlari xiralashgan (davomi borligi ko'rinsin).
    const chips = districtOptions.length > 0 && (
        <div
            className="-mx-4 px-4 mb-6 flex items-center gap-1.5 overflow-x-auto no-scrollbar [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-16px),transparent)] sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible sm:[mask-image:none]"
            data-no-swipe>
            <button onClick={() => selectTuman("")}
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold flex-shrink-0 transition-colors"
                style={{
                    background: activeSlug === "" ? BN.gold : BN.surface,
                    color: activeSlug === "" ? BN.onGold : BN.text2,
                    border: `1px solid ${activeSlug === "" ? BN.gold : BN.border}`,
                }}>
                {t("allTumans")}
                <span className="tabular-nums opacity-70">{markets.length}</span>
            </button>
            {districtOptions.map(o => {
                const active = activeSlug === o.slug;
                const count = markets.filter(m => (m.district || "Toshkent") === o.name).length;
                if (count === 0) return null;
                return (
                    <button key={o.slug} onClick={() => selectTuman(o.slug)}
                        className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[12.5px] font-bold flex-shrink-0 transition-colors"
                        style={{
                            background: active ? BN.gold : BN.surface,
                            color: active ? BN.onGold : BN.text2,
                            border: `1px solid ${active ? BN.gold : BN.border}`,
                        }}>
                        <MapPin className="w-3 h-3" />
                        {o.name}
                        <span className="tabular-nums opacity-70">{count}</span>
                    </button>
                );
            })}
        </div>
    );

    return <BnMarketsList markets={filtered} filter={chips || undefined} />;
}
