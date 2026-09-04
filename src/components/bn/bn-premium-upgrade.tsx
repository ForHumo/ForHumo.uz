"use client";

// BN Premium tier obuna kartochkasi — sotuvchi kabinetida.
// 4 ta tier: Bronze/Silver/Gold/Platinum. Har birining narxi + xususiyatlari.
// Sotib olish Wallet'dan pul yechadi.

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Crown, Loader2, CheckCircle2, X, Star, Trophy, Medal, Award, Gem } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";

type Tier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

interface TierInfo {
    tier: Tier;
    priceMonthly: number;
    meta: { name: string; nameRu: string; nameEn: string; color: string };
}

interface PremiumData {
    shop: { id: string; name: string };
    current: { tier: Tier | null; endsAt: string | null; active: boolean };
    tiers: TierInfo[];
}

const TIER_ICON: Record<Tier, typeof Medal> = {
    BRONZE: Medal,
    SILVER: Award,
    GOLD: Trophy,
    PLATINUM: Gem,
};

const TIER_FEATURES: Record<Tier, { uz: string[]; ru: string[]; en: string[] }> = {
    BRONZE: {
        uz: ["Bronza badge", "Kabinetda statistika", "Bepul 1 boost 24 soat/oy"],
        ru: ["Бронзовый значок", "Статистика в кабинете", "1 бесплатный буст 24ч/мес"],
        en: ["Bronze badge", "Cabinet analytics", "1 free 24h boost/month"],
    },
    SILVER: {
        uz: ["Kumush badge", "Bronza + kengaytirilgan statistika", "3 bepul boost 24 soat/oy", "Do'kon top-10'da"],
        ru: ["Серебряный значок", "Бронза + расширенная статистика", "3 бесплатных буста/мес", "Магазин в топ-10"],
        en: ["Silver badge", "Bronze + advanced analytics", "3 free 24h boosts/month", "Shop in top-10"],
    },
    GOLD: {
        uz: ["Oltin badge", "Silver + AI narx tavsiyasi", "10 bepul boost/oy", "Bosh sahifada uy-do'kon", "Priority support"],
        ru: ["Золотой значок", "Silver + AI-рекомендации цен", "10 бесплатных бустов/мес", "На главной", "Приоритетная поддержка"],
        en: ["Gold badge", "Silver + AI price hints", "10 free boosts/month", "Home page feature", "Priority support"],
    },
    PLATINUM: {
        uz: ["Platina badge", "Gold + brend sahifa", "Cheksiz boost", "Ekskluziv ma'lumot", "Shaxsiy hisob menejeri"],
        ru: ["Платиновый значок", "Gold + брендовая страница", "Безлимитный буст", "Эксклюзивные данные", "Персональный менеджер"],
        en: ["Platinum badge", "Gold + branded page", "Unlimited boosts", "Exclusive data", "Personal account manager"],
    },
};

