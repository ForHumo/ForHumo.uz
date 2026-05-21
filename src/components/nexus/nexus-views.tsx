"use client";

import { Search, History, TrendingUp, Clock, Sparkles, Calendar, Shield, Heart, UserCheck, CreditCard, Settings, LogOut, BadgeCheck } from "lucide-react";
import { useSession } from "next-auth/react";
import {
    GCinemaCard, VCinemaCard, MusicCard, GVideoCard,
    GStreamCard, VStreamCard, VVideoCard, PostCard,
} from "./content-cards";
import { ContentRow } from "./content-row";
import { cn } from "@/lib/utils";

// ── Shared section header ──────────────────────────────────────────────────────
function ViewHeader({ title, desc }: { title: React.ReactNode; desc: string }) {
    return (
        <div
            className="p-6 md:p-10 rounded-[2rem] mb-8 relative overflow-hidden"
            style={{
                background: "rgba(11,20,45,0.55)",
                border: "1px solid rgba(43,62,232,0.22)",
            }}
        >
            {/* Top-right glow */}
            <div
                className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(43,62,232,0.20) 0%, transparent 70%)" }}
            />
            {/* Bottom-left accent */}
            <div
                className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,206,200,0.10) 0%, transparent 70%)" }}
            />
            <h2 className="text-2xl md:text-4xl font-bold mb-2 tracking-tight relative text-white">{title}</h2>
            <p className="md:text-lg relative" style={{ color: "#6070a0" }}>{desc}</p>
        </div>
    );
}

