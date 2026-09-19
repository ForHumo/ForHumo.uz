"use client";

// FTC — "Sotuvchiga qo'ng'iroq". Jonli WebRTC qo'ng'iroq (ovoz, qo'ng'iroq ichida
// video yoqiladi). Telefon raqami YASHIRIN — Nexus signaling orqali ketadi.
// Ish vaqti badge ko'rsatiladi. Sotuvchi offline bo'lsa qo'ng'iroq javobsiz qoladi
// (35s), keyin xaridor "Yozish" orqali xabar qoldiradi.

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Phone, Loader2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { shopAvailability } from "@/lib/bn-hours";
import { startBnCall } from "./bn-call-provider";

interface Props {
    sellerId?: string | null;
    shopName: string;
    shopLogo?: string | null;
    ownerUsername?: string | null;
    workHours?: string | null;
    product: { id: string; title: string; image?: string | null };
}

export function BnSellerCallButton({ sellerId, shopName, shopLogo, ownerUsername, workHours, product }: Props) {
    const { status } = useSession();
    const [busy, setBusy] = useState(false);
    const avail = shopAvailability(workHours);

    function call() {
        if (busy) return;
        if (status !== "authenticated") {
            window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`;
            return;
        }
        if (!sellerId) return;
        setBusy(true);
        startBnCall({
            peerId: sellerId,
            kind: "AUDIO",
            bnProductId: product.id,
            peer: { id: sellerId, name: shopName, username: ownerUsername ?? null, image: shopLogo ?? null },
            bnProduct: { title: product.title, image: product.image ?? null },
        });
        setTimeout(() => setBusy(false), 1500);
    }

    const dot = avail.open === true ? BN.ok : avail.open === false ? BN.err : BN.text3;

    return (
        <button
            onClick={call}
            disabled={busy || !sellerId}
            className="flex flex-col items-center justify-center gap-0.5 h-11 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-60"
            style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
        >
            <span className="flex items-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                Qo&apos;ng&apos;iroq
            </span>
            {avail.open !== null && (
                <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: BN.text3 }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                    {avail.label}
                </span>
            )}
        </button>
    );
}
