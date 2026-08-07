"use client";

// iOS/Safari'da orqa tomon swipe har doim ishlamaydi (ayniqsa PWA rejimida).
// Har ichki sahifada aniq "‹ Ortga" tugmasi bo'lishi ishonchli yechim.
// history uzunligi 1 dan katta bo'lsa router.back(), aks holda BN bosh sahifaga.

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { useBnHref } from "./bn-nav";

export function BnBackButton({
    label = "Ortga",
    fallbackHref = "/",
    className = "",
}: { label?: string; fallbackHref?: string; className?: string }) {
    const router = useRouter();
    const to = useBnHref();

    function goBack() {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
        } else {
            router.push(to(fallbackHref));
        }
    }

    return (
        <button
            onClick={goBack}
            aria-label={label}
            className={`inline-flex items-center gap-1 h-9 pl-2 pr-3 rounded-xl text-[13px] font-bold transition-colors ${className}`}
            style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text2 }}
        >
            <ChevronLeft className="w-4 h-4" />
            {label}
        </button>
    );
}
