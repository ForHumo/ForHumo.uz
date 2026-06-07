"use client";

import { Link, useRouter } from "@/i18n/routing";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
    Home, ChevronRight, Search, ShoppingCart,
    ChevronDown, X, Layers, Bell,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { MARKET_CATEGORIES } from "@/lib/market-categories";
import { VerifiedBadge } from "./verified-badge";

interface Suggestions {
    brands: { slug: string; name: string; logo: string | null; verified: boolean }[];
    products: { slug: string; name: string; price: string; images: string[] }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CatalogMegaMenu — Uzum uslubidagi katta katalog
// ─────────────────────────────────────────────────────────────────────────────
function CatalogMegaMenu({ onClose }: { onClose: () => void }) {
    const locale = useLocale();
    const [active, setActive] = useState(MARKET_CATEGORIES[0].slug);
    const activeCat = MARKET_CATEGORIES.find(c => c.slug === active)!;

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 z-50
                bg-white/95 dark:bg-[#0a1a0d]/97
                backdrop-blur-xl
                border-b border-green-100 dark:border-green-900/30
                shadow-2xl shadow-green-900/10"
        >
            <div className="container mx-auto px-4 max-w-6xl py-6 flex gap-0">
                {/* Chap: kategoriyalar ro'yxati */}
                <div className="w-56 shrink-0 border-r border-gray-100 dark:border-white/[0.06] pr-4">
                    {MARKET_CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = active === cat.slug;
                        return (
                            <button key={cat.slug}
                                onMouseEnter={() => setActive(cat.slug)}
                                onClick={() => setActive(cat.slug)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                                    text-sm font-medium transition-all duration-150
                                    ${isActive
                                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                        : "text-gray-600 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                                    }`}
                            >
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: isActive ? cat.color + "20" : "transparent" }}>
                                    <Icon size={15} style={{ color: isActive ? cat.color : undefined }} />
                                </div>
                                <span className="flex-1 truncate">{cat.name}</span>
                                {isActive && <ChevronRight size={13} style={{ color: cat.color }} />}
                            </button>
                        );
                    })}
                </div>

                {/* O'ng: subkategoriyalar */}
                <div className="flex-1 pl-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: activeCat.color + "20" }}>
                            {(() => { const Icon = activeCat.icon; return <Icon size={16} style={{ color: activeCat.color }} />; })()}
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{activeCat.name}</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-x-8 gap-y-1">
                        {activeCat.subcategories.map((sub) => (
                            <Link key={sub.slug}
                                href={`/market/catalog?cat=${activeCat.slug}&sub=${sub.slug}`}
                                onClick={onClose}
                                className="text-sm text-gray-500 dark:text-white/40
                                    hover:text-green-600 dark:hover:text-green-400
                                    py-1.5 transition-colors duration-150"
                            >
                                {sub.name}
                            </Link>
                        ))}
                    </div>

                    {/* Barcha ko'rish */}
                    <Link href={`/market/catalog?cat=${activeCat.slug}`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 mt-5 text-xs font-semibold
                            text-green-600 dark:text-green-400
                            hover:text-green-700 dark:hover:text-green-300 transition-colors">
                        Barchasini ko'rish
                        <ChevronRight size={12} />
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MarketNavbar
// ─────────────────────────────────────────────────────────────────────────────
export function MarketNavbar() {
    const { data: session } = useSession();
    const locale = useLocale();
    const router = useRouter();
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [sug, setSug] = useState<Suggestions>({ brands: [], products: [] });
    const [sugOpen, setSugOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const navRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!session?.user) return;
        fetch("/api/market/notifications").then(r => r.json()).then(d => setUnread(d.unread ?? 0)).catch(() => {});
    }, [session?.user]);

    function runSearch() {
        const q = search.trim();
        if (q) { setSugOpen(false); router.push(`/market/catalog?q=${encodeURIComponent(q)}`); }
    }

