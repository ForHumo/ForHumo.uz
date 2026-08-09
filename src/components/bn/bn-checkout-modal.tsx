"use client";

// BN checkout modali — savat sahifasidan chaqiriladi.
// FulfillType + phone + address + paymentMethod tanlanadi va POST /api/bn/checkout
// chaqiriladi. Muvaffaqiyatda buyurtmalarim sahifasiga o'tadi.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Truck, Package, Eye, Wallet, Banknote, Loader2, BookMarked, Check } from "lucide-react";
import { BN, fmtPrice } from "@/lib/bn-theme";
import { useBnHref } from "./bn-nav";
import { BnPhoneInput, isValidUzPhone } from "./bn-phone-input";
import { BnMapPicker, type BnLatLng } from "./bn-map-picker";

interface SavedAddress {
    id: string;
    label: string;
    address: string;
    phone: string;
    city: string;
    district: string | null;
    isDefault: boolean;
    latitude?: number | null;
    longitude?: number | null;
}

type Fulfill = "PICKUP" | "DELIVERY" | "INSPECT";
type Pay = "WALLET" | "CASH";

interface Props {
    subtotal: number;
    /** Har item allowDelivery bo'lsa yetkazish tanlanishi mumkin */
    canDelivery: boolean;
    /** Har item allowInspect bo'lsa "ko'rib olish" tanlanishi mumkin */
    canInspect: boolean;
    onClose: () => void;
}