export function BnPremiumUpgrade() {
    const locale = useLocale();
    const [data, setData] = useState<PremiumData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
    const [months, setMonths] = useState(1);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    async function loadData() {
        try {
            const r = await fetch("/api/bn/shop/premium");
            if (!r.ok) { setData(null); return; }
            setData(await r.json());
        } catch { setData(null); }
        finally { setLoading(false); }
    }
    useEffect(() => { loadData(); }, []);

    async function subscribe() {
        if (!selectedTier) return;
        setBusy(true); setErr(null);
        try {
            const r = await fetch("/api/bn/shop/premium", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tier: selectedTier, months }),
            });
            const d = await r.json();
            if (!r.ok) {
                setErr(d?.error === "insufficient_balance"
                    ? t("Hamyonda pul yetmadi", "Недостаточно средств", "Insufficient balance")
                    : t("Xatolik", "Ошибка", "Error"));
                return;
            }
            setDone(true);
            setTimeout(() => { setSelectedTier(null); setDone(false); loadData(); }, 1500);
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl p-6 text-center" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <Loader2 className="w-5 h-5 animate-spin inline" style={{ color: BN.gold }} />
            </div>
        );
    }
    if (!data) return null;

    return (
        <div className="rounded-2xl p-5" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5" style={{ color: BN.gold }} fill="currentColor" />
                <h3 className="text-[16px] font-bold" style={{ color: BN.text }}>
                    {t("Premium obuna", "Премиум подписка", "Premium subscription")}
                </h3>
            </div>

            {data.current.active && data.current.tier && (
                <div className="mb-4 p-3 rounded-xl flex items-center gap-3" style={{ background: BN.okSoft }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: BN.ok }} />
                    <div>
                        <div className="text-[13px] font-semibold" style={{ color: BN.ok }}>
                            {data.current.tier} — {t("aktiv", "активна", "active")}
                        </div>
                        <div className="text-[11px]" style={{ color: BN.text3 }}>
                            {t("Tugash", "Окончание", "Ends")}: {data.current.endsAt ? new Date(data.current.endsAt).toLocaleDateString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ") : "—"}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                {data.tiers.map(tier => {
                    const Icon = TIER_ICON[tier.tier];
                    const features = TIER_FEATURES[tier.tier];
                    const isCurrent = data.current.active && data.current.tier === tier.tier;
                    const label = locale === "ru" ? tier.meta.nameRu : locale === "en" ? tier.meta.nameEn : tier.meta.name;
                    const featureList = locale === "ru" ? features.ru : locale === "en" ? features.en : features.uz;
                    return (
                        <div
                            key={tier.tier}
                            className="rounded-xl p-4 flex flex-col gap-2"
                            style={{
                                background: isCurrent ? tier.meta.color + "22" : BN.surfaceUp,
                                border: `2px solid ${isCurrent ? tier.meta.color : BN.border}`,
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Icon className="w-5 h-5" style={{ color: tier.meta.color }} fill={isCurrent ? tier.meta.color : "none"} />
                                <div className="text-[14px] font-bold" style={{ color: BN.text }}>{label}</div>
                            </div>
                            <div className="text-[18px] font-black" style={{ color: tier.meta.color }}>
                                {formatMoney(tier.priceMonthly, "UZS")}<span className="text-[11px] font-normal" style={{ color: BN.text3 }}>/oy</span>
                            </div>
                            <ul className="text-[11.5px] space-y-1" style={{ color: BN.text2 }}>
                                {featureList.map((f, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                        <Star className="w-3 h-3 flex-shrink-0 mt-0.5" fill={tier.meta.color} style={{ color: tier.meta.color }} />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => setSelectedTier(tier.tier)}
                                className="mt-2 h-9 rounded-lg text-[12px] font-semibold"
                                style={{ background: tier.meta.color, color: "#0A0E27" }}
                            >
                                {isCurrent ? t("Uzaytirish", "Продлить", "Renew") : t("Tanlash", "Выбрать", "Choose")}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Confirm modal */}
            {selectedTier && (
                <div className="bn-scope fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={() => !busy && setSelectedTier(null)}>
                    <div className="w-full max-w-[400px] rounded-2xl overflow-hidden" style={{ background: BN.surface, border: `1px solid ${BN.border}` }} onClick={e => e.stopPropagation()}>
                        <div className="p-5" style={{ borderBottom: `1px solid ${BN.border}` }}>
                            <div className="flex items-start justify-between">
                                <div className="text-[15px] font-bold" style={{ color: BN.text }}>
                                    {selectedTier} {t("obunani sotib olish", "подписка", "subscription")}
                                </div>
                                <button onClick={() => !busy && setSelectedTier(null)} className="p-1" style={{ color: BN.text3 }}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {done ? (
                            <div className="p-6 flex flex-col items-center gap-3">
                                <CheckCircle2 className="w-14 h-14" style={{ color: BN.ok }} />
                                <div className="text-[14px] font-semibold" style={{ color: BN.text }}>
                                    {t("Aktivlashtirildi!", "Активировано!", "Activated!")}
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="text-[12px]" style={{ color: BN.text3 }}>{t("Oy soni", "Кол-во месяцев", "Months")}</label>
                                    <div className="mt-2 grid grid-cols-4 gap-2">
                                        {[1, 3, 6, 12].map(m => (
                                            <button key={m} onClick={() => setMonths(m)} className="h-10 rounded-lg text-[13px] font-semibold" style={{ background: months === m ? BN.gold : BN.surfaceUp, color: months === m ? BN.onGold : BN.text2 }}>
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[13px]" style={{ color: BN.text2 }}>{t("Jami", "Итого", "Total")}:</span>
                                    <span className="text-[18px] font-bold" style={{ color: BN.gold }}>
                                        {formatMoney((data.tiers.find(t => t.tier === selectedTier)?.priceMonthly ?? 0) * months, "UZS")}
                                    </span>
                                </div>
                                {err && <p className="text-[12px]" style={{ color: BN.err }}>{err}</p>}
                                <button onClick={subscribe} disabled={busy} className="w-full h-11 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2" style={{ background: BN.gold, color: BN.onGold, opacity: busy ? 0.5 : 1 }}>
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Sotib olish", "Купить", "Purchase")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
