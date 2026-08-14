"use client";

import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { Menu, X, LogOut, ChevronDown, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useSession, signOut } from "next-auth/react";

// ── SVG Icons ────────────────────────────────────────────────────────────────

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

// ── Social links data ─────────────────────────────────────────────────────────

interface SocialSet {
    channel: string;
    bot: string;
    youtube: string;
    instagram: string;
}

const SOCIALS: Record<string, SocialSet> = {
    id:      { channel: "https://t.me/ForHumo_ID",      bot: "https://t.me/ForHumo_IDBot",      youtube: "https://www.youtube.com/@ForHumo_ID",      instagram: "https://www.instagram.com/forhumo_id"      },
    ai:      { channel: "https://t.me/ForHumo_AI",      bot: "https://t.me/ForHumo_AIBot",      youtube: "https://www.youtube.com/@ForHumo_AI",      instagram: "https://www.instagram.com/forhumo_ai/"      },
    nexus:   { channel: "https://t.me/ForHumo_Nexus",   bot: "https://t.me/ForHumo_NexusBot",   youtube: "https://www.youtube.com/@ForHumo_Nexus",   instagram: "https://www.instagram.com/forhumo_nexus/"   },
    esport:  { channel: "https://t.me/ForHumo_eSport",  bot: "https://t.me/ForHumo_eSportBot",  youtube: "https://www.youtube.com/@ForHumo_eSport",  instagram: "https://www.instagram.com/forhumo_esport/"  },
    market:  { channel: "https://t.me/ForHumo_Market",  bot: "https://t.me/ForHumo_MarketBot",  youtube: "https://www.youtube.com/@ForHumo_Market",  instagram: "https://www.instagram.com/forhumo_market/"  },
    pay:     { channel: "https://t.me/ForHumo_Pay",     bot: "https://t.me/ForHumo_PayBot",     youtube: "https://www.youtube.com/@ForHumo_Pay",     instagram: "https://www.instagram.com/forhumo_pay/"     },
    bn:      { channel: "https://t.me/BozorNarxidauz",  bot: "https://t.me/BozorNarxidaBot",    youtube: "https://www.youtube.com/@BozorNarxida",    instagram: "https://www.instagram.com/bozor.narxida"   },
    support: { channel: "https://t.me/ForHumo_Support", bot: "https://t.me/ForHumo_SupportBot", youtube: "https://www.youtube.com/@ForHumo_Support", instagram: "https://www.instagram.com/forhumo_support/" },
};

// ── Brand nav item with dropdown ──────────────────────────────────────────────

interface BrandNavItemProps {
    href: string;
    productName: string;
    prefix?: string;                              // "Humo" (default), "For", "Bozor"
    socialKey?: keyof typeof SOCIALS;
    onClose?: () => void;
}

