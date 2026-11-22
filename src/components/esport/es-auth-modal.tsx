"use client";

// Qatnashish darvozasi — tomosha KIRISHSIZ, lekin har qanday /api/esport/* 401 (jamoa
// yaratish, turnirga ro'yxat, transfer, qo'shilish...) bu modalni chiqaradi. eSport shell
// mount bo'lganда window.fetch o'raladi (faqat /api/esport/ 401 uchun event), unmount'да
// tiklanadi — qolgan ilovaga ta'sir qilmaydi. Hech bir action faylini tahrirlash shart emas.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { X } from "lucide-react";
import { useEsT } from "@/lib/esport-i18n";

export function EsAuthModal() {
    const t = useEsT();
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // es-fetch nети: eSport 401 → modal
    useEffect(() => {
        const orig = window.fetch;
        const boundOrig = orig.bind(window);
        window.fetch = async (...args: Parameters<typeof window.fetch>) => {
            const res = await boundOrig(...args);
            try {
                const input = args[0];
                const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
                if (res.status === 401 && url && url.includes("/api/esport/")) {
                    window.dispatchEvent(new CustomEvent("es:auth-required"));
                }
            } catch { /* ignore */ }
            return res;
        };
        return () => { window.fetch = orig; };
    }, []);

    useEffect(() => {
        const h = () => setOpen(true);
        window.addEventListener("es:auth-required", h as EventListener);
        return () => window.removeEventListener("es:auth-required", h as EventListener);
    }, []);

    if (!mounted || !open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(4,7,18,0.74)", backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="relative w-full max-w-sm rounded-2xl p-6 text-center"
                style={{ background: "#0d1424", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 60px -18px rgba(0,0,0,0.7)" }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={() => setOpen(false)}
                    aria-label="Yopish"
                    className="absolute right-3 top-3 text-white/40 transition hover:text-white/80"
                >
                    <X size={18} />
                </button>

                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl es-accent-bg">
                    <Image src="/esport-logo.png" alt="Humo eSport" width={34} height={34} className="h-9 w-9 object-contain" />
                </div>

                <h2 className="es-accent-text3 text-xl font-black tracking-tight">{t("auth.gateTitle")}</h2>
                <p className="mt-2 text-sm text-white/65">{t("auth.gateDesc")}</p>

                <button
                    onClick={() => signIn("google")}
                    className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:scale-[.98]"
                >
                    <img src="https://authjs.dev/img/providers/google.svg" alt="" className="h-5 w-5" />
                    {t("auth.gateBtn")}
                </button>

                <button onClick={() => setOpen(false)} className="mt-3 text-xs text-white/40 transition hover:text-white/70">
                    {t("auth.gateLater")}
                </button>
            </div>
        </div>,
        document.body
    );
}
