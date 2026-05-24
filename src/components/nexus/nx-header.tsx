"use client";

import Image from "next/image";
import { Search, Bell, ChevronDown, Menu, PlusSquare, MessageCircle, Compass } from "lucide-react";
import { useSession } from "next-auth/react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// NxHeader — asosiy header
// ─────────────────────────────────────────────────────────────────────────────
interface NxHeaderProps {
    onMenuOpen?: () => void;
    onSettingsOpen?: () => void;
}

export function NxHeader({ onMenuOpen, onSettingsOpen: _onSettingsOpen }: NxHeaderProps) {
    const { data: session } = useSession();
    const { setSearchOpen, setStudioOpen, setNotifOpen, setMessagesOpen, setExploreOpen, setCreatePostOpen } = useNxPlayer();

    return (
        <header
            className="relative z-30 flex-shrink-0 flex items-center gap-3 px-4 md:px-6 h-[60px]"
            style={{
                background: "rgba(5,8,24,0.82)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderBottom: "1px solid rgba(43,62,232,0.18)",
            }}
        >
            {/* ── Menu button ───────────────────────────────────────── */}
            <button
                onClick={onMenuOpen}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
                style={{
                    background: "rgba(43,62,232,0.08)",
                    border: "1px solid rgba(43,62,232,0.18)",
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.18)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)";
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)";
                }}
            >
                <Menu className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
            </button>

            {/* ── Logo ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
                <div className="relative w-8 h-8 flex-shrink-0">
                    <Image
                        src="/logos/humo-nexus.png"
                        alt="Nexus"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                <span
                    className="hidden sm:block text-[17px] font-black tracking-tight"
                    style={{
                        background: "linear-gradient(135deg, #2B3EE8 0%, #00CEC8 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}
                >
                    Nexus
                </span>
            </div>

            {/* ── Search ────────────────────────────────────────────── */}
            <div className="flex-1 max-w-xl relative group">
                <Search
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: "rgba(43,62,232,0.50)" }}
                />
                <input
                    type="text"
                    readOnly
                    placeholder="Kontent, kreator, kanal..."
                    className="w-full h-9 rounded-xl pl-9 pr-4 text-sm outline-none text-white cursor-pointer transition-all duration-200"
                    style={{
                        background: "rgba(43,62,232,0.08)",
                        border: "1px solid rgba(43,62,232,0.18)",
                    }}
                    onClick={() => setSearchOpen(true)}
                />
            </div>

            {/* ── Right actions ─────────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">

                {/* Kontent yaratish */}
                <button
                    onClick={() => setCreatePostOpen(true)}
                    className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl transition-all duration-150 active:scale-95"
                    style={{
                        background: "linear-gradient(135deg,rgba(43,62,232,0.20),rgba(0,206,200,0.12))",
                        border: "1px solid rgba(43,62,232,0.30)",
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,rgba(43,62,232,0.30),rgba(0,206,200,0.18))";
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,rgba(43,62,232,0.20),rgba(0,206,200,0.12))";
                    }}
                >
                    <PlusSquare className="w-4 h-4" style={{ color: "#00CEC8" }} />
                    <span className="text-xs font-black" style={{
                        background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}>
                        Yaratish
                    </span>
                </button>

                {/* Kashfiyot */}
                <button
                    onClick={() => setExploreOpen(true)}
                    className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.18)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)"; }}
                >
                    <Compass className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                </button>

                {/* Xabarlar */}
                <button
                    onClick={() => setMessagesOpen(true)}
                    className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.18)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)"; }}
                >
                    <MessageCircle className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                        style={{ background: "#10B981", boxShadow: "0 0 6px rgba(16,185,129,0.80)" }} />
                </button>

                {/* Bildirishnoma */}
                <BellButton onOpen={() => setNotifOpen(true)} />

                {/* Profil */}
                <ProfileButton session={session} />
            </div>
        </header>
    );
}

// ── Bell ──────────────────────────────────────────────────────────────────────
function BellButton({ onOpen }: { onOpen: () => void }) {
    return (
        <button
            onClick={onOpen}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
            style={{
                background: "rgba(43,62,232,0.08)",
                border: "1px solid rgba(43,62,232,0.18)",
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.18)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)";
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)";
            }}
        >
            <Bell className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
            <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{
                    background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                    boxShadow: "0 0 6px rgba(0,206,200,0.8)",
                }}
            />
        </button>
    );
}

// ── Profile ───────────────────────────────────────────────────────────────────
function ProfileButton({ session }: { session: ReturnType<typeof useSession>["data"] }) {
    const name   = session?.user?.name  ?? null;
    const image  = session?.user?.image ?? null;
    const letter = name ? name[0].toUpperCase() : "?";

    return (
        <button
            className="flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-xl transition-all duration-150 active:scale-95"
            style={{
                background: "rgba(43,62,232,0.08)",
                border: "1px solid rgba(43,62,232,0.18)",
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.18)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)";
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)";
            }}
        >
            {/* Avatar */}
            <div
                className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 text-xs font-black text-white"
                style={{
                    background: image
                        ? "transparent"
                        : "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                }}
            >
                {image ? (
                    <img src={image} alt={name ?? ""} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                    letter
                )}
            </div>

            {/* Name — faqat sm+ ekranlarda */}
            {name && (
                <span className="hidden md:block text-xs font-semibold max-w-[90px] truncate" style={{ color: "rgba(200,210,240,0.90)" }}>
                    {name.split(" ")[0]}
                </span>
            )}

            <ChevronDown className="hidden md:block w-3 h-3 flex-shrink-0" style={{ color: "rgba(43,62,232,0.60)" }} />
        </button>
    );
}
