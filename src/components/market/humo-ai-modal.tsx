"use client";

// Humo AI — Market'da suzuvchi/modal AI yordamchi.
// Global "humo-ai:open" eventi bilan ochiladi (dock markazidagi Humo AI tugmasi).

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { MarketAssistant } from "./market-assistant";

export function HumoAiModal() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const h = () => setOpen(true);
        window.addEventListener("humo-ai:open", h);
        return () => window.removeEventListener("humo-ai:open", h);
    }, []);

    useEffect(() => {
        if (!open) return;
        const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        window.addEventListener("keydown", k);
        return () => window.removeEventListener("keydown", k);
    }, [open]);

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[9997] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div
                role="dialog"
                aria-label="Humo AI"
                className="fixed z-[9998] bg-white dark:bg-[#0a1a0d] shadow-2xl border border-green-100 dark:border-green-900/30 flex flex-col overflow-hidden
                    inset-x-3 bottom-3 top-14 rounded-2xl
                    md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[560px] md:h-[720px] md:max-h-[calc(100vh-32px)]"
            >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-green-100 dark:border-green-900/30 shrink-0">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center">
                        <Image src="/logos/humo-ai.png" alt="Humo AI" width={36} height={36} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-gray-900 dark:text-white leading-tight">Humo AI</div>
                        <div className="text-[11px] text-gray-500 dark:text-white/50 leading-tight">Market yordamchisi</div>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        aria-label="Yopish"
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05] text-gray-500"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <MarketAssistant />
                </div>
            </div>
        </>
    );
}
