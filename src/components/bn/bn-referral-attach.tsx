"use client";

// Foydalanuvchi kirgach (session=authenticated) sessionStorage'dagi
// atributsiyadagi `ref` kodini backend'ga jo'natadi. Bir marta muvaffaqiyatli
// jo'natilsa, bir xil sessiyada qayta jo'natilmaydi (localStorage guard).

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getAttribution } from "@/lib/bn-analytics";

const GUARD_KEY = "bn:referral:attached-v1";

export function BnReferralAttach() {
    const { status } = useSession();
    const doneRef = useRef(false);

    useEffect(() => {
        if (doneRef.current) return;
        if (status !== "authenticated") return;
        try {
            if (localStorage.getItem(GUARD_KEY)) { doneRef.current = true; return; }
        } catch { /* ignore */ }
        const attr = getAttribution();
        const code = attr?.ref;
        if (!code) return;
        doneRef.current = true;
        void fetch("/api/bn/referral/attach", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code }),
        })
            .then(r => r.json().catch(() => null))
            .then(d => {
                if (d?.ok) {
                    try { localStorage.setItem(GUARD_KEY, "1"); } catch { /* ignore */ }
                }
            })
            .catch(() => { /* ignore — fail-safe */ });
    }, [status]);

    return null;
}
