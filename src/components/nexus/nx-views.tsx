"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import {
    Search, TrendingUp, Flame, Clock, Zap,
    Film, Music2, Headphones, BookOpen, Mic2,
    Radio, Users, Hash, MessageCircle, Bot, Gift, Trophy,
    Shield, Heart, UserCheck, CreditCard,
    Settings, LogOut, BadgeCheck, Plus, ChevronRight,
    Edit3, Save, X, Loader2, Trash2,
    ListMusic, BarChart2, Compass, Bookmark, Phone,
    ShoppingBag, Wallet, Download, Briefcase, Calendar, Video, Play,
} from "lucide-react";
import { useNxPlayer, type NxShort } from "./nx-player-ctx";
import { NxRow } from "./nx-row";
import { VideoCard, ShortCard, LiveCard, MusicCard, BookCard } from "./nx-cards";
import { NxStories } from "./nx-stories";
import { NxHero } from "./nx-hero";
import { NxFeed } from "./nx-feed";
import { NxSocialFeed } from "./nx-social-feed";

// ─────────────────────────────────────────────────────────────────────────────
// Umumiy yordamchi komponentlar
// ─────────────────────────────────────────────────────────────────────────────
function ViewShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-250 pb-32">
            {children}
        </div>
    );
}

function ViewHeader({ title, accent, desc, children }: {
    title: React.ReactNode; accent?: string; desc?: string; children?: React.ReactNode;
}) {
    return (
        <div
            className="mx-4 mt-4 mb-1 p-5 md:p-7 rounded-2xl relative overflow-hidden"
            style={{
                background: "rgba(11,18,40,0.60)",
                border: "1px solid rgba(43,62,232,0.22)",
            }}
        >
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full pointer-events-none"
                style={{ background: accent ?? "radial-gradient(circle, rgba(43,62,232,0.22) 0%, transparent 70%)" }} />
            <h2 className="text-2xl md:text-3xl font-black text-white mb-1 relative">{title}</h2>
            {desc && <p className="text-sm relative" style={{ color: "rgba(120,140,190,0.85)" }}>{desc}</p>}
            {children && <div className="mt-4 relative">{children}</div>}
        </div>
    );
}

function SearchBar({ placeholder }: { placeholder: string }) {
    return (
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(43,62,232,0.55)" }} />
            <input
                type="text"
                placeholder={placeholder}
                className="w-full h-11 rounded-xl pl-11 pr-4 text-sm text-white outline-none transition-all duration-200"
                style={{
                    background: "rgba(5,8,24,0.60)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    caretColor: "#00CEC8",
                }}
                onFocus={e => {
                    e.currentTarget.style.borderColor = "rgba(43,62,232,0.55)";
                    e.currentTarget.style.background = "rgba(5,8,24,0.80)";
                }}
                onBlur={e => {
                    e.currentTarget.style.borderColor = "rgba(43,62,232,0.22)";
                    e.currentTarget.style.background = "rgba(5,8,24,0.60)";
                }}
            />
        </div>
    );
}

