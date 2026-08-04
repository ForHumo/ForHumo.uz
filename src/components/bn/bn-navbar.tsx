"use client";

// Muallaq pastki navbar — hech narsaga tegmaydi, foni xira shaffof.
// Foydalanuvchi so'rovi: "Navbar muallaq turishi kerak biror joyga teginmasdan,
// navbarni orqa foni xira shaffof bo'lishi kerak."

import { Home, LayoutGrid, Heart, ShoppingCart, Play } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { BnLink, useBnPath } from "./bn-nav";

// Foydalanuvchi so'rovi (yangi tartib): Asosiy → Katalog → Sevimlilar → Savat → Media.
// Scan olib tashlandi — header qidiruv panelida kamera ikonkasi sifatida.
// Profil header'da bor — navbar'dan olib tashlandi.
const ITEMS = [
    { href: "/",           label: "Asosiy",     icon: Home },
    { href: "/katalog",    label: "Katalog",    icon: LayoutGrid },
    { href: "/sevimlilar", label: "Sevimlilar", icon: Heart },
    { href: "/savat",      label: "Savat",      icon: ShoppingCart },
    { href: "/media",      label: "Media",      icon: Play },
] as const;

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
                        const Icon = it.icon;
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
                                <Icon
                                    className="w-[19px] h-[19px]"
                                    strokeWidth={active ? 2.4 : 1.9}
                                />
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
