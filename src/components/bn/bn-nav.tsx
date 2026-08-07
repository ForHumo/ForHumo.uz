"use client";

// BN navigatsiya poydevori.
//
// URL MUAMMOSI VA YECHIMI:
//   bozornarxida.uz → middleware `/bozorlar` ni `/uz/bn/bozorlar` ga rewrite qiladi.
//   Shuning uchun BN havolalari domenga qarab boshqacha bo'lishi kerak:
//     bozornarxida.uz  → "/bozorlar"        (toza URL, foydalanuvchi shuni ko'radi)
//     forhumo.uz       → "/uz/bn/bozorlar"  (prefiks bilan)
//   `BnBaseProvider` serverdan kelgan `base` ni tarqatadi, `BnLink` uni qo'shadi.

import { createContext, useContext } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { BN } from "@/lib/bn-theme";

// ── Kontekst ────────────────────────────────────────────────────────────────

interface BnBase {
    /** "" (bozornarxida.uz) yoki "/uz/bn" (forhumo.uz) */
    base: string;
    locale: string;
    /** Foydalanuvchining tasdiqlangan do'koni bormi (Kabinet tugmasi uchun) */
    hasShop?: boolean;
}

const BnBaseCtx = createContext<BnBase>({ base: "", locale: "uz", hasShop: false });

export function BnBaseProvider({ base, locale, hasShop = false, children }: BnBase & { children: React.ReactNode }) {
    return <BnBaseCtx.Provider value={{ base, locale, hasShop }}>{children}</BnBaseCtx.Provider>;
}

export function useBnBase() {
    return useContext(BnBaseCtx);
}

/** BN ichidagi yo'lni to'liq href ga aylantiradi. `/` → bosh sahifa */
export function useBnHref() {
    const { base } = useBnBase();
    return (path: string) => {
        const p = path === "/" ? "" : path;
        return `${base}${p}` || "/";
    };
}

/** BN havolasi — domenga mos prefiks bilan.
 * newTab=true bo'lsa yangi oynada ochadi (Cmd/Ctrl+click yoki middle-click bilan bir xil).
 */
export function BnLink({
    href, children, className, style, onClick, title, "aria-label": ariaLabel, newTab,
}: {
    href: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    title?: string;
    "aria-label"?: string;
    newTab?: boolean;
}) {
    const to = useBnHref();
    return (
        <NextLink
            href={to(href)}
            className={className}
            style={style}
            onClick={onClick}
            title={title}
            aria-label={ariaLabel}
            {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
            {children}
        </NextLink>
    );
}

/** Joriy yo'lni BN ichidagi ko'rinishga keltiradi ("/uz/bn/savat" → "/savat") */
export function useBnPath(): string {
    const pathname = usePathname() ?? "/";
    const stripped = pathname
        .replace(/^\/(uz|ru|en)(?=\/|$)/, "")
        .replace(/^\/bn(?=\/|$)/, "");
    return stripped || "/";
}

// ── Rejim almashtirgich (Kunduzgi / Tungi / Tizim) ──────────────────────────

const MODES = [
    { key: "light",  label: "Kunduzgi", icon: Sun },
    { key: "dark",   label: "Tungi",    icon: Moon },
    { key: "system", label: "Tizim",    icon: Monitor },
] as const;

export function BnThemeToggle({ compact = false }: { compact?: boolean }) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => setMounted(true), []);

    // Server va klient mos kelishi uchun — o'rnatilmaguncha neytral ikon
    const current = mounted ? (theme ?? "system") : "system";
    const ActiveIcon = mounted
        ? (current === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun)
        : Monitor;

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Rejim"
                title="Rejim"
                className={`grid place-items-center rounded-xl transition-colors ${compact ? "w-9 h-9" : "w-10 h-10"}`}
                style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
            >
                <ActiveIcon className="w-[17px] h-[17px]" />
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div
                        className="absolute right-0 top-full mt-2 z-50 w-[168px] p-1.5 rounded-2xl"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}`, boxShadow: BN.shadow }}
                    >
                        {MODES.map(m => {
                            const Icon = m.icon;
                            const active = current === m.key;
                            return (
                                <button
                                    key={m.key}
                                    onClick={() => { setTheme(m.key); setOpen(false); }}
                                    className="flex items-center gap-2.5 w-full h-10 px-2.5 rounded-xl text-[13px] font-bold transition-colors"
                                    style={{
                                        background: active ? BN.goldSoft : "transparent",
                                        color: active ? BN.gold : BN.text,
                                    }}
                                >
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    <span className="flex-1 text-left">{m.label}</span>
                                    {active && <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={3} />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Til almashtirgich ───────────────────────────────────────────────────────
// Hozircha faqat UZ faol. RU/EN — foydalanuvchi so'roviga ko'ra keyin
// ("3ta til bo'ladi lekin uni ohirida qilamiz hozir emas").

const LANGS = [
    { key: "uz", label: "O'zbekcha", short: "UZ", ready: true },
    { key: "ru", label: "Русский",   short: "RU", ready: false },
    { key: "en", label: "English",   short: "EN", ready: false },
] as const;

export function BnLangSwitch({ compact = false }: { compact?: boolean }) {
    const { locale } = useBnBase();
    const [open, setOpen] = useState(false);
    const active = LANGS.find(l => l.key === locale) ?? LANGS[0];

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Til"
                title="Til"
                className={`grid place-items-center rounded-xl text-[12px] font-black transition-colors ${compact ? "w-9 h-9" : "w-10 h-10"}`}
                style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
            >
                {active.short}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div
                        className="absolute right-0 top-full mt-2 z-50 w-[180px] p-1.5 rounded-2xl"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}`, boxShadow: BN.shadow }}
                    >
                        {LANGS.map(l => (
                            <button
                                key={l.key}
                                onClick={() => setOpen(false)}
                                disabled={!l.ready}
                                className="flex items-center gap-2.5 w-full h-10 px-2.5 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-40"
                                style={{
                                    background: l.key === locale ? BN.goldSoft : "transparent",
                                    color: l.key === locale ? BN.gold : BN.text,
                                }}
                            >
                                <span className="w-7 text-[11px] font-black flex-shrink-0" style={{ color: BN.text3 }}>
                                    {l.short}
                                </span>
                                <span className="flex-1 text-left">{l.label}</span>
                                {l.key === locale
                                    ? <Check className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={3} />
                                    : !l.ready && <span className="text-[10px]" style={{ color: BN.text3 }}>tez orada</span>}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