export function BnCheckoutModal({ subtotal, canDelivery, canInspect, onClose }: Props) {
    const router = useRouter();
    const to = useBnHref();

    const [fulfill, setFulfill] = useState<Fulfill>("PICKUP");
    const [phone, setPhone] = useState("+998");
    const [address, setAddress] = useState<BnLatLng | null>(null);
    const [note, setNote] = useState("");
    const [pay, setPay] = useState<Pay>("WALLET");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [saved, setSaved] = useState<SavedAddress[]>([]);
    const [saveNext, setSaveNext] = useState(false);

    // Saqlangan manzillar
    useEffect(() => {
        fetch("/api/bn/addresses")
            .then(r => r.json())
            .then(d => {
                const items = (d.items ?? []) as SavedAddress[];
                setSaved(items);
                const def = items.find(a => a.isDefault) ?? items[0];
                if (def && !address) {
                    setAddress({
                        lat: def.latitude ?? 41.2995,
                        lng: def.longitude ?? 69.2401,
                        address: def.address,
                    });
                    setPhone(def.phone);
                }
            })
            .catch(() => { /* ignore — unauth or empty */ });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function pickSaved(a: SavedAddress) {
        setAddress({
            lat: a.latitude ?? 41.2995,
            lng: a.longitude ?? 69.2401,
            address: a.address,
        });
        setPhone(a.phone);
        setSaveNext(false);
    }

    const deliveryFee = fulfill === "DELIVERY" ? 20_000 : 0;
    const total = subtotal + deliveryFee;

    const canSubmit =
        isValidUzPhone(phone)
        && (fulfill !== "DELIVERY" || (address !== null && address.address.length > 4));

    async function submit() {
        setBusy(true);
        setErr(null);
        try {
            const r = await fetch("/api/bn/checkout", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    fulfillType: fulfill,
                    phone,
                    address: fulfill === "DELIVERY" ? address?.address ?? null : null,
                    latitude: fulfill === "DELIVERY" ? address?.lat ?? null : null,
                    longitude: fulfill === "DELIVERY" ? address?.lng ?? null : null,
                    note: note.trim() || null,
                    paymentMethod: pay,
                }),
            });
            const d = await r.json();
            if (!r.ok || !d?.ok) {
                if (d?.error === "insufficient_balance") {
                    setErr(`Hamyonda yetarli mablag' yo'q. Kerak: ${fmtPrice(d.need)}, hamyonda: ${fmtPrice(d.have)}`);
                } else if (d?.error === "cart_empty") {
                    setErr("Savat bo'sh.");
                } else if (d?.error === "insufficient_stock") {
                    setErr("Mahsulot yetarli emas — miqdorni kamaytiring.");
                } else if (d?.error === "oversell") {
                    setErr("Mahsulot boshqa xaridor tomonidan yechildi. Qayta urinib ko'ring.");
                } else {
                    setErr(d?.error ?? "Xatolik yuz berdi.");
                }
                return;
            }
            // Manzilni kitobchaga saqlash (agar tanlangan)
            if (saveNext && fulfill === "DELIVERY" && address) {
                void fetch("/api/bn/addresses", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        label: "Manzil",
                        address: address.address,
                        latitude: address.lat,
                        longitude: address.lng,
                        phone,
                        isDefault: saved.length === 0,
                    }),
                }).catch(() => { /* ignore */ });
            }
            // Muvaffaqiyat — birinchi buyurtma sahifasiga
            router.push(to(`/buyurtmalarim/${d.primary}`));
        } catch {
            setErr("Ulanish xatoligi. Qayta urinib ko'ring.");
        } finally { setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-[130]">
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose} />
            <div
                className="absolute inset-y-0 right-0 w-full sm:w-[460px] overflow-y-auto"
                style={{ background: BN.surface, borderLeft: `1px solid ${BN.border}` }}
            >
                {/* Sarlavha */}
                <div
                    className="sticky top-0 flex items-center justify-between h-16 px-4 z-10"
                    style={{ background: BN.surface, borderBottom: `1px solid ${BN.border}` }}
                >
                    <span className="text-[16px] font-black">Buyurtmani rasmiylashtirish</span>
                    <button
                        onClick={onClose}
                        aria-label="Yopish"
                        className="w-9 h-9 grid place-items-center rounded-lg"
                        style={{ background: BN.surfaceUp }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-6">
                    {/* Olish usuli */}
                    <Section title="Olish usuli">
                        <Choice
                            active={fulfill === "PICKUP"}
                            onClick={() => setFulfill("PICKUP")}
                            icon={<Package className="w-4 h-4" />}
                            title="Do'kondan olib ketaman"
                            desc="Bepul. Do'konga borib olasiz."
                        />
                        {canDelivery && (
                            <Choice
                                active={fulfill === "DELIVERY"}
                                onClick={() => setFulfill("DELIVERY")}
                                icon={<Truck className="w-4 h-4" />}
                                title="Yetkazib berish"
                                desc={`Toshkent bo'ylab ${fmtPrice(20_000)}`}
                            />
                        )}
                        {canInspect && (
                            <Choice
                                active={fulfill === "INSPECT"}
                                onClick={() => setFulfill("INSPECT")}
                                icon={<Eye className="w-4 h-4" />}
                                title="Ko'rib sotib olaman"
                                desc="24 soat band. Borib ko'rasiz, yoqsa to'laysiz."
                            />
                        )}
                    </Section>

                    {/* Aloqa */}
                    <Section title="Aloqa">
                        <Field label="Telefon">
                            <BnPhoneInput value={phone} onChange={setPhone} />
                        </Field>
                        {fulfill === "DELIVERY" && (
                            <>
                                {saved.length > 0 && (
                                    <div>
                                        <p className="flex items-center gap-1.5 text-[12px] font-bold mb-2" style={{ color: BN.text3 }}>
                                            <BookMarked className="w-3.5 h-3.5" />
                                            Saqlangan manzillar
                                        </p>
                                        <div className="flex gap-2 overflow-x-auto pb-1 bn-noscroll mb-2">
                                            {saved.map(a => {
                                                const active = a.address === address?.address;
                                                return (
                                                    <button
                                                        key={a.id}
                                                        onClick={() => pickSaved(a)}
                                                        className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12.5px] font-bold flex-shrink-0"
                                                        style={{
                                                            background: active ? BN.goldSoft : BN.surfaceUp,
                                                            border: `1px solid ${active ? BN.goldEdge : BN.border}`,
                                                            color: active ? BN.gold : BN.text2,
                                                        }}
                                                    >
                                                        {active && <Check className="w-3 h-3" />}
                                                        {a.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                <Field label="Yetkazish manzili">
                                    <BnMapPicker
                                        value={address}
                                        onChange={setAddress}
                                        placeholder="Xaritada uy joyingizni belgilang"
                                    />
                                </Field>
                                <label className="flex items-center gap-2 text-[12.5px] cursor-pointer" style={{ color: BN.text2 }}>
                                    <input
                                        type="checkbox"
                                        checked={saveNext}
                                        onChange={e => setSaveNext(e.target.checked)}
                                        className="w-4 h-4"
                                    />
                                    Manzilni kitobchaga saqlash
                                </label>
                            </>
                        )}
                        <Field label="Sotuvchiga izoh (ixtiyoriy)">
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                rows={2}
                                maxLength={240}
                                placeholder="Masalan: qo'ng'iroq qilmang, kutib turaman"
                                className="w-full p-3 rounded-xl text-[14px] font-medium outline-none resize-none"
                                style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                            />
                        </Field>
                    </Section>

                    {/* To'lov */}
                    <Section title="To'lov">
                        <Choice
                            active={pay === "WALLET"}
                            onClick={() => setPay("WALLET")}
                            icon={<Wallet className="w-4 h-4" />}
                            title="For Pay hamyondan"
                            desc="Pul kafolat ostida ushlanadi. Qabul qilmaguningizcha sotuvchiga o'tmaydi."
                        />
                        <Choice
                            active={pay === "CASH"}
                            onClick={() => setPay("CASH")}
                            icon={<Banknote className="w-4 h-4" />}
                            title="Naqd (do'konda)"
                            desc="Komissiyasiz. Kafolat yo'q."
                        />
                    </Section>

                    {err && (
                        <div
                            className="p-3 rounded-xl text-[12.5px]"
                            style={{ background: BN.errSoft, color: BN.err, border: `1px solid ${BN.err}33` }}
                        >
                            {err}
                        </div>
                    )}
                </div>

                {/* Yig'indi + tugma */}
                <div
                    className="sticky bottom-0 p-4 space-y-3"
                    style={{ background: BN.surface, borderTop: `1px solid ${BN.border}` }}
                >
                    <div className="space-y-1.5 text-[13.5px]">
                        <SumRow label="Mahsulotlar" value={fmtPrice(subtotal)} />
                        {deliveryFee > 0 && <SumRow label="Yetkazish" value={fmtPrice(deliveryFee)} />}
                        <div
                            className="flex items-baseline justify-between pt-2"
                            style={{ borderTop: `1px solid ${BN.border}` }}
                        >
                            <span className="text-[14px] font-bold">Jami</span>
                            <span className="text-[20px] font-black tabular-nums">{fmtPrice(total)}</span>
                        </div>
                    </div>

                    <button
                        onClick={submit}
                        disabled={!canSubmit || busy}
                        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black transition-transform active:scale-[0.98] disabled:opacity-60"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : `Buyurtma berish — ${fmtPrice(total)}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[11px] font-black uppercase tracking-wider mb-2.5" style={{ color: BN.text3 }}>
                {title}
            </p>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-[12px] font-bold mb-1.5" style={{ color: BN.text2 }}>{label}</span>
            {children}
        </label>
    );
}

function Choice({
    active, onClick, icon, title, desc,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
    return (
        <button
            onClick={onClick}
            className="flex items-start gap-3 w-full p-3 rounded-xl text-left transition-colors"
            style={{
                background: active ? BN.goldSoft : BN.surfaceUp,
                border: `1px solid ${active ? BN.goldEdge : BN.border}`,
            }}
        >
            <span
                className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0"
                style={{ background: active ? BN.gold : BN.surface, color: active ? BN.onGold : BN.text3 }}
            >
                {icon}
            </span>
            <span className="flex-1 min-w-0">
                <span className="block text-[13.5px] font-black" style={{ color: active ? BN.gold : BN.text }}>
                    {title}
                </span>
                <span className="block text-[12px] mt-0.5" style={{ color: BN.text3 }}>{desc}</span>
            </span>
        </button>
    );
}

function SumRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between">
            <span style={{ color: BN.text3 }}>{label}</span>
            <span className="font-bold tabular-nums">{value}</span>
        </div>
    );
}
