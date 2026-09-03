"use client";

// Belis booking detail — stepper + tarkib + narx + bekor qilish.

import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Calendar, MapPin, Phone, User, X, CheckCircle2, AlertTriangle, Package, Truck } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";
import { BelisLocationMap } from "./belis-location-map";
import { BelisChatButton } from "./belis-booking-chat";

interface ItemBooking {
    qty: number;
    item: { slug: string; nameUz: string; images: string[] };
}
interface Detail {
    id: string;
    code: string;
    status: "REQUESTED" | "CONFIRMED" | "PICKED_UP" | "RETURNED_OK" | "RETURNED_DAMAGE" | "LATE" | "CANCELLED";
    buyerName: string;
    buyerPhone: string;
    passportUrl: string | null;
    passportSeries: string | null;
    eventDate: string;
    pickupDate: string;
    returnDate: string;
    actualReturnedAt: string | null;
    komplekt: { slug: string; kind: string; nameUz: string; images: string[]; itemsCount: number; items: Array<{ slug: string; nameUz: string; images: string[] }> } | null;
    itemBookings: ItemBooking[];
    rentDailyUzs: number;
    daysCount: number;
    rentTotalUzs: number;
    depositUzs: number;
    paidRent: number;
    paidDeposit: number;
    fulfillType: "PICKUP" | "YANDEX_CUSTOMER";
    address: string | null;
    note: string | null;
    damageReport: string | null;
    fineUzs: number;
    refundedUzs: number;
    cancelReason: string | null;
    createdAt: string;
    confirmedAt: string | null;
    cancelledAt: string | null;
}

const STATUS_META: Record<Detail["status"], { label: string; color: string }> = {
    REQUESTED:       { label: "Kutilmoqda",  color: BELIS.warn },
    CONFIRMED:       { label: "Tasdiqlangan", color: BELIS.goldDeep },
    PICKED_UP:       { label: "Olib ketildi", color: BELIS.goldDeep },
    RETURNED_OK:     { label: "Qaytarildi (butun)", color: BELIS.ok },
    RETURNED_DAMAGE: { label: "Zarar bilan qaytdi", color: BELIS.err },
    LATE:            { label: "Kechikkan", color: BELIS.err },
    CANCELLED:       { label: "Bekor qilingan", color: BELIS.text3 },
};

function fmtSom(n: number): string { return `${n.toLocaleString("uz-UZ")} so'm`; }
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "long", year: "numeric" });
}

const STEPS: Detail["status"][] = ["REQUESTED", "CONFIRMED", "PICKED_UP", "RETURNED_OK"];

