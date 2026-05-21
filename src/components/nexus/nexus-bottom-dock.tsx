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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-500">
            <div className="nx-glass-heavy px-3 py-2.5 rounded-[2rem] flex items-center gap-0.5 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-x-auto nx-hide-scrollbar max-w-[96vw]">
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
                                    ? "bg-primary/20 text-primary scale-110"
                                    : "text-gray-400 hover:text-white hover:bg-white/5 hover:scale-105"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "w-5 h-5 transition-all duration-200",
                                    isActive && "drop-shadow-[0_0_8px_rgba(59,130,246,0.9)]"
                                )}
                            />

                            {/* Tooltip */}
                            <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/90 backdrop-blur-md rounded-lg text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none border border-white/10 whitespace-nowrap">
                                {label}
                            </div>

                            {/* Active dot */}
                            {isActive && (
                                <div className="absolute -bottom-0.5 w-1 h-1 bg-primary rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
