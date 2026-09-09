"use client";

// Humo AI Bot uchun push-obuna kartochkasi. Yangi lead kelganda ega
// push bilan xabar oladi. Bu — leadlar tizimining kritik komponenti.

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Loader2, AlertCircle } from "lucide-react";
import { getPushState, subscribePush, unsubscribePush, type PushState } from "@/lib/push-client";

export function HumoTgBotPushCard() {
    const [state, setState] = useState<PushState>("unsupported");
    const [busy, setBusy] = useState(false);

    useEffect(() => { void getPushState().then(setState); }, []);

    async function enable() {
        setBusy(true);
        try { setState(await subscribePush()); }
        finally { setBusy(false); }
    }
    async function disable() {
        setBusy(true);
        try { setState(await unsubscribePush()); }
        finally { setBusy(false); }
    }

    if (state === "unsupported") {
        return (
            <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                    Bu qurilma Web Push'ni qo'llab-quvvatlamaydi. Buyurtma bildirishnomalari uchun mobil qurilmada oching yoki iOS'da forhumo.uz ilovasini bosh ekranga qo'shing.
                </div>
            </div>
        );
    }

    if (state === "subscribed") {
        return (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                    <Check className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">Bildirishnomalar yoqilgan</div>
                    <div className="text-xs text-muted-foreground">Har yangi buyurtma push bilan yetadi.</div>
                </div>
                <button
                    onClick={disable} disabled={busy}
                    className="text-xs px-2.5 py-1 rounded border border-border hover:bg-muted disabled:opacity-50 flex items-center gap-1"
                >
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellOff className="w-3 h-3" />}
                    O'chirish
                </button>
            </div>
        );
    }

    if (state === "denied") {
        return (
            <div className="rounded-xl border border-rose-300/40 bg-rose-500/5 p-3 text-xs text-rose-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                    Bildirishnomalar taqiqlangan. Brauzer sozlamalaridan forhumo.uz uchun ruxsat bering — aks holda yangi buyurtma xabari kelmaydi.
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-sky-300/40 bg-sky-500/5 p-3 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/15 text-sky-600 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Buyurtma bildirishnomalarini yoqing</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                    Mijoz buyurtma bersa Web Push bilan darhol xabar berilamiz — savdo o'tkazib yubormaysiz.
                </div>
            </div>
            <button
                onClick={enable} disabled={busy}
                className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 flex items-center gap-1 shrink-0"
            >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                Yoqish
            </button>
        </div>
    );
}
