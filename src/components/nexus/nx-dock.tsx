"use client";

import React, { useRef, useCallback } from "react";
import {
    LayoutDashboard, Clapperboard, Radio,
    LibraryBig, MessagesSquare, CircleUserRound, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Tablar ro'yxati
// ─────────────────────────────────────────────────────────────────────────────
export type NxTab =
    | "feed"
    | "video"
    | "live"
    | "media"
    | "social"
    | "profile";

const TABS: { id: NxTab; icon: React.ElementType; label: string; color: string }[] = [
    { id: "feed",    icon: LayoutDashboard,  label: "Asosiy",   color: "#2B3EE8" },
    { id: "video",   icon: Clapperboard,     label: "Video",    color: "#8B5CF6" },
    { id: "live",    icon: Radio,            label: "Jonli",    color: "#EF4444" },
    { id: "media",   icon: LibraryBig,       label: "Media",    color: "#10B981" },
    { id: "social",  icon: MessagesSquare,   label: "Ijtimoiy", color: "#F59E0B" },
    { id: "profile", icon: CircleUserRound,  label: "Profil",   color: "#00CEC8" },
];

interface Props {
    active: NxTab;
    onChange: (tab: NxTab) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ripple helper — creates a DOM ripple at click position
// ─────────────────────────────────────────────────────────────────────────────
function spawnRipple(el: HTMLElement, color: string) {
    const dot = document.createElement("span");
    dot.className = "nx-ripple-dot";
    dot.style.background = color.replace("1)", "0.45)").replace("#", "rgba(").replace(/^rgba\(([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2}),/, (_, r, g, b) =>
        `rgba(${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)},`
    );
    dot.style.left = "50%";
    dot.style.top  = "50%";
    el.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove());
}

// ─────────────────────────────────────────────────────────────────────────────
// NxDock — floating pill
// ─────────────────────────────────────────────────────────────────────────────
export function NxDock({ active, onChange }: Props) {
    const { setCreatePostOpen } = useNxPlayer();
    const tabs = TABS;
    const midIdx = Math.floor(tabs.length / 2);

    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
            <nav
                className="flex items-center px-2 py-2 gap-0.5"
                style={{
                    background: "rgba(5,8,24,0.92)",
                    backdropFilter: "blur(28px)",
                    WebkitBackdropFilter: "blur(28px)",
                    border: "1px solid rgba(43,62,232,0.30)",
                    borderRadius: "9999px",
                    boxShadow: [
                        "0 20px 60px rgba(0,0,0,0.75)",
                        "0 0 0 1px rgba(43,62,232,0.10) inset",
                        "0 4px 32px rgba(43,62,232,0.18)",
                    ].join(","),
                }}
            >
                {tabs.map(({ id, icon: Icon, label, color }, i) => (
                    <React.Fragment key={id}>
                        {i === midIdx && (
                            <CreateButton onClick={() => setCreatePostOpen(true)} />
                        )}
                        <DockItem
                            id={id}
                            Icon={Icon}
                            label={label}
                            color={color}
                            isActive={active === id}
                            onClick={() => onChange(id)}
                        />
                    </React.Fragment>
                ))}
            </nav>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create button — centre "+" with pulse ring
// ─────────────────────────────────────────────────────────────────────────────
function CreateButton({ onClick }: { onClick: () => void }) {
    const ref = useRef<HTMLButtonElement>(null);

    const handleClick = useCallback(() => {
        if (ref.current) {
            ref.current.classList.remove("nx-pop");
            void ref.current.offsetWidth;
            ref.current.classList.add("nx-pop");
        }
        onClick();
    }, [onClick]);

    return (
        <button
            ref={ref}
            onClick={handleClick}
            className="nx-ripple-wrap mx-1.5 w-11 h-11 rounded-full flex items-center justify-center"
            style={{
                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                boxShadow: "0 0 24px rgba(43,62,232,0.55), 0 4px 16px rgba(0,0,0,0.45)",
            }}
        >
            <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bitta dock elementi
// ─────────────────────────────────────────────────────────────────────────────
interface ItemProps {
    id: NxTab;
    Icon: React.ElementType;
    label: string;
    color: string;
    isActive: boolean;
    onClick: () => void;
}

function DockItem({ Icon, label, color, isActive, onClick }: ItemProps) {
    const iconRef  = useRef<SVGSVGElement>(null);
    const btnRef   = useRef<HTMLButtonElement>(null);

    const handleClick = useCallback(() => {
        // Spring pop on icon
        if (iconRef.current) {
            iconRef.current.classList.remove("nx-pop");
            void (iconRef.current as unknown as HTMLElement).offsetWidth;
            iconRef.current.classList.add("nx-pop");
        }
        onClick();
    }, [onClick]);

    return (
        <button
            ref={btnRef}
            onClick={handleClick}
            title={label}
            className={cn(
                "nx-ripple-wrap relative flex flex-col items-center justify-center gap-1",
                "transition-all duration-300",
                isActive ? "w-[88px] h-12 rounded-[22px]" : "w-11 h-12 rounded-[18px]"
            )}
            style={isActive ? {
                background: `linear-gradient(145deg, ${color}28 0%, ${color}14 100%)`,
                border: `1px solid ${color}55`,
                boxShadow: `0 0 22px ${color}30, 0 2px 12px rgba(0,0,0,0.35)`,
            } : {
                background: "transparent",
                border: "1px solid transparent",
            }}
        >
            {/* Icon + label row when active */}
            <div className={cn(
                "flex items-center transition-all duration-300",
                isActive ? "gap-1.5" : "gap-0"
            )}>
                <Icon
                    ref={iconRef as React.Ref<SVGSVGElement>}
                    className={cn("transition-all duration-300 flex-shrink-0", isActive ? "w-[15px] h-[15px]" : "w-[18px] h-[18px]")}
                    strokeWidth={isActive ? 2.0 : 1.6}
                    style={{
                        color: isActive ? color : "rgba(120,140,185,0.75)",
                        filter: isActive ? `drop-shadow(0 0 6px ${color}80)` : "none",
                    }}
                />
                {isActive && (
                    <span
                        className="text-[11px] font-black whitespace-nowrap tracking-tight"
                        style={{ color }}
                    >
                        {label}
                    </span>
                )}
            </div>

            {/* Active glow indicator dot */}
            {isActive && (
                <div
                    className="nx-active-dot absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{
                        background: color,
                        boxShadow: `0 0 8px ${color}`,
                    }}
                />
            )}
        </button>
    );
}