// ── Quick filter button ────────────────────────────────────────────────────────
function FilterBtn({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <button
            className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-[1.5rem] transition-all duration-200 group active:scale-95"
            style={{
                background: "rgba(11,20,45,0.55)",
                border: "1px solid rgba(43,62,232,0.18)",
            }}
            onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "rgba(43,62,232,0.15)";
                el.style.borderColor = "rgba(43,62,232,0.45)";
            }}
            onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "rgba(11,20,45,0.55)";
                el.style.borderColor = "rgba(43,62,232,0.18)";
            }}
        >
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                style={{
                    background: "rgba(43,62,232,0.20)",
                    border: "1px solid rgba(43,62,232,0.30)",
                    color: "#7dd3fc",
                }}
            >
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-center whitespace-nowrap" style={{ color: "#6070a0" }}>
                {label}
            </span>
        </button>
    );
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ active }: { active: boolean }) {
    return (
        <div
            className="w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer"
            style={{
                background: active
                    ? "linear-gradient(90deg,#2B3EE8,#00CEC8)"
                    : "rgba(43,62,232,0.15)",
                border: active ? "none" : "1px solid rgba(43,62,232,0.25)",
            }}
        >
            <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow", active ? "right-0.5" : "left-0.5")} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chats View
// ─────────────────────────────────────────────────────────────────────────────
export function ChatsView() {
    return (
        <div
            className="flex flex-col h-[calc(100vh-200px)] min-h-[400px] rounded-[1.5rem] overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ background: "rgba(8,14,32,0.70)", border: "1px solid rgba(43,62,232,0.22)" }}
        >
            {/* Header */}
            <div
                className="p-4 md:p-5 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.15)", background: "rgba(6,11,26,0.50)" }}
            >
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }}
                    />
                    Xabarlar
                </h2>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors duration-150"
                        style={{ color: "#4a5a8a" }} />
                    <input
                        type="text"
                        placeholder="Suhbatlarni qidirish..."
                        className="rounded-xl pl-8 pr-3 py-2 text-xs outline-none transition-all w-44 md:w-56"
                        style={{
                            background: "rgba(11,20,45,0.60)",
                            border: "1px solid rgba(43,62,232,0.22)",
                            color: "white",
                        }}
                        onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.55)"}
                        onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.22)"}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5 nx-scrollbar">
                {Array.from({ length: 12 }, (_, i) => (
                    <button
                        key={i}
                        className="w-full p-3 md:p-4 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all duration-150 text-left group"
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.10)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                        <div className="relative flex-shrink-0">
                            <div
                                className="w-11 h-11 rounded-2xl p-[2px]"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                            >
                                <div className="w-full h-full rounded-[0.8rem] bg-[#060B1A] overflow-hidden">
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i + 1}`}
                                        alt="avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            {i % 3 === 0 && (
                                <div
                                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                    style={{ background: "#00CEC8", borderColor: "#060B1A" }}
                                />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <h4 className="font-bold text-sm truncate text-white group-hover:nx-gradient-text transition-colors duration-150">
                                    Foydalanuvchi {i + 1}
                                </h4>
                                <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: "#4a5a8a" }}>
                                    {`${12 - i}:${String(i * 5).padStart(2, "0")}`}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs truncate opacity-70 group-hover:opacity-100 transition-opacity duration-150" style={{ color: "#8090b0" }}>
                                    Nexus interfeysi juda zo'r!
                                </p>
                                {i < 3 && (
                                    <div
                                        className="flex-shrink-0 ml-2 text-[9px] font-bold text-white w-5 h-5 rounded-full flex items-center justify-center"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                                    >
                                        {i + 1}
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// G. Cinema View
// ─────────────────────────────────────────────────────────────────────────────
export function GCinemaView() {
    return (
        <div className="flex flex-col gap-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div
                className="p-6 md:p-10 rounded-[2rem] relative overflow-hidden"
                style={{ background: "rgba(11,20,45,0.55)", border: "1px solid rgba(43,62,232,0.22)" }}
            >
                <div
                    className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(43,62,232,0.22) 0%, transparent 70%)" }}
                />
                <h2 className="text-2xl md:text-4xl font-bold mb-4 tracking-tight relative text-white">
                    Explore{" "}
                    <span className="nx-gradient-text">Cinema</span>
                </h2>
                <div className="relative mb-6 group max-w-2xl">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-150" style={{ color: "#4a5a8a" }} />
                    <input
                        type="text"
                        placeholder="Film, serial yoki janrni qidiring..."
                        className="w-full h-14 rounded-2xl pl-14 pr-5 outline-none transition-all text-sm text-white"
                        style={{
                            background: "rgba(6,11,26,0.60)",
                            border: "1px solid rgba(43,62,232,0.22)",
                        }}
                        onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.55)"}
                        onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.22)"}
                    />
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 relative">
                    <FilterBtn icon={History}   label="Ko'rilgan"    />
                    <FilterBtn icon={TrendingUp} label="Trend"        />
                    <FilterBtn icon={Clock}      label="Eski filmlar" />
                    <FilterBtn icon={Sparkles}   label="Yangi"        />
                    <FilterBtn icon={Calendar}   label="Tez kunda"    />
                </div>
            </div>

            <ContentRow title="Trendda">
                {Array.from({ length: 6 }, (_, i) => (
                    <GCinemaCard key={i} title={`Trend Film ${i + 1}`} image={`https://picsum.photos/seed/trend${i}/800/450`}
                        duration="2s 10d" views="2.4M" rating="4.9" likes="800k" year="2024" postedTime="2 kun oldin" />
                ))}
            </ContentRow>
            <ContentRow title="Yangi chiqdi">
                {Array.from({ length: 6 }, (_, i) => (
                    <GCinemaCard key={i} title={`Yangi Hit ${i + 1}`} image={`https://picsum.photos/seed/new${i}/800/450`}
                        duration="1s 55d" views="1.1M" rating="4.7" likes="320k" year="2024" postedTime="5 soat oldin" />
                ))}
            </ContentRow>
            <ContentRow title="Klassikalar">
                {Array.from({ length: 6 }, (_, i) => (
                    <GCinemaCard key={i} title={`Klassik Film ${i + 1}`} image={`https://picsum.photos/seed/classic${i}/800/450`}
                        duration="2s 30d" views="5M" rating="4.8" likes="1.2M" year="2019" postedTime="3 yil oldin" />
                ))}
            </ContentRow>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// V. Cinema View
