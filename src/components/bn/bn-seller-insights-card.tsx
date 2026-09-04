"use client";

// Sotuvchi kabinet Home tab'da AI tavsiya + tahlil ochish tugma.
// Kichik oldindan ko'rish (1 ta tavsiya) + "Batafsil tahlil" havolasi.

import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";

interface InsightPreview {
    id: string;
    firstItem?: { title: string; body?: string };
    summary?: string | null;
    count: number;
}

interface AnalyticsMini {
    summary: { staleCount: number; totalOrders: number; totalRevenue: number };
    insight: {
        id: string;
        items: { title: string; body?: string }[];
        aiSummary: string | null;
        seen: boolean;
    } | null;
}

export function BnSellerInsightsCard() {
    const [data, setData] = useState<AnalyticsMini | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        fetch("/api/bn/seller/analytics", { cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .then(j => { if (alive && j) setData(j); })
            .catch(() => {})
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, []);

    if (loading) {
        return (
            <div className="rounded-2xl p-4 mb-4 flex items-center gap-2"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: BN.gold }} />
                <span className="text-[12px]" style={{ color: BN.text3 }}>AI tavsiya yuklanmoqda…</span>
            </div>
        );
    }

    if (!data) return null;

    const preview: InsightPreview | null = data.insight && data.insight.items[0] ? {
        id: data.insight.id,
        firstItem: data.insight.items[0],
        summary: data.insight.aiSummary,
        count: data.insight.items.length,
    } : null;

    return (
        <div className="space-y-3 mb-6">
            {/* AI tavsiya preview */}
            {preview && (
                <BnLink href="/sotuvchi/tahlil"
                    className="block rounded-2xl p-4 hover:brightness-95 transition"
                    style={{
                        background: `linear-gradient(135deg, ${BN.goldSoft} 0%, ${BN.surface} 60%)`,
                        border: `1px solid ${BN.borderGold}`,
                    }}>
                    <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                            style={{ background: BN.gold, color: BN.onGold }}>
                            <Sparkles className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[13px] font-black" style={{ color: BN.text }}>AI tavsiya</p>
                                <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black uppercase"
                                    style={{ background: BN.gold, color: BN.onGold }}>
                                    {preview.count} yangi
                                </span>
                            </div>
                            <p className="text-[13px] font-bold line-clamp-2" style={{ color: BN.text }}>
                                {preview.firstItem?.title}
                            </p>
                            {preview.firstItem?.body && (
                                <p className="text-[12px] mt-0.5 line-clamp-1" style={{ color: BN.text2 }}>
                                    {preview.firstItem.body}
                                </p>
                            )}
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0 self-center" style={{ color: BN.gold }} />
                    </div>
                </BnLink>
            )}

            {/* Sotilmagan ogohlantirish */}
            {data.summary.staleCount > 0 && (
                <BnLink href="/sotuvchi/tahlil"
                    className="block rounded-2xl p-3.5 hover:brightness-95 transition"
                    style={{ background: BN.errSoft, border: `1px solid ${BN.err}` }}>
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: BN.err }} />
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-black" style={{ color: BN.err }}>
                                {data.summary.staleCount} ta mahsulot 30+ kun sotilmagan
                            </p>
                            <p className="text-[11.5px]" style={{ color: BN.text2 }}>
                                Chegirma qiling yoki rasm/nomni yangilang
                            </p>
                        </div>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.err }} />
                    </div>
                </BnLink>
            )}

            {/* Tahlil ochish */}
            <BnLink href="/sotuvchi/tahlil"
                className="flex items-center gap-3 p-4 rounded-2xl hover:brightness-95 transition"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <span className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}>
                    <TrendingUp className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-black" style={{ color: BN.text }}>Tahlil va reytinglar</p>
                    <p className="text-[11.5px]" style={{ color: BN.text3 }}>
                        Eng ko'p sotilgan, kam sotilgan, sotilmagan mahsulotlar
                    </p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
            </BnLink>
        </div>
    );
}
