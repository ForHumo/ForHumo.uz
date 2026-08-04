"use client";

// Butun BN sahifa bo'ylab chapga/o'ngga swipe qilganda navbar tabini o'zgartiradi.
// Foydalanuvchi so'rovi: navbardagi keyingi/oldingi bo'limga o'tish.
//
// Qoidalar:
// - Faqat gorizontal swipe (vertikal skrol'ni buzmaydi)
// - Threshold 55px (tasodifiy tegib turishlar hisobga olinmasin)
// - Karusel, slayder, input, textarea, tugma ustida ishlamaydi (data-no-swipe)
// - Pointer events (mouse + touch)

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBnHref, useBnPath } from "./bn-nav";
import { NAV_ORDER } from "./bn-navbar";

const THRESHOLD_PX = 55;
const MAX_VERTICAL_DRIFT = 45;   // shu qadar tikka bo'lsa — skrol, swipe emas

export function BnSwipeNav({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const to = useBnHref();
    const path = useBnPath();

    useEffect(() => {
        let startX = 0, startY = 0;
        let tracking = false;
        let blocked = false;

        function onPointerDown(e: PointerEvent) {
            // Chap tugma yoki asosiy tegish; drag'ga qarshi elementlar bekor qiladi
            if (e.pointerType === "mouse" && e.button !== 0) return;

            // Ba'zi elementlar swipe'ni istamaydi — data-no-swipe atributi bilan
            const target = e.target as HTMLElement | null;
            if (target?.closest("[data-no-swipe]")) { blocked = true; return; }
            if (target?.closest("input,textarea,select,button,a,[role='button'],[contenteditable='true']")) {
                // Interaktiv element bosilganda swipe boshlanmaydi
                blocked = true; return;
            }

            blocked = false;
            tracking = true;
            startX = e.clientX;
            startY = e.clientY;
        }

        function onPointerUp(e: PointerEvent) {
            if (!tracking || blocked) { tracking = false; blocked = false; return; }
            tracking = false;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Vertikal harakat kattaroq bo'lsa — bu skrol, swipe emas
            if (Math.abs(dy) > MAX_VERTICAL_DRIFT) return;
            if (Math.abs(dx) < THRESHOLD_PX) return;

            // Joriy tabni topamiz
            const currentIdx = NAV_ORDER.findIndex(h => {
                if (h === "/") return path === "/";
                return path.startsWith(h);
            });
            if (currentIdx < 0) return;

            // Chapga swipe (dx < 0) → keyingi tab; o'ngga swipe → oldingisi
            const nextIdx = dx < 0 ? currentIdx + 1 : currentIdx - 1;
            if (nextIdx < 0 || nextIdx >= NAV_ORDER.length) return;

            router.push(to(NAV_ORDER[nextIdx]));
        }

        window.addEventListener("pointerdown", onPointerDown, { passive: true });
        window.addEventListener("pointerup", onPointerUp, { passive: true });
        window.addEventListener("pointercancel", () => { tracking = false; blocked = false; }, { passive: true });

        return () => {
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("pointerup", onPointerUp);
        };
    }, [router, to, path]);

    return <>{children}</>;
}
