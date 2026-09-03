"use client";

// Nexus /reklama sahifasi — foydalanuvchi o'z reklamalarini boshqaradi.
// Admin bo'lsa qo'shimcha "Moderatsiya" tab ko'rinadi.

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useLocale } from "next-intl";
import { Sparkles, TrendingUp, Users, Clock, ChevronDown, LogIn, Shield } from "lucide-react";
import { NxMyAdsCard } from "./nx-my-ads-card";
import { NxAdminAds } from "./nx-admin-ads";
import { formatMoney } from "@/lib/money";

const NX_GRADIENT = "linear-gradient(135deg, #2B3EE8 0%, #6D28D9 50%, #EC4899 100%)";
const NX_BG = "rgba(255,255,255,0.05)";
const NX_BORDER = "rgba(255,255,255,0.10)";

interface PricePeek {
    days: number;
    grossUzsTotal: number;
    grossUsdTotal: number;
    grossUzsPerDay: number;
    usdUzsRate: number;
}

export function NexusAdsPage() {
    const { status } = useSession();
    const locale = useLocale();
    const [isAdmin, setIsAdmin] = useState(false);
    const [tab, setTab] = useState<"mine" | "admin">("mine");
    const [pricePeek, setPricePeek] = useState<PricePeek | null>(null);
    const [showFaq, setShowFaq] = useState(false);

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    useEffect(() => {
        if (status !== "authenticated") return;
        // Admin holatini tekshirish (nexus admin endpoint auth error qaytarsa admin emas)
        fetch("/api/nexus/admin/ads?status=active", { cache: "no-store" })
            .then(r => setIsAdmin(r.status !== 403 && r.status !== 401))
            .catch(() => setIsAdmin(false));

        // Peek narx (1 kun)
        fetch("/api/nexus/ads/price?days=1")
            .then(r => r.json())
            .then((d: PricePeek) => setPricePeek(d))
            .catch(() => {});
    }, [status]);

    // Anonim — signIn CTA
    if (status === "unauthenticated") {
        return (
            <div className="min-h-screen text-white" style={{ background: "#050914" }}>
                <div className="max-w-2xl mx-auto px-4 py-12">
                    <div
                        className="rounded-3xl overflow-hidden"
                        style={{ background: "#0a0f1e", border: `1px solid ${NX_BORDER}` }}
                    >
                        <div
                            className="relative p-8 overflow-hidden"
                            style={{ background: NX_GRADIENT }}
                        >
                            <div
                                className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                                style={{ background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)" }}
                            />
                            <div className="relative">
                                <Sparkles className="w-8 h-8 mb-3" />
                                <h1 className="text-[26px] font-black leading-tight mb-2">
                                    {t("Nexus'da reklama joylang", "Разместите рекламу в Nexus", "Advertise on Nexus")}
                                </h1>
                                <p className="text-[14px] opacity-90 max-w-lg">
                                    {t(
                                        "Feed ichida native reklama. 3 slot. Har 15 postdan keyin. To'g'ridan-to'g'ri hamyondan to'lash.",
                                        "Нативная реклама в ленте. 3 слота. Каждые 15 постов. Оплата из кошелька.",
                                        "Native ads in the feed. 3 slots. Every 15 posts. Pay from your wallet.",
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="p-6">
                            <button
                                onClick={() => signIn("google")}
                                className="w-full h-12 rounded-xl text-[14px] font-black flex items-center justify-center gap-2 text-white"
                                style={{ background: NX_GRADIENT }}
                            >
                                <LogIn className="w-4 h-4" />
                                {t("Kirish (Google)", "Войти (Google)", "Sign in (Google)")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-white pb-24" style={{ background: "#050914" }}>
            <div className="max-w-3xl mx-auto px-4 py-6">
                {/* Hero */}
                <div
                    className="rounded-3xl overflow-hidden mb-4"
                    style={{ background: NX_GRADIENT }}
                >
                    <div className="relative p-6">
                        <div
                            className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.28) 0%, transparent 70%)" }}
                        />
                        <div className="relative flex items-start gap-4 flex-wrap">
                            <div className="flex-1 min-w-[220px]">
                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-2"
                                    style={{ background: "rgba(255,255,255,0.22)" }}>
                                    <Sparkles className="w-2.5 h-2.5" /> Nexus AD
                                </div>
                                <h1 className="text-[22px] sm:text-[26px] font-black leading-tight">
                                    {t("Feed reklamasi", "Реклама в ленте", "Feed ads")}
                                </h1>
                                <p className="text-[12.5px] mt-1 opacity-90">
                                    {t(
                                        "3 slot / 15 postda bir marta / kunlik $10 sof foyda platformaga",
                                        "3 слота / раз на 15 постов / $10 в день чистой прибыли",
                                        "3 slots / every 15 posts / $10/day net to platform",
                                    )}
                                </p>
                            </div>
                            {pricePeek && (
                                <div
                                    className="rounded-2xl px-4 py-3"
                                    style={{ background: "rgba(255,255,255,0.16)", backdropFilter: "blur(8px)" }}
                                >
                                    <p className="text-[10px] uppercase tracking-widest opacity-70">
                                        {t("1 kun", "1 день", "1 day")}
                                    </p>
                                    <p className="text-[18px] font-black tabular-nums">
                                        {formatMoney(pricePeek.grossUzsPerDay, "UZS")}
                                    </p>
                                    <p className="text-[10px] opacity-70">
                                        ~${pricePeek.grossUsdTotal.toFixed(2)} · CBU {pricePeek.usdUzsRate.toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Xususiyatlar */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <Feature icon={<Users className="w-4 h-4" />} label={t("Barcha auditoriya", "Вся аудитория", "All audience")} />
                    <Feature icon={<TrendingUp className="w-4 h-4" />} label={t("Real CTR", "Реальный CTR", "Real CTR")} />
                    <Feature icon={<Clock className="w-4 h-4" />} label={t("1-30 kun", "1-30 дней", "1-30 days")} />
                </div>

                {/* Tab: mine / admin */}
                {isAdmin && (
                    <div className="flex items-center gap-1.5 mb-3 p-1 rounded-2xl" style={{ background: NX_BG, border: `1px solid ${NX_BORDER}` }}>
                        <button
                            onClick={() => setTab("mine")}
                            className="flex-1 h-10 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5"
                            style={{
                                background: tab === "mine" ? NX_GRADIENT : "transparent",
                                color: "#fff",
                            }}
                        >
                            <Sparkles className="w-3.5 h-3.5" /> {t("Mening reklamalarim", "Мои реклама", "My ads")}
                        </button>
                        <button
                            onClick={() => setTab("admin")}
                            className="flex-1 h-10 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5"
                            style={{
                                background: tab === "admin" ? NX_GRADIENT : "transparent",
                                color: "#fff",
                            }}
                        >
                            <Shield className="w-3.5 h-3.5" /> {t("Moderatsiya", "Модерация", "Moderation")}
                        </button>
                    </div>
                )}

                {tab === "mine" ? <NxMyAdsCard /> : <NxAdminAds />}

                {/* FAQ */}
                <div className="mt-6">
                    <button
                        onClick={() => setShowFaq(v => !v)}
                        className="w-full flex items-center justify-between p-4 rounded-2xl text-[13.5px] font-black"
                        style={{ background: NX_BG, border: `1px solid ${NX_BORDER}` }}
                    >
                        <span>{t("Tez-tez so'raladigan savollar", "Частые вопросы", "FAQ")}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showFaq ? "rotate-180" : ""}`} />
                    </button>
                    {showFaq && (
                        <div className="mt-2 p-4 rounded-2xl space-y-4 text-[13px]" style={{ background: NX_BG, border: `1px solid ${NX_BORDER}` }}>
                            <FaqItem
                                q={t("Narx qanday hisoblanadi?", "Как считается цена?", "How is price calculated?")}
                                a={t(
                                    "Har kunga platformaga $10 sof foyda tushishi kerak. Soliqlar (5% dividend, 4% aylanma) va CBU USD/UZS kursi qo'shiladi.",
                                    "На каждый день платформа получает $10 чистой прибыли. Добавляются налоги (5% дивиденд, 4% оборот) и курс ЦБ.",
                                    "Platform gets $10 net per day. Taxes (5% dividend, 4% turnover) and CBU USD/UZS rate added.",
                                )}
                            />
                            <FaqItem
                                q={t("Reklama qayerda ko'rinadi?", "Где показывается реклама?", "Where does the ad appear?")}
                                a={t(
                                    "Nexus feed'ida — har 15 postdan keyin. 3 slot aylanma tarzda ishlaydi.",
                                    "В ленте Nexus — каждые 15 постов. 3 слота работают по кругу.",
                                    "In Nexus feed — every 15 posts. 3 slots rotate.",
                                )}
                            />
                            <FaqItem
                                q={t("Moderatsiya bormi?", "Есть ли модерация?", "Is there moderation?")}
                                a={t(
                                    "Ha. Moderator qoidalarni buzayotgan reklamalarni yashiradi. Yashirilganda push xabari keladi.",
                                    "Да. Модератор скрывает нарушающие правила рекламы. При скрытии приходит push.",
                                    "Yes. Moderator hides rule-breaking ads. You get a push when hidden.",
                                )}
                            />
                            <FaqItem
                                q={t("Pulni qaytarish mumkinmi?", "Возможен возврат?", "Are refunds possible?")}
                                a={t(
                                    "Reklama joylashtirilgach pul qaytarilmaydi. Moderatsiya bilan yashirilsa qolgan kunlar uchun to'lov qaytariladi.",
                                    "После размещения возврата нет. При скрытии модерацией — возврат за оставшиеся дни.",
                                    "No refund after posting. If hidden by moderator — refund for remaining days.",
                                )}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div
            className="p-3 rounded-2xl text-center"
            style={{ background: NX_BG, border: `1px solid ${NX_BORDER}` }}
        >
            <div className="w-8 h-8 rounded-xl grid place-items-center mx-auto mb-1.5 text-white" style={{ background: NX_GRADIENT }}>
                {icon}
            </div>
            <p className="text-[11px] font-bold text-white/80">{label}</p>
        </div>
    );
}

function FaqItem({ q, a }: { q: string; a: string }) {
    return (
        <div>
            <p className="font-black mb-1">{q}</p>
            <p className="text-white/60 leading-relaxed">{a}</p>
        </div>
    );
}
