"use client";

import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { Menu, X, LogOut, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";

// ── Humo AI social links for dropdown ──────────────────────────────────────

function TelegramIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.888-.667 3.473-1.512 5.79-2.508 6.953-2.99 3.287-1.365 3.97-1.603 4.417-1.611z" />
        </svg>
    );
}

function YoutubeIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    );
}

function InstagramIcon({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
    );
}

// ── Two-line brand nav item ─────────────────────────────────────────────────

interface BrandNavItemProps {
    href: string;
    productName: string;
    external?: boolean;
    onClick?: () => void;
}

function BrandNavItem({ href, productName, external, onClick }: BrandNavItemProps) {
    const linkClass =
        "flex flex-col items-center gap-0 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all group";

    if (external) {
        return (
            <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass} onClick={onClick}>
                <span className="text-[9px] font-bold leading-none tracking-widest uppercase opacity-50 group-hover:opacity-70 transition-opacity">
                    Humo
                </span>
                <span className="text-[13px] font-semibold leading-tight">{productName}</span>
            </a>
        );
    }

    return (
        <Link href={href} className={linkClass} onClick={onClick}>
            <span className="text-[9px] font-bold leading-none tracking-widest uppercase opacity-50 group-hover:opacity-70 transition-opacity">
                Humo
            </span>
            <span className="text-[13px] font-semibold leading-tight">{productName}</span>
        </Link>
    );
}

// ── Humo AI nav item with social dropdown ──────────────────────────────────

