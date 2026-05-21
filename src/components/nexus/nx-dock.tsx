"use client";

import {
    Home, Play, Radio, Library,
    MessageCircle, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

const TABS: { id: NxTab; icon: React.ElementType; label: string }[] = [
    { id: "feed",    icon: Home,          label: "Asosiy"   },
    { id: "video",   icon: Play,          label: "Video"    },
    { id: "live",    icon: Radio,         label: "Jonli"    },
    { id: "media",   icon: Library,       label: "Media"    },
    { id: "social",  icon: MessageCircle, label: "Ijtimoiy" },
    { id: "profile", icon: UserCircle,    label: "Profil"   },
];

interface Props {
    active: NxTab;
    onChange: (tab: NxTab) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// NxDock — floating pill
// ─────────────────────────────────────────────────────────────────────────────
export function NxDock({ active, onChange }: Props) {
    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
            <nav
                className="flex items-center px-2 py-2 gap-1"
                style={{
                    background: "rgba(5,8,24,0.90)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid rgba(43,62,232,0.28)",
                    borderRadius: "9999px",
                    boxShadow: [
                        "0 20px 60px rgba(0,0,0,0.70)",
                        "0 0 0 1px rgba(43,62,232,0.08) inset",
                        "0 2px 30px rgba(43,62,232,0.12)",
                    ].join(","),
                }}
            >
                {TABS.map(({ id, icon: Icon, label }) => {
                    const isActive = active === id;
                    return (
                        <DockItem
                            key={id}
                            id={id}
                            Icon={Icon}
                            label={label}
                            isActive={isActive}
                            onClick={() => onChange(id)}
                        />
                    );
                })}
            </nav>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bitta dock elementi
// ─────────────────────────────────────────────────────────────────────────────
interface ItemProps {
    id: NxTab;
    Icon: React.ElementType;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

function DockItem({ Icon, label, isActive, onClick }: ItemProps) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={cn(
                "relative flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95",
                isActive
                    ? "w-24 h-11 rounded-full"
                    : "w-11 h-11 rounded-full hover:bg-white/5"
            )}
            style={isActive ? {
                background: "linear-gradient(135deg, rgba(43,62,232,0.35) 0%, rgba(0,206,200,0.22) 100%)",
                border: "1px solid rgba(43,62,232,0.45)",
                boxShadow: "0 0 20px rgba(43,62,232,0.25), 0 0 40px rgba(0,206,200,0.10)",
            } : {}}
        >
            {/* Ikonka */}
            <div className={cn("transition-all duration-200", isActive ? "flex items-center gap-2" : "")}>
                <Icon
                    className={cn(
                        "transition-all duration-200",
                        isActive ? "w-4 h-4" : "w-5 h-5"
                    )}
                    style={isActive ? {
                        color: "#00CEC8",
                        filter: "drop-shadow(0 0 6px rgba(0,206,200,0.70))",
                    } : {
                        color: "rgba(100,120,180,0.70)",
                    }}
                />

                {/* Label — faqat active holatda */}
                {isActive && (
                    <span
                        className="text-[11px] font-bold whitespace-nowrap"
                        style={{
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        {label}
                    </span>
                )}
            </div>
        </button>
    );
}
