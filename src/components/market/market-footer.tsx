"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import { Send, Bot, Youtube, Instagram, Store } from "lucide-react";

const SOCIALS = [
    { icon: Send, label: "Telegram kanal", href: "https://t.me/ForHumo_Market" },
    { icon: Bot, label: "Telegram bot", href: "https://t.me/ForHumo_MarketBot" },
    { icon: Youtube, label: "YouTube", href: "https://www.youtube.com/@ForHumo_Market" },
    { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/forhumo_market/" },
];

export function MarketFooter() {
    return (
        <footer className="border-t border-green-100/80 dark:border-white/[0.06] mt-12">
            <div className="container mx-auto px-4 max-w-6xl py-8 flex flex-col sm:flex-row items-center justify-between gap-5">
                {/* Brend + huquq */}
                <div className="flex items-center gap-2.5 text-sm">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center">
                        <Store size={14} className="text-white" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white leading-tight">Humo Market</p>
                        <p className="text-[11px] text-gray-400 dark:text-white/30 leading-tight">© 2026 Barcha huquqlar himoyalangan</p>
                    </div>
                </div>

                {/* Havolalar + ijtimoiy tarmoqlar */}
                <div className="flex items-center gap-4">
                    <Link href="/privacy-policy"
                        className="text-xs font-medium text-gray-500 dark:text-white/40 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                        Maxfiylik siyosati
                    </Link>
                    <div className="flex items-center gap-2">
                        {SOCIALS.map(s => {
                            const Icon = s.icon;
                            return (
                                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center
                                        bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-white/40
                                        hover:bg-green-500 hover:text-white dark:hover:bg-green-500 dark:hover:text-white transition-all">
                                    <Icon size={15} />
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>
        </footer>
    );
}
