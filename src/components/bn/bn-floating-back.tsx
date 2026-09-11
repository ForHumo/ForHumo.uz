"use client";

// BN suzuvchi ortga qaytish tugmasi — mobil qurilmalarda (ayniqsa iPhone Safari,
// iPhone Duo va PWA rejimida) swipe-back har doim ishlamaydi.
// Har ichki BN sahifada aniq tugma bo'lishi ishonchli.
//
// Ko'rinadi:
//   - Faqat bosh sahifa ("/", "/qidiruv" default view) BO'LMAGAN yo'llarda
//   - Faqat mobil (<md — 768px) — desktop'da tugma keraksiz (brauzer o'zi qaytadi)
//   - Header ostida joylashadi (top: header + safe-area)
//
// Suzuvchi tugma — kontent'ni to'sib qo'ymaydi (bu safe joyga qo'yiladi).

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { useBnHref } from "./bn-nav";

// BN bosh sahifasi — bularda tugma ko'rinmaydi
const ROOT_PATHS = new Set([
    "/",
    "",
]);

function isRoot(pathname: string, locale: string): boolean {
    // Locale prefix'ni olib tashlash: /uz, /ru, /en
    const clean = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
    // BN prefix (agar hostname bozornarxida.uz emas bo'lsa, /bn qo'shilishi mumkin)
    const noBn = clean.replace(/^\/bn(?=\/|$)/, "");
    const normalized = noBn === "" ? "/" : noBn;
    return ROOT_PATHS.has(normalized);
}

export function BnFloatingBack({ locale }: { locale: string }) {
    const pathname = usePathname() ?? "/";
    const router = useRouter();
    const to = useBnHref();

    if (isRoot(pathname, locale)) return null;

    function goBack() {
        // Tarix uzunligi 1 dan katta bo'lsa — router.back(), aks holda BN bosh sahifa
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push(to("/"));
        }
    }

    return (
        <button
            type="button"
            onClick={goBack}
            aria-label="Ortga qaytish"
            className="bn-scope md:hidden fixed z-[45] rounded-full shadow-lg transition-transform active:scale-95"
            style={{
                // Header (h-14 = 56px) + safe area
                top: "calc(env(safe-area-inset-top) + 66px)",
                left: "12px",
                width: 40,
                height: 40,
                background: BN.surface,
                border: `1px solid ${BN.border}`,
                color: BN.text,
                display: "grid",
                placeItems: "center",
                boxShadow: `0 4px 16px ${BN.shadow}, 0 0 0 1px ${BN.border}`,
            }}
        >
            <ChevronLeft className="w-5 h-5" />
        </button>
    );
}
