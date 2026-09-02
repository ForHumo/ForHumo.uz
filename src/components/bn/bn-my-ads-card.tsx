"use client";

// BN sotuvchi o'z reklamalar analytics — impressions / clicks / CTR.
// Sotuvchi kabinetida ko'rinadi. GET /api/bn/ads (mine).

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Sparkles, Eye, MousePointerClick, Clock, Ban, Loader2, Plus } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";
import { BnAdBuyModal } from "./bn-ad-buy-modal";

interface MyAd {
    id: string;
    slot: number;
    imageUrl: string;
    title: string;
    ctaUrl: string;
    startsAt: string;
    expiresAt: string;
    active: boolean;
    hidden: boolean;
    daysCount: number;
    paidAmountUzs: number;
    impressions: number;
    clicks: number;
    isLive: boolean;
    moderationNote: string | null;
}

export function BnMyAdsCard() {
    const locale = useLocale();
    const [ads, setAds] = useState<MyAd[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [buyOpen, setBuyOpen] = useState(false);

    async function load() {
        try {
            const r = await fetch("/api/bn/ads");
            if (!r.ok) { setAds([]); return; }
            const d = await r.json();
            setAds(Array.isArray(d.banners) ? d.banners : []);
        } catch { setAds([]); }
        finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    if (loading) {
        return (
            <div className="rounded-2xl p-6 text-center" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <Loader2 className="w-5 h-5 animate-spin inline" style={{ color: BN.gold }} />
            </div>
        );
    }

    const totals = (ads ?? []).reduce((acc, a) => {
        acc.impressions += a.impressions;
        acc.clicks += a.clicks;
        acc.spent += a.paidAmountUzs;
        return acc;
    }, { impressions: 0, clicks: 0, spent: 0 });
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

    return (
        <>
            <div className="rounded-2xl p-5" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" style={{ color: BN.gold }} />
                        <h3 className="text-[16px] font-bold" style={{ color: BN.text }}>
                            {t("Mening reklamalarim", "Мои реклама", "My ads")}
                        </h3>
                    </div>
                    <button
                        onClick={() => setBuyOpen(true)}
                        className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-[12px] font-bold"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {t("Yangi reklama", "Новая реклама", "New ad")}
                    </button>
                </div>

                {ads && ads.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <StatCell
                            icon={<Eye className="w-4 h-4" />}
                            label={t("Ko'rilgan", "Показов", "Views")}
                            value={totals.impressions.toLocaleString()}
                        />
                        <StatCell
                            icon={<MousePointerClick className="w-4 h-4" />}
                            label={t("Bosishlar", "Кликов", "Clicks")}
                            value={totals.clicks.toLocaleString()}
                        />
                        <StatCell
                            icon={<span className="text-[12px] font-bold">%</span>}
                            label="CTR"
                            value={`${ctr.toFixed(2)}%`}
                            color={ctr >= 3 ? BN.ok : ctr >= 1 ? BN.gold : BN.text3}
                        />
                    </div>
                )}

                {ads && ads.length === 0 ? (
                    <div className="text-center py-8" style={{ color: BN.text3 }}>
                        <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <div className="text-[13px]">
                            {t(
                                "Hali reklamangiz yo'q. Bosh sahifadagi 5 slotga qo'shishingiz mumkin.",
                                "У вас пока нет реклам. Можете добавить в 5 слотов на главной.",
                                "You have no ads yet. Add to 5 slots on the home page.",
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {ads?.map(a => (
                            <div
                                key={a.id}
                                className="flex gap-3 p-3 rounded-xl"
                                style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}
                            >
                                <img src={a.imageUrl} alt={a.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[13px] font-semibold truncate" style={{ color: BN.text }}>
                                            {a.title}
                                        </span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: BN.surface, color: BN.text3 }}>
                                            SLOT {a.slot}
                                        </span>
                                        {a.hidden ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: BN.errSoft, color: BN.err }}>
                                                <Ban className="w-2.5 h-2.5" /> {t("Blok", "Блок", "Hidden")}
                                            </span>
                                        ) : a.isLive ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: BN.okSoft, color: BN.ok }}>
                                                LIVE
                                            </span>
                                        ) : (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: BN.surface, color: BN.text3 }}>
                                                <Clock className="w-2.5 h-2.5" /> {t("Tugagan", "Истек", "Ended")}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ color: BN.text3 }}>
                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.impressions.toLocaleString()}</span>
                                        <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{a.clicks.toLocaleString()}</span>
                                        <span>CTR {a.impressions > 0 ? ((a.clicks / a.impressions) * 100).toFixed(1) : "0"}%</span>
                                        <span className="ml-auto tabular-nums">{formatMoney(a.paidAmountUzs, "UZS")}</span>
                                    </div>
                                    <div className="mt-0.5 text-[10px]" style={{ color: BN.text3 }}>
                                        {new Date(a.startsAt).toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ")}
                                        {" — "}
                                        {new Date(a.expiresAt).toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ")}
                                    </div>
                                    {a.moderationNote && (
                                        <div className="mt-1 text-[11px]" style={{ color: BN.err }}>
                                            {t("Moderator izohi", "Модератор", "Moderator")}: {a.moderationNote}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <BnAdBuyModal open={buyOpen} onClose={() => setBuyOpen(false)} onSuccess={() => { setBuyOpen(false); load(); }} />
        </>
    );
}

function StatCell({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
    return (
        <div className="rounded-xl p-3" style={{ background: BN.surfaceUp }}>
            <div className="flex items-center gap-1 text-[11px]" style={{ color: BN.text3 }}>
                {icon}
                {label}
            </div>
            <div className="mt-1 text-[16px] font-bold tabular-nums" style={{ color: color ?? BN.text }}>
                {value}
            </div>
        </div>
    );
}
