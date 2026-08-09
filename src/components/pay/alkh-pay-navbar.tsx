"use client";

import { ModuleNavbar } from "@/components/layout/module-navbar";

export function AlkhPayNavbar() {
    return (
        <ModuleNavbar
            config={{
                name: "For Pay",
                logoSrc: "/logos/alkh-pay.png",
                href: "/pay",
                accentFrom: "from-blue-500",
                accentTo: "to-cyan-400",
                glowColor: "rgba(0,170,255,0.45)",
            }}
        />
    );
}
