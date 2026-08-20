"use client";

// BN kabinet Pul tabida ko'rinadigan Web Push opt-in kartochkasi.
// Foydalanuvchi bir bosishda bildirishnomalarni yoqishi/o'chirishi mumkin.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, BellOff, Check, Loader2, X } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { getPushState, subscribePush, unsubscribePush, type PushState } from "@/lib/push-client";

export function BnPushCard() {
    const t = useTranslations("bn.push");
    const [state, setState] = useState<PushState>("unsupported");
    const [busy, setBusy] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        void getPushState().then(setState);
        try {
            if (localStorage.getItem("bn-push-dismissed-v1")) setDismissed(true);
        } catch { /* ignore */ }
    }, []);

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
    function dismiss() {
        try { localStorage.setItem("bn-push-dismissed-v1", "1"); } catch { /* ignore */ }
        setDismissed(true);
    }

    // Qurilma qo'llab-quvvatlamasa yoki foydalanuvchi bir marta yashirgan bo'lsa
    if (state === "unsupported") return null;
    if (dismissed && state !== "subscribed") return null;

    // Obuna bo'lgan holat — kichkina "yoqilgan" indikator (o'chirish mumkin)
    if (state === "subscribed") {
        return (
            <div className="mb-4 p-3 rounded-2xl flex items-center gap-3"
                style={{ background: BN.surface, border: `1px solid ${BN.ok}44` }}>
                <span className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0"
                    style={{ background: `${BN.ok}22`, color: BN.ok }}>
                    <Check className="w-4 h-4" strokeWidth={3} />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black">{t("subscribedTitle")}</p>
                    <p className="text-[11.5px] mt-0.5" style={{ color: BN.text3 }}>
                        {t("subscribedText")}
                    </p>
                </div>
                <button onClick={disable} disabled={busy}
                    className="h-8 px-3 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5 flex-shrink-0"
                    style={{ background: BN.surfaceUp, color: BN.text2 }}>
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5" />}
                    {t("disable")}
                </button>
            </div>
        );
    }

    // Ruxsat rad etilgan — foydalanuvchi brauzer sozlamalaridan o'zgartirsin
    if (state === "denied") {
        return (
            <div className="mb-4 p-4 rounded-2xl flex items-start gap-3 relative"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <button onClick={dismiss}
                    className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-lg"
                    style={{ color: BN.text3 }}>
                    <X className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.errSoft, color: BN.err }}>
                    <BellOff className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-[14px] font-black">{t("deniedTitle")}</p>
                    <p className="text-[12px] mt-1 leading-relaxed" style={{ color: BN.text2 }}>
                        {t("deniedText")}
                    </p>
                </div>
            </div>
        );
    }

    // Default/unsubscribed — yoqish taklifi
    return (
        <div className="mb-4 p-4 rounded-2xl flex items-start gap-3 relative"
            style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
            <button onClick={dismiss}
                className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-lg"
                style={{ color: BN.text3 }}>
                <X className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                style={{ background: BN.goldSoft, color: BN.gold }}>
                <Bell className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-[14px] font-black">{t("promptTitle")}</p>
                <p className="text-[12px] mt-1 leading-relaxed" style={{ color: BN.text2 }}>
                    {t("promptText")}
                </p>
                <div className="flex items-center gap-2 mt-3">
                    <button onClick={enable} disabled={busy}
                        className="h-9 px-4 rounded-lg text-[13px] font-black flex items-center gap-1.5 disabled:opacity-60"
                        style={{ background: BN.gold, color: BN.onGold }}>
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                        {t("enable")}
                    </button>
                    <button onClick={dismiss}
                        className="h-9 px-3 rounded-lg text-[12.5px] font-bold"
                        style={{ background: "transparent", color: BN.text3 }}>
                        {t("later")}
                    </button>
                </div>
            </div>
        </div>
    );
}
