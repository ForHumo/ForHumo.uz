"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, CheckCircle, Clock, Truck, Package, Home } from "lucide-react";
import { BELIS, BELIS_SOCIAL } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

interface Order {
    id: string; code: string; status: string; paymentStatus: string; paymentMethod: string;
    fulfillType: string; buyerName: string; buyerPhone: string; address: string | null; city: string | null;
    subtotal: number | string; deliveryFee: number | string; total: number | string; currency: string;
    createdAt: string; acceptedAt: string | null; shippedAt: string | null; deliveredAt: string | null;
    items: Array<{ id: string; productName: string; productImage: string | null; quantity: number; priceSnapshot: number | string; currency: string }>;
    note: string | null;
}

const STATUS_STEPS = ["NEW", "ACCEPTED", "PREPARING", "SHIPPING", "DELIVERED"] as const;

export function BelisOrderDetail({ orderId }: { orderId: string }) {
    const t = useTranslations("belis.order.status");
    const locale = useLocale();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    async function load() {
        try {
            const r = await fetch(`/api/belis/orders/${orderId}`, { cache: "no-store" });
            if (r.ok) setOrder(await r.json().then(d => d.order));
            else setErr("Buyurtma topilmadi yoki ruxsat yo'q");
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, [orderId]);
    // Live tracker — 15s'da bir marta yangilaymiz (terminal bo'lmaguncha)
    useEffect(() => {
        if (!order || ["DELIVERED", "CANCELLED"].includes(order.status)) return;
        const iv = setInterval(load, 15_000);
        return () => clearInterval(iv);
    }, [order?.status]);

    const fmt = (n: number | string) => `${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "uz-UZ").format(Number(n))} ${order?.currency === "USD" ? "$" : "so'm"}`;

    if (loading) return <div className="text-center py-20"><Loader2 className="w-6 h-6 animate-spin inline" style={{ color: BELIS.gold }} /></div>;
    if (err || !order) return <div className="max-w-md mx-auto text-center py-20"><p style={{ color: BELIS.err }}>{err ?? "Xato"}</p></div>;

    const idx = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]);
    const cancelled = order.status === "CANCELLED";

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Success banner */}
            <div className="text-center mb-6 p-6 rounded-2xl"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                <CheckCircle className="w-12 h-12 mx-auto mb-2" strokeWidth={1.25} style={{ color: BELIS.gold }} />
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: BELIS.text2 }}>Buyurtma qabul qilindi</p>
                <p className="text-2xl font-black" style={{ color: BELIS.gold, fontFamily: "'Montserrat', sans-serif" }}>{order.code}</p>
                <p className="text-xs mt-1" style={{ color: BELIS.text3 }}>
                    {new Date(order.createdAt).toLocaleString(locale === "ru" ? "ru-RU" : "uz-UZ")}
                </p>
            </div>

            {/* Stepper */}
            {!cancelled ? (
                <div className="mb-6 p-4 rounded-2xl"
                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                    <div className="flex justify-between relative">
                        {STATUS_STEPS.map((step, i) => {
                            const active = i <= idx;
                            return (
                                <div key={step} className="flex-1 flex flex-col items-center relative z-10">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                                        style={{
                                            background: active ? BELIS.gold : BELIS.bg,
                                            border: `2px solid ${active ? BELIS.gold : BELIS.border}`,
                                        }}>
                                        <StepIcon step={step} active={active} />
                                    </div>
                                    <p className="text-[9px] mt-1.5 text-center font-bold"
                                        style={{ color: active ? BELIS.text : BELIS.text3 }}>{t(step)}</p>
                                </div>
                            );
                        })}
                        {/* Line */}
                        <div className="absolute top-4 left-4 right-4 h-0.5" style={{ background: BELIS.borderSoft }} />
                        <div className="absolute top-4 left-4 h-0.5 transition-all"
                            style={{ background: BELIS.gold, width: `calc(${(idx / (STATUS_STEPS.length - 1)) * 100}% - 16px)` }} />
                    </div>
                </div>
            ) : (
                <div className="mb-6 p-4 rounded-2xl text-center"
                    style={{ background: BELIS.errSoft, border: `1px solid ${BELIS.err}55`, color: BELIS.err }}>
                    Buyurtma bekor qilindi
                </div>
            )}

            {/* Mahsulotlar */}
            <div className="mb-4 p-4 rounded-2xl"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                <p className="text-xs uppercase tracking-widest mb-3" style={{ color: BELIS.text2, fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>
                    Mahsulotlar
                </p>
                {order.items.map(it => (
                    <div key={it.id} className="flex items-center gap-3 py-2 border-b last:border-b-0" style={{ borderColor: BELIS.borderSoft }}>
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: BELIS.bg }}>
                            {it.productImage && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={it.productImage} alt="" className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold" style={{ color: BELIS.text, fontFamily: "'Playfair Display', serif" }}>{it.productName}</p>
                            <p className="text-xs" style={{ color: BELIS.text2 }}>{it.quantity} × {fmt(it.priceSnapshot)}</p>
                        </div>
                        <p className="text-sm font-black" style={{ color: BELIS.gold }}>{fmt(Number(it.priceSnapshot) * it.quantity)}</p>
                    </div>
                ))}
            </div>

            {/* To'lov + yetkazish */}
            <div className="mb-4 p-4 rounded-2xl"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                <InfoRow k="Yetkazish" v={order.fulfillType === "PICKUP" ? "O'zi olib ketish" : order.fulfillType === "YANDEX_DELIVERY" ? "Yandex Delivery" : "BTS Express"} />
                <InfoRow k="To'lov" v={order.paymentMethod === "CARD" ? "Karta o'tkazma" : "Naqd"} />
                <InfoRow k="To'lov holati" v={order.paymentStatus === "PAID" ? "Tasdiqlangan" : order.paymentStatus === "PENDING" ? "Kutilmoqda" : order.paymentStatus} />
                {order.address && <InfoRow k="Manzil" v={order.address + (order.city ? ` · ${order.city}` : "")} />}
                {order.note && <InfoRow k="Izoh" v={order.note} />}
            </div>

            {/* Summasi */}
            <div className="mb-4 p-4 rounded-2xl"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                <InfoRow k="Mahsulotlar" v={fmt(order.subtotal)} />
                <InfoRow k="Yetkazish" v={Number(order.deliveryFee) === 0 ? "Bepul" : fmt(order.deliveryFee)} />
                <div className="h-px my-2" style={{ background: BELIS.borderSoft }} />
                <div className="flex justify-between">
                    <span className="text-sm font-bold" style={{ color: BELIS.text }}>Jami</span>
                    <span className="text-lg font-black" style={{ color: BELIS.gold }}>{fmt(order.total)}</span>
                </div>
            </div>

            {/* Aloqa */}
            <div className="text-center text-xs" style={{ color: BELIS.text2 }}>
                Savol bo&apos;lsa: <a href={BELIS_SOCIAL.telegramBot} target="_blank" rel="noopener" className="font-bold" style={{ color: BELIS.gold }}>@belisuz_bot</a>
            </div>
            <div className="text-center mt-4">
                <BelisLink href="/belis" className="text-xs hover:underline" style={{ color: BELIS.text2 }}>← Bosh sahifaga qaytish</BelisLink>
            </div>
        </div>
    );
}

function InfoRow({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex justify-between text-sm py-0.5">
            <span style={{ color: BELIS.text2 }}>{k}</span>
            <span className="text-right" style={{ color: BELIS.text }}>{v}</span>
        </div>
    );
}
function StepIcon({ step, active }: { step: string; active: boolean }) {
    const color = active ? BELIS.onGold : BELIS.text3;
    const props = { className: "w-3.5 h-3.5", strokeWidth: 1.5, style: { color } };
    if (step === "NEW") return <Clock {...props} />;
    if (step === "ACCEPTED") return <CheckCircle {...props} />;
    if (step === "PREPARING") return <Package {...props} />;
    if (step === "SHIPPING") return <Truck {...props} />;
    return <Home {...props} />;
}
