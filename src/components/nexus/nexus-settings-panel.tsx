"use client";

import {
    X, Moon, Sun, Globe, Bell, Lock,
    User, Palette, LogOut, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const SETTINGS = [
    {
        icon: Palette,
        gradient: "from-[#2B3EE8] to-[#4B5EFF]",
        iconColor: "#a0b0ff",
        title: "Ko'rinish",
        desc: "Qorong'u va yorug' rejim",
        control: (
            <div className="flex p-1 rounded-lg gap-0.5"
                style={{ background: "rgba(6,11,26,0.80)", border: "1px solid rgba(43,62,232,0.20)" }}>
                <button className="p-1.5 rounded-md transition-colors"
                    style={{ background: "rgba(43,62,232,0.30)", color: "#a0b0ff" }}>
                    <Moon className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-md text-[#4a5a8a] hover:text-white transition-colors">
                    <Sun className="w-3.5 h-3.5" />
                </button>
            </div>
        ),
    },
    {
        icon: Globe,
        gradient: "from-[#0EA5E9] to-[#00CEC8]",
        iconColor: "#7dd3fc",
        title: "Til",
        desc: "Interfeys tilini tanlang",
        control: (
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ background: "rgba(11,20,45,0.80)", border: "1px solid rgba(43,62,232,0.25)", color: "#a0b0ff" }}>
                UZ
            </span>
        ),
    },
    {
        icon: Bell,
        gradient: "from-[#F59E0B] to-[#EF4444]",
        iconColor: "#fbbf24",
        title: "Bildirishnomalar",
        desc: "Ogohlantirish sozlamalari",
        control: (
            <div className="w-9 h-5 rounded-full relative cursor-pointer"
                style={{ background: "linear-gradient(90deg,#2B3EE8,#00CEC8)" }}>
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow" />
            </div>
        ),
    },
    {
        icon: Lock,
        gradient: "from-[#8B5CF6] to-[#6366F1]",
        iconColor: "#c4b5fd",
        title: "Maxfiylik",
        desc: "Ko'rinuvchanlik va xavfsizlik",
        control: null,
    },
    {
        icon: User,
        gradient: "from-[#10B981] to-[#059669]",
        iconColor: "#6ee7b7",
        title: "Hisob boshqaruvi",
        desc: "Profil ma'lumotlari va xavfsizlik",
        control: null,
    },
    {
        icon: Shield,
        gradient: "from-[#EC4899] to-[#8B5CF6]",
        iconColor: "#f9a8d4",
        title: "Shaxsiylashtirish",
        desc: "Tavsiya algoritmini sozlash",
        control: null,
    },
];

export function NexusSettingsPanel({ isOpen, onClose }: Props) {
    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 z-[80] transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                style={{ background: "rgba(6,11,26,0.85)", backdropFilter: "blur(12px)" }}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={cn(
                    "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-2xl max-h-[82vh] z-[90] rounded-[2rem] overflow-hidden flex flex-col transition-all duration-300",
                    isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                )}
                style={{
                    background: "rgba(8,14,32,0.96)",
                    backdropFilter: "blur(28px)",
                    WebkitBackdropFilter: "blur(28px)",
                    border: "1px solid rgba(43,62,232,0.30)",
                    boxShadow: "0 40px 120px rgba(0,0,0,0.9), 0 0 80px rgba(43,62,232,0.10)",
                }}
            >
                {/* Header */}
                <div className="px-7 py-5 flex items-center justify-between flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.15)" }}>
                    <div>
                        <h2 className="text-xl font-bold nx-gradient-text">Sozlamalar</h2>
                        <p className="text-xs mt-0.5" style={{ color: "#4a5a8a" }}>
                            Nexus tajribangizni boshqaring
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors duration-150"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.22)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.10)"}
                    >
                        <X className="w-5 h-5 text-[#a0b0e0]" />
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 nx-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SETTINGS.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div
                                key={i}
                                className="p-5 rounded-[1.5rem] cursor-pointer group transition-all duration-200"
                                style={{
                                    background: "rgba(11,20,45,0.50)",
                                    border: "1px solid rgba(43,62,232,0.15)",
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.10)";
                                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.40)";
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = "rgba(11,20,45,0.50)";
                                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(43,62,232,0.15)";
                                }}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br", s.gradient)}>
                                        <Icon className="w-4 h-4 text-white" />
                                    </div>
                                    {s.control}
                                </div>
                                <p className="font-bold text-sm mb-0.5 text-white group-hover:nx-gradient-text transition-colors duration-200">
                                    {s.title}
                                </p>
                                <p className="text-[10px]" style={{ color: "#4a5a8a" }}>{s.desc}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-7 py-4 flex items-center justify-between flex-shrink-0"
                    style={{ borderTop: "1px solid rgba(43,62,232,0.15)" }}>
                    <button className="flex items-center gap-2 text-sm font-bold text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-xl transition-colors duration-150">
                        <LogOut className="w-4 h-4" />
                        Chiqish
                    </button>
                    <p className="text-[10px] font-mono nx-gradient-text opacity-60">
                        Nexus v1.0.0 — Sirius
                    </p>
                </div>
            </div>
        </>
    );
}
