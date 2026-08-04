"use client";

// BN Media — Nexus'ga o'xshash lenta (reels + rasmli postlar + chat), lekin
// FAQAT sotuv/xarid kontenti. Foydalanuvchi so'rovi:
//   "BNdagi media bo'limi. Nexus bilan integratsiya. Sotuvchi Nexus'da kanal
//    yaratsa, BN media'da ham avtomatik ko'rinishi kerak."
//
// Arxitektura (FAZA 6 — API bilan almashtiriladi):
//   Kontent Nexus DB'da (NexusPost + NexusVideo) — BN faqat filtr ko'zoyna.
//   Filtr: post BnShop.profileId ga tegishli YOKI `#bn`/`#bozornarxida` teg.
//   Kanal = Nexus profil (do'kon egasi). "Kanalim" tugmasi Nexus'da post
//   yaratishga olib boradi (yangi post shu yerda ham ko'rinadi).

import { useState } from "react";
import {
    Play, Image as ImageIcon, MessageCircle, Store, Sparkles, Filter,
    Heart, MessageSquare, Share2, BadgeCheck, ArrowUpRight,
} from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { MOCK_SHOPS, MOCK_PRODUCTS } from "@/lib/bn-mock";

type Tab = "feed" | "reels" | "chat";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "feed",  label: "Lenta",  icon: <ImageIcon className="w-[15px] h-[15px]" /> },
    { key: "reels", label: "Reels",  icon: <Play className="w-[15px] h-[15px]" /> },
    { key: "chat",  label: "Chat",   icon: <MessageCircle className="w-[15px] h-[15px]" /> },
];

interface MediaPost {
    id: string;
    kind: "image" | "reel";
    author: {
        name: string;
        shopSlug: string;
        avatarUrl: string;
        verified: boolean;
    };
    coverUrl: string;
    caption: string;
    productSlug?: string;
    productTitle?: string;
    productPrice?: number;
    likes: number;
    comments: number;
    /** Nexus'dagi asl post havolasi (integratsiya) */
    nexusUrl?: string;
}

const MOCK_MEDIA: MediaPost[] = MOCK_SHOPS.slice(0, 6).flatMap((s, i) => {
    const p = MOCK_PRODUCTS[i % MOCK_PRODUCTS.length];
    return [
        {
            id: `m${i}a`,
            kind: (i % 3 === 0 ? "reel" : "image") as "image" | "reel",
            author: {
                name: s.name, shopSlug: s.slug,
                avatarUrl: s.logoUrl ?? "",
                verified: s.tier === "VERIFIED" || s.tier === "PREMIUM",
            },
            coverUrl: p.images[0],
            caption: [
                "Bugun kelgan yangi tovarlar. Hozir arzon narxda!",
                "Original mahsulot, kafolat bilan. Sergeli bozorida.",
                "Katta chegirma — 3 kun ichida. Shoshiling!",
                "Sotuvchi to'g'ridan-to'g'ri: ombordan chiqarilyapti.",
            ][i % 4],
            productSlug: p.slug,
            productTitle: p.title,
            productPrice: p.price,
            likes: 40 + i * 17,
            comments: 3 + i * 2,
            nexusUrl: `https://forhumo.uz/uz/nexus/p/mock-${i}`,
        },
    ];
});

export function BnMedia() {
    const [tab, setTab] = useState<Tab>("feed");

    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-10">
            {/* Sarlavha + integratsiya izohi */}
            <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                    <img
                        src="/logos/humo-nexus.png"
                        alt=""
                        width={32}
                        height={32}
                        className="w-8 h-8 object-contain flex-shrink-0"
                    />
                    <h1 className="text-[24px] sm:text-[30px] font-black tracking-tight leading-none">Nexus</h1>
                    <span
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-black"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <Sparkles className="w-3 h-3" />
                        Humo Nexus bilan integratsiya
                    </span>
                </div>
                <p className="text-[13px] leading-relaxed max-w-[640px]" style={{ color: BN.text2 }}>
                    Sotuvchilarning postlari va reklamalari. Do&apos;kon egasi Humo Nexus&apos;da post qo&apos;ysa,
                    shu yerda ham ko&apos;rinadi — kanal yaratish shart emas.
                </p>
            </div>

            {/* Tablar + filtr */}
            <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1 bn-noscroll">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-xl text-[13.5px] font-bold flex-shrink-0 transition-colors whitespace-nowrap"
                        style={{
                            background: tab === t.key ? BN.goldSoft : BN.surface,
                            border: `1px solid ${tab === t.key ? BN.goldEdge : BN.border}`,
                            color: tab === t.key ? BN.gold : BN.text2,
                        }}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
                <div className="w-px h-6 flex-shrink-0" style={{ background: BN.border }} />
                <button
                    className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[13px] font-bold flex-shrink-0"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
                >
                    <Filter className="w-4 h-4" />
                    Kategoriya
                </button>
                <div className="flex-1" />
                <a
                    href="https://forhumo.uz/uz/nexus"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl text-[13px] font-black flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold, border: `1px solid ${BN.goldEdge}` }}
                >
                    Nexus&apos;da post qo&apos;shish
                    <ArrowUpRight className="w-4 h-4" />
                </a>
            </div>

            {tab === "feed" && <MediaGrid posts={MOCK_MEDIA.filter(m => m.kind === "image")} />}
            {tab === "reels" && <ReelsGrid posts={MOCK_MEDIA.filter(m => m.kind === "reel")} />}
            {tab === "chat" && <ChatEmpty />}
        </div>
    );
}

