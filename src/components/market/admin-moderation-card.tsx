"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ShieldAlert, ChevronRight } from "lucide-react";

// Faqat founderlar ko'radi (API 403 bersa — yashirin). Kutilayotgan shikoyatlar sonini ko'rsatadi.
export function AdminModerationCard() {
    const [show, setShow] = useState(false);
    const [pending, setPending] = useState(0);

    useEffect(() => {
        fetch("/api/admin/moderation?status=PENDING")
            .then(async r => {
                if (!r.ok) return;
                const d = await r.json();
                setShow(true);
                const c = (d.counts || []).find((x: { status: string; _count: number }) => x.status === "PENDING");
                setPending(c?._count ?? (d.flags?.length ?? 0));
            })
            .catch(() => { });
    }, []);

    if (!show) return null;

    return (
        <div className="mt-10">
            <Link href="/admin/moderation"
                className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-white/[0.07]
                    bg-white dark:bg-white/[0.03] hover:border-red-300 dark:hover:border-red-500/30 transition group">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert size={21} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="font-black text-gray-900 dark:text-white">Moderatsiya markazi</div>
                    <div className="text-xs text-gray-400 dark:text-white/30">AI + foydalanuvchi shikoyatlari</div>
                </div>
                {pending > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-red-500 text-white">{pending}</span>
                )}
                <ChevronRight size={18} className="text-gray-300 dark:text-white/20 group-hover:translate-x-0.5 transition-transform" />
            </Link>
        </div>
    );
}