function BrandNavItem({ href, productName, prefix = "Humo", socialKey, onClose }: BrandNavItemProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const tSocial = useTranslations("Social");
    const hasSocials = !!socialKey;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const baseClass =
        "flex flex-col items-center gap-0 px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all group";

    const innerContent = (
        <>
            <span className="text-[9px] font-bold leading-none tracking-widest uppercase opacity-45 group-hover:opacity-65 transition-opacity">
                {prefix}
            </span>
            <span className="text-[12.5px] font-semibold leading-tight flex items-center gap-0.5">
                {productName}
                {hasSocials && (
                    <ChevronDown size={9} className={`ml-0.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
                )}
            </span>
        </>
    );

    if (!hasSocials) {
        return (
            <Link href={href} className={baseClass} onClick={onClose}>
                {innerContent}
            </Link>
        );
    }

    const s = SOCIALS[socialKey];
    const dropItems = [
        { label: tSocial("telegram_channel"), href: s.channel, icon: <TelegramIcon /> },
        { label: tSocial("telegram_bot"),     href: s.bot,     icon: <TelegramIcon /> },
        { label: tSocial("youtube"),           href: s.youtube, icon: <YoutubeIcon /> },
        { label: tSocial("instagram"),         href: s.instagram, icon: <InstagramIcon /> },
    ];

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setOpen(v => !v)} className={baseClass}>
                {innerContent}
            </button>

            {/* CSS transition dropdown — always in DOM to allow transition */}
            <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 w-52 origin-top rounded-xl border border-border bg-popover p-1.5 shadow-xl z-50
                transition-all duration-150
                ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}>
                <Link
                    href={href}
                    className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
                    onClick={() => { setOpen(false); onClose?.(); }}
                >
                    <span className="w-3.5" />
                    {prefix} {productName}
                </Link>

                <div className="h-px bg-border my-1" />

                {dropItems.map((item) => (
                    <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 w-full rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        onClick={() => setOpen(false)}
                    >
                        <span className="text-muted-foreground/60 w-3.5 flex-shrink-0">{item.icon}</span>
                        {item.label}
                    </a>
                ))}
            </div>
        </div>
    );
}

// ── Mobile accordion brand item ───────────────────────────────────────────────

function MobileAccordionItem({
    item,
    tSocial,
    onClose,
}: {
    item: { key: string; product: string; href: string; prefix?: string; socialKey?: keyof typeof SOCIALS };
    tSocial: ReturnType<typeof useTranslations<"Social">>;
    onClose: () => void;
}) {
    const [open, setOpen] = useState(false);
    const s = item.socialKey ? SOCIALS[item.socialKey] : null;

    return (
        <div className="rounded-md overflow-hidden">
            <div className="flex items-center">
                <Link
                    href={item.href}
                    className="flex-1 text-base font-medium text-foreground hover:text-primary py-3 px-3 rounded-md hover:bg-accent transition-colors"
                    onClick={onClose}
                >
                    {item.prefix ?? "Humo"} {item.product}
                </Link>
                {s && (
                    <button
                        onClick={() => setOpen(p => !p)}
                        className="p-3 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Toggle socials"
                    >
                        <ChevronDown
                            size={15}
                            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                        />
                    </button>
                )}
            </div>

            {/* CSS grid height animation */}
            <div className={`grid transition-all duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                    {s && (
                        <div className="ml-3 mb-1 flex flex-col border-l border-border pl-3">
                            {[
                                { label: tSocial("telegram_channel"), href: s.channel },
                                { label: tSocial("telegram_bot"),     href: s.bot     },
                                { label: tSocial("youtube"),          href: s.youtube },
                                { label: tSocial("instagram"),        href: s.instagram },
                            ].map((sl) => (
                                <a
                                    key={sl.href}
                                    href={sl.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-muted-foreground hover:text-foreground py-2 px-2 rounded-md hover:bg-accent transition-colors"
                                    onClick={onClose}
                                >
                                    {sl.label}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Profile button ────────────────────────────────────────────────────────────

function ProfileButton() {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const tSocial = useTranslations("Social");

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const name     = session?.user?.name  ?? "";
    const email    = session?.user?.email ?? "";
    const image    = session?.user?.image ?? null;
    const initials = name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "U";

    const Avatar = ({ cls }: { cls: string }) =>
        image ? (
            <img src={image} alt={name} className={`${cls} object-cover`} referrerPolicy="no-referrer" />
        ) : (
            <span className={`${cls} flex items-center justify-center font-bold text-xs`}>{initials}</span>
        );

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Humo ID"
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-border hover:border-primary transition-colors flex items-center justify-center bg-muted text-foreground text-xs flex-shrink-0"
            >
                <Avatar cls="w-full h-full rounded-full" />
            </button>

            <div className={`absolute right-0 top-full mt-2 w-60 origin-top-right rounded-xl border border-border bg-popover p-2 shadow-xl z-50
                transition-all duration-150
                ${open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}>
                <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-border flex-shrink-0 bg-muted">
                        <Avatar cls="w-full h-full rounded-full" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{email}</p>
                    </div>
                </div>

                <div className="h-px bg-border my-1" />

                <Link
                    href="/id/edit"
                    className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    onClick={() => setOpen(false)}
                >
                    <Pencil size={13} />
                    {tSocial("edit_profile")}
                </Link>

                <button
                    onClick={() => { setOpen(false); signOut(); }}
                    className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    <LogOut size={13} />
                    {tSocial("sign_out")}
                </button>
            </div>
        </div>
    );
}

// ── Main Header ───────────────────────────────────────────────────────────────

export function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const t = useTranslations("Navigation");
    const tSocial = useTranslations("Social");
    const close = () => setIsOpen(false);

    // Close mobile menu on resize to desktop
    useEffect(() => {
        const mq = window.matchMedia("(min-width: 768px)");
        const handler = (e: MediaQueryListEvent) => { if (e.matches) setIsOpen(false); };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const primaryNavItems = [
        { name: t("home"),     href: "/"         },
        { name: t("projects"), href: "/#project" },
    ];

    // prefix — kichik "HUMO" ustki yozuv o'rnida ko'rinadi. Pay/BN uchun brand
    // nomining birinchi so'zi ("For", "Bozor") "Humo" o'rniga chiqadi.
    const brandItems: { key: string; product: string; href: string; prefix?: string; socialKey?: keyof typeof SOCIALS }[] = [
        { key: "id",      product: t("id"),      href: "/id",          socialKey: "id"       },
        { key: "ai",      product: t("ai"),      href: "/ai",          socialKey: "ai"       },
        { key: "nexus",   product: t("nexus"),   href: "/nexus",       socialKey: "nexus"    },
        { key: "esport",  product: t("esport"),  href: "/esport",      socialKey: "esport"   },
        { key: "market",  product: t("market"),  href: "/coming-soon", socialKey: "market"   },
        { key: "pay",     product: "Pay",        href: "/coming-soon", prefix: "For",   socialKey: "pay" },
        { key: "bn",      product: "Narxida",    href: "/bn",          prefix: "Bozor", socialKey: "bn"  },
        { key: "support", product: "Support",    href: "/support",     socialKey: "support"  },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">

                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
                    <div className="relative h-9 w-9 overflow-hidden rounded-full shadow-md shadow-primary/20 transition-transform duration-200 group-hover:rotate-[8deg] group-hover:scale-[1.08]">
                        <Image src="/logo.png" alt="For Humo" fill className="object-cover" priority />
                    </div>
                    <span className="text-[17px] font-bold tracking-tight text-foreground hover:text-primary transition-colors hidden sm:block">
                        For Humo
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-0.5">
                    {primaryNavItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all px-3 py-1.5 rounded-md hover:bg-accent"
                        >
                            {item.name}
                        </Link>
                    ))}

                    <div className="h-5 w-px bg-border/70 mx-1.5 flex-shrink-0" />

                    {brandItems.map((item) => (
                        <BrandNavItem
                            key={item.key}
                            href={item.href}
                            productName={item.product}
                            prefix={item.prefix}
                            socialKey={item.socialKey}
                        />
                    ))}

                    <div className="h-5 w-px bg-border/60 mx-1.5 flex-shrink-0" />

                    <div className="flex items-center gap-1">
                        <ThemeToggle />
                        <LanguageSwitcher />
                    </div>

                    <div className="h-5 w-px bg-border/60 mx-1.5 flex-shrink-0" />

                    <ProfileButton />
                </nav>

                {/* Mobile controls */}
                <div className="flex items-center gap-1 md:hidden">
                    <ThemeToggle />
                    <LanguageSwitcher />
                    <ProfileButton />
                    <button
                        className="p-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setIsOpen(v => !v)}
                        aria-label="Menu"
                    >
                        {isOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile menu — CSS grid height animation */}
            <div className={`md:hidden border-t border-border bg-background/95 backdrop-blur-xl grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                    <nav className="flex flex-col p-4 gap-0.5">
                        {primaryNavItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-base font-medium text-foreground hover:text-primary block py-3 px-3 rounded-md hover:bg-accent transition-colors"
                                onClick={close}
                            >
                                {item.name}
                            </Link>
                        ))}

                        <div className="h-px bg-border my-2" />

                        {brandItems.map((item) => (
                            <MobileAccordionItem
                                key={item.key}
                                item={item}
                                tSocial={tSocial}
                                onClose={close}
                            />
                        ))}
                    </nav>
                </div>
            </div>
        </header>
    );
}
