"use client";

// Belis base kontekst — belis.uz uchun URL toza qoladi (/uz/kabinet).
// forhumo.uz uchun /uz/belis prefiks qo'shiladi.
// BN naqshi bilan bir xil (bn-nav.tsx BnBaseProvider).

import { createContext, useContext } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";

interface BelisBase {
    /** "" (belis.uz) yoki "/uz/belis" (forhumo.uz) */
    base: string;
    locale: string;
}

const BelisBaseCtx = createContext<BelisBase>({ base: "", locale: "uz" });

export function BelisBaseProvider({ base, locale, children }: BelisBase & { children: React.ReactNode }) {
    return <BelisBaseCtx.Provider value={{ base, locale }}>{children}</BelisBaseCtx.Provider>;
}

export function useBelisBase() {
    return useContext(BelisBaseCtx);
}

/** Belis ichida href'ni to'liq yo'lga aylantiradi. "/" → bosh sahifa. */
export function useBelisHref() {
    const { base } = useBelisBase();
    return (path: string) => {
        const p = path === "/" ? "" : path;
        // Foydalanuvchi hali /belis prefiks bilan yozgan bo'lsa strip qilamiz
        const clean = p.replace(/^\/belis(?=\/|$)/, "");
        return `${base}${clean}` || "/";
    };
}

interface LinkProps {
    href: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    title?: string;
    "aria-label"?: string;
    target?: string;
    rel?: string;
}

/** Belis-scoped link. `/belis` prefikssiz yoziladi ("/kabinet"). */
export function BelisSmartLink({ href, children, ...rest }: LinkProps) {
    const to = useBelisHref();
    return <NextLink href={to(href)} {...rest}>{children}</NextLink>;
}

/** Joriy path'ni belis-scoped ko'rinishga keltiradi (/uz/belis/kabinet → /kabinet). */
export function useBelisPath(): string {
    const pathname = usePathname() ?? "/";
    const stripped = pathname
        .replace(/^\/(uz|ru|en)(?=\/|$)/, "")
        .replace(/^\/belis(?=\/|$)/, "");
    return stripped || "/";
}