function AiNavItem({ onClick }: { onClick?: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const socials = [
        { label: "Humo AI", href: "/ai", icon: null, isMain: true },
        { label: "Telegram kanal", href: "https://t.me/ForHumo_AI", icon: <TelegramIcon />, isMain: false },
        { label: "Telegram bot", href: "https://t.me/ForHumo_AIBot", icon: <TelegramIcon />, isMain: false },
        { label: "YouTube", href: "https://www.youtube.com/@ForHumoAI", icon: <YoutubeIcon />, isMain: false },
        { label: "Instagram", href: "https://www.instagram.com/aihumo/", icon: <InstagramIcon />, isMain: false },
    ];

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="flex flex-col items-center gap-0 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all group"
            >
                <span className="text-[9px] font-bold leading-none tracking-widest uppercase opacity-50 group-hover:opacity-70 transition-opacity">
                    Humo
                </span>
                {/* Logo: white for dark mode, black for light mode — swap /humo-ai-logo.png files if available */}
                {mounted ? (
                    <span className="text-[13px] font-semibold leading-tight flex items-center gap-1">
                        AI
                        <ChevronDown size={10} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                    </span>
                ) : (
                    <span className="text-[13px] font-semibold leading-tight">AI</span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 origin-top rounded-xl border border-border bg-popover p-1.5 shadow-xl z-50"
                    >
                        {socials.map((s) => {
                            const cls = `flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm transition-colors ${
                                s.isMain
                                    ? "text-foreground font-semibold hover:bg-accent"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            }`;

                            if (s.isMain) {
                                return (
                                    <Link key={s.label} href={s.href} className={cls} onClick={() => { setOpen(false); onClick?.(); }}>
                                        <span className="w-[14px]" />
                                        {s.label}
                                    </Link>
                                );
                            }
                            return (
                                <a
                                    key={s.label}
                                    href={s.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cls}
                                    onClick={() => setOpen(false)}
                                >
                                    <span className="text-muted-foreground/70">{s.icon}</span>
                                    {s.label}
                                </a>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Profile (Humo ID) button ────────────────────────────────────────────────

function ProfileButton() {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const name = session?.user?.name ?? "";
    const email = session?.user?.email ?? "";
    const image = session?.user?.image ?? null;
    const initials = name.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "U";

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                aria-label="Humo ID profil"
                title="Humo ID"
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-colors flex items-center justify-center bg-muted text-foreground font-bold text-sm flex-shrink-0"
            >
                {image ? (
                    <img src={image} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                    <span>{initials}</span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-xl border border-border bg-popover p-2 shadow-xl z-50"
                    >
                        {/* User info */}
                        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-border flex-shrink-0 flex items-center justify-center bg-muted font-bold text-sm">
                                {image ? (
                                    <img src={image} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <span>{initials}</span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                                <p className="text-xs text-muted-foreground truncate">{email}</p>
                            </div>
                        </div>

                        <div className="h-px bg-border my-1" />

                        {/* Sign out */}
                        <button
                            onClick={() => { setOpen(false); signOut(); }}
                            className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                            <LogOut size={14} />
                            Chiqish
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Main Header ─────────────────────────────────────────────────────────────

export function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations("Navigation");

    const primaryNavItems = [
        { name: t("home"), href: "/" },
        { name: t("projects"), href: "/#ecosystem" },
    ];

    // Secondary brand items (after separator): ID first, then products
    const brandItems = [
        { key: "id", product: t("id"), href: "/id" },
        { key: "nexus", product: t("nexus"), href: "/nexus" },
        { key: "esport", product: t("esport"), href: "/esport" },
        { key: "market", product: t("market"), href: "/coming-soon" },
        { key: "pay", product: t("pay"), href: "/coming-soon" },
        { key: "support", product: t("support"), href: "/coming-soon" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">

                {/* Logo */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2">
                        <motion.div
                            whileHover={{ rotate: 10, scale: 1.1 }}
                            className="relative h-9 w-9 overflow-hidden rounded-full shadow-lg shadow-primary/20"
                        >
                            <Image
                                src="/logo.png"
                                alt="For Humo Logo"
                                fill
                                className="object-cover"
                                priority
                            />
                        </motion.div>
                        <span className="text-lg font-bold tracking-tight text-foreground hover:text-primary transition-colors hidden sm:block">
                            For Humo
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {/* Primary: Bosh Sahifa, Loyihalar */}
                    {primaryNavItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all hover:translate-y-[-1px] px-3 py-1.5 rounded-md hover:bg-accent"
                        >
                            {item.name}
                        </Link>
                    ))}

                    <div className="h-5 w-[1px] bg-border/70 mx-1 flex-shrink-0" />

                    {/* Humo ID — first */}
                    <BrandNavItem href="/id" productName={t("id")} />

                    {/* Humo AI — with dropdown */}
                    <AiNavItem />

                    {/* Rest of products */}
                    {brandItems.slice(1).map((item) => (
                        <BrandNavItem key={item.key} href={item.href} productName={item.product} />
                    ))}

                    <div className="h-5 w-[1px] bg-border/60 mx-1 flex-shrink-0" />

                    {/* Theme + Language */}
                    <div className="flex items-center gap-1">
                        <ThemeToggle />
                        <LanguageSwitcher />
                    </div>

                    <div className="h-5 w-[1px] bg-border/60 mx-1 flex-shrink-0" />

                    {/* Humo ID Profile circle */}
                    <ProfileButton />
                </nav>

                {/* Mobile: theme + lang + burger */}
                <div className="flex items-center gap-2 md:hidden">
                    <ThemeToggle />
                    <LanguageSwitcher />
                    <ProfileButton />
                    <button
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Menu"
                    >
                        {isOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl overflow-hidden"
                    >
                        <nav className="flex flex-col p-4 gap-1">
                            {[
                                ...primaryNavItems,
                                { name: `Humo ${t("id")}`, href: "/id" },
                                { name: `Humo ${t("ai")}`, href: "/ai" },
                                ...brandItems.slice(1).map((b) => ({ name: `Humo ${b.product}`, href: b.href })),
                            ].map((item, index) => (
                                <motion.div
                                    key={item.name}
                                    initial={{ x: -16, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: index * 0.04 }}
                                >
                                    <Link
                                        href={item.href}
                                        className="text-base font-medium text-foreground hover:text-primary transition-colors block py-2 px-3 rounded-md hover:bg-accent"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {item.name}
                                    </Link>
                                </motion.div>
                            ))}

                            {/* Humo AI socials in mobile */}
                            <div className="mt-2 pt-2 border-t border-border">
                                <p className="text-xs text-muted-foreground px-3 mb-1 font-semibold uppercase tracking-wider">
                                    Humo AI
                                </p>
                                {[
                                    { label: "Telegram kanal", href: "https://t.me/ForHumo_AI" },
                                    { label: "Telegram bot", href: "https://t.me/ForHumo_AIBot" },
                                    { label: "YouTube", href: "https://www.youtube.com/@ForHumoAI" },
                                    { label: "Instagram", href: "https://www.instagram.com/aihumo/" },
                                ].map((s) => (
                                    <a
                                        key={s.href}
                                        href={s.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors block py-1.5 px-3 rounded-md hover:bg-accent"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {s.label}
                                    </a>
                                ))}
                            </div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
