"use client";

import React from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Bot } from "lucide-react";

type IconCmp = (p: { size?: number }) => React.JSX.Element;

// Original brend ikonkalari (Simple Icons SVG yo'llari)
const TelegramIcon: IconCmp = ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.061 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
);
const YoutubeIcon: IconCmp = ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
);
const InstagramIcon: IconCmp = ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.846-10.405a1.441 1.441 0 0 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/>
    </svg>
);
const BotIcon: IconCmp = ({ size = 15 }) => <Bot size={size} />;

const SOCIALS: { Icon: IconCmp; label: string; href: string }[] = [
    { Icon: TelegramIcon, label: "Telegram kanal", href: "https://t.me/ForHumo_Market" },
    { Icon: BotIcon, label: "Telegram bot", href: "https://t.me/ForHumo_MarketBot" },
    { Icon: YoutubeIcon, label: "YouTube", href: "https://www.youtube.com/@ForHumo_Market" },
    { Icon: InstagramIcon, label: "Instagram", href: "https://www.instagram.com/forhumo_market/" },
];

export function MarketFooter() {
    return (
        <footer className="border-t border-green-100/80 dark:border-white/[0.06] mt-12">
            <div className="container mx-auto px-4 max-w-6xl py-8 flex flex-col sm:flex-row items-center justify-between gap-5">
                {/* Logo + huquq */}
                <div className="flex items-center gap-2.5 text-sm">
                    <Image src="/logos/humo-market.png" alt="Humo Market" width={32} height={32} className="rounded-xl" />
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white leading-tight">Humo Market</p>
                        <p className="text-[11px] text-gray-400 dark:text-white/30 leading-tight">© 2026 Barcha huquqlar himoyalangan</p>
                    </div>
                </div>

                {/* Havolalar + ijtimoiy tarmoqlar */}
                <div className="flex items-center gap-4">
                    <Link href="/privacy-policy/market"
                        className="text-xs font-medium text-gray-500 dark:text-white/40 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                        Maxfiylik siyosati
                    </Link>
                    <div className="flex items-center gap-2">
                        {SOCIALS.map(s => {
                            const { Icon } = s;
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
