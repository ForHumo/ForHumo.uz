"use client";

// Universal PWA install banner - forhumo.uz uchun (BN'dan mustaqil).

import { useEffect, useState } from "react";
import { Download, X, Smartphone, Share2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const DISMISS_KEY = "humo-install-dismissed-v1";

export function HumoInstallCard() {
    const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIos, setIsIos] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        try {
            if (localStorage.getItem(DISMISS_KEY)) setDismissed(true);
        } catch { /* skip */ }

        // iOS Safari check
        const ua = window.navigator.userAgent;
        const isIosSafari = /iP(hone|od|ad)/.test(ua) && !/CriOS|FxiOS/.test(ua);
        setIsIos(isIosSafari);

        // Standalone check
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window.navigator as any).standalone || window.matchMedia("(display-mode: standalone)").matches) {
            setInstalled(true);
        }

        const onPrompt = (e: Event) => {
            e.preventDefault();
            setPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener("beforeinstallprompt", onPrompt);
        return () => window.removeEventListener("beforeinstallprompt", onPrompt);
    }, []);

    const install = async () => {
        if (!prompt) return;
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
    };

    const dismiss = () => {
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* skip */ }
        setDismissed(true);
    };

    if (installed || dismissed) return null;
    if (!prompt && !isIos) return null;

    return (
        <div className="relative rounded-2xl p-4 sm:p-5 overflow-hidden text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6 0%, #a855f7 60%, #ec4899 100%)" }}>
            <button onClick={dismiss}
                className="absolute top-2 right-2 w-8 h-8 rounded-lg grid place-items-center hover:bg-white/20 transition">
                <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-8">
                <span className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 bg-white/20 backdrop-blur-sm">
                    <Smartphone className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black">For Humo'ni bosh ekranga qo'ying</p>
                    <p className="text-[12px] text-white/85 mt-0.5">
                        Bir bosishda barcha modul - Belis, BN, Nexus, Pay
                    </p>
                    {isIos && !prompt ? (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-white/85">
                            <Share2 className="w-3.5 h-3.5" /> Ulash tugmasi → "Bosh ekranga qo'shish"
                        </div>
                    ) : prompt ? (
                        <button onClick={install}
                            className="mt-2.5 h-9 px-4 rounded-lg inline-flex items-center gap-1.5 text-[13px] font-black text-purple-700 bg-white hover:bg-neutral-100">
                            <Download className="w-3.5 h-3.5" /> O'rnatish
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
