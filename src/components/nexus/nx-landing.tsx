"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
    Play, Radio, Music, BookOpen, Mic, MessageCircle,
    Film, Users, Zap, ArrowUpRight, ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxLanding — Premium marketing sahifa (landonorris.com uslubi)
// ─────────────────────────────────────────────────────────────────────────────
export function NxLanding() {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const onScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,700;1,800&family=Barlow:wght@400;500;600&display=swap');

                .nxl-display  { font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; }
                .nxl-body     { font-family: 'Barlow', system-ui, sans-serif; }

                @keyframes blob-drift-a {
                    0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
                    25%     { transform: translate(40px,-30px) scale(1.06) rotate(5deg); }
                    75%     { transform: translate(-30px,20px) scale(0.94) rotate(-4deg); }
                }
                @keyframes blob-drift-b {
                    0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
                    33%     { transform: translate(-50px,25px) scale(1.08) rotate(-6deg); }
                    66%     { transform: translate(35px,-40px) scale(0.92) rotate(7deg); }
                }
                @keyframes blob-drift-c {
                    0%,100% { transform: translate(0,0) scale(1); }
                    50%     { transform: translate(20px,30px) scale(1.04); }
                }
                @keyframes ticker-scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes fade-up {
                    from { opacity: 0; transform: translateY(50px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes line-grow {
                    from { transform: scaleX(0); }
                    to   { transform: scaleX(1); }
                }
                @keyframes pulse-lime {
                    0%,100% { box-shadow: 0 0 0 0 rgba(197,255,0,0.40); }
                    50%     { box-shadow: 0 0 0 12px rgba(197,255,0,0); }
                }

                .blob-a { animation: blob-drift-a 10s ease-in-out infinite; }
                .blob-b { animation: blob-drift-b 13s ease-in-out infinite; }
                .blob-c { animation: blob-drift-c 16s ease-in-out infinite; }
                .ticker-inner { animation: ticker-scroll 28s linear infinite; }
                .ticker-inner:hover { animation-play-state: paused; }

                .nxl-hero-title { animation: fade-up 0.9s ease both; }
                .nxl-hero-sub   { animation: fade-up 0.9s 0.15s ease both; }
                .nxl-hero-badge { animation: fade-up 0.9s 0.30s ease both; }

                .feat-card {
                    transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
                }
                .feat-card:hover {
                    transform: translateY(-6px);
                    border-color: rgba(197,255,0,0.35) !important;
                    box-shadow: 0 16px 48px rgba(0,0,0,0.40);
                }
                .lime-btn {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    animation: pulse-lime 2.5s ease-in-out infinite;
                }
                .lime-btn:hover {
                    transform: scale(1.04);
                    box-shadow: 0 0 32px rgba(197,255,0,0.55);
                    animation: none;
                }
                .stat-num {
                    font-variant-numeric: tabular-nums;
                }
                .creator-card {
                    transition: transform 0.3s ease;
                }
                .creator-card:hover { transform: scale(1.03); }

                .scroll-line {
                    transform-origin: left;
                    animation: line-grow 1s ease both;
                }
            `}</style>

            <div className="nxl-body overflow-x-hidden" style={{ background: "#F4F2EC" }}>

                {/* ════════════════════════════════════════════════════
                    HERO
                ════════════════════════════════════════════════════ */}
                <section
                    className="relative w-full min-h-screen flex flex-col overflow-hidden"
                    style={{ background: "#F4F2EC" }}
                >
                    {/* ── Blob fon ────────────────────────────── */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
                        {/* Blob 1 — chapda */}
                        <div className="blob-a absolute" style={{
                            top: "-8%", left: "-6%",
                            width: "55%", height: "55%",
                            background: "radial-gradient(ellipse, rgba(43,62,232,0.10) 0%, rgba(43,62,232,0.04) 50%, transparent 75%)",
                            borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
                        }} />
                        {/* Blob 2 — o'ngda */}
                        <div className="blob-b absolute" style={{
                            bottom: "5%", right: "-8%",
                            width: "48%", height: "52%",
                            background: "radial-gradient(ellipse, rgba(0,206,200,0.12) 0%, rgba(0,206,200,0.04) 50%, transparent 75%)",
                            borderRadius: "45% 55% 40% 60% / 55% 45% 60% 40%",
                        }} />
                        {/* Blob 3 — markazda */}
                        <div className="blob-c absolute" style={{
                            top: "20%", left: "30%",
                            width: "40%", height: "45%",
                            background: "radial-gradient(ellipse, rgba(43,62,232,0.06) 0%, transparent 70%)",
                            borderRadius: "50% 50% 55% 45% / 45% 55% 45% 55%",
                        }} />

                        {/* Kontur chiziqlar — LN uslubi */}
                        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
                            <ellipse cx="720" cy="450" rx="480" ry="320" fill="none" stroke="#0A0A0A" strokeWidth="1" />
                            <ellipse cx="720" cy="450" rx="360" ry="240" fill="none" stroke="#0A0A0A" strokeWidth="1" />
                            <ellipse cx="720" cy="450" rx="240" ry="160" fill="none" stroke="#0A0A0A" strokeWidth="1" />
                        </svg>
                    </div>

                    {/* ── Nav ─────────────────────────────────── */}
                    <nav className="relative z-20 flex items-center justify-between px-6 md:px-10 pt-7">
                        {/* Brand name */}
                        <div className="nxl-display leading-none select-none">
                            <div className="text-[22px] md:text-[28px] font-black tracking-tighter text-black">HUMO</div>
                            <div className="text-[22px] md:text-[28px] font-black tracking-tighter text-black" style={{ marginTop: "-4px" }}>NEXUS</div>
                        </div>

                        {/* Monogram */}
                        <div className="absolute left-1/2 -translate-x-1/2 nxl-display">
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                <path d="M4 36 L4 4 L20 24 L36 4 L36 36" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                <path d="M4 36 L36 36" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round"/>
                            </svg>
                        </div>

                        {/* CTA + menu */}
                        <div className="flex items-center gap-3">
                            <Link
                                href="/uz/nexus"
                                className="lime-btn nxl-display flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-black uppercase tracking-wide"
                                style={{ background: "#C5FF00" }}
                            >
                                <Zap className="w-3.5 h-3.5" />
                                Kirish
                            </Link>
                            <button
                                className="w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-1.5"
                                style={{ background: "rgba(10,10,10,0.06)", border: "1px solid rgba(10,10,10,0.10)" }}
                            >
                                <span className="block w-5 h-0.5 bg-black rounded-full" />
                                <span className="block w-3.5 h-0.5 bg-black rounded-full ml-auto" />
                            </button>
                        </div>
                    </nav>

                    {/* ── Hero kontent ────────────────────────── */}
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">

                        {/* Asosiy vizual — katta logotip + platforma tasviri */}
                        <div className="relative flex items-center justify-center w-full max-w-3xl mx-auto">

                            {/* Katta "HN" fon monogrammi */}
                            <div
                                className="nxl-display absolute select-none pointer-events-none"
                                style={{
                                    fontSize: "clamp(180px, 35vw, 480px)",
                                    fontWeight: 900,
                                    color: "rgba(10,10,10,0.04)",
                                    letterSpacing: "-0.04em",
                                    lineHeight: 1,
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                HN
                            </div>

                            {/* Platforma preview kartasi */}
                            <div
                                className="relative z-10 rounded-3xl overflow-hidden shadow-2xl nxl-hero-title"
                                style={{
                                    width: "min(380px, 88vw)",
                                    aspectRatio: "9/16",
                                    maxHeight: "65vh",
                                    background: "linear-gradient(145deg, #050818 0%, #0B1228 50%, #050818 100%)",
                                    border: "1px solid rgba(43,62,232,0.25)",
                                    boxShadow: "0 40px 80px rgba(0,0,0,0.20), 0 0 0 1px rgba(43,62,232,0.08)",
                                }}
                            >
                                {/* Fon gradients */}
                                <div className="absolute inset-0" style={{
                                    background: "radial-gradient(ellipse at 30% 20%, rgba(43,62,232,0.30) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(0,206,200,0.20) 0%, transparent 60%)",
                                }} />

                                {/* Grid pattern */}
                                <div className="absolute inset-0 opacity-10" style={{
                                    backgroundImage: "radial-gradient(circle, rgba(43,62,232,0.40) 1px, transparent 1px)",
                                    backgroundSize: "24px 24px",
                                }} />

                                {/* Mock UI elementlari */}
                                <div className="relative h-full flex flex-col p-5">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="text-white text-xs font-black tracking-widest opacity-70">NEXUS</div>
                                        <div className="w-6 h-6 rounded-full" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }} />
                                    </div>

                                    {/* Katta kontent kartasi */}
                                    <div className="rounded-2xl overflow-hidden mb-3 flex-shrink-0" style={{
                                        background: "rgba(43,62,232,0.15)",
                                        border: "1px solid rgba(43,62,232,0.25)",
                                        height: "38%",
                                    }}>
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{
                                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                                boxShadow: "0 0 32px rgba(43,62,232,0.50)",
                                            }}>
                                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Kichik kartalar qatori */}
                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        {[
                                            { icon: Music,   label: "Musiqa",  color: "#10B981" },
                                            { icon: Radio,   label: "Jonli",   color: "#EF4444" },
                                            { icon: Film,    label: "Kino",    color: "#F59E0B" },
                                            { icon: BookOpen,label: "Kitob",   color: "#8B5CF6" },
                                        ].map(({ icon: Icon, label, color }, i) => (
                                            <div key={i} className="rounded-xl p-2.5 flex items-center gap-2" style={{
                                                background: "rgba(43,62,232,0.08)",
                                                border: "1px solid rgba(43,62,232,0.15)",
                                            }}>
                                                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}22` }}>
                                                    <Icon className="w-3 h-3" style={{ color }} />
                                                </div>
                                                <span className="text-white text-[10px] font-bold">{label}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Stats */}
                                    <div className="mt-auto flex items-center justify-between">
                                        {[["500K+","Foydalanuvchi"],["50K+","Kreator"],["10M+","Kontent"]].map(([n, l], i) => (
                                            <div key={i} className="text-center">
                                                <div className="text-white text-sm font-black" style={{
                                                    background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                                    WebkitBackgroundClip: "text",
                                                    WebkitTextFillColor: "transparent",
                                                    backgroundClip: "text",
                                                }}>{n}</div>
                                                <div className="text-[8px] font-medium" style={{ color: "rgba(160,180,220,0.60)" }}>{l}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* O'ng tomondagi info karta */}
                            <div
                                className="nxl-hero-sub absolute right-0 top-1/2 -translate-y-1/2 hidden md:block"
                                style={{ transform: "translate(110%, -50%)" }}
                            >
                                <InfoCard
                                    label="Platforma"
                                    title="Super-App"
                                    sub="Stream · Blog · Chat · Store"
                                    color="#C5FF00"
                                />
                            </div>

                            {/* Chap tomondagi badge */}
                            <div
                                className="nxl-hero-badge absolute left-0 bottom-8 hidden md:block"
                                style={{ transform: "translateX(-110%)" }}
                            >
                                <InfoCard
                                    label="O'zbekiston #1"
                                    title="Kreator"
                                    sub="Iqtisodiyoti"
                                    color="#2B3EE8"
                                />
                            </div>
                        </div>

                        {/* Tagline */}
                        <div className="mt-10 text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.25em]" style={{ color: "rgba(10,10,10,0.45)" }}>
                                Bitta platforma · Cheksiz imkoniyat
                            </p>
                        </div>
                    </div>

                    {/* ── Platform links ──────────────────────── */}
                    <div className="relative z-10 pb-10 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.20em] mb-4" style={{ color: "rgba(10,10,10,0.40)" }}>
                            Bizni kuzating
                        </p>
                        <div className="flex items-center justify-center gap-6">
                            {["Telegram", "Instagram", "YouTube", "TikTok"].map(s => (
                                <button key={s} className="text-xs font-black uppercase tracking-wider transition-opacity duration-150 hover:opacity-60" style={{ color: "#0A0A0A" }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════════════
                    TICKER
                ════════════════════════════════════════════════════ */}
                <div className="relative overflow-hidden py-4" style={{ background: "#0A0A0A" }}>
                    <div className="ticker-inner flex items-center gap-8 whitespace-nowrap" style={{ width: "max-content" }}>
                        {Array(4).fill(null).map((_, gi) => (
                            <div key={gi} className="flex items-center gap-8">
                                {["STREAM", "BLOG", "JONLI EFIR", "MUSIQA", "KINO", "KITOB", "KANAL", "GURUH", "NEXUS", "KREATOR"].map((t, i) => (
                                    <span key={i} className="flex items-center gap-6">
                                        <span className="nxl-display text-sm font-black tracking-[0.20em]" style={{ color: "#C5FF00" }}>{t}</span>
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(197,255,0,0.40)" }} />
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════
                    STATS
                ════════════════════════════════════════════════════ */}
                <section style={{ background: "#111111" }} className="px-6 md:px-16 py-20">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
                            {[
                                { n: "500K+",  l: "Foydalanuvchi",  sub: "Faol haftalik" },
                                { n: "50K+",   l: "Kreatorlar",     sub: "Kontentchilar" },
                                { n: "10M+",   l: "Kontent birligi",sub: "Barcha formatlar" },
                                { n: "Day 1",  l: "Monetizatsiya",  sub: "Payme · Click · Humo" },
                            ].map(({ n, l, sub }, i) => (
                                <div
                                    key={i}
                                    className="px-8 py-10 flex flex-col justify-between"
                                    style={{
                                        borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none",
                                        borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
                                    }}
                                >
                                    <div
                                        className="nxl-display stat-num font-black leading-none mb-4"
                                        style={{
                                            fontSize: "clamp(40px, 6vw, 72px)",
                                            background: "linear-gradient(135deg, #C5FF00 0%, #A8E000 100%)",
                                            WebkitBackgroundClip: "text",
                                            WebkitTextFillColor: "transparent",
                                            backgroundClip: "text",
                                        }}
                                    >
                                        {n}
                                    </div>
                                    <div>
                                        <div className="text-white font-black text-base mb-1">{l}</div>
                                        <div className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{sub}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════════════
                    FEATURES GRID
                ════════════════════════════════════════════════════ */}
                <section style={{ background: "#0D0D0D" }} className="px-6 md:px-16 py-24">
                    <div className="max-w-6xl mx-auto">

                        {/* Sarlavha */}
                        <div className="mb-16">
                            <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-4" style={{ color: "rgba(197,255,0,0.70)" }}>
                                Platforma imkoniyatlari
                            </p>
                            <h2
                                className="nxl-display font-black leading-none"
                                style={{
                                    fontSize: "clamp(48px, 8vw, 100px)",
                                    color: "#FFFFFF",
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                BITTA JOYDA<br />
                                <span style={{ color: "#C5FF00" }}>HAMMA NARSA</span>
                            </h2>
                        </div>

                        {/* Feature kartalar */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                {
                                    icon: Play,
                                    title: "Video & Shorts",
                                    desc: "YouTube uslubi gorizontal videolar va Instagram kabi vertikal Reels — ikkalasi bitta joyda.",
                                    tag: "4K · HDR",
                                    color: "#2B3EE8",
                                    big: true,
                                },
                                {
                                    icon: Radio,
                                    title: "Jonli Efir",
                                    desc: "Real vaqtda stream, tomoshabinlar bilan suhbat, sovg'a va monetizatsiya.",
                                    tag: "HD Live",
                                    color: "#EF4444",
                                },
                                {
                                    icon: Music,
                                    title: "Musiqa",
                                    desc: "Lossless sifat — FLAC, WAV. O'zbek va jahon musiqa katalogi.",
                                    tag: "Lossless",
                                    color: "#10B981",
                                },
                                {
                                    icon: MessageCircle,
                                    title: "Kanallar & Chatlar",
                                    desc: "Telegram kabi kanallar, guruhlar, botlar — Nexus ichida.",
                                    tag: "Encrypted",
                                    color: "#00CEC8",
                                },
                                {
                                    icon: Film,
                                    title: "Kino & Seriallar",
                                    desc: "O'zbek va xorijiy kinolar, seriallar — offline rejim bilan.",
                                    tag: "Original",
                                    color: "#F59E0B",
                                },
                                {
                                    icon: BookOpen,
                                    title: "Kitoblar",
                                    desc: "E-kitob, audiokitob, podkast — kreatorlar uchun yangi daromad yo'li.",
                                    tag: "Audio · Ebook",
                                    color: "#8B5CF6",
                                },
                            ].map(({ icon: Icon, title, desc, tag, color, big }, i) => (
                                <div
                                    key={i}
                                    className={`feat-card rounded-3xl p-7 flex flex-col gap-5 ${big ? "md:col-span-1 md:row-span-1" : ""}`}
                                    style={{
                                        background: "rgba(255,255,255,0.03)",
                                        border: "1px solid rgba(255,255,255,0.07)",
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                            style={{ background: `${color}20`, border: `1px solid ${color}30` }}
                                        >
                                            <Icon className="w-5 h-5" style={{ color }} />
                                        </div>
                                        <span
                                            className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                                            style={{ background: `${color}18`, color, border: `1px solid ${color}25` }}
                                        >
                                            {tag}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-white text-lg font-black mb-2">{title}</h3>
                                        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{desc}</p>
                                    </div>

                                    <div className="mt-auto flex items-center gap-1.5 text-xs font-black uppercase tracking-wider cursor-pointer hover:gap-2.5 transition-all duration-200" style={{ color }}>
                                        Ko'proq <ArrowUpRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════════════
                    CREATOR SECTION — "ALWAYS BRINGING THE FIGHT" uslubi
                ════════════════════════════════════════════════════ */}
                <section
                    className="relative px-6 md:px-16 py-28 overflow-hidden"
                    style={{ background: "#141414" }}
                >
                    {/* Kontur fon */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.04]">
                        <svg className="w-full h-full" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice">
                            <path d="M0 300 Q360 100 720 300 T1440 300" fill="none" stroke="#C5FF00" strokeWidth="2"/>
                            <path d="M0 350 Q360 150 720 350 T1440 350" fill="none" stroke="#C5FF00" strokeWidth="1.5"/>
                            <path d="M0 250 Q360 50 720 250 T1440 250" fill="none" stroke="#C5FF00" strokeWidth="1"/>
                        </svg>
                    </div>

                    <div className="relative max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-12">

                            {/* Chap — katta sarlavha */}
                            <div className="flex-1">
                                <p className="text-[11px] font-black uppercase tracking-[0.25em] mb-6" style={{ color: "rgba(197,255,0,0.70)" }}>
                                    Kreator iqtisodiyoti
                                </p>
                                <h2
                                    className="nxl-display font-black leading-none"
                                    style={{
                                        fontSize: "clamp(52px, 9vw, 120px)",
                                        letterSpacing: "-0.02em",
                                        lineHeight: 0.92,
                                    }}
                                >
                                    <span style={{ color: "#FFFFFF" }}>BITTA</span>
                                    <br />
                                    <span style={{ color: "#C5FF00" }}>PUBLISH.</span>
                                    <br />
                                    <span style={{ color: "rgba(255,255,255,0.35)" }}>KO'P PLATFORMA.</span>
                                </h2>
                            </div>

                            {/* O'ng — tavsif + CTA */}
                            <div className="max-w-sm">
                                <div className="w-12 h-0.5 mb-6 scroll-line" style={{ background: "#C5FF00", transformOrigin: "left" }} />
                                <p className="text-base leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.55)" }}>
                                    Bir marta kontent yozing — Nexus uni video, musiqa, blog, kanal va podkast sifatida avtomatik taqsimlaydi. Daromadingiz birinchi kundan boshlanadi.
                                </p>
                                <Link
                                    href="/uz/nexus"
                                    className="lime-btn inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl nxl-display font-black text-black uppercase tracking-wide text-sm"
                                    style={{ background: "#C5FF00" }}
                                >
                                    Kreator bo'lish <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        {/* Kreator kartalar qatori */}
                        <div className="mt-16 flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                            {[
                                { name: "Madina Ergash",  cat: "Musiqa",    sub: "245K", img: "avataaars/svg?seed=madina"  },
                                { name: "Sardor Dev",     cat: "Dasturlash",sub: "189K", img: "avataaars/svg?seed=sardor"  },
                                { name: "Kamol Kino",     cat: "Kino",      sub: "312K", img: "avataaars/svg?seed=kamol"   },
                                { name: "Dilnoza Show",   cat: "Ko'ngil",   sub: "421K", img: "avataaars/svg?seed=dilnoza" },
                                { name: "Bobur Tech",     cat: "Texnologiya",sub:"98K",  img: "avataaars/svg?seed=bobur"   },
                            ].map(({ name, cat, sub, img }, i) => (
                                <div
                                    key={i}
                                    className="creator-card flex-shrink-0 rounded-2xl p-4 flex items-center gap-4 cursor-pointer"
                                    style={{
                                        width: "220px",
                                        background: "rgba(255,255,255,0.04)",
                                        border: "1px solid rgba(255,255,255,0.08)",
                                    }}
                                >
                                    <div
                                        className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                                        style={{ border: "2px solid rgba(197,255,0,0.30)" }}
                                    >
                                        <img
                                            src={`https://api.dicebear.com/9.x/${img}`}
                                            alt={name}
                                            className="w-full h-full object-cover bg-white"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white text-sm font-black truncate">{name}</p>
                                        <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.40)" }}>{cat}</p>
                                        <p className="text-xs font-black mt-0.5" style={{ color: "#C5FF00" }}>{sub} obunachi</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════════════
                    LIME GRADIENT TRANSITION + CTA
                ════════════════════════════════════════════════════ */}
                <section
                    className="relative overflow-hidden"
                    style={{
                        background: "linear-gradient(180deg, #141414 0%, #8BB800 40%, #C5FF00 100%)",
                        paddingTop: "80px",
                        paddingBottom: "0",
                    }}
                >
                    {/* Tepada qorong'i to'lqin */}
                    <svg className="absolute top-0 left-0 w-full" viewBox="0 0 1440 80" preserveAspectRatio="none">
                        <path d="M0 80 Q360 0 720 40 T1440 0 L1440 0 L0 0 Z" fill="#141414" />
                    </svg>

                    <div className="relative max-w-4xl mx-auto px-6 text-center pt-20 pb-20">
                        <h2
                            className="nxl-display font-black leading-none mb-6"
                            style={{
                                fontSize: "clamp(56px, 10vw, 130px)",
                                color: "#0A0A0A",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            NEXUS GA<br />QO'SHILING
                        </h2>
                        <p className="text-base font-semibold mb-10 max-w-md mx-auto" style={{ color: "rgba(10,10,10,0.55)" }}>
                            O'zbek kreatorlari uchun eng kuchli platforma. Kontent yozing, daromad toping, jamoa quring.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href="/uz/nexus"
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl nxl-display font-black text-base uppercase tracking-wide transition-all duration-200 hover:scale-105"
                                style={{
                                    background: "#0A0A0A",
                                    color: "#C5FF00",
                                    boxShadow: "0 8px 32px rgba(0,0,0,0.30)",
                                }}
                            >
                                <Zap className="w-4 h-4" /> Bepul boshlash
                            </Link>
                            <button
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl nxl-display font-black text-base uppercase tracking-wide transition-all duration-200 hover:scale-105"
                                style={{
                                    background: "rgba(10,10,10,0.12)",
                                    color: "#0A0A0A",
                                    border: "2px solid rgba(10,10,10,0.25)",
                                }}
                            >
                                <Users className="w-4 h-4" /> Kreator bo'lish
                            </button>
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════════════════
                    FOOTER
                ════════════════════════════════════════════════════ */}
                <footer style={{ background: "#0A0A0A", borderTop: "1px solid rgba(255,255,255,0.06)" }} className="px-6 md:px-16 py-14">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-14">
                            {/* Brand */}
                            <div>
                                <div className="nxl-display font-black text-white text-2xl leading-tight tracking-tight mb-2">
                                    HUMO<br />NEXUS
                                </div>
                                <p className="text-xs max-w-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                                    O'zbekistonning birinchi kreator super-app platformasi.
                                </p>
                            </div>

                            {/* Links */}
                            {[
                                { title: "Platforma", links: ["Video", "Musiqa", "Jonli efir", "Kino", "Kitoblar"] },
                                { title: "Kreatorlar", links: ["Studio", "Analitika", "Monetizatsiya", "Hamjamiyat"] },
                                { title: "Kompaniya", links: ["Humo haqida", "Yangiliklar", "Humo Support", "Maxfiylik"] },
                            ].map(({ title, links }) => (
                                <div key={title}>
                                    <p className="text-[10px] font-black uppercase tracking-[0.20em] mb-4" style={{ color: "rgba(197,255,0,0.60)" }}>{title}</p>
                                    <ul className="flex flex-col gap-2.5">
                                        {links.map(l => (
                                            <li key={l}>
                                                <a href="#" className="text-sm font-medium transition-opacity duration-150 hover:opacity-100" style={{ color: "rgba(255,255,255,0.40)" }}>{l}</a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>

                        {/* Bottom bar */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                                © 2026 Humo Digital. Barcha huquqlar himoyalangan.
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#C5FF00" }} />
                                <span className="text-xs font-bold" style={{ color: "#C5FF00" }}>Nexus v1.0.0</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Yordamchi — info karta
// ─────────────────────────────────────────────────────────────────────────────
function InfoCard({ label, title, sub, color }: {
    label: string; title: string; sub: string; color: string;
}) {
    return (
        <div
            className="rounded-2xl p-4 min-w-[140px]"
            style={{
                background: "rgba(10,10,10,0.06)",
                border: "1px solid rgba(10,10,10,0.10)",
                backdropFilter: "blur(8px)",
            }}
        >
            <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: "rgba(10,10,10,0.45)" }}>{label}</p>
            <p className="text-base font-black text-black leading-tight">{title}</p>
            <p className="text-[10px] font-medium mt-1" style={{ color: "rgba(10,10,10,0.50)" }}>{sub}</p>
            <div className="w-6 h-1 rounded-full mt-2.5" style={{ background: color }} />
        </div>
    );
}