function FilterChips({ items }: { items: { icon: React.ElementType; label: string }[] }) {
    const [active, setActive] = useState(0);
    return (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {items.map(({ icon: Icon, label }, i) => (
                <button
                    key={i}
                    onClick={() => setActive(i)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200 active:scale-95"
                    style={active === i ? {
                        background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                        color: "white",
                        boxShadow: "0 4px 14px rgba(43,62,232,0.40)",
                    } : {
                        background: "rgba(43,62,232,0.10)",
                        border: "1px solid rgba(43,62,232,0.22)",
                        color: "rgba(140,160,210,0.85)",
                    }}
                >
                    <Icon className="w-3 h-3" />
                    {label}
                </button>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEED VIEW — bosh sahifa
// ─────────────────────────────────────────────────────────────────────────────
export function FeedView() {
    const { setMarketOpen, setEventsOpen, setJobsOpen, setSpacesOpen, setTrendingOpen, setAiOpen, setLeaderboardOpen } = useNxPlayer();
    return (
        <ViewShell>
            <NxStories />
            <NxHero />
            {/* ── Tezkor xususiyatlar ─────────────────────────────────── */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {[
                    { label: "Nexus AI",     icon: Bot,         grad: "linear-gradient(135deg,#8B5CF6,#EC4899)", action: () => setAiOpen(true)      },
                    { label: "Trendlar",     icon: TrendingUp,  grad: "linear-gradient(135deg,#F97316,#EF4444)", action: () => setTrendingOpen(true)},
                    { label: "Nexus Market", icon: ShoppingBag, grad: "linear-gradient(135deg,#F59E0B,#F97316)", action: () => setMarketOpen(true)  },
                    { label: "Tadbirlar",    icon: Calendar,    grad: "linear-gradient(135deg,#EC4899,#8B5CF6)", action: () => setEventsOpen(true)  },
                    { label: "Nexus Jobs",   icon: Briefcase,   grad: "linear-gradient(135deg,#0EA5E9,#2B3EE8)", action: () => setJobsOpen(true)    },
                    { label: "Spaces",       icon: Headphones,  grad: "linear-gradient(135deg,#8B5CF6,#EC4899)", action: () => setSpacesOpen(true)      },
                    { label: "Leaderboard",  icon: Trophy,      grad: "linear-gradient(135deg,#F59E0B,#F97316)", action: () => setLeaderboardOpen(true) },
                ].map(({ label, icon: Icon, grad, action }) => (
                    <button key={label} onClick={action}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 transition-all duration-150 active:scale-95"
                        style={{ background: "rgba(11,18,40,0.70)", border: "1px solid rgba(43,62,232,0.20)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.45)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.20)"}
                    >
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: grad }}>
                            <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-bold" style={{ color: "rgba(180,195,235,0.90)" }}>{label}</span>
                    </button>
                ))}
            </div>
            <NxFeed />
        </ViewShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO VIEW
// ─────────────────────────────────────────────────────────────────────────────
const VIDEO_SHORTS: NxShort[] = Array.from({ length: 10 }, (_, i) => ({
    image:    `https://picsum.photos/seed/vs${i + 80}/400/711`,
    author:   `@talent_${i + 1}`,
    views:    `${(i + 1) * 200}K`,
    likes:    `${(i + 1) * 25}K`,
    duration: `0:${String(20 + i * 4).padStart(2, "0")}`,
}));

export function VideoView() {
    const { openShorts, setExploreOpen, setSubsOpen } = useNxPlayer();
    return (
        <ViewShell>
            <ViewHeader
                title={<>Video <span style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Dunyo</span></>}
                desc="G. videolar, Shorts va professional kontentlar"
            >
                <div className="flex flex-col gap-3">
                    <SearchBar placeholder="Video yoki kanal qidiring..." />
                    <FilterChips items={[
                        { icon: Flame,      label: "Trendda"    },
                        { icon: Zap,        label: "Yangi"      },
                        { icon: TrendingUp, label: "O'sish"     },
                        { icon: Clock,      label: "Ko'rilmagan"},
                        { icon: Hash,       label: "Gaming"     },
                        { icon: Hash,       label: "Tech"       },
                        { icon: Hash,       label: "Ta'lim"     },
                    ]} />
                </div>
            </ViewHeader>

            <NxRow title="Tavsiya etilgan" onSeeAll={() => setExploreOpen(true)}>
                {Array.from({ length: 7 }, (_, i) => (
                    <VideoCard key={i}
                        title={["Nexus SDK — To'liq qo'llanma", "O'zbekiston AI ekotizimi", "React 19 amaliy", "Kino yaratish asoslari", "Musiqa produksiyasi", "Startup qurish", "UX dizayn sirlari"][i]}
                        image={`https://picsum.photos/seed/vv${i + 70}/800/450`}
                        views={`${(i + 2) * 78}K`} duration={`${12 + i * 2}:${String(i * 11 % 60).padStart(2, "0")}`}
                        author={["Dev UZ", "AI Hub", "Sardor K.", "Film Lab", "Beat Studio", "Startup UZ", "UX School"][i]}
                        avatar={`https://api.dicebear.com/9.x/avataaars/svg?seed=vauthor${i}`}
                    />
                ))}
            </NxRow>

            <NxRow title="Shorts" accent="linear-gradient(180deg,#8B5CF6,#6366F1)" onSeeAll={() => openShorts(VIDEO_SHORTS, 0)}>
                {VIDEO_SHORTS.map((s, i) => (
                    <ShortCard key={i} {...s} onClick={() => openShorts(VIDEO_SHORTS, i)} />
                ))}
            </NxRow>

            <NxRow title="Obuna bo'lganlar" onSeeAll={() => setSubsOpen(true)}>
                {Array.from({ length: 6 }, (_, i) => (
                    <VideoCard key={i}
                        title={`Yangi video — ${["Humo Dev", "Sardor", "Kamola", "Tech UZ", "Beat Lab", "Film School"][i]}`}
                        image={`https://picsum.photos/seed/sub${i + 90}/800/450`}
                        views={`${(i + 1) * 45}K`} duration={`${8 + i}:00`}
                        author={["Humo Dev", "Sardor", "Kamola", "Tech UZ", "Beat Lab", "Film School"][i]}
                        avatar={`https://api.dicebear.com/9.x/avataaars/svg?seed=sub${i}`}
                    />
                ))}
            </NxRow>
        </ViewShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE VIEW
// ─────────────────────────────────────────────────────────────────────────────
export function LiveView() {
    return (
        <ViewShell>
            <ViewHeader
                title={<>Jonli <span style={{ background: "linear-gradient(135deg,#EF4444,#F97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Efirlar</span></>}
                desc="Real vaqtda dunyo bo'ylab kontentlar"
                accent="radial-gradient(circle, rgba(239,68,68,0.25) 0%, transparent 70%)"
            >
                <FilterChips items={[
                    { icon: Radio,  label: "Hammasi"    },
                    { icon: Hash,   label: "Gaming"     },
                    { icon: Hash,   label: "Musiqa"     },
                    { icon: Hash,   label: "Dasturlash" },
                    { icon: Hash,   label: "Sport"      },
                    { icon: Hash,   label: "Ta'lim"     },
                ]} />
            </ViewHeader>

            <NxRow title="Hozir Jonli" accent="linear-gradient(180deg,#EF4444,#F97316)">
                {[
                    { title: "Nexus Launch Event",      author: "Humo Official",  viewers: "18.5K", category: "Tech"      },
                    { title: "Pro Gaming Finals",        author: "eSport UZ",      viewers: "9.2K",  category: "Gaming"    },
                    { title: "Milliy Musiqa Festivali",  author: "Madina Ergash",  viewers: "5.8K",  category: "Musiqa"    },
                    { title: "React Native Workshop",    author: "Dev Sardor",     viewers: "3.1K",  category: "Kod"       },
                    { title: "Futbol — Real vs Barca",   author: "Sport UZ",       viewers: "42K",   category: "Sport"     },
                    { title: "AI Chat bilan suhbat",     author: "Humo AI",        viewers: "7.6K",  category: "AI"        },
                ].map((s, i) => (
                    <LiveCard key={i} title={s.title}
                        image={`https://picsum.photos/seed/lv${i + 100}/800/450`}
                        author={s.author} viewers={s.viewers} category={s.category} />
                ))}
            </NxRow>

            <NxRow title="Tez kunda boshlanadi" accent="linear-gradient(180deg,#10B981,#00CEC8)">
                {Array.from({ length: 5 }, (_, i) => (
                    <LiveCard key={i}
                        title={`Kutilayotgan Efir ${i + 1}`}
                        image={`https://picsum.photos/seed/upcoming${i + 110}/800/450`}
                        author={`Kreator ${i + 1}`} viewers={`${(i + 1) * 800}`} category="Tayyor" />
                ))}
            </NxRow>

            <NxRow title="Yaqinda tugagan" accent="linear-gradient(180deg,#6366F1,#8B5CF6)">
                {Array.from({ length: 5 }, (_, i) => (
                    <VideoCard key={i}
                        title={`Efir yozuvi — ${i + 1}-son`}
                        image={`https://picsum.photos/seed/rec${i + 120}/800/450`}
                        views={`${(i + 1) * 5.2}K`} duration={`${1 + i}s ${i * 10}d`}
                        author={`Streamer ${i + 1}`}
                        avatar={`https://api.dicebear.com/9.x/avataaars/svg?seed=stream${i}`}
                    />
                ))}
            </NxRow>
        </ViewShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDIA VIEW — Kino / Musiqa / Podcast / AudioKitob / Kitob
// ─────────────────────────────────────────────────────────────────────────────
const MEDIA_TABS = [
    { id: "cinema",    icon: Film,       label: "Kino"       },
    { id: "music",     icon: Music2,     label: "Musiqa"     },
    { id: "podcast",   icon: Mic2,       label: "Podcast"    },
    { id: "audiobook", icon: Headphones, label: "Audiokitob" },
    { id: "book",      icon: BookOpen,   label: "Kitob"      },
];

export function MediaView() {
    const [sub, setSub] = useState("cinema");
    const { setPlaylistsOpen, setReaderOpen, setPodcastsOpen, setAlbumsOpen, setTrendingOpen } = useNxPlayer();

    return (
        <ViewShell>
            {/* Sub-tablar */}
            <div
                className="mx-4 mt-4 mb-2 flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "none" }}
            >
                {MEDIA_TABS.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => setSub(id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0 transition-all duration-200 active:scale-95"
                        style={sub === id ? {
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            color: "white",
                            boxShadow: "0 4px 16px rgba(43,62,232,0.40)",
                        } : {
                            background: "rgba(11,18,40,0.60)",
                            border: "1px solid rgba(43,62,232,0.22)",
                            color: "rgba(140,160,210,0.85)",
                        }}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {sub === "cinema" && (
                <>
                    <NxRow title="Trendda — Kinolar" accent="linear-gradient(180deg,#F59E0B,#EF4444)" onSeeAll={() => setTrendingOpen(true)}>
                        {Array.from({ length: 6 }, (_, i) => (
                            <VideoCard key={i}
                                title={["Abadiyat Soyasida", "Ko'k Osmon", "Yolg'iz Qadam", "Toshkent Tuni", "Shamol Bilan", "Ikki Dunyo"][i]}
                                image={`https://picsum.photos/seed/cin${i + 130}/800/450`}
                                views={`${(i + 1) * 1.4}M`} duration={`2s ${i * 8 + 5}d`}
                                author="Humo Cinema"
                                avatar="https://api.dicebear.com/9.x/avataaars/svg?seed=cinema" />
                        ))}
                    </NxRow>
                    <NxRow title="Seriallar" onSeeAll={() => setTrendingOpen(true)}>
                        {Array.from({ length: 6 }, (_, i) => (
                            <VideoCard key={i}
                                title={`Serial ${i + 1} — Yangi mavsum`}
                                image={`https://picsum.photos/seed/ser${i + 136}/800/450`}
                                views={`${(i + 1) * 800}K`} duration={`${i + 1} fasl`}
                                author="Humo Cinema"
                                avatar="https://api.dicebear.com/9.x/avataaars/svg?seed=serial" />
                        ))}
                    </NxRow>
                </>
            )}

            {sub === "music" && (
                <>
                    {/* Pleylist tez-havola */}
                    <div className="mx-4 mb-3">
                        <button
                            onClick={() => setPlaylistsOpen(true)}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-150 active:scale-95"
                            style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: "linear-gradient(135deg,#10B981,#0D9488)" }}>
                                <ListMusic className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-black text-white">Mening pleylistlarim</p>
                                <p className="text-[10px]" style={{ color: "rgba(80,180,140,0.80)" }}>Treklarni boshqarish va yangi to'plam yaratish</p>
                            </div>
                            <ChevronRight className="w-4 h-4" style={{ color: "rgba(16,185,129,0.60)" }} />
                        </button>
                    </div>
                    <NxRow title="Top Treklar" accent="linear-gradient(180deg,#10B981,#00CEC8)" onSeeAll={() => setPlaylistsOpen(true)}>
                        {Array.from({ length: 8 }, (_, i) => (
                            <MusicCard key={i}
                                title={["Bahor Ohangi", "Tun Yulduzi", "Sevgi Qo'shig'i", "Uzoq Yo'l", "Yurak Tori", "Osmon Osti", "Erkin Qush", "Yangi Kun"][i]}
                                artist={["Madina", "Sardor", "Kamola", "Bobur", "Dilnoza", "Jasur", "Zulfiya", "Islom"][i]}
                                image={`https://picsum.photos/seed/mus${i + 150}/400/400`}
                                duration={`${3 + i % 2}:${String(20 + i * 7 % 40).padStart(2, "0")}`}
                                listens={`${(i + 1) * 380}K`} />
                        ))}
                    </NxRow>
                    <NxRow title="Yangi Albomlar" onSeeAll={() => setAlbumsOpen(true)}>
                        {Array.from({ length: 6 }, (_, i) => (
                            <MusicCard key={i}
                                title={`Yangi Albom ${i + 1}`} artist={`Artist ${i + 1}`}
                                image={`https://picsum.photos/seed/alb${i + 160}/400/400`}
                                duration={`${10 + i * 2} trek`} listens={`${(i + 1) * 120}K`} />
                        ))}
                    </NxRow>
                </>
            )}

            {(sub === "podcast" || sub === "audiobook") && (
                <NxRow title={sub === "podcast" ? "Mashhur Podcastlar" : "Audiokitoblar"} accent="linear-gradient(180deg,#8B5CF6,#6366F1)" onSeeAll={() => sub === "podcast" ? setPodcastsOpen(true) : setReaderOpen(true)}>
                    {Array.from({ length: 6 }, (_, i) => (
                        <BookCard key={i}
                            title={sub === "podcast" ? `Podcast — ${["Biznes", "Tech", "Psixologiya", "Tarix", "Fan", "Sport"][i]}` : `Audiokitob ${i + 1}`}
                            author={`Muallif ${i + 1}`}
                            image={`https://picsum.photos/seed/pod${i + 170}/400/600`}
                            rating={`4.${6 + i % 4}`}
                            pages={`${i + 1}s ${i * 20 + 10}d`}
                            type="audio" />
                    ))}
                </NxRow>
            )}

            {sub === "book" && (
                <NxRow title="E-Kitoblar" accent="linear-gradient(180deg,#F59E0B,#D97706)" onSeeAll={() => setReaderOpen(true)}>
                    {Array.from({ length: 6 }, (_, i) => (
                        <BookCard key={i}
                            title={["Raqamli Ozodlik", "AI va Biznes", "Kreator Iqtisodiyoti", "O'zbek Texnologiyasi", "Dasturchi Orzusi", "Muvaffaqiyat"][i]}
                            author={`Muallif ${i + 1}`}
                            image={`https://picsum.photos/seed/book${i + 180}/400/600`}
                            rating={`4.${5 + i % 5}`} pages={`${250 + i * 50} bet`} type="ebook" />
                    ))}
                </NxRow>
            )}
        </ViewShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL VIEW — Postlar, Chat, Kanal, Guruh, Bot
// ─────────────────────────────────────────────────────────────────────────────
const SOCIAL_TABS = [
    { id: "posts",   icon: Flame,         label: "Postlar"  },
    { id: "chat",    icon: MessageCircle, label: "Chatlar"  },
    { id: "channel", icon: Hash,          label: "Kanallar" },
    { id: "group",   icon: Users,         label: "Guruhlar" },
    { id: "bot",     icon: Bot,           label: "Botlar"   },
];

const CHAT_LIST = [
    { name: "Islomjon",      msg: "Yangi loyiha haqida...",        time: "14:32", unread: 3,  online: true  },
    { name: "Dizayn Jamoa",  msg: "Fayl: mockup.fig yuklandi",     time: "12:45", unread: 0,  online: false, group: true },
    { name: "Madina",        msg: "Rahmat! Juda ajoyib",           time: "11:20", unread: 1,  online: true  },
    { name: "Do'stlar",      msg: "Sardor: Qayerdasiz?",           time: "10:05", unread: 0,  online: false, group: true },
    { name: "Sardor",        msg: "Ertaga uchrashamiz?",           time: "09:30", unread: 0,  online: false },
    { name: "Humo Support",  msg: "Muammoingiz hal qilindi",       time: "Kecha", unread: 0,  online: true  },
    { name: "Kamola",        msg: "Ha, yaxshi g'oya!",             time: "Kecha", unread: 0,  online: false },
    { name: "Dev Guruh",     msg: "Bobur: PR merge qilindi",       time: "Dush",  unread: 5,  online: false, group: true },
];

export function SocialView() {
    const [sub, setSub] = useState("posts");
    const { setMessagesOpen, setExploreOpen, setGroupsOpen } = useNxPlayer();

    return (
        <ViewShell>
            {/* Sub-tablar */}
            <div className="mx-4 mt-4 mb-3 flex gap-2">
                {SOCIAL_TABS.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => setSub(id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 transition-all duration-200 active:scale-95"
                        style={sub === id ? {
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            color: "white",
                        } : {
                            background: "rgba(11,18,40,0.60)",
                            border: "1px solid rgba(43,62,232,0.22)",
                            color: "rgba(140,160,210,0.85)",
                        }}
                    >
                        <Icon className="w-3.5 h-3.5" />{label}
                    </button>
                ))}
            </div>

            {sub === "posts" && <NxSocialFeed />}

            {sub === "chat" && (
                <div className="mx-4">
                    <button
                        onClick={() => setMessagesOpen(true)}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-sm font-bold text-white transition-all duration-150 active:scale-95 mb-3"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.40)" }}
                    >
                        <MessageCircle className="w-5 h-5" />
                        Xabarlarni ochish
                    </button>
                    <div className="rounded-2xl overflow-hidden"
                        style={{ background: "rgba(8,14,32,0.70)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        {CHAT_LIST.map((c, i) => (
                            <button
                                key={i}
                                onClick={() => setMessagesOpen(true)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 group"
                                style={{ borderBottom: i < CHAT_LIST.length - 1 ? "1px solid rgba(43,62,232,0.08)" : "none" }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className="w-11 h-11 rounded-2xl overflow-hidden"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", padding: "2px" }}>
                                        <div className="w-full h-full rounded-[14px] bg-[#050818] overflow-hidden">
                                            <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${c.name}`} alt={c.name} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    {c.online && (
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                            style={{ background: "#10B981", borderColor: "#050818" }} />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-sm font-bold text-white flex items-center gap-1.5 group-hover:text-[#00CEC8] transition-colors duration-150">
                                            {c.name}
                                            {c.group && <Users className="w-3 h-3" style={{ color: "#00CEC8" }} />}
                                        </span>
                                        <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(80,100,150,0.80)" }}>{c.time}</span>
                                    </div>
                                    <p className="text-xs truncate" style={{ color: "rgba(100,120,170,0.75)" }}>{c.msg}</p>
                                </div>
                                {c.unread > 0 && (
                                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        {c.unread}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {sub === "channel" && (
                <div className="mx-4">
                    <button
                        onClick={() => setGroupsOpen(true)}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-sm font-bold text-white mb-3 transition-all duration-150 active:scale-95"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.40)" }}
                    >
                        <Hash className="w-5 h-5" />
                        Kanallar va Guruhlarni ochish
                    </button>
                    <div className="flex flex-col gap-2">
                        {["Nexus Rasmiy", "Tech UZ", "Humo AI News", "Kino Dunyo", "Sport Live", "Biznes UZ"].map((name, i) => (
                            <button key={i}
                                onClick={() => setGroupsOpen(true)}
                                className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all duration-150 group"
                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)"}
                            >
                                <div className="w-11 h-11 rounded-2xl overflow-hidden flex-shrink-0"
                                    style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.40),rgba(0,206,200,0.30))" }}>
                                    <img src={`https://api.dicebear.com/9.x/identicon/svg?seed=${name}`} alt={name} className="w-full h-full" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white group-hover:text-[#00CEC8] transition-colors duration-150">{name}</p>
                                    <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>{(i + 1) * 12.4}K a'zo</p>
                                </div>
                                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.50)" }} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {sub === "group" && (
                <div className="mx-4">
                    <button
                        onClick={() => setGroupsOpen(true)}
                        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-sm font-bold text-white mb-3 transition-all duration-150 active:scale-95"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.40)" }}
                    >
                        <Users className="w-5 h-5" />
                        Guruhlarni ochish
                    </button>
                    <div className="flex flex-col gap-2">
                        {["Nexus Kreatorlar", "O'zbek Dasturchilar", "Dizaynerlar Jamoasi", "Marketing Professionals", "Startup Founders UZ"].map((name, i) => (
                            <button key={i}
                                onClick={() => setGroupsOpen(true)}
                                className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all duration-150 group"
                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)"}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)"}
                            >
                                <div className="w-11 h-11 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-white group-hover:text-[#00CEC8] transition-colors duration-150">{name}</p>
                                    <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>{(i + 1) * 340} a'zo</p>
                                </div>
                                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.50)" }} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {sub === "bot" && (
                <div className="mx-4 flex flex-col gap-2">
                    {[
                        { name: "Humo Assistant",  desc: "AI yordamchi — savol-javob, kontent tavsiya" },
                        { name: "Nexus Publisher", desc: "Kontent nashr qilish — bitta bosish" },
                        { name: "Analytics Bot",   desc: "Statistika va daromad hisoboti" },
                        { name: "Pay Bot",         desc: "To'lov tizimi — Payme, Click" },
                    ].map((b, i) => (
                        <button key={i}
                            className="flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all duration-150 group"
                            style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)"}
                        >
                            <div className="w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg,#8B5CF6,#6366F1)" }}>
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white group-hover:text-[#00CEC8] transition-colors duration-150">{b.name}</p>
                                <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.80)" }}>{b.desc}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.50)" }} />
                        </button>
                    ))}
                    {/* Bot yaratish */}
                    <button
                        className="flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-bold text-white transition-all duration-200 active:scale-98 mt-2"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.40)" }}
                    >
                        <Plus className="w-4 h-4" />
                        Yangi bot yaratish
                    </button>
                </div>
            )}
        </ViewShell>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE VIEW — Humo ID + real data + edit modal
// ─────────────────────────────────────────────────────────────────────────────
interface ProfileData {
    name?: string | null; firstName?: string | null; lastName?: string | null;
    bio?: string | null; username?: string | null; city?: string | null;
    image?: string | null;
}

export function ProfileView() {
    const { data: session } = useSession();
    const { watchHistory, clearHistory, openVideo, openSavedHistory, setPlaylistsOpen, setAnalyticsOpen, setSavedOpen, setSubsOpen, setCallsOpen, setSpacesOpen, setWalletOpen, setMarketOpen, setDownloadsOpen, setJobsOpen, setEventsOpen, setGoLiveOpen, setGiftsOpen, setTrendingOpen, setAiOpen, setLeaderboardOpen, setMeetingOpen } = useNxPlayer();

    const sessionName  = session?.user?.name  ?? "Mehmon";
    const sessionEmail = session?.user?.email ?? "—";
    const sessionImage = session?.user?.image ?? null;

    const [profile,     setProfile]     = useState<ProfileData | null>(null);
    const [editOpen,    setEditOpen]    = useState(false);
    const [editFirst,   setEditFirst]   = useState("");
    const [editLast,    setEditLast]    = useState("");
    const [editBio,     setEditBio]     = useState("");
    const [saving,      setSaving]      = useState(false);
    const [saveError,   setSaveError]   = useState("");

    /* Real profil ma'lumotlarini yuklash */
    const fetchProfile = useCallback(async () => {
        if (!session?.user?.email) return;
        try {
            const res = await fetch("/api/user/profile");
            if (res.ok) setProfile(await res.json());
        } catch { /* ignore */ }
    }, [session?.user?.email]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    /* Edit modal ochilganda mavjud qiymatlarni to'ldirish */
    const openEdit = () => {
        setEditFirst(profile?.firstName ?? sessionName.split(" ")[0] ?? "");
        setEditLast(profile?.lastName  ?? sessionName.split(" ")[1] ?? "");
        setEditBio(profile?.bio ?? "");
        setSaveError("");
        setEditOpen(true);
    };

    const handleSave = async () => {
        setSaving(true); setSaveError("");
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName: editFirst, lastName: editLast, bio: editBio }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                setSaveError(d?.error ?? "Xatolik yuz berdi");
            } else {
                setProfile(await res.json());
                setEditOpen(false);
            }
        } catch { setSaveError("Tarmoq xatosi"); }
        finally { setSaving(false); }
    };

    const displayName  = profile?.firstName
        ? [profile.firstName, profile.lastName].filter(Boolean).join(" ")
        : sessionName;
    const displayImage = profile?.image ?? sessionImage;
    const initial      = displayName[0]?.toUpperCase() ?? "U";

    return (
        <ViewShell>
            {/* ── Profil kartasi ────────────────────────────────────────── */}
            <div className="mx-4 mt-4 rounded-2xl p-6 relative overflow-hidden"
                style={{ background: "rgba(11,18,40,0.65)", border: "1px solid rgba(43,62,232,0.25)" }}>
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle,rgba(43,62,232,0.22) 0%,transparent 70%)" }} />
                <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle,rgba(0,206,200,0.12) 0%,transparent 70%)" }} />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl p-[2.5px] flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 0 32px rgba(43,62,232,0.45)" }}>
                        <div className="w-full h-full rounded-[14px] bg-[#050818] overflow-hidden flex items-center justify-center text-2xl font-black text-white">
                            {displayImage
                                ? <img src={displayImage} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                : initial}
                        </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-2xl font-black text-white mb-0.5">{displayName}</h2>
                        {profile?.username && (
                            <p className="text-xs font-mono mb-1" style={{ color: "#00CEC8" }}>@{profile.username}</p>
                        )}
                        <p className="text-sm font-mono mb-2" style={{ color: "rgba(100,120,170,0.80)" }}>{sessionEmail}</p>
                        {profile?.bio && (
                            <p className="text-xs mb-3 leading-relaxed" style={{ color: "rgba(140,160,210,0.80)" }}>
                                {profile.bio}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            {[
                                { icon: Shield,     label: "Tasdiqlangan", color: "#00CEC8" },
                                { icon: BadgeCheck, label: "Nexus Member", color: "#10B981" },
                            ].map(({ icon: Icon, label, color }, i) => (
                                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                                    style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                    <Icon className="w-3 h-3" style={{ color }} />
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                            onClick={openEdit}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity duration-150 hover:opacity-85 active:scale-95"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 18px rgba(43,62,232,0.45)" }}
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            Tahrirlash
                        </button>
                        <button
                            onClick={() => setGoLiveOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity duration-150 hover:opacity-85 active:scale-95"
                            style={{ background: "linear-gradient(135deg,#EF4444,#F97316)" }}
                        >
                            <Radio className="w-3.5 h-3.5" />
                            Go Live
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Follower / Following ──────────────────────────────────── */}
            <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
                {[
                    { label: "Kuzatuvchilar", value: "8.4K", action: () => setSubsOpen(true) },
                    { label: "Kuzatilmoqda",  value: "312",  action: () => setSubsOpen(true) },
                    { label: "Postlar",        value: "47",   action: undefined },
                ].map(({ label, value, action }, i) => (
                    <button key={i} onClick={action}
                        className="flex flex-col items-center py-4 rounded-2xl transition-all duration-150"
                        style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)", cursor: action ? "pointer" : "default" }}
                        onMouseEnter={e => action && ((e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)")}
                        onMouseLeave={e => action && ((e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)")}
                    >
                        <p className="text-2xl font-black text-white">{value}</p>
                        <p className="text-[10px] mt-0.5 font-bold" style={{ color: "rgba(100,120,170,0.75)" }}>{label}</p>
                    </button>
                ))}
            </div>

            {/* ── Tezkor havolalar ──────────────────────────────────────── */}
            <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
                {[
                    { label: "Saqlangan",   icon: Bookmark,     grad: "linear-gradient(135deg,#F59E0B,#EF4444)",  action: () => setSavedOpen(true)      },
                    { label: "Pleylistlar", icon: ListMusic,    grad: "linear-gradient(135deg,#10B981,#0D9488)",  action: () => setPlaylistsOpen(true)  },
                    { label: "Analitika",   icon: BarChart2,    grad: "linear-gradient(135deg,#2B3EE8,#00CEC8)",  action: () => setAnalyticsOpen(true)  },
                    { label: "Obunalar",    icon: Users,        grad: "linear-gradient(135deg,#8B5CF6,#6366F1)",  action: () => setSubsOpen(true)       },
                    { label: "Qo'ng'iroq",  icon: Phone,        grad: "linear-gradient(135deg,#10B981,#00CEC8)",  action: () => setCallsOpen(true)      },
                    { label: "Spaces",      icon: Headphones,   grad: "linear-gradient(135deg,#8B5CF6,#EC4899)",  action: () => setSpacesOpen(true)     },
                    { label: "Hamyon",      icon: Wallet,       grad: "linear-gradient(135deg,#10B981,#14B8A6)",  action: () => setWalletOpen(true)     },
                    { label: "Market",      icon: ShoppingBag,  grad: "linear-gradient(135deg,#F59E0B,#F97316)",  action: () => setMarketOpen(true)     },
                    { label: "Tadbirlar",   icon: Calendar,     grad: "linear-gradient(135deg,#EC4899,#8B5CF6)",  action: () => setEventsOpen(true)     },
                    { label: "Yuklangan",   icon: Download,     grad: "linear-gradient(135deg,#2B3EE8,#6366F1)",  action: () => setDownloadsOpen(true)  },
                    { label: "Jobs",        icon: Briefcase,    grad: "linear-gradient(135deg,#0EA5E9,#2B3EE8)",  action: () => setJobsOpen(true)       },
                    { label: "Sovg'alar",   icon: Gift,         grad: "linear-gradient(135deg,#F59E0B,#EF4444)",  action: () => setGiftsOpen(true)      },
                    { label: "Trendlar",    icon: TrendingUp,   grad: "linear-gradient(135deg,#F97316,#EF4444)",  action: () => setTrendingOpen(true)   },
                    { label: "Nexus AI",    icon: Bot,          grad: "linear-gradient(135deg,#8B5CF6,#EC4899)",  action: () => setAiOpen(true)         },
                    { label: "Leaderboard", icon: Trophy,       grad: "linear-gradient(135deg,#F59E0B,#F97316)",  action: () => setLeaderboardOpen(true)},
                    { label: "Video Majlis",icon: Video,        grad: "linear-gradient(135deg,#2B3EE8,#00CEC8)",  action: () => setMeetingOpen(true)    },
                ].map(({ label, icon: Icon, grad, action }, i) => (
                    <button key={i}
                        onClick={action}
                        className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-150 active:scale-95"
                        style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)")}
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: grad }}>
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-xs font-black text-white">{label}</p>
                    </button>
                ))}
            </div>

            {/* ── Statistika ────────────────────────────────────────────── */}
            <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
                {[
                    { icon: Heart,      label: "Layklar",    value: "1.2M",  gradient: "from-red-500 to-pink-600",      action: undefined                 },
                    { icon: UserCheck,  label: "Obunachi",   value: "8.4K",  gradient: "from-[#2B3EE8] to-[#00CEC8]",  action: () => setSubsOpen(true)   },
                    { icon: CreditCard, label: "Hamyon",     value: "240K",  gradient: "from-emerald-500 to-teal-600",  action: () => setWalletOpen(true) },
                    { icon: Shield,     label: "Xavfsizlik", value: "Yuqori",gradient: "from-violet-500 to-indigo-600", action: undefined                 },
                ].map(({ icon: Icon, label, value, gradient, action }, i) => (
                    <button key={i} onClick={action}
                        className="flex items-center gap-3 p-4 rounded-2xl transition-all duration-150 text-left"
                        style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)", cursor: action ? "pointer" : "default" }}
                        onMouseEnter={e => action && ((e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)")}
                        onMouseLeave={e => action && ((e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)")}
                    >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${gradient}`}>
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(80,100,150,0.80)" }}>{label}</p>
                            <p className="text-lg font-black text-white">{value}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* ── Ko'rish tarixi ────────────────────────────────────────── */}
            {watchHistory.length > 0 && (
                <div className="mx-4 mt-3 rounded-2xl overflow-hidden"
                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}>
                    <div className="flex items-center justify-between px-5 py-3"
                        style={{ borderBottom: "1px solid rgba(43,62,232,0.12)" }}>
                        <h3 className="text-sm font-black text-white flex items-center gap-2">
                            <Clock className="w-4 h-4" style={{ color: "#00CEC8" }} />
                            Ko'rish tarixi ({watchHistory.length})
                        </h3>
                        <div className="flex items-center gap-2">
                            <button onClick={openSavedHistory}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg"
                                style={{ color: "#00CEC8", background: "rgba(0,206,200,0.08)" }}>
                                Barchasi
                            </button>
                            <button onClick={clearHistory}
                                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg"
                                style={{ color: "rgba(239,68,68,0.80)", background: "rgba(239,68,68,0.08)" }}>
                                <Trash2 className="w-3 h-3" />
                                Tozalash
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 overflow-x-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
                        {watchHistory.slice(0, 12).map((v, i) => (
                            <button
                                key={i}
                                onClick={() => openVideo(v)}
                                className="flex-shrink-0 w-32 group text-left"
                            >
                                <div className="relative aspect-video rounded-lg overflow-hidden mb-1"
                                    style={{ border: "1px solid rgba(43,62,232,0.15)" }}>
                                    <img src={v.image} alt={v.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                        style={{ background: "rgba(5,8,24,0.50)" }}>
                                        <Play className="w-5 h-5 text-white fill-white" />
                                    </div>
                                    <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[8px] font-bold"
                                        style={{ background: "rgba(5,8,24,0.80)" }}>{v.duration}</div>
                                </div>
                                <p className="text-[10px] font-bold text-white line-clamp-2 leading-snug group-hover:text-[#00CEC8] transition-colors">{v.title}</p>
                                <p className="text-[9px] mt-0.5" style={{ color: "rgba(80,100,150,0.80)" }}>{v.author}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Sozlamalar ────────────────────────────────────────────── */}
            <div className="mx-4 mt-3 rounded-2xl p-5"
                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.20)" }}>
                <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" style={{ color: "#00CEC8" }} />
                    Tezkor sozlamalar
                </h3>
                <div className="space-y-2">
                    {["Ochiq profil", "Ikki bosqichli tasdiqlash", "Bildirishnomalar"].map((label, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                            style={{ background: "rgba(5,8,24,0.50)", border: "1px solid rgba(43,62,232,0.12)" }}>
                            <span className="text-sm font-medium" style={{ color: "rgba(140,160,210,0.85)" }}>{label}</span>
                            <div className="w-9 h-5 rounded-full relative cursor-pointer"
                                style={{ background: i < 2 ? "linear-gradient(90deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.20)" }}>
                                <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                                    style={{ [i < 2 ? "right" : "left"]: "2px" }} />
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center justify-between p-3 rounded-xl font-bold text-sm text-red-400 transition-colors duration-150 group"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.14)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"}
                    >
                        <span>Chiqish</span>
                        <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
                    </button>
                </div>
            </div>

            {/* ── Profil tahrirlash modali ───────────────────────────────── */}
            {editOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[60]"
                        style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                        onClick={() => setEditOpen(false)}
                    />
                    <div
                        className="fixed inset-x-4 bottom-0 z-[60] rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:rounded-3xl"
                        style={{
                            background: "rgba(8,12,32,0.98)",
                            border: "1px solid rgba(43,62,232,0.25)",
                            boxShadow: "0 32px 80px rgba(0,0,0,0.60)",
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4"
                            style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                            <h3 className="text-base font-black text-white">Profilni tahrirlash</h3>
                            <button
                                onClick={() => setEditOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl"
                                style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}
                            >
                                <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                            </button>
                        </div>

                        {/* Fields */}
                        <div className="px-5 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                                        style={{ color: "rgba(43,62,232,0.70)" }}>Ism</label>
                                    <input
                                        value={editFirst}
                                        onChange={e => setEditFirst(e.target.value)}
                                        placeholder="Ism"
                                        className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
                                        style={{
                                            background: "rgba(5,8,24,0.70)",
                                            border: "1px solid rgba(43,62,232,0.25)",
                                            caretColor: "#00CEC8",
                                        }}
                                        onFocus={e => (e.currentTarget.style.borderColor = "rgba(43,62,232,0.55)")}
                                        onBlur={e  => (e.currentTarget.style.borderColor = "rgba(43,62,232,0.25)")}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                                        style={{ color: "rgba(43,62,232,0.70)" }}>Familiya</label>
                                    <input
                                        value={editLast}
                                        onChange={e => setEditLast(e.target.value)}
                                        placeholder="Familiya"
                                        className="w-full h-10 px-3 rounded-xl text-sm text-white outline-none"
                                        style={{
                                            background: "rgba(5,8,24,0.70)",
                                            border: "1px solid rgba(43,62,232,0.25)",
                                            caretColor: "#00CEC8",
                                        }}
                                        onFocus={e => (e.currentTarget.style.borderColor = "rgba(43,62,232,0.55)")}
                                        onBlur={e  => (e.currentTarget.style.borderColor = "rgba(43,62,232,0.25)")}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5"
                                    style={{ color: "rgba(43,62,232,0.70)" }}>Bio ({editBio.length}/160)</label>
                                <textarea
                                    value={editBio}
                                    onChange={e => setEditBio(e.target.value.slice(0, 160))}
                                    placeholder="O'zingiz haqingizda..."
                                    rows={3}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
                                    style={{
                                        background: "rgba(5,8,24,0.70)",
                                        border: "1px solid rgba(43,62,232,0.25)",
                                        caretColor: "#00CEC8",
                                    }}
                                    onFocus={e => (e.currentTarget.style.borderColor = "rgba(43,62,232,0.55)")}
                                    onBlur={e  => (e.currentTarget.style.borderColor = "rgba(43,62,232,0.25)")}
                                />
                            </div>

                            {saveError && (
                                <p className="text-xs text-red-400 font-bold">{saveError}</p>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-opacity duration-150"
                                style={{
                                    background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                    boxShadow: "0 4px 18px rgba(43,62,232,0.40)",
                                    opacity: saving ? 0.70 : 1,
                                }}
                            >
                                {saving
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <><Save className="w-4 h-4" />Saqlash</>}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </ViewShell>
    );
}
