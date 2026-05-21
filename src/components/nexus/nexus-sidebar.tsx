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
            { icon: ListMusic, label: "Pleylistlar"  },
            { icon: Clock,     label: "Keyinroq ko'rish" },
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
                    "fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Panel */}
            <aside
                className={cn(
                    "fixed top-0 right-0 bottom-0 w-72 z-[70] nx-glass-heavy border-l border-white/10 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="p-5 flex items-center justify-between border-b border-white/5 flex-shrink-0">
                    <h2 className="text-lg font-bold">Nexus Menyu</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 nx-scrollbar">
                    {SECTIONS.map((section, si) => (
                        <div key={si} className="mb-6 last:mb-0">
                            <p className="px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-gray-600 mb-2">
                                {section.title}
                            </p>
                            <div className="space-y-0.5">
                                {section.items.map((item, ii) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={ii}
                                            onClick={item.isSettings ? () => { onClose(); onOpenSettings(); } : undefined}
                                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 group transition-all duration-150"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-all duration-150 flex-shrink-0">
                                                    <Icon className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors duration-150 text-left">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {item.badge && (
                                                    <span className="px-1.5 py-0.5 bg-primary text-[9px] font-bold rounded-md min-w-[18px] text-center">
                                                        {item.badge}
                                                    </span>
                                                )}
                                                <ChevronRight className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer — Nexus Pro promo */}
                <div className="p-4 border-t border-white/5 flex-shrink-0">
                    <div className="bg-gradient-to-br from-primary/15 to-blue-600/15 rounded-2xl p-4 border border-primary/20 relative overflow-hidden group cursor-pointer hover:border-primary/40 transition-colors duration-200">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-primary/20 blur-2xl rounded-full -mr-8 -mt-8 group-hover:bg-primary/30 transition-colors duration-300" />
                        <div className="flex items-center gap-2 mb-1.5 relative">
                            <Zap className="w-3.5 h-3.5 text-primary" />
                            <p className="text-[10px] text-primary font-bold tracking-widest">NEXUS PRO</p>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed relative">
                            Cheksiz bulut xotira va kengaytirilgan AI agentlar.
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
}
