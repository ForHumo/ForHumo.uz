"use client";

import { ModuleNavbar } from "@/components/layout/module-navbar";
import { useLocale } from "next-intl";

export function EsportNavbar() {
    const locale = useLocale();
    return (
        <ModuleNavbar
            config={{
                name: "Humo eSport",
                logoSrc: "/logos/humo-esport.png",
                href: "/esport",
                accentFrom: "from-green-400",
                accentTo: "to-cyan-400",
                glowColor: "rgba(0,220,130,0.45)",
                links: [
                    { label: "Asosiy",     href: "/esport" },
                    { label: "Turnirlar",  href: "/esport/tournaments" },
                    { label: "Jamoalar",   href: "/esport/teams" },
                    { label: "O'yinchilar",href: "/esport/players" },
                ],
            }}
        />
    );
}