export function BelisBookingDetail({ code }: { code: string }) {
    const [data, setData] = useState<Detail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    async function load() {
        const r = await fetch(`/api/belis/bookings/${code}`, { cache: "no-store" });
        const d = await r.json();
        if (r.ok) setData(d);
        else setError(d?.error ?? "network");
    }
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [code]);

    async function cancel() {
        if (!confirm("Bekor qilishga rozimisiz?")) return;
        const reason = prompt("Sabab (ixtiyoriy)") ?? undefined;
        setCancelling(true);
        try {
            const r = await fetch(`/api/belis/bookings/${code}/cancel`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ reason }),
            });
            if (r.ok) await load();
        } finally { setCancelling(false); }
    }

    if (error === "not_found" || error === "forbidden") {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <p className="text-[15px]" style={{ color: BELIS.text2 }}>Buyurtma topilmadi yoki ruxsat yo&apos;q</p>
                <BelisLink href="/belis/kabinet" className="mt-3 inline-block text-[13px] font-black" style={{ color: BELIS.goldDeep }}>
                    Kabinetga qaytish
                </BelisLink>
            </div>
        );
    }
    if (!data) {
        return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" style={{ color: BELIS.gold }} /></div>;
    }

    const meta = STATUS_META[data.status];
    const isTerminal = ["RETURNED_OK", "RETURNED_DAMAGE", "CANCELLED"].includes(data.status);
    const canCancel = ["REQUESTED", "CONFIRMED"].includes(data.status);
    const curStep = STEPS.indexOf(data.status);
    const isCancelled = data.status === "CANCELLED";

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            <BelisLink href="/belis/kabinet" className="inline-flex items-center gap-1 text-[13px] font-black mb-4"
                style={{ color: BELIS.text2 }}>
                <ChevronLeft className="w-4 h-4" /> Kabinet
            </BelisLink>

            <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
                <div>
                    <h1 className="text-[24px] font-black tracking-tight" style={{ color: BELIS.text }}>Buyurtma #{data.code}</h1>
                    <p className="text-[12px] mt-1" style={{ color: BELIS.text3 }}>Yaratilgan: {fmtDate(data.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {!isCancelled && <BelisChatButton code={data.code} otherName="Belis (@sevinch)" />}
                    <span className="px-3 py-1.5 rounded-lg text-[13px] font-black"
                        style={{ background: `${meta.color}1F`, color: meta.color }}>
                        {meta.label}
                    </span>
                </div>
            </div>

            {/* Stepper */}
            {!isCancelled && (
                <div className="rounded-2xl p-5 mb-4" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                    <div className="flex items-center justify-between">
                        {STEPS.map((s, i) => {
                            const done = i < curStep;
                            const active = i === curStep && !isTerminal ? true : i === curStep;
                            const meta2 = STATUS_META[s];
                            return (
                                <div key={s} className="flex-1 flex flex-col items-center relative">
                                    {i > 0 && (
                                        <div className="absolute top-4 -left-1/2 w-full h-0.5"
                                            style={{ background: i <= curStep ? BELIS.gold : BELIS.borderSoft }} />
                                    )}
                                    <span className="relative w-8 h-8 rounded-full grid place-items-center text-[11px] font-black z-10"
                                        style={{
                                            background: done ? BELIS.gold : active ? BELIS_GOLD_GRADIENT : BELIS.surfaceUp,
                                            color: done || active ? BELIS.onGold : BELIS.text3,
                                            boxShadow: active ? "0 0 0 4px rgba(212,175,55,0.25)" : "none",
                                        }}>
                                        {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                                    </span>
                                    <span className="text-[10px] font-bold mt-1.5 text-center leading-tight" style={{ color: i <= curStep ? BELIS.text : BELIS.text3 }}>
                                        {meta2.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bekor sabab */}
            {isCancelled && data.cancelReason && (
                <div className="rounded-2xl p-4 mb-4 flex items-start gap-2" style={{ background: BELIS.errSoft, color: BELIS.err }}>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="text-[13px]">{data.cancelReason}</span>
                </div>
            )}

            {/* Damage report */}
            {data.status === "RETURNED_DAMAGE" && data.damageReport && (
                <div className="rounded-2xl p-4 mb-4" style={{ background: BELIS.errSoft, border: `1px solid ${BELIS.err}` }}>
                    <p className="text-[12px] font-black mb-1" style={{ color: BELIS.err }}>Qaytish holati (zarar)</p>
                    <p className="text-[12.5px]" style={{ color: BELIS.text }}>{data.damageReport}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                <div className="space-y-4">
                    {/* Komplekt */}
                    {data.komplekt && (
                        <div className="rounded-2xl p-4" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                            <div className="flex items-center gap-2 mb-3">
                                <Package className="w-4 h-4" style={{ color: BELIS.goldDeep }} />
                                <h3 className="text-[14px] font-black" style={{ color: BELIS.text }}>Komplekt</h3>
                            </div>
                            <BelisLink href={`/belis/k/${data.komplekt.slug}` as never} className="flex items-center gap-3">
                                <span className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: BELIS.surfaceUp }}>
                                    {data.komplekt.images[0] && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={data.komplekt.images[0]} alt="" className="w-full h-full object-cover" />
                                    )}
                                </span>
                                <div>
                                    <p className="text-[14px] font-black" style={{ color: BELIS.text }}>{data.komplekt.nameUz}</p>
                                    <p className="text-[11.5px]" style={{ color: BELIS.text3 }}>{data.komplekt.itemsCount} ta quti</p>
                                </div>
                            </BelisLink>
                        </div>
                    )}

                    {/* Sana */}
                    <div className="rounded-2xl p-4" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4" style={{ color: BELIS.goldDeep }} />
                            <h3 className="text-[14px] font-black" style={{ color: BELIS.text }}>Sanalar</h3>
                        </div>
                        <div className="space-y-1.5 text-[13px]">
                            <Row label="Olib ketish" value={fmtDate(data.pickupDate)} />
                            <Row label="Marosim" value={fmtDate(data.eventDate)} />
                            <Row label="Qaytarish (oxirgi)" value={fmtDate(data.returnDate)} />
                            {data.actualReturnedAt && <Row label="Haqiqiy qaytish" value={fmtDate(data.actualReturnedAt)} />}
                            <Row label="Kunlar" value={`${data.daysCount} kun`} />
                        </div>
                    </div>

                    {/* Yetkazish */}
                    <div className="rounded-2xl p-4" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <div className="flex items-center gap-2 mb-3">
                            {data.fulfillType === "PICKUP" ? <MapPin className="w-4 h-4" style={{ color: BELIS.goldDeep }} /> : <Truck className="w-4 h-4" style={{ color: BELIS.goldDeep }} />}
                            <h3 className="text-[14px] font-black" style={{ color: BELIS.text }}>Yetkazish</h3>
                        </div>
                        <p className="text-[13px]" style={{ color: BELIS.text }}>
                            {data.fulfillType === "PICKUP" ? "Do'konga o'zim boraman" : "Yandex chaqiraman (kuryerga o'zim to'layman)"}
                        </p>
                        {data.address && <p className="text-[12px] mt-1" style={{ color: BELIS.text2 }}>{data.address}</p>}
                    </div>

                    {/* Mijoz */}
                    <div className="rounded-2xl p-4" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <div className="flex items-center gap-2 mb-3">
                            <User className="w-4 h-4" style={{ color: BELIS.goldDeep }} />
                            <h3 className="text-[14px] font-black" style={{ color: BELIS.text }}>Mijoz ma&apos;lumoti</h3>
                        </div>
                        <div className="space-y-1.5 text-[13px]">
                            <Row label="Ism" value={data.buyerName} />
                            <Row label="Telefon" value={data.buyerPhone} />
                            {data.passportSeries && <Row label="Pasport" value={data.passportSeries} />}
                            {data.passportUrl && (
                                <a href={data.passportUrl} target="_blank" rel="noopener noreferrer"
                                    className="text-[12px] font-bold underline" style={{ color: BELIS.goldDeep }}>
                                    Pasport nusxasi (rasm)
                                </a>
                            )}
                        </div>
                        {data.buyerPhone && (
                            <a href={`tel:${data.buyerPhone.replace(/\s/g, "")}`}
                                className="mt-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-black"
                                style={{ background: BELIS.goldSoft, color: BELIS.onGold }}>
                                <Phone className="w-3.5 h-3.5" /> Qo&apos;ng&apos;iroq
                            </a>
                        )}
                    </div>

                    {data.note && (
                        <div className="rounded-2xl p-4" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                            <p className="text-[11.5px] font-black uppercase mb-1" style={{ color: BELIS.text3 }}>Izoh</p>
                            <p className="text-[13px]" style={{ color: BELIS.text }}>{data.note}</p>
                        </div>
                    )}

                    {/* Do'kon manzili — pickup yoki hatto yandex uchun ham foydali */}
                    {data.fulfillType === "PICKUP" && (
                        <BelisLocationMap title="Olib ketish manzili" compact />
                    )}
                </div>

                {/* Narx sidebar */}
                <div>
                    <div className="rounded-2xl p-4 sticky top-4" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        <h3 className="text-[14px] font-black mb-3" style={{ color: BELIS.text }}>To&apos;lov</h3>
                        <div className="space-y-1.5 text-[13px]">
                            <Row label={`Ijara (${data.daysCount} kun)`} value={fmtSom(data.rentTotalUzs)} />
                            <Row label="Zaklat" value={fmtSom(data.depositUzs)} />
                            <div className="pt-2 mt-2 flex items-center justify-between" style={{ borderTop: `1px solid ${BELIS.border}` }}>
                                <span className="font-black" style={{ color: BELIS.text }}>Jami to&apos;lov</span>
                                <span className="font-black text-[16px]" style={{ color: BELIS.goldDeep }}>{fmtSom(data.rentTotalUzs + data.depositUzs)}</span>
                            </div>
                            {data.paidRent > 0 && <Row label="To'landi (ijara)" value={fmtSom(data.paidRent)} />}
                            {data.paidDeposit > 0 && <Row label="To'landi (zaklat)" value={fmtSom(data.paidDeposit)} />}
                            {data.fineUzs > 0 && (
                                <div className="flex items-center justify-between" style={{ color: BELIS.err }}>
                                    <span>Shtraf</span>
                                    <span className="font-black">{fmtSom(data.fineUzs)}</span>
                                </div>
                            )}
                            {data.refundedUzs > 0 && (
                                <div className="flex items-center justify-between" style={{ color: BELIS.ok }}>
                                    <span>Qaytarildi</span>
                                    <span className="font-black">{fmtSom(data.refundedUzs)}</span>
                                </div>
                            )}
                        </div>

                        {canCancel && (
                            <button onClick={cancel} disabled={cancelling}
                                className="mt-4 w-full h-10 rounded-xl text-[13px] font-black flex items-center justify-center gap-1.5 disabled:opacity-60"
                                style={{ background: BELIS.errSoft, color: BELIS.err }}>
                                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> Bekor qilish</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span style={{ color: BELIS.text3 }}>{label}</span>
            <span className="font-bold" style={{ color: BELIS.text }}>{value}</span>
        </div>
    );
}
