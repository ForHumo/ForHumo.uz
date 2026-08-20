"use client";

// BN "Ilovani o'rnatish" (PWA install) kartochkasi.
// Chrome/Edge/Samsung Internet: beforeinstallprompt tutiladi, tugma bir bosishda o'rnatadi.
// iOS Safari: beforeinstallprompt yo'q — foydalanuvchiga qo'lda ko'rsatma (Share → Home Screen).
// Standalone rejimda ochilgan (allaqachon o'rnatilgan) yoki bir marta yashirilgan bo'lsa
// ko'rinmaydi.
//
// Nima uchun bu muhim: PWA o'rnatilgach BN home ekranida ikonka bo'ladi (foydalanuvchi
// Google'dan qidirmasdan qaytadi) va iOS'da Web Push shu bilan ishlaydi (iOS'da faqat
// standalone PWA push oladi).

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Share2, Plus, X, Smartphone } from "lucide-react";
import { BN } from "@/lib/bn-theme";

type State = "hidden" | "prompt" | "ios" | "installed";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "bn-install-dismissed-v1";

export function BnInstallCard() {
    const t = useTranslations("bn.install");
    const [state, setState] = useState<State>("hidden");
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        // 1. Allaqachon o'rnatilgan (standalone rejim) — ko'rsatmaymiz
        try {
            if (window.matchMedia("(display-mode: standalone)").matches) return;
            // iOS Safari standalone
            if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) return;
        } catch { /* ignore */ }

        // 2. Foydalanuvchi ilgari yashirgan — ko'rsatmaymiz
        try {
            if (localStorage.getItem(DISMISS_KEY)) return;
        } catch { /* ignore */ }

        // 3. iOS Safari — beforeinstallprompt yo'q, qo'lda ko'rsatma
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
        if (isIOS && isSafari) {
            setState("ios");
            return;
        }

        // 4. Chrome/Edge/Samsung — event kutamiz
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
            setState("prompt");
        };
        window.addEventListener("beforeinstallprompt", handler);

        // 5. Installed event — banner'ni yopamiz
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
            } else {
                // Rad etdi — foydalanuvchi keyingi sessiyada ham banner ko'rmasin
                dismiss();
            }
            setDeferred(null);
        } finally {
            setBusy(false);
        }
    }

    function dismiss() {
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
        setState("hidden");
    }

    if (state === "hidden" || state === "installed") return null;

    // ── iOS varianti — qo'lda ko'rsatma ──
    if (state === "ios") {
        return (
            <section className="mb-4 sm:mb-5">
                <div className="relative overflow-hidden rounded-2xl p-4 flex items-start gap-3"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                    <button onClick={dismiss} aria-label={t("later")}
                        className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-lg"
                        style={{ color: BN.text3 }}>
                        <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}>
                        <Smartphone className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0 pr-6">
                        <p className="text-[14px] font-black leading-tight">{t("iosTitle")}</p>
                        <p className="text-[12px] leading-relaxed mt-1" style={{ color: BN.text2 }}>
                            {t("iosStep1")} <Share2 className="inline w-3.5 h-3.5 mx-0.5" style={{ verticalAlign: "-2px" }} />
                            {" → "}
                            <span className="whitespace-nowrap">{t("iosStep2")} <Plus className="inline w-3.5 h-3.5 mx-0.5" style={{ verticalAlign: "-2px" }} /></span>
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    // ── Android/Chrome varianti — bir bosishda o'rnatish ──
    return (
        <section className="mb-4 sm:mb-5">
            <div className="relative overflow-hidden rounded-2xl p-4 flex items-start gap-3"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
                <button onClick={dismiss} aria-label={t("later")}
                    className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-lg"
                    style={{ color: BN.text3 }}>
                    <X className="w-3.5 h-3.5" />
                </button>
                <span className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}>
                    <Download className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0 pr-6">
                    <p className="text-[14px] font-black leading-tight">{t("title")}</p>
                    <p className="text-[12px] leading-relaxed mt-1" style={{ color: BN.text2 }}>
                        {t("text")}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <button onClick={install} disabled={busy}
                            className="h-9 px-4 rounded-xl text-[12.5px] font-black flex items-center gap-1.5 disabled:opacity-60 transition-transform active:scale-[0.97]"
                            style={{ background: BN.gold, color: BN.onGold }}>
                            <Download className="w-3.5 h-3.5" />
                            {t("install")}
                        </button>
                        <button onClick={dismiss}
                            className="h-9 px-3 rounded-xl text-[12px] font-bold"
                            style={{ background: "transparent", color: BN.text3 }}>
                            {t("later")}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