// ─────────────────────────────────────────────────────────────────────────────
export function VCinemaView() {
    return (
        <div className="flex flex-col gap-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ViewHeader
                title={<>Vertikal <span className="nx-gradient-text">Kino</span></>}
                desc="Ekraningiz uchun maxsus mo'ljallangan kinematografik vertikal filmlar."
            />
            <ContentRow title="Top Vertikal Filmlar">
                {Array.from({ length: 7 }, (_, i) => (
                    <VCinemaCard key={i} title={`Vertikal Epic ${i + 1}`} image={`https://picsum.photos/seed/vepic${i}/400/600`}
                        duration="42 daq" views="500k" rating="4.6" likes="95k" year="2024" postedTime="1 kun oldin" />
                ))}
            </ContentRow>
            <ContentRow title="Janrlar bo'yicha">
                {Array.from({ length: 7 }, (_, i) => (
                    <VCinemaCard key={i} title={`Janr Filmi ${i + 1}`} image={`https://picsum.photos/seed/genre${i}/400/600`}
                        duration="55 daq" views="300k" rating="4.4" likes="60k" year="2024" postedTime="3 kun oldin" />
                ))}
            </ContentRow>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Musics View
// ─────────────────────────────────────────────────────────────────────────────
export function MusicsView() {
    return (
        <div className="flex flex-col gap-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ViewHeader
                title={<>Sizning <span className="nx-gradient-text">Musiqangiz</span></>}
                desc="Yangi ovozlar va siz uchun tuzilgan pleylistlarni kashf eting."
            />
            <ContentRow title="Top Treklarr">
                {Array.from({ length: 8 }, (_, i) => (
                    <MusicCard key={i} title={`Trend Trek ${i + 1}`} artist={`Nexus Artist ${i + 1}`}
                        image={`https://picsum.photos/seed/music_hit${i}/400/400`}
                        duration="3:30" rating="4.9" listens="1.2M" likes="200k" year="2024" postedTime="2 kun oldin" />
                ))}
            </ContentRow>
            <ContentRow title="Yangi Albomlar">
                {Array.from({ length: 8 }, (_, i) => (
                    <MusicCard key={i} title={`Yangi Albom ${i + 1}`} artist={`Artist ${i + 1}`}
                        image={`https://picsum.photos/seed/album${i}/400/400`}
                        duration="4:10" rating="4.7" listens="800k" likes="150k" year="2024" postedTime="1 hafta oldin" />
                ))}
            </ContentRow>
            <ContentRow title="O'zbek Musiqasi">
                {Array.from({ length: 8 }, (_, i) => (
                    <MusicCard key={i} title={`O'zbek Trek ${i + 1}`} artist={`O'zbek Artist ${i + 1}`}
                        image={`https://picsum.photos/seed/uzmusic${i}/400/400`}
                        duration="3:50" rating="4.8" listens="500k" likes="90k" year="2024" postedTime="5 kun oldin" />
                ))}
            </ContentRow>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Blogs (Posts) View
// ─────────────────────────────────────────────────────────────────────────────
export function BlogsView() {
    return (
        <div className="flex flex-col gap-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ViewHeader
                title={<>Nexus <span className="nx-gradient-text">Postlar</span></>}
                desc="Fikrlar, yangiliklar va jamiyat hikoyalari."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 9 }, (_, i) => (
                    <PostCard
                        key={i}
                        author={`@nexus_user_${i + 1}`}
                        time={`${i + 1} soat oldin`}
                        content="AI agentlar va markazlashmagan hisoblashning kelajagi haqida ba'zi fikrlar. Nexus ekotizimida hayajonli davrlar kutilmoqda! Bu texnologiya hayotimizni tubdan o'zgartiradi."
                    />
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// G. Videos View
// ─────────────────────────────────────────────────────────────────────────────
export function GVideosView() {
    return (
        <div className="flex flex-col gap-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ViewHeader
                title={<>G. <span className="nx-gradient-text">Videolar</span></>}
                desc="Global ijodkorlardan yuqori sifatli keng ekranli kontentlar."
            />
            <ContentRow title="Tavsiya etilgan">
                {Array.from({ length: 6 }, (_, i) => (
                    <GVideoCard key={i} title={`Ajoyib Video Sarlavha ${i + 1}`} author="Top Creator"
                        views="500k" time={`${i + 1} kun`} image={`https://picsum.photos/seed/gvideo${i}/800/450`}
                        duration="10:00" postedTime={`${i + 1} kun oldin`} />
                ))}
            </ContentRow>
            <ContentRow title="Texnologiya">
                {Array.from({ length: 6 }, (_, i) => (
                    <GVideoCard key={i} title={`Tech Tahlil ${i + 1}`} author="Tech Guru"
                        views="250k" time={`${i + 2} kun`} image={`https://picsum.photos/seed/tech${i}/800/450`}
                        duration="15:30" postedTime={`${i + 2} kun oldin`} />
                ))}
            </ContentRow>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// G. Streams View
// ─────────────────────────────────────────────────────────────────────────────
export function GStreamsView() {
    return (
        <div className="flex flex-col gap-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ViewHeader
                title={<>G. <span className="nx-gradient-text">Efirlar</span></>}
                desc="Dunyo bo'ylab jonli efirlar va gaming transmissiyalar."
            />
            <ContentRow title="Hozir jonli">
                {[1, 2, 3].map((i) => (
                    <GStreamCard key={i} title={`Jonli Efir ${i}`} author="Streamer Pro"
                        status="LIVE" viewers="12k" startTime="20:00"
                        image={`https://picsum.photos/seed/gstream_live${i}/800/450`} postedTime="Hozir" />
                ))}
            </ContentRow>
            <ContentRow title="Tez kunda">
                {[1, 2, 3].map((i) => (
                    <GStreamCard key={i} title={`Kutilayotgan Efir ${i}`} author="Coming Soon"
                        status="UPCOMING" waiting="5.4k"
                        image={`https://picsum.photos/seed/gstream_up${i}/800/450`} postedTime={`${i * 2} soatda`} />
                ))}
            </ContentRow>
            <ContentRow title="Tugagan efirlar">
                {[1, 2, 3].map((i) => (
                    <GStreamCard key={i} title={`Tugagan Efir ${i}`} author="Humo Team"
                        status="ENDED" viewers="45k" likes="12k"
                        image={`https://picsum.photos/seed/gstream_end${i}/800/450`} postedTime="Kecha" />
                ))}
            </ContentRow>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// V. Videos (Shorts) View
// ─────────────────────────────────────────────────────────────────────────────
export function VVideosView() {
    return (
        <div className="flex flex-col gap-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ViewHeader
                title={<>V. <span className="nx-gradient-text">Shorts</span></>}
                desc="Tez sur'atli vertikal videolar va trendlar."
            />
            <ContentRow title="Trending Shorts">
                {Array.from({ length: 8 }, (_, i) => (
                    <VVideoCard key={i} author={`@creator_${i + 1}`}
                        image={`https://picsum.photos/seed/vvideo${i}/400/711`}
                        views="1.5M" likes="250k" duration="0:59" postedTime={`${i + 1} soat oldin`} />
                ))}
            </ContentRow>
            <ContentRow title="Yangi shorts">
                {Array.from({ length: 8 }, (_, i) => (
                    <VVideoCard key={i} author={`@newcreator_${i + 1}`}
                        image={`https://picsum.photos/seed/newvert${i}/400/711`}
                        views="120k" likes="18k" duration="0:45" postedTime={`${i + 3} soat oldin`} />
                ))}
            </ContentRow>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// V. Streams View
// ─────────────────────────────────────────────────────────────────────────────
export function VStreamsView() {
    return (
        <div className="flex flex-col gap-6 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ViewHeader
                title={<>V. <span className="nx-gradient-text">Efirlar</span></>}
                desc="Real vaqtda vertikal streaming tajribasi."
            />
            <ContentRow title="Jonli vertikal efirlar">
                {[1, 2, 3, 4].map((i) => (
                    <VStreamCard key={i} title={`Vertikal Efir ${i}`} author={`V-Creator ${i}`}
                        status="LIVE" viewers="5.4k" startTime="19:30"
                        image={`https://picsum.photos/seed/vstream_live${i}/400/711`} postedTime="Hozir" />
                ))}
            </ContentRow>
            <ContentRow title="Kutilmoqda">
                {[1, 2, 3].map((i) => (
                    <VStreamCard key={i} title={`Kutilayotgan ${i}`} author={`ShowRunner ${i}`}
                        status="UPCOMING" waiting="800"
                        image={`https://picsum.photos/seed/vstream_up${i}/400/711`} postedTime="Ertaga" />
                ))}
            </ContentRow>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Humo ID (Profile) View
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, gradient }: { icon: React.ElementType; label: string; value: string; gradient: string }) {
    return (
        <div
            className="p-5 rounded-[1.5rem] flex items-center gap-4 transition-all duration-200"
            style={{
                background: "rgba(11,20,45,0.55)",
                border: "1px solid rgba(43,62,232,0.18)",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)"}
        >
            <div
                className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br", gradient)}
            >
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "#4a5a8a" }}>{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    );
}

export function HumoIDView() {
    const { data: session } = useSession();
    const displayName  = session?.user?.name  ?? "Foydalanuvchi";
    const displayImage = session?.user?.image  ?? null;
    const email        = session?.user?.email  ?? "—";
    const initials     = displayName.slice(0, 1).toUpperCase();

    return (
        <div className="max-w-3xl mx-auto flex flex-col gap-5 pb-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Profile card */}
            <div
                className="p-7 md:p-10 rounded-[2rem] relative overflow-hidden"
                style={{ background: "rgba(11,20,45,0.55)", border: "1px solid rgba(43,62,232,0.22)" }}
            >
                {/* Ambient glows */}
                <div
                    className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(43,62,232,0.20) 0%, transparent 70%)" }}
                />
                <div
                    className="absolute bottom-0 left-0 w-40 h-40 rounded-full -ml-20 -mb-20 pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(0,206,200,0.12) 0%, transparent 70%)" }}
                />

                <div className="flex flex-col md:flex-row items-center gap-6 relative">
                    {/* Avatar — gradient ring */}
                    <div
                        className="w-24 h-24 rounded-[1.75rem] p-[2px] shadow-2xl flex-shrink-0"
                        style={{
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            boxShadow: "0 0 40px rgba(43,62,232,0.50), 0 0 80px rgba(0,206,200,0.15)",
                        }}
                    >
                        <div className="w-full h-full rounded-[1.65rem] bg-[#060B1A] p-1 overflow-hidden flex items-center justify-center">
                            {displayImage ? (
                                <img src={displayImage} alt={displayName} className="w-full h-full object-cover rounded-[1.5rem]" referrerPolicy="no-referrer" />
                            ) : (
                                <span className="text-3xl font-black text-white">{initials}</span>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl font-black mb-1 tracking-tight text-white">{displayName}</h2>
                        <p className="text-sm mb-3 font-mono" style={{ color: "#6070a0" }}>{email}</p>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                            <span
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                                style={{ background: "rgba(43,62,232,0.20)", border: "1px solid rgba(43,62,232,0.35)" }}
                            >
                                <Shield className="w-3 h-3" style={{ color: "#00CEC8" }} />
                                Tasdiqlangan
                            </span>
                            <span
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                                style={{ background: "rgba(43,62,232,0.15)", border: "1px solid rgba(43,62,232,0.28)" }}
                            >
                                <BadgeCheck className="w-3 h-3 text-emerald-400" />
                                Nexus Member
                            </span>
                        </div>
                    </div>

                    <button
                        className="flex-shrink-0 px-6 py-3 text-white rounded-2xl font-bold text-sm active:scale-95 shadow-xl"
                        style={{
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            boxShadow: "0 8px 30px rgba(43,62,232,0.40)",
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.90"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                    >
                        Profilni tahrirlash
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard icon={Heart}      label="Umumiy layklar"  value="1.2M"    gradient="from-red-500 to-pink-600"      />
                <StatCard icon={UserCheck}  label="Obunachi"        value="842"     gradient="from-[#2B3EE8] to-[#00CEC8]"  />
                <StatCard icon={CreditCard} label="Humo Wallet"     value="$1,240"  gradient="from-emerald-500 to-teal-600" />
                <StatCard icon={Shield}     label="Xavfsizlik"      value="Yuqori"  gradient="from-violet-500 to-indigo-600" />
            </div>

            {/* Quick settings */}
            <div
                className="p-6 rounded-[2rem]"
                style={{ background: "rgba(11,20,45,0.55)", border: "1px solid rgba(43,62,232,0.22)" }}
            >
                <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-white">
                    <Settings className="w-4 h-4" style={{ color: "#00CEC8" }} />
                    Tezkor sozlamalar
                </h3>
                <div className="space-y-3">
                    {[
                        { label: "Ochiq profil",                  active: true  },
                        { label: "Ikki bosqichli tasdiqlash",     active: true  },
                        { label: "Humo ID maxfiyligi",            active: false },
                    ].map(({ label, active }, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3.5 rounded-2xl transition-colors duration-150"
                            style={{
                                background: "rgba(6,11,26,0.50)",
                                border: "1px solid rgba(43,62,232,0.15)",
                            }}
                        >
                            <span className="text-sm font-medium" style={{ color: "#8090b0" }}>{label}</span>
                            <Toggle active={active} />
                        </div>
                    ))}
                    <button
                        className="w-full flex items-center justify-between p-3.5 rounded-2xl font-bold text-sm text-red-400 transition-colors duration-150 group"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"}
                    >
                        <span>Nexusdan chiqish</span>
                        <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
                    </button>
                </div>
            </div>
        </div>
    );
}
