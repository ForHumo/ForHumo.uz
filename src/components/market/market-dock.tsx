"use client";

import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import {
    Home, Grid3X3, Heart, ShoppingCart,
} from "lucide-react";
import { useEffect, useState } from "react";

interface DockItem {
    icon?: React.ElementType;
    label: string;
    href?: string;
    key: string;
    accent?: boolean;
    action?: "ai";
}

// 5 element: Asosiy / Katalog / Humo AI (markazda accent, logotip) / Sevimlilar / Savat
const DOCK_ITEMS: DockItem[] = [
    { icon: Home,         label: "Asosiy",   href: "/market",          key: "home"     },
    { icon: Grid3X3,      label: "Katalog",  href: "/market/catalog",  key: "catalog"  },
    {                     label: "Humo AI",                             key: "ai", accent: true, action: "ai" },
    { icon: Heart,        label: "Sevimli",  href: "/market/wishlist", key: "wishlist" },
    { icon: ShoppingCart, label: "Savat",    href: "/market/cart",     key: "cart"     },
];

export function MarketDock() {
    const pathname = usePathname();
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        fetch("/api/market/cart")
            .then(r => r.json())
            .then(d => setCartCount(d.items?.length ?? 0))
            .catch(() => {});
    }, [pathname]);

    function isActive(item: DockItem) {
        if (!item.href) return false;
        if (item.key === "home") return /\/market$/.test(pathname);
        return pathname.includes(item.href.replace("/market", ""));
    }

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4 pointer-events-none"
        >
            <div className="flex items-end gap-2 px-4 py-2
                bg-white/85 dark:bg-[#050F07]/92
                backdrop-blur-xl
                border border-green-100/80 dark:border-green-900/20
                rounded-3xl shadow-2xl shadow-green-900/10
                pointer-events-auto">
                {DOCK_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);
                    const isCart = item.key === "cart";

                    if (item.accent) {
                        // AI tugmasi — kattaroq, ustidan chiqib turadi (raised), Humo AI logotipi
                        return (
                            <button key={item.key} type="button"
                                onClick={() => {
                                    if (item.action === "ai") window.dispatchEvent(new Event("humo-ai:open"));
                                }}
                                title={item.label}
                                className="flex flex-col items-center gap-1 min-w-[64px] active:scale-95 transition">
                                <div className="w-14 h-14 -mt-4 rounded-full
                                    bg-white flex items-center justify-center
                                    shadow-lg shadow-green-500/40
                                    ring-4 ring-white/85 dark:ring-[#050F07]/92
                                    hover:scale-105 transition">
                                    <Image src="/logos/humo-ai-icon-black.png" alt="Humo AI"
                                        width={38} height={38} className="w-9 h-9 object-contain" />
                                </div>
                                <span className="text-[10px] font-bold text-green-600 dark:text-green-400 leading-none pb-1">
                                    {item.label}
                                </span>
                            </button>
                        );
                    }

                    return (
                        <Link key={item.key} href={item.href ?? "/market"}
                            className="min-w-[62px] flex flex-col items-center gap-1 py-1.5 px-2 rounded-2xl transition">
                            <div className={`relative flex items-center justify-center
                                w-11 h-9 rounded-xl transition
                                ${active ? "bg-green-100/80 dark:bg-green-900/30" : "hover:bg-gray-100/80 dark:hover:bg-white/[0.05]"}`}>
                                {Icon && <Icon size={20}
                                    className={active ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-white/50"}
                                    strokeWidth={active ? 2.5 : 1.8}
                                />}
                                {isCart && cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1
                                        bg-green-500 rounded-full flex items-center justify-center">
                                        <span className="text-[9px] font-black text-white">{cartCount}</span>
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] font-semibold leading-none ${
                                active ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-white/45"
                            }`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </motion.div>
    );
}
