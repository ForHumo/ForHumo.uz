"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, ChevronLeft, Heart, Users, Clock, TrendingUp, Star, Zap, Crown } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type Category = "all" | "music" | "film" | "art" | "tech" | "community";

interface PledgeTier {
    id: string;
    label: string;
    amount: number;
    perks: string[];
    backers: number;
}

interface Campaign {
    id: string;
    title: string;
    creator: string;
    avatar: string;
    category: Category;
    image: string;
    description: string;
    raised: number;
    goal: number;
    backers: number;
    daysLeft: number;
    featured: boolean;
    tiers: PledgeTier[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_CAMPAIGNS: Campaign[] = [
    {
        id: "c1",
        title: "O'zbek hip-hop albomi — 'Shahar Ovozlari'",
        creator: "Jasur Beats",
        avatar: "JB",
        category: "music",
        image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80",
        description: "O'zbekiston ko'chalarining haqiqiy ovozini 16 trekli to'liq albomga yozmoqchiman. Har bir trek — shahrimizning bir burchagi.",
        raised: 8_400_000,
        goal: 15_000_000,
        backers: 342,
        daysLeft: 18,
        featured: true,
        tiers: [
            { id: "t1", label: "Muxlis", amount: 25_000, perks: ["Raqamli albom", "Minnatdorlik xati"], backers: 210 },
            { id: "t2", label: "Qo'llovchi", amount: 75_000, perks: ["Raqamli albom", "Eksklyuziv trek", "Discord kirish"], backers: 98 },
            { id: "t3", label: "Homiy", amount: 200_000, perks: ["Hamma narsa", "Kredit sahifada ism", "Imzolangan CD"], backers: 34 },
        ],
    },
    {
        id: "c2",
        title: "Mustaqil qisqametrajli film — 'Tog' Qizi'",
        creator: "Zilola Yusupova",
        avatar: "ZY",
        category: "film",
        image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80",
        description: "Tog'li qishloqda kechgan haqiqiy hikoya asosida qisqametrajli badiiy film. Mahalliy aktyorlar, haqiqiy manzaralar.",
        raised: 22_100_000,
        goal: 30_000_000,
        backers: 891,
        daysLeft: 7,
        featured: true,
        tiers: [
            { id: "t1", label: "Tomosha", amount: 30_000, perks: ["Onlayn premyera kirish"], backers: 650 },
            { id: "t2", label: "Sahna ortida", amount: 100_000, perks: ["Onlayn premyera", "Making-of video", "Poster"], backers: 201 },
            { id: "t3", label: "Ijodkor", amount: 500_000, perks: ["Hamma narsa", "Mahsulot", "VIP premyera taklifi"], backers: 40 },
        ],
    },
    {
        id: "c3",
        title: "Ko'cha san'ati — Toshkent Grand Mural",
        creator: "Art Kollektiv UZ",
        avatar: "AK",
        category: "art",
        image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80",
        description: "Toshkentning markazida 500 m² murasi. Shahar madaniyatini aks ettiruvchi ommaviy san'at asari.",
        raised: 4_600_000,
        goal: 20_000_000,
        backers: 123,
        daysLeft: 35,
        featured: false,
        tiers: [
            { id: "t1", label: "Rang bering", amount: 20_000, perks: ["Raqamli sertifikat"], backers: 88 },
            { id: "t2", label: "Bo'yoq", amount: 80_000, perks: ["Sertifikat", "Mini-print", "Ijodiy yangiliklar"], backers: 28 },
            { id: "t3", label: "Homiy", amount: 300_000, perks: ["Hamma narsa", "Muralda ism", "Ochilish tadbiri"], backers: 7 },
        ],
    },
    {
        id: "c4",
        title: "O'zbek dasturchilar podkasti",
        creator: "DevTalk UZ",
        avatar: "DT",
        category: "tech",
        image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&q=80",
        description: "O'zbek tili va muhitidagi dasturlash, startaplar va texnologiya haqidagi haftalik podkast. Yiliga 52 epizod.",
        raised: 6_800_000,
        goal: 10_000_000,
        backers: 445,
        daysLeft: 12,
        featured: false,
        tiers: [
            { id: "t1", label: "Tinglovchi", amount: 15_000, perks: ["Podkast RSS", "Minnatdorlik"], backers: 310 },
            { id: "t2", label: "Hamjamiyat", amount: 50_000, perks: ["RSS", "Discord", "Savol berish imkoni"], backers: 115 },
            { id: "t3", label: "Sponsor", amount: 250_000, perks: ["Hamma narsa", "Brendingiz epizodda"], backers: 20 },
        ],
    },
    {
        id: "c5",
        title: "Qishloq bolalari uchun musiqa maktabi",
        creator: "Musiqiy Qadamlar",
        avatar: "MQ",
        category: "community",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
        description: "Farg'ona viloyatidagi 3 ta qishloqda bepul musiqa darslari. 150 dan ortiq bola uchun asboblar sotib olinadi.",
        raised: 11_200_000,
        goal: 12_000_000,
        backers: 1203,
        daysLeft: 3,
        featured: false,
        tiers: [
            { id: "t1", label: "Yordam", amount: 10_000, perks: ["Minnatdorlik", "Yangiliklar"], backers: 900 },
            { id: "t2", label: "Ustoz", amount: 50_000, perks: ["Yangiliklar", "Hisobot video", "Ism ro'yxatda"], backers: 270 },
            { id: "t3", label: "Mesenat", amount: 500_000, perks: ["Hamma narsa", "Dars videosi", "Sertifikat"], backers: 33 },
        ],
    },
];

const CATS: { id: Category; label: string }[] = [
    { id: "all",       label: "Barchasi" },
    { id: "music",     label: "Musiqa" },
    { id: "film",      label: "Film" },
    { id: "art",       label: "San'at" },
    { id: "tech",      label: "Texnologiya" },
    { id: "community", label: "Jamiyat" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchilar
// ─────────────────────────────────────────────────────────────────────────────
function fmtSum(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " mln";
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + " ming";
    return String(n);
}

function pct(raised: number, goal: number): number {
    return Math.min(100, Math.round((raised / goal) * 100));
}

function urgencyColor(days: number): string {
    if (days <= 3)  return "#EF4444";
    if (days <= 7)  return "#F97316";
    if (days <= 14) return "#EAB308";
    return "#00CEC8";
}

// ─────────────────────────────────────────────────────────────────────────────
// NxFundraiser
// ─────────────────────────────────────────────────────────────────────────────
export function NxFundraiser() {
    const { fundraiserOpen, setFundraiserOpen } = useNxPlayer();

    const [cat,         setCat]         = useState<Category>("all");
    const [detail,      setDetail]      = useState<Campaign | null>(null);
    const [backedIds,   setBackedIds]   = useState<Set<string>>(new Set());
    const [selectedTier, setSelectedTier] = useState<string | null>(null);
    const [pledgeStep,  setPledgeStep]  = useState<"tiers" | "confirm" | "success">("tiers");

    if (!fundraiserOpen) return null;

    // ── Detail / Pledge view ───────────────────────────────────────────────
    if (detail) {
        const progress = pct(detail.raised, detail.goal);
        const isBacked = backedIds.has(detail.id);
        const tier     = detail.tiers.find(t => t.id === selectedTier) ?? null;

        const handleBack = () => {
            setDetail(null);
            setSelectedTier(null);
            setPledgeStep("tiers");
        };

        const handlePledge = () => {
            if (!selectedTier) return;
            if (pledgeStep === "tiers")   { setPledgeStep("confirm"); return; }
            if (pledgeStep === "confirm") {
                setBackedIds(prev => new Set(prev).add(detail.id));
                setPledgeStep("success");
                return;
            }
            if (pledgeStep === "success") {
                handleBack();
            }
        };

        return (
            <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
                {/* Header */}
                <div
                    className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}
                >
                    <button
                        onClick={handleBack}
                        className="w-9 h-9 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                    >
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{detail.title}</p>
                        <p className="text-[11px]" style={{ color: "rgba(100,120,170,0.80)" }}>{detail.creator}</p>
                    </div>
                    {isBacked && (
                        <span
                            className="text-[10px] font-black px-2.5 py-1 rounded-full"
                            style={{ background: "rgba(16,185,129,0.18)", color: "#10B981" }}
                        >
                            Qo'lladingiz
                        </span>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {/* Campaign image */}
                    <div className="relative h-52 w-full overflow-hidden flex-shrink-0">
                        <img src={detail.image} alt={detail.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,8,24,0.95) 0%, transparent 60%)" }} />
                        <div className="absolute bottom-4 left-4 right-4">
                            <div className="flex items-center gap-2 mb-2">
                                {detail.featured && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                        style={{ background: "rgba(43,62,232,0.80)", color: "white" }}>
                                        Tanlangan
                                    </span>
                                )}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(0,0,0,0.50)", color: "rgba(200,210,255,0.90)" }}>
                                    {CATS.find(c => c.id === detail.category)?.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="px-4 py-4">
                        {/* Progress bar */}
                        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(43,62,232,0.15)" }}>
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${progress}%`,
                                    background: progress >= 100
                                        ? "linear-gradient(90deg,#10B981,#00CEC8)"
                                        : "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="text-center">
                                <p className="text-base font-black text-white">{progress}%</p>
                                <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.80)" }}>Bajarildi</p>
                            </div>
                            <div className="text-center">
                                <p className="text-base font-black text-white">{detail.backers.toLocaleString()}</p>
                                <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.80)" }}>Qo'llovchilar</p>
                            </div>
                            <div className="text-center">
                                <p className="text-base font-black" style={{ color: urgencyColor(detail.daysLeft) }}>
                                    {detail.daysLeft} kun
                                </p>
                                <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.80)" }}>Qoldi</p>
                            </div>
                        </div>

                        <div className="mb-4 p-3 rounded-2xl" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(160,176,224,0.80)" }}>
                                {detail.description}
                            </p>
                        </div>

                        <div className="mb-3">
                            <p className="text-xs font-bold text-white mb-1">
                                {fmtSum(detail.raised)} so'm yig'ildi
                            </p>
                            <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                                Maqsad: {fmtSum(detail.goal)} so'm
                            </p>
                        </div>

                        {/* Pledge tiers */}
                        {pledgeStep === "tiers" && (
                            <>
                                <p className="text-xs font-black text-white mb-3 mt-5">Qo'llov darajasini tanlang</p>
                                <div className="flex flex-col gap-3">
                                    {detail.tiers.map((t, i) => {
                                        const icons = [Star, Zap, Crown];
                                        const Icon  = icons[i] ?? Star;
                                        const active = selectedTier === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => setSelectedTier(t.id)}
                                                className="w-full text-left p-4 rounded-2xl transition-all duration-200"
                                                style={{
                                                    background: active ? "rgba(43,62,232,0.22)" : "rgba(43,62,232,0.06)",
                                                    border: `1px solid ${active ? "rgba(43,62,232,0.60)" : "rgba(43,62,232,0.15)"}`,
                                                    transform: active ? "scale(1.01)" : "scale(1)",
                                                }}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div
                                                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                                        style={{ background: active ? "rgba(43,62,232,0.35)" : "rgba(43,62,232,0.12)" }}
                                                    >
                                                        <Icon className="w-4 h-4" style={{ color: active ? "#00CEC8" : "rgba(140,160,220,0.60)" }} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-black text-white">{t.label}</p>
                                                        <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.80)" }}>
                                                            {t.backers} kishi qo'llamoqda
                                                        </p>
                                                    </div>
                                                    <span className="text-sm font-black" style={{ color: "#00CEC8" }}>
                                                        {fmtSum(t.amount)} so'm
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 ml-11">
                                                    {t.perks.map((p, pi) => (
                                                        <span key={pi} className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                                                            style={{ background: "rgba(0,206,200,0.12)", color: "rgba(0,206,200,0.80)" }}>
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                        {/* Confirm step */}
                        {pledgeStep === "confirm" && tier && (
                            <div className="mt-5 p-4 rounded-2xl" style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                <p className="text-xs font-black text-white mb-3">Tasdiqlash</p>
                                <div className="flex justify-between mb-2">
                                    <span className="text-[11px]" style={{ color: "rgba(140,160,210,0.80)" }}>Daraja</span>
                                    <span className="text-[11px] font-bold text-white">{tier.label}</span>
                                </div>
                                <div className="flex justify-between mb-4">
                                    <span className="text-[11px]" style={{ color: "rgba(140,160,210,0.80)" }}>Miqdor</span>
                                    <span className="text-sm font-black" style={{ color: "#00CEC8" }}>{fmtSum(tier.amount)} so'm</span>
                                </div>
                                <p className="text-[9px] leading-relaxed" style={{ color: "rgba(100,120,170,0.70)" }}>
                                    Hamyon balansingizdan {fmtSum(tier.amount)} so'm yechiladi. Qo'llov qaytarib olinmaydi.
                                </p>
                            </div>
                        )}

                        {/* Success */}
                        {pledgeStep === "success" && (
                            <div className="mt-5 text-center py-8">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                    style={{ background: "rgba(16,185,129,0.18)", border: "2px solid rgba(16,185,129,0.40)" }}
                                >
                                    <Heart className="w-8 h-8" style={{ color: "#10B981" }} />
                                </div>
                                <p className="text-base font-black text-white mb-1">Rahmat!</p>
                                <p className="text-[11px]" style={{ color: "rgba(140,160,210,0.80)" }}>
                                    Siz bu loyihani qo'lladingiz
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom action */}
                {!isBacked && pledgeStep !== "success" && (
                    <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.15)" }}>
                        <button
                            disabled={!selectedTier}
                            onClick={handlePledge}
                            className="w-full py-3.5 rounded-2xl text-sm font-black transition-all duration-200"
                            style={{
                                background: selectedTier
                                    ? "linear-gradient(135deg,#2B3EE8,#00CEC8)"
                                    : "rgba(43,62,232,0.15)",
                                color: selectedTier ? "white" : "rgba(100,120,170,0.60)",
                                opacity: selectedTier ? 1 : 0.7,
                            }}
                        >
                            {pledgeStep === "tiers" && (selectedTier ? `${fmtSum(detail.tiers.find(t=>t.id===selectedTier)!.amount)} so'm qo'llab-quvvatlash` : "Daraja tanlang")}
                            {pledgeStep === "confirm" && "Tasdiqlash va to'lov"}
                        </button>
                        {pledgeStep === "confirm" && (
                            <button
                                className="w-full mt-2 text-[11px] text-center py-2"
                                style={{ color: "rgba(100,120,170,0.70)" }}
                                onClick={() => setPledgeStep("tiers")}
                            >
                                Orqaga
                            </button>
                        )}
                    </div>
                )}
                {pledgeStep === "success" && (
                    <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.15)" }}>
                        <button
                            onClick={handleBack}
                            className="w-full py-3.5 rounded-2xl text-sm font-black text-white"
                            style={{ background: "rgba(43,62,232,0.20)", border: "1px solid rgba(43,62,232,0.35)" }}
                        >
                            Boshqa loyihalarni ko'rish
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ── Campaign list view ─────────────────────────────────────────────────
    const visible = cat === "all"
        ? MOCK_CAMPAIGNS
        : MOCK_CAMPAIGNS.filter(c => c.category === cat);

    const featured = MOCK_CAMPAIGNS.filter(c => c.featured);

    return (
        <div
            className="fixed inset-0 z-[120] flex flex-col"
            style={{ background: "#050818" }}
        >
            {/* Header */}
            <div
                className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}
            >
                <button
                    onClick={() => setFundraiserOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                >
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Moliyalashtirish</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                        Ijodkorlarni qo'llab-quvvatlang
                    </p>
                </div>
                <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}
                >
                    <TrendingUp className="w-3 h-3" style={{ color: "#00CEC8" }} />
                    <span className="text-[10px] font-bold" style={{ color: "#00CEC8" }}>
                        {MOCK_CAMPAIGNS.reduce((s, c) => s + c.backers, 0).toLocaleString()} qo'llovchi
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                {/* Featured banner */}
                <div className="px-4 pt-4 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-3"
                        style={{ color: "rgba(100,120,170,0.60)" }}>
                        Tanlangan loyihalar
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                        {featured.map(c => {
                            const p = pct(c.raised, c.goal);
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => { setDetail(c); setPledgeStep("tiers"); setSelectedTier(null); }}
                                    className="flex-shrink-0 w-64 rounded-2xl overflow-hidden text-left"
                                    style={{ border: "1px solid rgba(43,62,232,0.22)" }}
                                >
                                    <div className="relative h-32 overflow-hidden">
                                        <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0"
                                            style={{ background: "linear-gradient(to top,rgba(5,8,24,0.90) 0%,transparent 55%)" }} />
                                        <div className="absolute bottom-2 left-3 right-3">
                                            <p className="text-[11px] font-black text-white leading-tight line-clamp-2">{c.title}</p>
                                        </div>
                                    </div>
                                    <div className="p-3" style={{ background: "rgba(8,12,32,0.95)" }}>
                                        <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: "rgba(43,62,232,0.18)" }}>
                                            <div className="h-full rounded-full" style={{ width: `${p}%`, background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }} />
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[10px] font-bold" style={{ color: "#00CEC8" }}>{p}% bajarildi</span>
                                            <span className="text-[10px]" style={{ color: urgencyColor(c.daysLeft) }}>{c.daysLeft} kun</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Category filter */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {CATS.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setCat(c.id)}
                            className="flex-shrink-0 text-[11px] font-bold px-3.5 py-1.5 rounded-full transition-all duration-200"
                            style={{
                                background: cat === c.id ? "rgba(43,62,232,0.35)" : "rgba(43,62,232,0.08)",
                                border: `1px solid ${cat === c.id ? "rgba(43,62,232,0.60)" : "rgba(43,62,232,0.15)"}`,
                                color: cat === c.id ? "white" : "rgba(140,160,210,0.70)",
                            }}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>

                {/* Campaign cards */}
                <div className="px-4 pb-8 flex flex-col gap-4">
                    {visible.map(c => {
                        const p      = pct(c.raised, c.goal);
                        const isBacked = backedIds.has(c.id);
                        return (
                            <button
                                key={c.id}
                                onClick={() => { setDetail(c); setPledgeStep("tiers"); setSelectedTier(null); }}
                                className="w-full text-left rounded-2xl overflow-hidden"
                                style={{ background: "rgba(8,12,32,0.95)", border: "1px solid rgba(43,62,232,0.18)" }}
                            >
                                {/* Image */}
                                <div className="relative h-40 overflow-hidden">
                                    <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0"
                                        style={{ background: "linear-gradient(to top,rgba(5,8,24,0.90) 0%,transparent 50%)" }} />
                                    {isBacked && (
                                        <div className="absolute top-3 right-3 text-[10px] font-black px-2 py-1 rounded-full"
                                            style={{ background: "rgba(16,185,129,0.85)", color: "white" }}>
                                            Qo'lladingiz
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        {/* Avatar */}
                                        <div
                                            className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                                        >
                                            {c.avatar}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-white leading-tight mb-0.5 line-clamp-2">{c.title}</p>
                                            <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>{c.creator}</p>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(43,62,232,0.15)" }}>
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${p}%`,
                                                background: p >= 90
                                                    ? "linear-gradient(90deg,#10B981,#00CEC8)"
                                                    : "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <p className="text-xs font-black text-white">{p}%</p>
                                            <p className="text-[9px]" style={{ color: "rgba(100,120,170,0.70)" }}>Bajarildi</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(100,120,170,0.60)" }} />
                                            <div>
                                                <p className="text-xs font-black text-white">{c.backers}</p>
                                                <p className="text-[9px]" style={{ color: "rgba(100,120,170,0.70)" }}>Qo'llov</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3 flex-shrink-0" style={{ color: urgencyColor(c.daysLeft) }} />
                                            <div>
                                                <p className="text-xs font-black" style={{ color: urgencyColor(c.daysLeft) }}>{c.daysLeft} kun</p>
                                                <p className="text-[9px]" style={{ color: "rgba(100,120,170,0.70)" }}>Qoldi</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
