"use client";

// Belis "Ilovani o'rnatish" (PWA install) kartochkasi.
// BnInstallCard naqshi, Belis brendida.
// Chrome/Edge/Samsung Internet: beforeinstallprompt.
// iOS Safari: qo'lda ko'rsatma (Share → Home Screen) — iOS'da Web Push faqat
// standalone PWA'da ishlaydi, shu bilan bildirishnoma keladi.

import { useEffect, useState } from "react";
import { Download, Share2, Plus, X, Smartphone } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";

type State = "hidden" | "prompt" | "ios" | "installed";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "belis-install-dismissed-v1";

export function BelisInstallCard() {
    const [state, setState] = useState<State>("hidden");
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        try {
            if (window.matchMedia("(display-mode: standalone)").matches) return;
            if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) return;
        } catch { /* ignore */ }

        try {
            if (localStorage.getItem(DISMISS_KEY)) return;
        } catch { /* ignore */ }

        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
        if (isIOS && isSafari) {
            setState("ios");
            return;
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
            setState("prompt");
        };
        window.addEventListener("beforeinstallprompt", handler);

        const installedHandler = () => setState("installed");
        window.addEventListener("appinstalled", installedHandler);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("appinstalled", installedHandler);
        };
    }, []);

    async function install() {
        if (!deferred) return;
        setBusy(true);
        try {
            await deferred.prompt();
            const choice = await deferred.userChoice;
            if (choice.outcome === "accepted") {
                setState("installed");
            }
        } catch { /* ignore */ }
        finally { setBusy(false); }
    }

    function dismiss() {
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
        setState("hidden");
    }

    if (state === "hidden" || state === "installed") return null;

    return (
        <div className="relative rounded-2xl p-5 overflow-hidden"
            style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
            <button onClick={dismiss}
                aria-label="Yopish"
                className="absolute top-3 right-3 w-8 h-8 rounded-lg grid place-items-center hover:brightness-95"
                style={{ background: BELIS.bg, color: BELIS.text3 }}>
                <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-8">
                <span className="w-12 h-12 rounded-2xl grid place-items-center flex-shrink-0"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <Smartphone className="w-6 h-6" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black" style={{ color: BELIS.text }}>
                        Belis ilovasini o&apos;rnating
                    </p>
                    <p className="text-[12.5px] mt-0.5 leading-relaxed" style={{ color: BELIS.text2 }}>
                        Bosh ekranga yorliq qo&apos;shing — buyurtma holati va yangi qutilar haqida
                        bildirishnoma to&apos;g&apos;ridan-to&apos;g&apos;ri telefoningizga tushadi.
                    </p>
                </div>
            </div>

            {state === "prompt" && (
                <button onClick={install} disabled={busy}
                    className="mt-4 w-full h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <Download className="w-4 h-4" />
                    {busy ? "O'rnatilmoqda..." : "O'rnatish"}
                </button>
            )}

            {state === "ios" && (
                <div className="mt-4 space-y-2">
                    <div className="p-3 rounded-xl flex items-start gap-2 text-[12.5px]"
                        style={{ background: BELIS.bg, color: BELIS.text2 }}>
                        <Share2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BELIS.goldDeep }} />
                        <span>1. Safari&apos;da pastdagi <b>Ulashish</b> tugmasini bosing</span>
                    </div>
                    <div className="p-3 rounded-xl flex items-start gap-2 text-[12.5px]"
                        style={{ background: BELIS.bg, color: BELIS.text2 }}>
                        <Plus className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: BELIS.goldDeep }} />
                        <span>2. <b>Bosh ekranga qo&apos;shish</b> ni tanlang</span>
                    </div>
                </div>
            )}
        </div>
    );
}
