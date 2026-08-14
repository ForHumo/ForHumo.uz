"use client";

// Modul navbarlariga qo'yiladigan Support tugmasi. Bosilsa suzuvchi SupportDock
// panel ochiladi ("support:open" event orqali).

import { HeadsetIcon } from "lucide-react";

export function NavbarSupportButton() {
    return (
        <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("support:open"))}
            title="Support"
            aria-label="Support"
            className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground"
        >
            <HeadsetIcon className="w-4 h-4" />
        </button>
    );
}
