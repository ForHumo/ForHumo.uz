"use client";

import { useSession } from "next-auth/react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Home, Play, Radio, Library, MessageCircle, UserCircle,
    Settings, HelpCircle, Star, Bookmark, History, TrendingUp,
    Music, Film, BookOpen, Mic, Crown, ChevronRight, LogOut,
    Compass, ListMusic, Bell, BarChart2, Hash, Phone, Users, Headphones,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxSidebar — o'ng tomondan chiqadigan drawer
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
    open: boolean;
    onClose: () => void;
    onOpenSettings: () => void;
}

const NAV_ITEMS = [
    { icon: Home,          label: "Asosiy lenta",       section: "main" },
    { icon: Play,          label: "Videolar",            section: "main" },
    { icon: Radio,         label: "Jonli efirlar",       section: "main" },
    { icon: Film,          label: "Kino va seriallar",   section: "media" },
    { icon: Music,         label: "Musiqa",              section: "media" },
    { icon: Mic,           label: "Podkastlar",          section: "media" },
    { icon: BookOpen,      label: "Kitoblar",            section: "media" },
    { icon: MessageCircle, label: "Chatlar va kanallar", section: "social" },
];

const MY_ITEMS = [
    { icon: Bookmark,   label: "Saqlangan"        },
    { icon: History,    label: "Ko'rish tarixi"   },
    { icon: TrendingUp, label: "Mening kanalim"   },
    { icon: Star,       label: "Obunalarim"       },
];