    // Jonli takliflar (debounce)
    useEffect(() => {
        const q = search.trim();
        if (q.length < 2) { setSug({ brands: [], products: [] }); setSugOpen(false); return; }
        const t = setTimeout(() => {
            fetch(`/api/market/search?q=${encodeURIComponent(q)}`)
                .then(r => r.json())
                .then(d => { setSug({ brands: d.brands ?? [], products: d.products ?? [] }); setSugOpen(true); })
                .catch(() => {});
        }, 250);
        return () => clearTimeout(t);
    }, [search]);

    // Tashqarida bosilsa yopiladi
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (navRef.current && !navRef.current.contains(e.target as Node)) {
                setCatalogOpen(false); setSugOpen(false);
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <motion.header
            ref={navRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-0 z-40 w-full"
        >
            {/* Asosiy navbar */}
            <div className="bg-white/80 dark:bg-[#050F07]/90 backdrop-blur-xl
                border-b border-green-100/80 dark:border-green-900/20
                transition-colors duration-500">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="flex items-center gap-3 h-14">

                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Link href="/"
                                className="flex items-center gap-1.5 text-gray-400 dark:text-white/25
                                    hover:text-gray-600 dark:hover:text-white/50 transition-colors">
                                <Home size={13} />
                                <span className="text-xs font-medium hidden sm:block">For Humo</span>
                            </Link>
                            <ChevronRight size={11} className="text-gray-300 dark:text-white/15" />
                            <Link href={`/market`}
                                className="flex items-center gap-2 group">
                                <div className="relative">
                                    <motion.div
                                        className="absolute inset-0 rounded-xl blur-md opacity-50"
                                        style={{ backgroundColor: "rgba(34,197,94,0.4)" }}
                                        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    />
                                    <Image src="/logos/humo-market.png" alt="Humo Market"
                                        width={28} height={28} className="relative rounded-xl" />
                                </div>
                                <span className="font-black text-[15px] tracking-tight
                                    text-transparent bg-clip-text
                                    bg-gradient-to-r from-green-600 to-emerald-400
                                    dark:from-green-400 dark:to-emerald-300">
                                    Humo Market
                                </span>
                            </Link>
                        </div>

                        {/* Katalog tugmasi */}
                        <button
                            onClick={() => setCatalogOpen(v => !v)}
                            className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl
                                text-sm font-semibold transition-all duration-200
                                ${catalogOpen
                                    ? "bg-green-600 text-white shadow-md shadow-green-500/25"
                                    : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                                }`}
                        >
                            {catalogOpen ? <X size={15} /> : <Layers size={15} />}
                            Katalog
                            <ChevronDown size={13}
                                className={`transition-transform duration-200 ${catalogOpen ? "rotate-180" : ""}`} />
                        </button>

                        {/* Qidiruv */}
                        <div className="flex-1 relative">
                            <Search size={15}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2
                                    text-gray-400 dark:text-white/25 pointer-events-none" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && runSearch()}
                                onFocus={() => { if (sug.brands.length || sug.products.length) setSugOpen(true); }}
                                placeholder="Mahsulot, brend yoki kategoriya..."
                                className="w-full bg-gray-50/90 dark:bg-white/[0.05]
                                    border border-gray-200/80 dark:border-white/[0.08]
                                    focus:border-green-400 dark:focus:border-green-500/50
                                    rounded-xl pl-10 pr-4 py-2.5
                                    text-gray-900 dark:text-white text-sm
                                    placeholder:text-gray-400 dark:placeholder:text-white/20
                                    outline-none transition-all duration-200"
                            />

                            {/* Jonli takliflar dropdown */}
                            <AnimatePresence>
                                {sugOpen && (sug.brands.length > 0 || sug.products.length > 0) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute top-full left-0 right-0 mt-2 z-50
                                            bg-white/95 dark:bg-[#0a1a0d]/97 backdrop-blur-xl
                                            border border-green-100 dark:border-green-900/30
                                            rounded-2xl shadow-2xl shadow-green-900/10 overflow-hidden py-2">
                                        {/* Brendlar */}
                                        {sug.brands.length > 0 && (
                                            <div className="px-2 pb-1">
                                                <p className="text-[10px] font-bold text-gray-400 dark:text-white/25 uppercase px-2 py-1">Brendlar</p>
                                                {sug.brands.map(b => (
                                                    <Link key={b.slug} href={`/market/brand/${b.slug}`} onClick={() => setSugOpen(false)}
                                                        className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/15 transition-colors">
                                                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-green-500/10 flex items-center justify-center shrink-0">
                                                            {b.logo ? <Image src={b.logo} alt="" width={28} height={28} className="w-full h-full object-cover" />
                                                                : <span className="text-green-500 text-xs font-bold">{b.name[0]}</span>}
                                                        </div>
                                                        <span className="text-sm text-gray-700 dark:text-white/70 truncate flex-1">{b.name}</span>
                                                        {b.verified && <VerifiedBadge size={12} />}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                        {/* Mahsulotlar */}
                                        {sug.products.length > 0 && (
                                            <div className="px-2 pt-1 border-t border-gray-100 dark:border-white/[0.06]">
                                                <p className="text-[10px] font-bold text-gray-400 dark:text-white/25 uppercase px-2 py-1">Mahsulotlar</p>
                                                {sug.products.map(p => (
                                                    <Link key={p.slug} href={`/market/product/${p.slug}`} onClick={() => setSugOpen(false)}
                                                        className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/15 transition-colors">
                                                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/[0.05] shrink-0">
                                                            {p.images?.[0] && <Image src={p.images[0]} alt="" width={28} height={28} className="w-full h-full object-cover" />}
                                                        </div>
                                                        <span className="text-sm text-gray-700 dark:text-white/70 truncate flex-1">{p.name}</span>
                                                        <span className="text-xs font-bold text-green-600 dark:text-green-400 shrink-0">{Number(p.price).toLocaleString()} Ƶ</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* O'ng: cart + til + tema + avatar */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Link href={`/market/cart`}
                                className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl
                                    bg-green-50 dark:bg-green-900/15
                                    hover:bg-green-100 dark:hover:bg-green-900/25
                                    text-green-700 dark:text-green-400
                                    text-sm font-semibold transition-all">
                                <ShoppingCart size={16} />
                                <span className="hidden sm:block">Savat</span>
                            </Link>

                            {/* Bildirishnoma */}
                            {session?.user && (
                                <Link href="/market/notifications"
                                    className="relative p-2 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20
                                        text-gray-500 dark:text-white/50 hover:text-green-600 dark:hover:text-green-400 transition-all">
                                    <Bell size={18} />
                                    {unread > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1
                                            bg-red-500 rounded-full flex items-center justify-center">
                                            <span className="text-[9px] font-black text-white">{unread > 9 ? "9+" : unread}</span>
                                        </span>
                                    )}
                                </Link>
                            )}

                            <LanguageSwitcher />
                            <ThemeToggle />
                            {session?.user && (
                                <Link href="/id" className="relative group">
                                    <div className="w-8 h-8 rounded-full overflow-hidden
                                        ring-2 ring-green-200/80 dark:ring-green-700/30
                                        group-hover:ring-green-400/50 transition-all">
                                        {session.user.image ? (
                                            <Image src={session.user.image} alt=""
                                                width={32} height={32} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-green-600 to-emerald-400
                                                flex items-center justify-center text-white text-xs font-bold">
                                                {(session.user.name ?? "U")[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full
                                        bg-emerald-400 ring-2 ring-white dark:ring-[#050F07]" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mega menu */}
            <AnimatePresence>
                {catalogOpen && (
                    <CatalogMegaMenu onClose={() => setCatalogOpen(false)} />
                )}
            </AnimatePresence>
        </motion.header>
    );
}
