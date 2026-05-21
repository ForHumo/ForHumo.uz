"use client";

import {
    X, Monitor, Users, Bot, PlayCircle, Clock,
    ThumbsUp, ThumbsDown, ListMusic, History,
    UserX, ChevronRight, Bell, Settings, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarItem {
    icon: React.ElementType;
    label: string;
    badge?: string;
    isSettings?: boolean;
}

interface SidebarSection {
    title: string;
    items: SidebarItem[];
}

const SECTIONS: SidebarSection[] = [
    {
        title: "Bildirishnomalar",
        items: [
            { icon: Bell, label: "Barcha bildirishnomalar", badge: "12" },
        ],
    },
    {
        title: "Mening kontentim",
        items: [
            { icon: Monitor,    label: "Mening kanallarim" },
            { icon: Users,      label: "Mening guruhlarim" },
            { icon: Bot,        label: "AI Agentlarim"     },
        ],
    },
    {
        title: "Faollik",
        items: [
            { icon: PlayCircle, label: "Obunalar"          },
            { icon: History,    label: "Ko'rilganlar"      },
            { icon: ThumbsUp,   label: "Yoqtirilganlar"   },
            { icon: ThumbsDown, label: "Yoqtirilmaganlar" },
        ],
    },
    {
        title: "Saqlangan",
        items: [
            { icon: ListMusic, label: "Pleylistlar"       },
            { icon: Clock,     label: "Keyinroq ko'rish"  },
        ],
    },
    {
        title: "Nexus tizimi",
        items: [
            { icon: UserX,    label: "Bloklangan foydalanuvchilar" },
            { icon: Settings, label: "Sozlamalar", isSettings: true },
        ],
    },
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onOpenSettings: () => void;
}

export function NexusSidebar({ isOpen, onClose, onOpenSettings }: Props) {
    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 z-[60] transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                style={{ background: "rgba(6,11,26,0.75)", backdropFilter: "blur(6px)" }}
                onClick={onClose}
            />

            {/* Panel */}
            <aside
                className={cn(
                    "fixed top-0 right-0 bottom-0 w-72 z-[70] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
                style={{
                    background: "rgba(6,11,26,0.94)",
                    backdropFilter: "blur(28px)",
                    WebkitBackdropFilter: "blur(28px)",
                    borderLeft: "1px solid rgba(43,62,232,0.25)",
                }}
            >
                {/* Header */}
                <div className="p-5 flex items-center justify-between flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.15)" }}>
                    <h2 className="text-lg font-bold nx-gradient-text">Nexus Menyu</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors duration-150"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.22)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.10)"}
                    >
                        <X className="w-4 h-4 text-[#a0b0e0]" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 nx-scrollbar">
                    {SECTIONS.map((section, si) => (
                        <div key={si} className="mb-6 last:mb-0">
                            <p className="px-3 text-[9px] font-bold uppercase tracking-[0.18em] mb-2"
                                style={{ color: "rgba(43,62,232,0.70)" }}>
                                {section.title}
                            </p>
                            <div className="space-y-0.5">
                                {section.items.map((item, ii) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={ii}
                                            onClick={item.isSettings ? () => { onClose(); onOpenSettings(); } : undefined}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 group"
                                            style={{}}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.10)"}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-150 text-[#4a5a8a] group-hover:text-[#7dd3fc]"
                                                    style={{ background: "rgba(11,20,45,0.60)", border: "1px solid rgba(43,62,232,0.18)" }}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-sm font-medium text-[#8090b0] group-hover:text-white transition-colors duration-150 text-left">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {item.badge && (
                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md min-w-[18px] text-center text-white nx-gradient">
                                                        {item.badge}
                                                    </span>
                                                )}
                                                <ChevronRight className="w-3.5 h-3.5 text-[#4a5a8a] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer — Nexus Pro promo */}
                <div className="p-4 flex-shrink-0"
                    style={{ borderTop: "1px solid rgba(43,62,232,0.15)" }}>
                    <div
                        className="rounded-2xl p-4 relative overflow-hidden cursor-pointer group transition-all duration-200"
                        style={{
                            background: "linear-gradient(135deg, rgba(43,62,232,0.18) 0%, rgba(0,206,200,0.12) 100%)",
                            border: "1px solid rgba(43,62,232,0.30)",
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.55)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.30)"}
                    >
                        {/* Background shimmer */}
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-10 -mt-10 pointer-events-none"
                            style={{ background: "radial-gradient(circle, rgba(43,62,232,0.35) 0%, transparent 70%)" }} />
                        <div className="flex items-center gap-2 mb-1.5 relative">
                            <Zap className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                            <p className="text-[10px] font-bold tracking-widest nx-gradient-text">NEXUS PRO</p>
                        </div>
                        <p className="text-xs text-[#8090b0] leading-relaxed relative">
                            Cheksiz bulut xotira va kengaytirilgan AI agentlar.
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
}
