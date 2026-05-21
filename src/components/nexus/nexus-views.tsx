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
function ViewHeader({ title, accent, desc }: { title: React.ReactNode; accent?: string; desc: string }) {
    return (
        <div className="nx-glass p-6 md:p-10 rounded-[2rem] border border-white/8 mb-8 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            <h2 className="text-2xl md:text-4xl font-bold mb-2 tracking-tight relative">{title}</h2>
            <p className="text-gray-400 md:text-lg relative">{desc}</p>
        </div>
    );
}

// ── Quick filter button ────────────────────────────────────────────────────────
function FilterBtn({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <button className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-primary/20 hover:border-primary/30 hover:text-primary transition-all duration-200 group active:scale-95">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-all duration-200">
                <Icon className="w-5 h-5" />
            </div>
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-primary transition-colors duration-200 text-center whitespace-nowrap">
                {label}
            </span>
        </button>
    );
}

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ active }: { active: boolean }) {
    return (
        <div className={cn("w-10 h-5 rounded-full relative transition-colors duration-200 cursor-pointer", active ? "bg-primary" : "bg-gray-700")}>
            <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow", active ? "right-0.5" : "left-0.5")} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chats View
// ─────────────────────────────────────────────────────────────────────────────
export function ChatsView() {
    return (
        <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px] bg-black/20 rounded-[1.5rem] border border-white/5 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="p-4 md:p-5 border-b border-white/5 flex items-center justify-between bg-black/30 flex-shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Xabarlar
                </h2>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-primary transition-colors duration-150" />
                    <input
                        type="text"
                        placeholder="Suhbatlarni qidirish..."
                        className="bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-primary/50 transition-all w-44 md:w-56"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5 nx-scrollbar">
                {Array.from({ length: 12 }, (_, i) => (
                    <button
                        key={i}
                        className="w-full p-3 md:p-4 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-all duration-150 hover:bg-white/5 text-left group"
                    >
                        <div className="relative flex-shrink-0">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary/50 to-blue-600/50 p-[2px]">
                                <div className="w-full h-full rounded-[0.8rem] bg-black/80 overflow-hidden">
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=user${i + 1}`}
                                        alt="avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                            {i % 3 === 0 && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050505]" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                                <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors duration-150">
                                    Foydalanuvchi {i + 1}
                                </h4>
                                <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">
                                    {`${12 - i}:${String(i * 5).padStart(2, "0")}`}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-400 truncate opacity-70 group-hover:opacity-100 transition-opacity duration-150">
                                    Nexus interfeysi juda zo'r!
                                </p>
                                {i < 3 && (
                                    <div className="flex-shrink-0 ml-2 bg-primary text-[9px] font-bold text-white w-5 h-5 rounded-full flex items-center justify-center">
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
            <div className="nx-glass p-6 md:p-10 rounded-[2rem] border border-white/8 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-56 h-56 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
                <h2 className="text-2xl md:text-4xl font-bold mb-4 tracking-tight relative">
                    Explore <span className="text-primary">Cinema</span>
                </h2>
                <div className="relative mb-6 group max-w-2xl">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-primary transition-colors duration-150" />
                    <input
                        type="text"
                        placeholder="Film, serial yoki janrni qidiring..."
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-14 pr-5 outline-none focus:border-primary/50 focus:bg-white/8 transition-all text-sm"
                    />
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 relative">
                    <FilterBtn icon={History}   label="Ko'rilgan"  />
                    <FilterBtn icon={TrendingUp} label="Trend"     />
                    <FilterBtn icon={Clock}      label="Eski filmlar" />
                    <FilterBtn icon={Sparkles}   label="Yangi"     />
                    <FilterBtn icon={Calendar}   label="Tez kunda" />
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
                title={<>Vertikal <span className="text-blue-400">Kino</span></>}
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
                title={<>Sizning <span className="text-primary">Musiqangiz</span></>}
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
                title={<>Nexus <span className="text-yellow-400">Postlar</span></>}
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
                title={<>G. <span className="text-red-400">Videolar</span></>}
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
                title={<>G. <span className="text-red-500">Efirlar</span></>}
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
                title={<>V. <span className="text-blue-400">Shorts</span></>}
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
                title={<>V. <span className="text-blue-500">Efirlar</span></>}
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
                        image={`https://picsum.photos/seed/vstream_up${i}/400/711`} postedTime={`Ertaga`} />
                ))}
            </ContentRow>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Humo ID (Profile) View
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
    return (
        <div className="nx-glass p-5 rounded-[1.5rem] border border-white/5 flex items-center gap-4 hover:border-white/10 transition-all duration-200">
            <div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center flex-shrink-0", color)}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-xl font-bold">{value}</p>
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
            <div className="nx-glass p-7 md:p-10 rounded-[2rem] border border-white/8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
                <div className="flex flex-col md:flex-row items-center gap-6 relative">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-[1.75rem] bg-gradient-to-tr from-primary to-blue-500 p-[2px] shadow-2xl flex-shrink-0">
                        <div className="w-full h-full rounded-[1.65rem] bg-[#0a0a0a] p-1 overflow-hidden flex items-center justify-center">
                            {displayImage ? (
                                <img src={displayImage} alt={displayName} className="w-full h-full object-cover rounded-[1.5rem]" referrerPolicy="no-referrer" />
                            ) : (
                                <span className="text-3xl font-black text-white">{initials}</span>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl font-black mb-1 tracking-tight">{displayName}</h2>
                        <p className="text-sm text-gray-400 mb-3 font-mono">{email}</p>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold">
                                <Shield className="w-3 h-3 text-primary" />
                                Tasdiqlangan
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold">
                                <BadgeCheck className="w-3 h-3 text-emerald-400" />
                                Nexus Member
                            </span>
                        </div>
                    </div>

                    <button className="flex-shrink-0 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors duration-200 active:scale-95 shadow-lg shadow-primary/20">
                        Profilni tahrirlash
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard icon={Heart}      label="Umumiy layklar"  value="1.2M"     color="text-red-400"     />
                <StatCard icon={UserCheck}  label="Obunachi"        value="842"      color="text-blue-400"    />
                <StatCard icon={CreditCard} label="Humo Wallet"     value="$1,240"   color="text-green-400"   />
                <StatCard icon={Shield}     label="Xavfsizlik"      value="Yuqori"   color="text-primary"     />
            </div>

            {/* Quick settings */}
            <div className="nx-glass p-6 rounded-[2rem] border border-white/8">
                <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-primary" />
                    Tezkor sozlamalar
                </h3>
                <div className="space-y-3">
                    {[
                        { label: "Ochiq profil", active: true },
                        { label: "Ikki bosqichli tasdiqlash", active: true },
                        { label: "Humo ID maxfiyligi", active: false },
                    ].map(({ label, active }, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors duration-150">
                            <span className="text-sm font-medium text-gray-300">{label}</span>
                            <Toggle active={active} />
                        </div>
                    ))}
                    <button className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/15 transition-colors duration-150 group">
                        <span>Nexusdan chiqish</span>
                        <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
                    </button>
                </div>
            </div>
        </div>
    );
}
