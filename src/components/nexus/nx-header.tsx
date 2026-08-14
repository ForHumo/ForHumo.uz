"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import Image from "next/image";
import { Search, Bell, ChevronDown, Menu, PlusSquare, MessageCircle, Compass, Home, HeadsetIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useNxPlayer } from "./nx-player-ctx";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// NxHeader — asosiy header
// ─────────────────────────────────────────────────────────────────────────────
interface NxHeaderProps {
    onMenuOpen?: () => void;
    onSettingsOpen?: () => void;
}

export function NxHeader({ onMenuOpen, onSettingsOpen: _onSettingsOpen }: NxHeaderProps) {
    const { data: session } = useSession();
    const { setSearchOpen, setNotifOpen, setMessagesOpen, setExploreOpen, setCreatePostOpen } = useNxPlayer();

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
            {/* ── Menu button (chapdan ochiladi) ───────────────────── */}
            <HeaderIconBtn
                onClick={onMenuOpen ?? (() => {})}
                icon={Menu}
                iconColor="rgba(160,176,224,0.80)"
            />

            {/* ── Asosiy sahifaga qaytish ───────────────────────────── */}
            <Link
                href="/"
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                style={{
                    background: "rgba(43,62,232,0.08)",
                    border: "1px solid rgba(43,62,232,0.18)",
                }}
                title="For Humo"
            >
                <Home className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
            </Link>

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
                <CreateBtn onClick={() => setCreatePostOpen(true)} />

                {/* Kashfiyot */}
                <HeaderIconBtn
                    onClick={() => setExploreOpen(true)}
                    icon={Compass}
                    iconColor="rgba(160,176,224,0.80)"
                    className="hidden sm:flex"
                />

                {/* Humo Support — yon panel ochadi */}
                <HeaderIconBtn
                    onClick={() => window.dispatchEvent(new Event("support:open"))}
                    icon={HeadsetIcon}
                    iconColor="rgba(160,176,224,0.80)"
                />

                {/* Xabarlar */}
                <MessagesButton onOpen={() => setMessagesOpen(true)} />

                {/* Bildirishnoma */}
                <BellButton onOpen={() => setNotifOpen(true)} />

                {/* Profil */}
                <ProfileButton session={session} />
            </div>
        </header>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable animated icon button
// ─────────────────────────────────────────────────────────────────────────────
interface HeaderIconBtnProps {
    onClick: () => void;
    icon: React.ElementType;
    iconColor?: string;
    badge?: { color: string; glow: string };
    className?: string;
}

function HeaderIconBtn({ onClick, icon: Icon, iconColor, badge, className = "" }: HeaderIconBtnProps) {
    const iconRef = useRef<SVGSVGElement>(null);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        // Spring pop on icon
        if (iconRef.current) {
            iconRef.current.classList.remove("nx-pop");
            void (iconRef.current as unknown as HTMLElement).offsetWidth;
            iconRef.current.classList.add("nx-pop");
        }
        // Ripple at click coordinates
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const dot = document.createElement("span");
        dot.className = "nx-ripple-dot";
        dot.style.left = `${e.clientX - rect.left}px`;
        dot.style.top  = `${e.clientY - rect.top}px`;
        btn.appendChild(dot);
        dot.addEventListener("animationend", () => dot.remove());
        onClick();
    }, [onClick]);

    return (
        <button
            onClick={handleClick}
            className={`nx-ripple-wrap nx-press relative w-9 h-9 flex items-center justify-center rounded-xl ${className}`}
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
            <Icon
                ref={iconRef as React.Ref<SVGSVGElement>}
                className="w-4 h-4"
                style={{ color: iconColor ?? "rgba(160,176,224,0.80)" }}
            />
            {badge && (
                <span
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                    style={{ background: badge.color, boxShadow: `0 0 6px ${badge.glow}` }}
                />
            )}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create button — pill with gradient text
// ─────────────────────────────────────────────────────────────────────────────
function CreateBtn({ onClick }: { onClick: () => void }) {
    const iconRef = useRef<SVGSVGElement>(null);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (iconRef.current) {
            iconRef.current.classList.remove("nx-pop");
            void (iconRef.current as unknown as HTMLElement).offsetWidth;
            iconRef.current.classList.add("nx-pop");
        }
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const dot = document.createElement("span");
        dot.className = "nx-ripple-dot";
        dot.style.left = `${e.clientX - rect.left}px`;
        dot.style.top  = `${e.clientY - rect.top}px`;
        btn.appendChild(dot);
        dot.addEventListener("animationend", () => dot.remove());
        onClick();
    }, [onClick]);

    return (
        <button
            onClick={handleClick}
            className="nx-ripple-wrap nx-press hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl"
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
            <PlusSquare
                ref={iconRef as React.Ref<SVGSVGElement>}
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "#00CEC8" }}
            />
            <span className="text-xs font-black" style={{
                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
            }}>
                Yaratish
            </span>
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bell — animated ring on click
// ─────────────────────────────────────────────────────────────────────────────
function BellButton({ onOpen }: { onOpen: () => void }) {
    const bellRef = useRef<SVGSVGElement>(null);
    const { notifOpen } = useNxPlayer();
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (notifOpen) return; // panel ochiq — yopilganda yangilaymiz
        let cancel = false;
        const fetchCount = () => fetch("/api/nexus/notifications/count")
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (!cancel && d) setUnread(d.unread ?? 0); })
            .catch(() => { });
        fetchCount();
        const t = setInterval(fetchCount, 60000);
        return () => { cancel = true; clearInterval(t); };
    }, [notifOpen]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (bellRef.current) {
            bellRef.current.classList.remove("nx-pop");
            void (bellRef.current as unknown as HTMLElement).offsetWidth;
            bellRef.current.classList.add("nx-pop");
        }
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const dot = document.createElement("span");
        dot.className = "nx-ripple-dot";
        dot.style.left = `${e.clientX - rect.left}px`;
        dot.style.top  = `${e.clientY - rect.top}px`;
        btn.appendChild(dot);
        dot.addEventListener("animationend", () => dot.remove());
        onOpen();
    }, [onOpen]);

    return (
        <button
            onClick={handleClick}
            className="nx-ripple-wrap nx-press relative w-9 h-9 flex items-center justify-center rounded-xl"
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
            <Bell
                ref={bellRef as React.Ref<SVGSVGElement>}
                className="w-4 h-4"
                style={{ color: "rgba(160,176,224,0.80)" }}
            />
            {unread > 0 && (
                <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 0 6px rgba(0,206,200,0.8)" }}
                >
                    {unread > 9 ? "9+" : unread}
                </span>
            )}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Messages — real o'qilmagan badge
// ─────────────────────────────────────────────────────────────────────────────
function MessagesButton({ onOpen }: { onOpen: () => void }) {
    const iconRef = useRef<SVGSVGElement>(null);
    const { messagesOpen } = useNxPlayer();
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        if (messagesOpen) return;
        let cancel = false;
        // Yagona unread jami: DM + kanal + guruh (bildirishnoma alohida — BellButton'da).
        const fetchCount = () => fetch("/api/nexus/unread-total")
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                if (cancel || !d) return;
                setUnread((d.dm ?? 0) + (d.channel ?? 0) + (d.group ?? 0));
            })
            .catch(() => { });
        fetchCount();
        const t = setInterval(fetchCount, 30_000);
        return () => { cancel = true; clearInterval(t); };
    }, [messagesOpen]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (iconRef.current) {
            iconRef.current.classList.remove("nx-pop");
            void (iconRef.current as unknown as HTMLElement).offsetWidth;
            iconRef.current.classList.add("nx-pop");
        }
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const dot = document.createElement("span");
        dot.className = "nx-ripple-dot";
        dot.style.left = `${e.clientX - rect.left}px`;
        dot.style.top = `${e.clientY - rect.top}px`;
        btn.appendChild(dot);
        dot.addEventListener("animationend", () => dot.remove());
        onOpen();
    }, [onOpen]);

    return (
        <button
            onClick={handleClick}
            className="nx-ripple-wrap nx-press relative w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.18)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.18)"; }}
        >
            <MessageCircle ref={iconRef as React.Ref<SVGSVGElement>} className="w-4 h-4" style={{ color: "rgba(160,176,224,0.80)" }} />
            {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                    style={{ background: "#10B981", boxShadow: "0 0 6px rgba(16,185,129,0.8)" }}>
                    {unread > 99 ? "99+" : unread}
                </span>
            )}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile avatar button
// ─────────────────────────────────────────────────────────────────────────────
function ProfileButton({ session }: { session: ReturnType<typeof useSession>["data"] }) {
    const name   = session?.user?.name  ?? null;
    const image  = session?.user?.image ?? null;
    const letter = name ? name[0].toUpperCase() : "?";

    return (
        <button
            onClick={() => window.dispatchEvent(new CustomEvent("nexus:navigate", { detail: "profile" }))}
            className="nx-press flex items-center gap-2 h-9 pl-1 pr-2.5 rounded-xl transition-colors duration-150"
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
