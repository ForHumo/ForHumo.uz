"use client";

// Belis mening arizalarim.

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Package, ChevronRight, Loader2, LogIn, Calendar } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

interface Booking {
    id: string;
    code: string;
    status: "REQUESTED" | "CONFIRMED" | "PICKED_UP" | "RETURNED_OK" | "RETURNED_DAMAGE" | "LATE" | "CANCELLED";
    eventDate: string;
    pickupDate: string;
    returnDate: string;
    rentTotalUzs: number;
    depositUzs: number;
    fulfillType: "PICKUP" | "YANDEX_CUSTOMER";
    komplekt: { slug: string; nameUz: string; images: string[] } | null;
    createdAt: string;
}

const STATUS_META: Record<Booking["status"], { label: string; color: string }> = {
    REQUESTED:       { label: "Kutilmoqda",  color: BELIS.warn },
    CONFIRMED:       { label: "Tasdiqlangan", color: BELIS.goldDeep },
    PICKED_UP:       { label: "Olib ketildi", color: BELIS.goldDeep },
    RETURNED_OK:     { label: "Qaytarildi",  color: BELIS.ok },
    RETURNED_DAMAGE: { label: "Zarar bilan qaytdi", color: BELIS.err },
    LATE:            { label: "Kechikkan",   color: BELIS.err },
    CANCELLED:       { label: "Bekor",       color: BELIS.text3 },
};

function fmtSom(n: number): string {
    return `${n.toLocaleString("uz-UZ")} so'm`;
}
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

export function BelisMyBookings() {
    const { status } = useSession();
    const [rows, setRows] = useState<Booking[] | null>(null);

    useEffect(() => {
        if (status !== "authenticated") return;
        fetch("/api/belis/bookings", { cache: "no-store" })
            .then(r => r.json())
            .then(d => setRows(Array.isArray(d?.bookings) ? d.bookings : []))
            .catch(() => setRows([]));
    }, [status]);

    if (status === "unauthenticated") {
        return (
            <div className="max-w-md mx-auto px-4 py-16 text-center">
                <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <LogIn className="w-7 h-7" />
                </span>
                <p className="text-[16px] font-black mb-1" style={{ color: BELIS.text }}>Arizalarni ko&apos;rish uchun kiring</p>
                <button onClick={() => signIn("google")}
                    className="mt-4 w-full h-12 rounded-xl text-[14px] font-black flex items-center justify-center gap-2"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <LogIn className="w-4 h-4" /> Google bilan kirish
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center gap-3 mb-5">
                <span className="w-11 h-11 rounded-2xl grid place-items-center"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <Package className="w-5 h-5" />
                </span>
                <h1 className="text-[22px] font-black" style={{ color: BELIS.text }}>Mening arizalarim</h1>
            </div>

            {rows === null && (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: BELIS.gold }} /></div>
            )}
            {rows && rows.length === 0 && (
                <div className="text-center py-16 rounded-2xl" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-60" style={{ color: BELIS.gold }} />
                    <p className="text-[14px]" style={{ color: BELIS.text2 }}>Hozircha arizangiz yo&apos;q</p>
                    <BelisLink href="/belis/katalog" className="mt-3 inline-block text-[13px] font-black" style={{ color: BELIS.goldDeep }}>Katalogga o&apos;tish →</BelisLink>
                </div>
            )}
            {rows && rows.length > 0 && (
                <div className="space-y-2.5">
                    {rows.map(b => {
                        const meta = STATUS_META[b.status];
                        return (
                            <BelisLink key={b.id} href={`/belis/buyurtma/${b.code}` as never}
                                className="flex items-center gap-3 p-3 rounded-2xl transition-colors"
                                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                                <span className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: BELIS.surfaceUp }}>
                                    {b.komplekt?.images[0] && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={b.komplekt.images[0]} alt="" className="w-full h-full object-cover" />
                                    )}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                        <span className="text-[10.5px] font-black px-1.5 py-0.5 rounded"
                                            style={{ background: `${meta.color}22`, color: meta.color }}>
                                            {meta.label}
                                        </span>
                                        <span className="text-[10.5px] tabular-nums" style={{ color: BELIS.text3 }}>#{b.code}</span>
                                    </div>
                                    <p className="text-[13.5px] font-black line-clamp-1" style={{ color: BELIS.text }}>
                                        {b.komplekt?.nameUz ?? "Komplekt"}
                                    </p>
                                    <p className="text-[11.5px]" style={{ color: BELIS.text3 }}>
                                        Marosim: {fmtDate(b.eventDate)} · Pickup: {fmtDate(b.pickupDate)}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[13px] font-black tabular-nums" style={{ color: BELIS.goldDeep }}>{fmtSom(b.rentTotalUzs + b.depositUzs)}</p>
                                    <ChevronRight className="w-4 h-4 ml-auto mt-0.5" style={{ color: BELIS.text3 }} />
                                </div>
                            </BelisLink>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
