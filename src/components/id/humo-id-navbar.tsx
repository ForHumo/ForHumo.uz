"use client";

import { ModuleNavbar } from "@/components/layout/module-navbar";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { NavbarSupportButton } from "@/components/layout/navbar-support-button";

export function HumoIdNavbar() {
    const { data: session } = useSession();
    const locale = useLocale();

    // Verifikatsiya darajasi badge (extra slot)
    const levelBadge = session ? (
        <Link href={`/id/verify`}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full
                bg-blue-50 dark:bg-blue-500/10
                border border-blue-200/80 dark:border-blue-500/20
                text-blue-600 dark:text-blue-400 text-xs font-semibold
                hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all">
            <ShieldCheck size={12} />
            Humo ID
        </Link>
    ) : null;

    return (
        <ModuleNavbar
            config={{
                name: "Humo ID",
                logoSrc: "/logos/humo-id.png",
                href: "/id",
                accentFrom: "from-blue-500",
                accentTo: "to-indigo-400",
                glowColor: "rgba(99,102,241,0.45)",
                links: [
                    { label: "Profilim", href: "/id" },
                    { label: "Tahrirlash", href: "/id/edit" },
                    { label: "Tasdiqlash", href: "/id/verify" },
                    { label: "Bilim bazam", href: "/id/knowledge" },
                ],
            }}
            extra={<div className="flex items-center gap-2">{levelBadge}<NavbarSupportButton variant="blue" /></div>}
        />
    );
}
