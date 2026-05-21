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
        color: "text-primary bg-primary/15",
        title: "Ko'rinish",
        desc: "Qorong'u va yorug' rejim",
        control: (
            <div className="flex bg-black/40 p-1 rounded-lg gap-0.5">
                <button className="p-1.5 rounded-md bg-white/10 text-white transition-colors hover:bg-white/20">
                    <Moon className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 rounded-md text-gray-500 transition-colors hover:text-white">
                    <Sun className="w-3.5 h-3.5" />
                </button>
            </div>
        ),
    },
    {
        icon: Globe,
        color: "text-blue-400 bg-blue-500/15",
        title: "Til",
        desc: "Interfeys tilini tanlang",
        control: (
            <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-1 rounded-lg">UZ</span>
        ),
    },
    {
        icon: Bell,
        color: "text-orange-400 bg-orange-500/15",
        title: "Bildirishnomalar",
        desc: "Ogohlantirish sozlamalari",
        control: (
            <div className="w-9 h-5 bg-primary rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
            </div>
        ),
    },
    {
        icon: Lock,
        color: "text-purple-400 bg-purple-500/15",
        title: "Maxfiylik",
        desc: "Ko'rinuvchanlik va xavfsizlik",
        control: null,
    },
    {
        icon: User,
        color: "text-green-400 bg-green-500/15",
        title: "Hisob boshqaruvi",
        desc: "Profil ma'lumotlari va xavfsizlik",
        control: null,
    },
    {
        icon: Shield,
        color: "text-pink-400 bg-pink-500/15",
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
                    "fixed inset-0 bg-black/75 backdrop-blur-md z-[80] transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={cn(
                    "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-2xl max-h-[82vh] z-[90] nx-glass border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-[0_30px_100px_rgba(0,0,0,0.9)] transition-all duration-300",
                    isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                )}
            >
                {/* Header */}
                <div className="px-7 py-5 flex items-center justify-between border-b border-white/5 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">Sozlamalar</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Nexus tajribangizni boshqaring</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 nx-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4">
                    {SETTINGS.map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div
                                key={i}
                                className="p-5 bg-white/[0.03] rounded-[1.5rem] border border-white/5 hover:border-primary/25 transition-all duration-200 cursor-pointer group"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", s.color)}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    {s.control}
                                </div>
                                <p className="font-bold text-sm mb-0.5 group-hover:text-primary transition-colors duration-200">{s.title}</p>
                                <p className="text-[10px] text-gray-500">{s.desc}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-white/5 flex items-center justify-between flex-shrink-0">
                    <button className="flex items-center gap-2 text-red-500 text-sm font-bold hover:bg-red-500/10 px-3 py-1.5 rounded-xl transition-colors duration-150">
                        <LogOut className="w-4 h-4" />
                        Chiqish
                    </button>
                    <p className="text-[10px] text-gray-600 font-mono">Nexus v1.0.0 — Sirius</p>
                </div>
            </div>
        </>
    );
}
