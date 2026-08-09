"use client";

import { Link } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    Home, Grid3X3, Heart, ShoppingCart, Shield,
} from "lucide-react";
import { useEffect, useState } from "react";

interface DockItem {
    icon: React.ElementType;
    label: string;
    href: string;
    key: string;
    accent?: boolean;
}

// Public dock — barcha foydalanuvchilarga. Owner/Worker'ga Admin havolasi
// alohida (staff bo'lganda) qo'shiladi.
const DOCK_ITEMS: DockItem[] = [
    { icon: Home,         label: "Asosiy",   href: "/market",          key: "home"     },
    { icon: Grid3X3,      label: "Katalog",  href: "/market/catalog",  key: "catalog"  },
    { icon: Heart,        label: "Sevimli",  href: "/market/wishlist", key: "wishlist" },
    { icon: ShoppingCart, label: "Savat",    href: "/market/cart",     key: "cart"     },
];

export function MarketDock() {
    const pathname = usePathname();
    const [cartCount, setCartCount] = useState(0);
    const [isStaff, setIsStaff] = useState(false);

    useEffect(() => {
        fetch("/api/market/cart")
            .then(r => r.json())
            .then(d => setCartCount(d.items?.length ?? 0))
            .catch(() => {});
        fetch("/api/market/admin/me")
            .then(r => r.json())
            .then(d => setIsStaff(!!d.isOwner || !!d.isWorker))
            .catch(() => {});
    }, [pathname]);

    function isActive(item: DockItem) {
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
            <div className="flex items-center gap-1 px-3 py-2.5
                bg-white/80 dark:bg-[#050F07]/90
                backdrop-blur-xl
                border border-green-100/80 dark:border-green-900/20
                rounded-full shadow-2xl shadow-green-900/10
                pointer-events-auto">
                {[
                    ...DOCK_ITEMS,
                    ...(isStaff ? [{ icon: Shield, label: "Admin", href: "/market/admin", key: "admin", accent: true } as DockItem] : []),
                ].map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);
                    const isCart = item.key === "cart";

                    if (item.accent) {
                        return (
                            <Link key={item.key} href={item.href}
                                className="mx-1 w-11 h-11 rounded-full
                                    bg-gradient-to-br from-green-500 to-emerald-600
                                    flex items-center justify-center
                                    shadow-lg shadow-green-500/30
                                    hover:from-green-400 hover:to-emerald-500
                                    transition-all duration-200">
                                <Icon size={20} className="text-white" strokeWidth={2.5} />
                            </Link>
                        );
                    }

                    return (
                        <Link key={item.key} href={item.href}>
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className={`relative flex flex-col items-center justify-center
                                    w-12 h-12 rounded-2xl transition-all duration-200
                                    ${active
                                        ? "bg-green-100/80 dark:bg-green-900/30"
                                        : "hover:bg-gray-100/80 dark:hover:bg-white/[0.05]"
                                    }`}
                            >
                                <Icon size={20}
                                    className={active
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-gray-500 dark:text-white/40"
                                    }
                                    strokeWidth={active ? 2.5 : 1.8}
                                />
                                {/* Savat badge */}
                                {isCart && cartCount > 0 && (
                                    <motion.div
                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        className="absolute -top-0.5 -right-0.5 w-4 h-4
                                            bg-green-500 rounded-full
                                            flex items-center justify-center">
                                        <span className="text-[9px] font-black text-white">{cartCount}</span>
                                    </motion.div>
                                )}
                                {/* Aktiv dot */}
                                {active && (
                                    <motion.div
                                        layoutId="market-dock-dot"
                                        className="absolute bottom-1 w-1 h-1 rounded-full bg-green-500"
                                    />
                                )}
                            </motion.div>
                        </Link>
                    );
                })}
            </div>
        </motion.div>
    );
}
