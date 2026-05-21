"use client";

import {
    LayoutGrid, MessageCircle, Film, Clapperboard,
    Music, BookOpen, PlaySquare, Radio,
    Smartphone, Signal, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DOCK_ITEMS = [
    { id: "nexus",    icon: LayoutGrid,    label: "Nexus"     },
    { id: "chats",    icon: MessageCircle, label: "Xabarlar"  },
    { id: "gcinema",  icon: Film,          label: "G. Kino"   },
    { id: "vcinema",  icon: Clapperboard,  label: "V. Kino"   },
    { id: "musics",   icon: Music,         label: "Musiqa"    },
    { id: "blogs",    icon: BookOpen,      label: "Postlar"   },
    { id: "gvideos",  icon: PlaySquare,    label: "G. Video"  },
    { id: "gstreams", icon: Radio,         label: "G. Efir"   },
    { id: "vvideos",  icon: Smartphone,    label: "Shorts"    },
    { id: "vstreams", icon: Signal,        label: "V. Efir"   },
    { id: "humoid",   icon: UserCircle,    label: "Profil"    },
] as const;

interface Props {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function NexusBottomDock({ activeTab, onTabChange }: Props) {
    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-500">
            <div
                className="px-3 py-2.5 rounded-[2rem] flex items-center gap-0.5 overflow-x-auto nx-hide-scrollbar max-w-[96vw]"
                style={{
                    background: "rgba(6,11,26,0.92)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid rgba(43,62,232,0.30)",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(43,62,232,0.10) inset, 0 4px 40px rgba(43,62,232,0.10)",
                }}
            >
                {DOCK_ITEMS.map(({ id, icon: Icon, label }) => {
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => onTabChange(id)}
                            title={label}
                            className={cn(
                                "relative flex flex-col items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-2xl transition-all duration-200 group flex-shrink-0",
                                isActive
                                    ? "scale-110"
                                    : "text-[#4a5a8a] hover:text-white hover:scale-105"
                            )}
                            style={isActive ? {
                                background: "linear-gradient(135deg, rgba(43,62,232,0.30) 0%, rgba(0,206,200,0.18) 100%)",
                                color: "#7dd3fc",
                            } : {}}
                        >
                            <Icon
                                className={cn(
                                    "w-5 h-5 transition-all duration-200",
                                )}
                                style={isActive ? {
                                    filter: "drop-shadow(0 0 8px rgba(43,62,232,0.9)) drop-shadow(0 0 16px rgba(0,206,200,0.4))",
                                } : {}}
                            />

                            {/* Tooltip */}
                            <div
                                className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap"
                                style={{ background: "rgba(6,11,26,0.95)", border: "1px solid rgba(43,62,232,0.30)" }}
                            >
                                {label}
                            </div>

                            {/* Active indicator dot — gradient */}
                            {isActive && (
                                <div
                                    className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                                    style={{ background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