// ── Lenta (rasmli postlar) ──────────────────────────────────────────────────

function MediaGrid({ posts }: { posts: MediaPost[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map(p => (
                <article
                    key={p.id}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    {/* Avtor */}
                    <BnLink href={`/d/${p.author.shopSlug}`} className="flex items-center gap-2.5 p-3">
                        <span
                            className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 grid place-items-center"
                            style={{ background: BN.surfaceUp }}
                        >
                            {p.author.avatarUrl ? (
                                <img src={p.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <Store className="w-5 h-5" style={{ color: BN.text3 }} />
                            )}
                        </span>
                        <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-1">
                                <span className="text-[13.5px] font-black truncate">{p.author.name}</span>
                                {p.author.verified && (
                                    <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BN.info }} />
                                )}
                            </span>
                            <span className="block text-[11px]" style={{ color: BN.text3 }}>Sotuvchi</span>
                        </span>
                    </BnLink>

                    {/* Rasm */}
                    <div className="aspect-square overflow-hidden" style={{ background: BN.surfaceUp }}>
                        <img
                            src={p.coverUrl}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                        />
                    </div>

                    {/* Amallar + kontent */}
                    <div className="p-3">
                        <div className="flex items-center gap-4 mb-2">
                            <button className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: BN.text2 }}>
                                <Heart className="w-[18px] h-[18px]" />
                                {p.likes}
                            </button>
                            <button className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: BN.text2 }}>
                                <MessageSquare className="w-[18px] h-[18px]" />
                                {p.comments}
                            </button>
                            <button className="ml-auto" style={{ color: BN.text2 }}>
                                <Share2 className="w-[18px] h-[18px]" />
                            </button>
                        </div>

                        <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: BN.text }}>
                            <span className="font-black">{p.author.name}</span>{" "}
                            <span style={{ color: BN.text2 }}>{p.caption}</span>
                        </p>

                        {/* Mahsulot bog'lanmasi (BN farqi — Nexus'da bunday havola bo'lmaydi) */}
                        {p.productSlug && (
                            <BnLink
                                href={`/p/${p.productSlug}`}
                                className="flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                                style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}
                            >
                                <span className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                                    <img src={p.coverUrl} alt="" className="w-full h-full object-cover" />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block text-[12.5px] font-bold truncate">{p.productTitle}</span>
                                    <span className="block text-[13px] font-black tabular-nums mt-0.5" style={{ color: BN.gold }}>
                                        {(p.productPrice ?? 0).toLocaleString("uz-UZ")} so&apos;m
                                    </span>
                                </span>
                                <span
                                    className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-black flex-shrink-0"
                                    style={{ background: BN.gold, color: BN.onGold }}
                                >
                                    Ochish
                                </span>
                            </BnLink>
                        )}
                    </div>
                </article>
            ))}
        </div>
    );
}

// ── Reels (vertikal videolar) ───────────────────────────────────────────────

function ReelsGrid({ posts }: { posts: MediaPost[] }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {posts.map(p => (
                <BnLink
                    key={p.id}
                    href={`/media/${p.id}`}
                    className="group relative rounded-2xl overflow-hidden"
                    style={{ background: BN.surfaceUp, aspectRatio: "9/16", border: `1px solid ${BN.border}` }}
                >
                    <img
                        src={p.coverUrl}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                    <div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 45%)" }}
                    />
                    <span
                        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black leading-none backdrop-blur-sm"
                        style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                    >
                        <Play className="w-3 h-3 fill-current" />
                        Reel
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-2.5">
                        <p className="flex items-center gap-1 text-[11.5px] font-black text-white truncate">
                            {p.author.name}
                            {p.author.verified && <BadgeCheck className="w-3 h-3 flex-shrink-0" style={{ color: BN.info }} />}
                        </p>
                        <p className="flex items-center gap-2 text-[10.5px] mt-1" style={{ color: "rgba(255,255,255,0.75)" }}>
                            <span className="flex items-center gap-0.5">
                                <Heart className="w-3 h-3" />
                                {p.likes}
                            </span>
                            <span className="flex items-center gap-0.5">
                                <MessageSquare className="w-3 h-3" />
                                {p.comments}
                            </span>
                        </p>
                    </div>
                </BnLink>
            ))}
        </div>
    );
}

// ── Chat (bo'sh) ────────────────────────────────────────────────────────────

function ChatEmpty() {
    return (
        <div
            className="rounded-3xl p-8 text-center max-w-[440px] mx-auto"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
        >
            <span
                className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4"
                style={{ background: BN.goldSoft, color: BN.gold }}
            >
                <MessageCircle className="w-7 h-7" />
            </span>
            <p className="text-[15px] font-black mb-1.5">Chat tez orada</p>
            <p className="text-[13px] leading-relaxed" style={{ color: BN.text2 }}>
                Sotuvchi bilan to&apos;g&apos;ridan-to&apos;g&apos;ri yozishasiz — Humo Nexus xabarlashuvining sotuv qismi.
                Xarid boshlash uchun mahsulot sahifasidan &quot;Sotuvchiga yozish&quot; tugmasi bo&apos;ladi.
            </p>
        </div>
    );
}
