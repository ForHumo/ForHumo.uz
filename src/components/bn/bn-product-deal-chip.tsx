"use client";

// Mahsulot sahifasida "Siz kelishgan narx" banneri — xaridor bu mahsulot bo'yicha
// sotuvchi bilan kelishgan bo'lsa ko'rinadi (checkout shu narxni qo'llaydi).
// Kelishuv yo'q bo'lsa yashirin.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Handshake, Clock } from "lucide-react";
import { BN, groupThousands } from "@/lib/bn-theme";

interface Deal { productSlug: string; agreedPrice: number; listPrice: number; expiresAt: string }

export function BnProductDealChip({ productSlug }: { productSlug: string }) {
    const t = useTranslations("bn.product");
    const [deal, setDeal] = useState<Deal | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await fetch("/api/bn/deals");
                if (!r.ok) return;
                const d = await r.json();
                const found = (d.deals ?? []).find((x: Deal) => x.productSlug === productSlug);
                if (alive && found) setDeal(found);
            } catch { /* jim */ }
        })();
        return () => { alive = false; };
    }, [productSlug]);

    if (!deal) return null;

    const ms = new Date(deal.expiresAt).getTime() - Date.now();
    const h = Math.max(0, Math.floor(ms / 3600_000));
    const m = Math.max(0, Math.floor((ms % 3600_000) / 60_000));
    const rem = h >= 1 ? t("deal.hours", { n: h }) : t("deal.minutes", { n: m });

    return (
        <div className="rounded-xl px-3.5 py-3 mb-3" style={{ background: BN.goldSoft, border: `1px solid ${BN.borderGold}` }}>
            <div className="flex items-center gap-2 mb-1">
                <Handshake className="w-4 h-4" style={{ color: BN.gold }} />
                <span className="text-[12px] font-black uppercase tracking-wider" style={{ color: BN.gold }}>{t("deal.title")}</span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-[20px] font-black tabular-nums" style={{ color: BN.gold }}>
                    {groupThousands(deal.agreedPrice)} {t("currencySom")}
                </span>
                {deal.listPrice > deal.agreedPrice && (
                    <span className="text-[13px] line-through tabular-nums" style={{ color: BN.text3 }}>
                        {groupThousands(deal.listPrice)}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1 text-[11.5px] mt-1" style={{ color: BN.text2 }}>
                <Clock className="w-3.5 h-3.5" />
                {ms <= 0 ? t("deal.expired") : t("deal.heldFor", { time: rem })}
            </div>
        </div>
    );
}
