"use client";

import { Home, LayoutGrid, Heart, ShoppingCart } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink, useBnPath } from "./bn-nav";
import type { LucideIcon } from "lucide-react";

// Foydalanuvchi so'rovi (yakuniy):
//   Asosiy → Katalog → Sevimlilar → Savat → Nexus
// - Scan olib tashlandi (header qidiruv panelida bor)
// - Profil olib tashlandi (header'da bor)
// - Media → Nexus (chunki bu Humo Nexus integratsiyasi)
// - Nexus ikonkasi — Humo Nexus logosi (rasm)
//
// Swipe navigatsiya: BnSwipeNav layout'da BODY'ga bog'lanadi, chapga swipe →
// keyingi tab, o'ngga swipe → oldingi tab. Shuning uchun bu yerdagi TARTIB
// swipe uchun ham manba (`NAV_ORDER`).

interface Item {
    href: string;
    label: string;
    icon?: LucideIcon;
    iconSrc?: string;      // rasm ikonka (Nexus uchun)
    iconSrcAlt?: string;
}

const ITEMS: Item[] = [
    { href: "/",           label: "Asosiy",     icon: Home },
    { href: "/katalog",    label: "Katalog",    icon: LayoutGrid },
    { href: "/sevimlilar", label: "Sevimlilar", icon: Heart },
    { href: "/savat",      label: "Savat",      icon: ShoppingCart },
    { href: "/nexus",      label: "Nexus",      iconSrc: "/logos/humo-nexus.png", iconSrcAlt: "Humo Nexus" },
];

/** Swipe navigatsiya uchun tartib. `swipe-nav.tsx` shu ro'yxatdan foydalanadi. */
export const NAV_ORDER = ITEMS.map(i => i.href);

export function BnNavbar() {
    const path = useBnPath();

    return (
        <nav
            className="fixed inset-x-0 bottom-0 z-50 pointer-events-none"
            style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
        >
            <div className="mx-auto max-w-[440px] px-4">
                <div
                    className="pointer-events-auto flex items-stretch gap-0.5 p-1.5 rounded-[22px]"
                    style={{
                        background: BN.glass,
                        backdropFilter: "blur(20px) saturate(180%)",
                        WebkitBackdropFilter: "blur(20px) saturate(180%)",
                        border: `1px solid ${BN.border}`,
                        boxShadow: BN.shadow,
                    }}
                >
                    {ITEMS.map(it => {
                        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
                        return (
                            <BnLink
                                key={it.href}
                                href={it.href}
                                aria-label={it.label}
                                className="flex flex-col items-center justify-center gap-1 flex-1 h-[52px] rounded-2xl transition-colors"
                                style={{
                                    background: active ? BN.goldSoft : "transparent",
                                    color: active ? BN.gold : BN.text3,
                                }}
                            >
                                {it.iconSrc ? (
                                    <img
                                        src={it.iconSrc}
                                        alt={it.iconSrcAlt ?? ""}
                                        width={20}
                                        height={20}
                                        className="w-[20px] h-[20px] object-contain"
                                        style={{
                                            filter: active ? "none" : "grayscale(1) opacity(0.75)",
                                            transition: "filter .15s",
                                        }}
                                    />
                                ) : it.icon ? (
                                    <it.icon
                                        className="w-[19px] h-[19px]"
                                        strokeWidth={active ? 2.4 : 1.9}
                                    />
                                ) : null}
                                <span
                                    className="text-[10px] leading-none"
                                    style={{ fontWeight: active ? 800 : 600 }}
                                >
                                    {it.label}
                                </span>
                            </BnLink>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
