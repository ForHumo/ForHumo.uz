"use client";

// Test rejim banneri — foydalanuvchilar aniq tushunishi uchun.
// NEXT_PUBLIC_BELIS_MODE=live bo'lganda ko'rinmaydi.
// Session'da tashlanadi (spam emas).

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { isBelisTest } from "@/lib/belis-mode";
import { BELIS } from "@/lib/belis-theme";

export function BelisTestBanner() {
    const [mounted, setMounted] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            if (sessionStorage.getItem("belis-test-dismissed") === "1") setDismissed(true);
        } catch { /* noop */ }
    }, []);

    if (!mounted || !isBelisTest() || dismissed) return null;

    function dismiss() {
        try { sessionStorage.setItem("belis-test-dismissed", "1"); } catch { /* noop */ }
        setDismissed(true);
    }

    return (
        <div className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[12px] font-black"
            style={{ background: "#3A3520", color: BELIS.goldSoft, borderBottom: `1px solid ${BELIS.gold}` }}>
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: BELIS.gold }} />
            <span className="text-center flex-1 sm:flex-none">
                TEST rejim · sayt sinovda · haqiqiy ijara hozircha ishga tushmagan
            </span>
            <button onClick={dismiss} className="w-6 h-6 grid place-items-center rounded" title="Yashirish"
                style={{ color: BELIS.goldSoft }}>
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
