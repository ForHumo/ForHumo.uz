"use client";

import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Crown, Check, Zap, Music, Video, Star,
    BookOpen, Mic, Shield, ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Obuna rejalari
// ─────────────────────────────────────────────────────────────────────────────
const PLANS = [
    {
        id:       "free",
        name:     "Bepul",
        price:    "0",
        period:   "so'm/oy",
        gradient: "rgba(43,62,232,0.10)",
        border:   "rgba(43,62,232,0.20)",
        badge:    null,
        features: [
            { icon: Video,   text: "Cheklangan video sifati (720p)"     },
            { icon: Music,   text: "Musiqa: reklamali, 128kbps"         },
            { icon: BookOpen,text: "Kitoblar: cheklangan tanlam"        },
            { icon: Mic,     text: "Podkastlar: bepul epizodlar"        },
        ],
        disabled: [],
        cta:      "Hozirgi reja",
        active:   true,
    },
    {
        id:       "pro",
        name:     "Nexus Pro",
        price:    "29 900",
        period:   "so'm/oy",
        gradient: "linear-gradient(135deg, rgba(43,62,232,0.28) 0%, rgba(0,206,200,0.14) 100%)",
        border:   "rgba(43,62,232,0.50)",
        badge:    "7 kun BEPUL",
        features: [
            { icon: Video,   text: "4K Ultra sifat + HDR"               },
            { icon: Music,   text: "Reklamasiz, Lossless / 320kbps"     },
            { icon: BookOpen,text: "Barcha kitoblar, audiokitoblar"      },
            { icon: Mic,     text: "Podkastlar: to'liq arxiv"           },
            { icon: Shield,  text: "Offline yuklash (5 qurilma)"         },
            { icon: Zap,     text: "AI tavsiyalar va qidiruv"            },
        ],
        disabled: [],
        cta:      "Bepul boshlash",
        active:   false,
    },
    {
        id:       "creator",
        name:     "Creator Pro",
        price:    "79 900",
        period:   "so'm/oy",
        gradient: "linear-gradient(135deg, rgba(139,92,246,0.28) 0%, rgba(43,62,232,0.18) 100%)",
        border:   "rgba(139,92,246,0.50)",
        badge:    "Creator",
        features: [
            { icon: Video,   text: "Nexus Pro — barchasi"               },
            { icon: Zap,     text: "AI video tahrirchi + avto-sarlavha" },
            { icon: Music,   text: "Studio sifat audio master"          },
            { icon: Star,    text: "Kanal monetizatsiya va analytics"   },
            { icon: Shield,  text: "Cheksiz bulut saqlash"              },
            { icon: Crown,   text: "Creator badge + prioritet support"  },
        ],
        disabled: [],
        cta:      "Creator Pro olish",
        active:   false,
    },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// NxPro — to'liq ekran obuna modali
// ─────────────────────────────────────────────────────────────────────────────
export function NxPro() {
    const { proOpen, setProOpen } = useNxPlayer();

    return (
        <div
            className="fixed inset-0 z-[60] flex flex-col transition-opacity duration-300"
            style={{
                background: "rgba(5,8,24,0.97)",
                opacity: proOpen ? 1 : 0,
                pointerEvents: proOpen ? "auto" : "none",
                backdropFilter: "blur(20px)",
            }}
        >
            {/* ── Ambient glows ─────────────────────────────────────────── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute" style={{
                    top: "-20%", left: "-10%", width: "60%", height: "60%",
                    background: "radial-gradient(ellipse, rgba(43,62,232,0.25) 0%, transparent 70%)",
                }} />
                <div className="absolute" style={{
                    bottom: "-20%", right: "-10%", width: "60%", height: "60%",
                    background: "radial-gradient(ellipse, rgba(0,206,200,0.18) 0%, transparent 70%)",
                }} />
            </div>

            {/* ── Header ────────────────────────────────────────────────── */}
            <div
                className="relative z-10 flex items-center justify-between px-5 md:px-8 h-[60px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}
            >
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                    >
                        <Crown className="w-4 h-4 text-white" />
                    </div>
                    <span
                        className="text-base font-black tracking-tight"
                        style={{
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        Nexus Obuna
                    </span>
                </div>
                <button
                    onClick={() => setProOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90"
                    style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}
                >
                    <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                </button>
            </div>

            {/* ── Scroll area ───────────────────────────────────────────── */}
            <div className="relative z-10 flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">

                    {/* Hero tagline */}
                    <div className="text-center mb-10">
                        <h1 className="text-2xl md:text-4xl font-black text-white mb-2 leading-tight">
                            O'zingizga mos rejani tanlang
                        </h1>
                        <p className="text-sm md:text-base" style={{ color: "rgba(140,160,210,0.80)" }}>
                            Humo Nexus platformasida eng yaxshi tajriba uchun Nexus Pro yoki Creator Pro rejasini tanlang
                        </p>
                    </div>

                    {/* Plans grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {PLANS.map(plan => (
                            <PlanCard key={plan.id} plan={plan} onClose={() => setProOpen(false)} />
                        ))}
                    </div>

                    {/* Humo Pay placeholder */}
                    <div
                        className="mt-8 p-5 rounded-2xl text-center"
                        style={{
                            background: "rgba(43,62,232,0.06)",
                            border: "1px solid rgba(43,62,232,0.16)",
                        }}
                    >
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div
                                className="px-3 py-1 rounded-lg text-xs font-black"
                                style={{ background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }}
                            >
                                Humo Pay
                            </div>
                            <span className="text-xs font-bold" style={{ color: "rgba(100,120,170,0.80)" }}>
                                orqali to'lash
                            </span>
                        </div>
                        <p className="text-xs" style={{ color: "rgba(80,100,150,0.70)" }}>
                            To'lov tizimi ishlab chiqilmoqda. Humo Nexus to'liq qurilgach ulanadi.
                        </p>
                    </div>

                    {/* FAQ short */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { q: "Bekor qilish mumkinmi?",      a: "Ha, istalgan vaqtda bekor qilsa bo'ladi. Keyingi to'lov olinmaydi." },
                            { q: "Bepul sinab ko'rish?",        a: "Pro reja uchun 7 kunlik bepul sinov mavjud, karta talab qilinmaydi." },
                            { q: "Qurilma cheklovi bormi?",     a: "Pro — 5 ta qurilma, Creator Pro — cheksiz qurilma." },
                            { q: "To'lov qanday amalga oshadi?",a: "Humo Pay orqali UZS hisobidan oylik hisoblanadi." },
                        ].map(({ q, a }, i) => (
                            <div
                                key={i}
                                className="p-4 rounded-xl"
                                style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.12)" }}
                            >
                                <p className="text-sm font-bold text-white mb-1">{q}</p>
                                <p className="text-xs leading-relaxed" style={{ color: "rgba(120,140,190,0.80)" }}>{a}</p>
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-[10px] mt-6" style={{ color: "rgba(60,80,130,0.60)" }}>
                        * Test rejimi — to'lovlar haqiqiy hisoblanmaydi. Humo Nexus v1.0 · 2026
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlanCard
// ─────────────────────────────────────────────────────────────────────────────
function PlanCard({
    plan,
    onClose,
}: {
    plan: typeof PLANS[number];
    onClose: () => void;
}) {
    const isPro     = plan.id === "pro";
    const isCreator = plan.id === "creator";
    const isFree    = plan.id === "free";

    const handleCta = () => {
        if (!isFree) {
            // Test rejimi: haqiqiy to'lov yo'q
            alert(`"${plan.name}" tanlandi. To'lov tizimi hali tayyor emas — test rejimi.`);
        }
    };

    return (
        <div
            className="relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300"
            style={{
                background: plan.gradient,
                border: `1px solid ${plan.border}`,
                boxShadow: isPro
                    ? "0 0 32px rgba(43,62,232,0.18), 0 0 64px rgba(0,206,200,0.08)"
                    : isCreator
                    ? "0 0 32px rgba(139,92,246,0.18)"
                    : "none",
            }}
        >
            {/* Badge */}
            {plan.badge && (
                <div className="absolute top-3 right-3">
                    <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-black text-white"
                        style={{
                            background: isCreator
                                ? "linear-gradient(90deg,#8B5CF6,#6366F1)"
                                : "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                        }}
                    >
                        {plan.badge}
                    </span>
                </div>
            )}

            <div className="p-5 flex-1 flex flex-col">
                {/* Plan name + price */}
                <div className="mb-5">
                    <p className="text-xs font-black uppercase tracking-widest mb-1"
                        style={{ color: isPro ? "#00CEC8" : isCreator ? "#8B5CF6" : "rgba(100,120,170,0.80)" }}>
                        {plan.name}
                    </p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">{plan.price}</span>
                        <span className="text-xs" style={{ color: "rgba(100,120,170,0.70)" }}>
                            {plan.period}
                        </span>
                    </div>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-2.5 flex-1 mb-6">
                    {plan.features.map(({ icon: Icon, text }, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                            <div
                                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{
                                    background: isPro
                                        ? "rgba(0,206,200,0.15)"
                                        : isCreator
                                        ? "rgba(139,92,246,0.15)"
                                        : "rgba(43,62,232,0.10)",
                                }}
                            >
                                <Icon className="w-3 h-3"
                                    style={{
                                        color: isPro ? "#00CEC8" : isCreator ? "#8B5CF6" : "rgba(100,120,170,0.80)",
                                    }}
                                />
                            </div>
                            <span className="text-xs leading-relaxed" style={{ color: "rgba(180,195,235,0.90)" }}>
                                {text}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* CTA button */}
                <button
                    onClick={handleCta}
                    disabled={isFree}
                    className="w-full py-3 rounded-xl text-sm font-black transition-all duration-200 flex items-center justify-center gap-2"
                    style={isFree ? {
                        background: "rgba(43,62,232,0.08)",
                        border: "1px solid rgba(43,62,232,0.18)",
                        color: "rgba(100,120,170,0.70)",
                        cursor: "default",
                    } : isPro ? {
                        background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                        boxShadow: "0 0 20px rgba(43,62,232,0.35)",
                        color: "#fff",
                    } : {
                        background: "linear-gradient(135deg,#8B5CF6,#6366F1)",
                        boxShadow: "0 0 20px rgba(139,92,246,0.35)",
                        color: "#fff",
                    }}
                >
                    {plan.cta}
                    {!isFree && <ChevronRight className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}