export function NxSidebar({ open, onClose, onOpenSettings }: Props) {
    const { data: session } = useSession();
    const { setProOpen, setExploreOpen, setMessagesOpen, setNotifOpen, setPlaylistsOpen, setAnalyticsOpen, setSavedOpen, setGroupsOpen, setCallsOpen, setSubsOpen, setSpacesOpen } = useNxPlayer();
    const name   = session?.user?.name  ?? "Mehmon";
    const image  = session?.user?.image ?? null;
    const email  = session?.user?.email ?? "";
    const letter = name[0].toUpperCase();

    return (
        <>
            {/* ── Backdrop ──────────────────────────────────────────── */}
            <div
                className="fixed inset-0 z-40 transition-opacity duration-300"
                style={{
                    background: "rgba(5,8,24,0.70)",
                    backdropFilter: "blur(4px)",
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? "auto" : "none",
                }}
                onClick={onClose}
            />

            {/* ── Drawer ────────────────────────────────────────────── */}
            <aside
                className="fixed top-0 right-0 bottom-0 z-50 flex flex-col w-72 max-w-[88vw] transition-transform duration-300"
                style={{
                    background: "rgba(8,12,32,0.97)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    borderLeft: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "-8px 0 48px rgba(43,62,232,0.12)",
                    transform: open ? "translateX(0)" : "translateX(100%)",
                }}
            >
                {/* ── Header ────────────────────────────────────────── */}
                <div
                    className="flex items-center justify-between px-5 h-[60px] flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}
                >
                    <span
                        className="text-base font-black tracking-tight"
                        style={{
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        Humo Nexus
                    </span>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 active:scale-90"
                        style={{
                            background: "rgba(43,62,232,0.10)",
                            border: "1px solid rgba(43,62,232,0.20)",
                        }}
                    >
                        <X className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                    </button>
                </div>

                {/* ── Scroll area ───────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

                    {/* ── User card ─────────────────────────────────── */}
                    <div className="px-4 pt-4 pb-3">
                        <div
                            className="flex items-center gap-3 p-3.5 rounded-2xl"
                            style={{
                                background: "rgba(43,62,232,0.08)",
                                border: "1px solid rgba(43,62,232,0.18)",
                            }}
                        >
                            {/* Avatar */}
                            <div
                                className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-base font-black text-white"
                                style={{
                                    background: image ? "transparent" : "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                    border: "2px solid rgba(43,62,232,0.35)",
                                }}
                            >
                                {image
                                    ? <img src={image} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    : letter
                                }
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-white truncate">{name}</p>
                                <p className="text-[10px] truncate mt-0.5" style={{ color: "rgba(100,120,170,0.80)" }}>{email}</p>
                            </div>
                        </div>
                    </div>

                    {/* ── Nexus Pro promo ───────────────────────────── */}
                    <div className="px-4 pb-4">
                        <div
                            className="relative overflow-hidden rounded-2xl p-4 cursor-pointer group"
                            onClick={() => { onClose(); setProOpen(true); }}
                            style={{
                                background: "linear-gradient(135deg, rgba(43,62,232,0.25) 0%, rgba(0,206,200,0.12) 100%)",
                                border: "1px solid rgba(43,62,232,0.35)",
                            }}
                        >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.15),rgba(0,206,200,0.08))" }} />
                            <div className="relative flex items-center gap-3">
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                                >
                                    <Crown className="w-4.5 h-4.5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-white">Nexus Pro</p>
                                    <p className="text-[10px] leading-tight mt-0.5" style={{ color: "rgba(140,160,210,0.90)" }}>
                                        Reklamasiz, lossless sifat
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.60)" }} />
                            </div>
                            <div className="relative mt-3 flex items-center gap-2">
                                <div
                                    className="flex-1 h-1 rounded-full overflow-hidden"
                                    style={{ background: "rgba(43,62,232,0.20)" }}
                                >
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: "35%",
                                            background: "linear-gradient(90deg,#2B3EE8,#00CEC8)",
                                        }}
                                    />
                                </div>
                                <span className="text-[9px] font-bold" style={{ color: "rgba(0,206,200,0.80)" }}>
                                    7 kun bepul
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Navigation ────────────────────────────────── */}
                    <SidebarSection title="Kontent">
                        {NAV_ITEMS.filter(i => i.section === "main").map((item, i) => (
                            <SidebarItem key={i} icon={item.icon} label={item.label} />
                        ))}
                    </SidebarSection>

                    <SidebarSection title="Media">
                        {NAV_ITEMS.filter(i => i.section === "media").map((item, i) => (
                            <SidebarItem key={i} icon={item.icon} label={item.label} />
                        ))}
                    </SidebarSection>

                    <SidebarSection title="Kashfiyot">
                        <SidebarItem icon={Compass}       label="Explore / Kashfiyot"   onClick={() => { onClose(); setExploreOpen(true); }} />
                        <SidebarItem icon={MessageCircle} label="Xabarlar (DM)"         onClick={() => { onClose(); setMessagesOpen(true); }} badge="3" />
                        <SidebarItem icon={Hash}          label="Guruhlar va Kanallar"   onClick={() => { onClose(); setGroupsOpen(true); }} badge="2" />
                        <SidebarItem icon={Phone}         label="Qo'ng'iroqlar"          onClick={() => { onClose(); setCallsOpen(true); }} />
                        <SidebarItem icon={Headphones}    label="Spaces (Audio)"         onClick={() => { onClose(); setSpacesOpen(true); }} />
                        <SidebarItem icon={Bell}          label="Bildirishnomalar"        onClick={() => { onClose(); setNotifOpen(true); }} badge="5" />
                        <SidebarItem icon={ListMusic}     label="Pleylistlar"             onClick={() => { onClose(); setPlaylistsOpen(true); }} />
                        <SidebarItem icon={BarChart2}     label="Analitika"               onClick={() => { onClose(); setAnalyticsOpen(true); }} />
                    </SidebarSection>

                    <SidebarSection title="Mening Nexus">
                        <SidebarItem icon={Bookmark}   label="Saqlangan"       onClick={() => { onClose(); setSavedOpen(true); }} />
                        <SidebarItem icon={History}    label="Ko'rish tarixi" />
                        <SidebarItem icon={TrendingUp} label="Mening kanalim" />
                        <SidebarItem icon={Users}      label="Obunalar"        onClick={() => { onClose(); setSubsOpen(true); }} />
                    </SidebarSection>

                    {/* ── Settings / Logout ─────────────────────────── */}
                    <div className="px-4 pb-2">
                        <SidebarItem icon={Settings} label="Sozlamalar" onClick={onOpenSettings} />
                        <SidebarItem icon={HelpCircle} label="Yordam va aloqa" />
                    </div>
                </div>

                {/* ── Footer ────────────────────────────────────────── */}
                <div
                    className="flex-shrink-0 px-4 py-3"
                    style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}
                >
                    <button
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150"
                        style={{
                            background: "rgba(239,68,68,0.06)",
                            border: "1px solid rgba(239,68,68,0.15)",
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)";
                            (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.30)";
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.06)";
                            (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.15)";
                        }}
                    >
                        <LogOut className="w-4 h-4" style={{ color: "rgba(239,68,68,0.80)" }} />
                        <span className="text-sm font-semibold" style={{ color: "rgba(239,68,68,0.80)" }}>
                            Chiqish
                        </span>
                    </button>

                    <p className="text-center text-[9px] mt-2.5" style={{ color: "rgba(60,80,130,0.70)" }}>
                        Humo Nexus v1.0.0 · Humo Digital 2026
                    </p>
                </div>
            </aside>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ichki komponentlar
// ─────────────────────────────────────────────────────────────────────────────
function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="px-4 mb-1">
            <p
                className="text-[9px] font-black uppercase tracking-widest mb-1.5 px-1"
                style={{ color: "rgba(43,62,232,0.55)" }}
            >
                {title}
            </p>
            {children}
            <div className="mt-2 mb-3 h-px" style={{ background: "rgba(43,62,232,0.10)" }} />
        </div>
    );
}

function SidebarItem({
    icon: Icon,
    label,
    onClick,
    badge,
}: {
    icon: React.ElementType;
    label: string;
    onClick?: () => void;
    badge?: string;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-left transition-all duration-150 group"
            style={{
                background: "transparent",
                border: "1px solid transparent",
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.16)";
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.borderColor = "transparent";
            }}
        >
            <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(43,62,232,0.12)" }}
            >
                <Icon className="w-3.5 h-3.5" style={{ color: "rgba(100,140,220,0.90)" }} />
            </div>
            <span className="flex-1 text-sm font-medium" style={{ color: "rgba(180,195,235,0.90)" }}>
                {label}
            </span>
            {badge && (
                <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-black"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                >
                    {badge}
                </span>
            )}
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0"
                style={{ color: "rgba(43,62,232,0.50)" }} />
        </button>
    );
}
