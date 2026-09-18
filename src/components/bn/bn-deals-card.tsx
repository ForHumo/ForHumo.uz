"use client";

// "Kelishilgan narxlarim" — xaridor sotuvchi bilan kelishgan narxlar (48s band).
// Kabinet MoneyTab'da. Kelishuv yo'q bo'lsa yashirin.

import { useEffect, useState } from "react";
import { Handshake, Clock, ChevronRight } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

interface Deal {
    id: string;
    productSlug: string;
    title: string;
    image: string | null;
    listPrice: number;
    agreedPrice: number;
    available: boolean;
    shopSlug: string;
    shopName: string;
    expiresAt: string;
}

function remaining(expiresAt: string): string {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "tugadi";
    const h = Math.floor(ms / 3600_000);
    const m = Math.floor((ms % 3600_000) / 60_000);
    if (h >= 1) return `${h} soat ${m} daq`;
    return `${m} daqiqa`;
}

export function BnDealsCard() {
    const [deals, setDeals] = useState<Deal[] | null>(null);
    const [, force] = useState(0);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await fetch("/api/bn/deals");
                const d = await r.json();
                if (alive) setDeals((d.deals ?? []) as Deal[]);
            } catch { if (alive) setDeals([]); }
        })();
        // countdown yangilanishi uchun har daqiqa re-render
        const id = setInterval(() => force(x => x + 1), 60_000);
        return () => { alive = false; clearInterval(id); };
    }, []);

    if (!deals || deals.length === 0) return null;

    return (
        <div className="rounded-2xl p-4 mb-4" style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
            <div className="flex items-center gap-2 mb-3">
                <Handshake className="w-[18px] h-[18px]" style={{ color: BN.gold }} />
                <h3 className="text-[15px] font-black">Kelishilgan narxlarim</h3>
                <span className="ml-auto text-[12px] font-bold" style={{ color: BN.gold }}>{deals.length}</span>
            </div>

            <div className="space-y-2">
                {deals.map(d => {
                    const rem = remaining(d.expiresAt);
                    const expired = rem === "tugadi";
                    return (
                        <BnLink
                            key={d.id}
                            href={`/d/${d.shopSlug}/${d.productSlug}`}
                            className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:opacity-90"
                            style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}
                        >
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: BN.surface }}>
                                {d.image && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={d.image} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-bold truncate">{d.title}</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-black tabular-nums" style={{ color: BN.gold }}>
                                        {d.agreedPrice.toLocaleString("uz-UZ")} so&apos;m
                                    </span>
                                    {d.listPrice > d.agreedPrice && (
                                        <span className="text-[11px] line-through tabular-nums" style={{ color: BN.text3 }}>
                                            {d.listPrice.toLocaleString("uz-UZ")}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: expired ? BN.err : BN.text3 }}>
                                    <Clock className="w-3 h-3" />
                                    {expired ? "Muddati tugadi" : !d.available ? "Mahsulot mavjud emas" : `${rem} qoldi`}
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
                        </BnLink>
                    );
                })}
            </div>
        </div>
    );
}
