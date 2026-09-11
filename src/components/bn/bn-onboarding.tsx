"use client";

// BN onboarding gate — birinchi tashrifda modalni dinamik yuklab ochadi.
// Takroriy tashriflarda framer-motion umuman bundle'ga tushmaydi (localStorage tekshiruv
// gate darajasida amalga oshiriladi, faqat kerakli holatda import qilinadi).

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const BnOnboardingModal = dynamic(() => import("./bn-onboarding-modal"), {
    ssr: false,
});

const KEY = "bn-onboarding-v1";

export function BnOnboarding() {
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        try {
            const seen = localStorage.getItem(KEY);
            if (!seen) {
                const t = setTimeout(() => setShouldShow(true), 800);
                return () => clearTimeout(t);
            }
        } catch {}
    }, []);

    const close = () => {
        try { localStorage.setItem(KEY, "1"); } catch {}
        setShouldShow(false);
    };

    if (!shouldShow) return null;
    return <BnOnboardingModal onClose={close} />;
}
