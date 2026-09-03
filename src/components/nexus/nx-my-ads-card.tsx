"use client";

// Nexus — o'z reklamalar analytics (impressions / clicks / CTR).
// /nexus/reklama sahifasida ko'rinadi. GET /api/nexus/ads (mine).

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Sparkles, Eye, MousePointerClick, Clock, Ban, Loader2, Plus, ExternalLink } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { NxAdBuyModal } from "./nx-ad-buy-modal";

interface MyAd {
    id: string;
    slot: number;
    imageUrl: string;
    title: string;
    body: string | null;
    ctaUrl: string;
    ctaText: string;
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

const NX_GRADIENT = "linear-gradient(135deg, #2B3EE8 0%, #6D28D9 50%, #EC4899 100%)";
const NX_BG = "rgba(255,255,255,0.05)";
const NX_BORDER = "rgba(255,255,255,0.10)";

export function NxMyAdsCard() {
    const locale = useLocale();
    const [ads, setAds] = useState<MyAd[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [buyOpen, setBuyOpen] = useState(false);

    async function load() {
        try {
            const r = await fetch("/api/nexus/ads");
            if (!r.ok) { setAds([]); return; }
            const d = await r.json();
            setAds(Array.isArray(d.ads) ? d.ads : []);
        } catch { setAds([]); }
        finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    if (loading) {
        return (
            <div className="rounded-3xl p-8 text-center" style={{ background: NX_BG, border: `1px solid ${NX_BORDER}` }}>
                <Loader2 className="w-6 h-6 animate-spin inline text-white/60" />
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
    const ctrColor = ctr >= 3 ? "#10b981" : ctr >= 1 ? "#F5B301" : "rgba(255,255,255,0.55)";

    return (
        <>
            <div className="rounded-3xl p-5 text-white" style={{ background: "#0a0f1e", border: `1px solid ${NX_BORDER}` }}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" style={{ color: "#EC4899" }} />
                        <h3 className="text-[16px] font-black">
                            {t("Mening reklamalarim", "Мои реклама", "My ads")}
                        </h3>
                    </div>
                    <button
                        onClick={() => setBuyOpen(true)}
                        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13px] font-black text-white"
                        style={{
                            background: NX_GRADIENT,
                            boxShadow: "0 6px 18px rgba(109,40,217,0.35)",
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        {t("Yangi reklama", "Новая реклама", "New ad")}
                    </button>
                </div>

                {ads && ads.length > 0 && (
                    <div className="grid grid-cols-3 gap-2.5 mb-4">
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
                            color={ctrColor}
                        />
                    </div>
                )}

                {ads && ads.length === 0 ? (
                    <div className="text-center py-10">
                        <span
                            className="w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-3"
                            style={{ background: NX_GRADIENT }}
                        >
                            <Sparkles className="w-8 h-8 text-white" />
                        </span>
                        <p className="text-[14px] font-black mb-1">
                            {t("Hali reklamangiz yo'q", "У вас пока нет реклам", "You have no ads yet")}
                        </p>
                        <p className="text-[12px] text-white/50 max-w-sm mx-auto">
                            {t(
                                "Feed'da 3 slot bor. Har 15 postdan keyin ko'rinadi.",
                                "В ленте 3 слота. Показывается каждые 15 постов.",
                                "3 slots in the feed. Shows every 15 posts.",
                            )}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {ads?.map(a => (
                            <div
                                key={a.id}
                                className="flex gap-3 p-3 rounded-2xl"
                                style={{ background: NX_BG, border: `1px solid ${NX_BORDER}` }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={a.imageUrl}
                                    alt={a.title}
                                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[13px] font-black truncate">{a.title}</span>
                                        <span
                                            className="text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider"
                                            style={{ background: NX_BG, color: "rgba(255,255,255,0.55)" }}
                                        >
                                            SLOT {a.slot}
                                        </span>
                                        {a.hidden ? (
                                            <span
                                                className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 font-black"
                                                style={{ background: "rgba(248,113,113,0.18)", color: "#f87171" }}
                                            >
                                                <Ban className="w-2.5 h-2.5" /> {t("Blok", "Блок", "Hidden")}
                                            </span>
                                        ) : a.isLive ? (
                                            <span
                                                className="text-[10px] px-1.5 py-0.5 rounded font-black"
                                                style={{ background: "rgba(16,185,129,0.18)", color: "#10b981" }}
                                            >
                                                LIVE
                                            </span>
                                        ) : (
                                            <span
                                                className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"
                                                style={{ background: NX_BG, color: "rgba(255,255,255,0.55)" }}
                                            >
                                                <Clock className="w-2.5 h-2.5" /> {t("Tugagan", "Истек", "Ended")}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex items-center gap-3 text-[11px] text-white/55">
                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{a.impressions.toLocaleString()}</span>
                                        <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{a.clicks.toLocaleString()}</span>
                                        <span>CTR {a.impressions > 0 ? ((a.clicks / a.impressions) * 100).toFixed(1) : "0"}%</span>
                                        <span className="ml-auto tabular-nums text-white">{formatMoney(a.paidAmountUzs, "UZS")}</span>
                                    </div>
                                    <div className="mt-0.5 text-[10px] text-white/40 flex items-center gap-2">
                                        <span>
                                            {new Date(a.startsAt).toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ")}
                                            {" — "}
                                            {new Date(a.expiresAt).toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ")}
                                        </span>
                                        <a
                                            href={a.ctaUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-0.5 text-white/60 hover:text-white truncate"
                                        >
                                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate max-w-[140px]">{a.ctaUrl.replace(/^https?:\/\//, "")}</span>
                                        </a>
                                    </div>
                                    {a.moderationNote && (
                                        <div
                                            className="mt-1.5 p-1.5 rounded-lg text-[11px] flex items-start gap-1"
                                            style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}
                                        >
                                            <Ban className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                            <span>{t("Moderator izohi", "Модератор", "Moderator")}: {a.moderationNote}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <NxAdBuyModal open={buyOpen} onClose={() => setBuyOpen(false)} onSuccess={() => { setBuyOpen(false); load(); }} />
        </>
    );
}

function StatCell({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
    return (
        <div className="rounded-xl p-3" style={{ background: NX_BG, border: `1px solid ${NX_BORDER}` }}>
            <div className="flex items-center gap-1 text-[11px] text-white/55">
                {icon}
                {label}
            </div>
            <div className="mt-1 text-[16px] font-black tabular-nums" style={{ color: color ?? "#fff" }}>
                {value}
            </div>
        </div>
    );
}
