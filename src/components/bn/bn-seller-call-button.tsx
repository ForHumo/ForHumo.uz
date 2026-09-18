"use client";

// FTC — "Sotuvchiga qo'ng'iroq". Telefon raqami YASHIRIN (OLX uslubi):
// xaridor tugmani bosadi → sotuvchiga mahsulot konteksti bilan qo'ng'iroq
// so'rovi (push + chat) ketadi. Ish vaqti gate — yopiq bo'lsa so'rov saqlanadi,
// ish vaqtida bog'lanishadi. Hech qaysi tomon raqami ko'rinmaydi.

import { useState } from "react";
import { Phone, Loader2, Check } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { bnToast } from "./bn-toast";
import { shopAvailability } from "@/lib/bn-hours";

interface Props {
    shopSlug: string;
    workHours?: string | null;
    product: { id: string; title: string };
}

export function BnSellerCallButton({ shopSlug, workHours, product }: Props) {
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const avail = shopAvailability(workHours);

    async function request() {
        if (busy || done) return;
        setBusy(true);
        try {
            const r = await fetch(`/api/bn/shops/${shopSlug}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    kind: "CALL",
                    productId: product.id,
                    text: `${product.title} — qo'ng'iroq qilishingizni so'rayman`,
                }),
            });
            if (r.status === 401) {
                window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`;
                return;
            }
            if (r.status === 429) {
                bnToast("Juda ko'p so'rov — biroz kutib qayta urining", "error");
                return;
            }
            if (!r.ok) {
                bnToast("So'rov yuborilmadi, qayta urining", "error");
                return;
            }
            setDone(true);
            bnToast(
                avail.open === false
                    ? "Do'kon hozir yopiq. So'rovingiz saqlandi — ish vaqtida bog'lanishadi."
                    : "Qo'ng'iroq so'rovi yuborildi. Sotuvchi tez orada bog'lanadi.",
                "success",
            );
        } catch {
            bnToast("Ulanish xatoligi", "error");
        } finally {
            setBusy(false);
        }
    }

    // Ochiq/yopiq nuqta rangi
    const dot = avail.open === true ? BN.ok : avail.open === false ? BN.err : BN.text3;

    return (
        <button
            onClick={request}
            disabled={busy || done}
            className="flex flex-col items-center justify-center gap-0.5 h-11 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-70"
            style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
        >
            <span className="flex items-center gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" />
                    : done ? <Check className="w-4 h-4" style={{ color: BN.ok }} />
                    : <Phone className="w-4 h-4" />}
                {done ? "So'rov yuborildi" : "Qo'ng'iroq"}
            </span>
            {!done && avail.open !== null && (
                <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: BN.text3 }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                    {avail.label}
                </span>
            )}
        </button>
    );
}
