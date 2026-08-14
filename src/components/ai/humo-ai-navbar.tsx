"use client";

import { ModuleNavbar } from "@/components/layout/module-navbar";
import { NavbarSupportButton } from "@/components/layout/navbar-support-button";

export function HumoAiNavbar() {
    return (
        <ModuleNavbar
            config={{
                name: "Humo AI",
                logoSrc: "/logos/humo-ai-white.png",
                href: "/ai",
                accentFrom: "from-violet-500",
                accentTo: "to-purple-400",
                glowColor: "rgba(139,92,246,0.45)",
            }}
            extra={<NavbarSupportButton variant="violet" />}
        />
    );
}
