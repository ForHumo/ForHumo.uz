"use client";

// Modul navbarlariga qo'yiladigan Support tugmasi. Bosilsa suzuvchi SupportDock
// panel ochiladi ("support:open" event orqali).
// Variantlar orqali har modul dizayniga moslashadi.

import { HeadsetIcon } from "lucide-react";

export type SupportBtnVariant = "default" | "blue" | "violet" | "green" | "gold" | "cyan";

const VARIANT_STYLES: Record<SupportBtnVariant, string> = {
    default: "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground",
    blue:    "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400",
    violet:  "bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400",
    green:   "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    gold:    "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400",
    cyan:    "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
};

interface Props {
    variant?: SupportBtnVariant;
    label?: string;                     // Yozuv ham chiqarsa ("Support") — ikonasiz emas
    className?: string;
}

export function NavbarSupportButton({ variant = "default", label, className }: Props) {
    const base = "flex items-center justify-center rounded-lg transition-colors font-bold";
    const size = label ? "h-9 gap-1.5 px-3 text-xs" : "h-9 w-9";
    return (
        <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("support:open"))}
            title="Support"
            aria-label="Support"
            className={`${base} ${size} ${VARIANT_STYLES[variant]} ${className ?? ""}`}
        >
            <HeadsetIcon className={label ? "w-3.5 h-3.5" : "w-4 h-4"} />
            {label}
        </button>
    );
}
