"use client";

// /ai — endi to'g'ridan native React chat.
// Iframe (public/ai-static/*) deprecated: Faza 4 da butunlay olib tashlandi.
// Barcha foydalanuvchilar (login qilgan yoki anonim) yagona chat sahifasiga tushadi.

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";

export default function AIPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/ai/chat");
    }, [router]);

    return null;
}
