"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Loader2, Truck, Package, MapPin, CreditCard, Coins } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT, BELIS_LOCATION } from "@/lib/belis-theme";

type Fulfill = "YANDEX_DELIVERY" | "BTS_EXPRESS" | "PICKUP";
type Pay = "CARD" | "CASH";

interface CartItem { id: string; quantity: number; product: { id: string; nameUz: string; images: string[]; price: number; currency: string } }

function fee(f: Fulfill, sub: number): number {
    if (f === "PICKUP") return 0;
    if (f === "YANDEX_DELIVERY") return sub >= 500_000 ? 0 : 25_000;
    return sub >= 1_000_000 ? 0 : 40_000;
}

export function BelisCheckout() {
    const t = useTranslations("belis.checkout");
    const locale = useLocale();
    const router = useRouter();
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [note, setNote] = useState("");
    const [fulfill, setFulfill] = useState<Fulfill>("YANDEX_DELIVERY");
    const [payment, setPayment] = useState<Pay>("CARD");

    useEffect(() => {
        fetch("/api/belis/cart").then(r => r.ok ? r.json() : null)
            .then(d => setItems(d?.items ?? []))
            .finally(() => setLoading(false));
    }, []);

    // NAQD faqat PICKUP bilan
    useEffect(() => {
        if (payment === "CASH" && fulfill !== "PICKUP") setPayment("CARD");
    }, [fulfill, payment]);

    const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const delivery = fee(fulfill, subtotal);
    const total = subtotal + delivery;
    const fmt = (n: number) => new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "uz-UZ").format(n) + " so'm";

    async function submit() {
        setErr(null);
        if (!name.trim() || !phone.trim()) { setErr("Ism va telefon kerak"); return; }
        if (fulfill !== "PICKUP" && !address.trim()) { setErr("Manzil kerak"); return; }
        if (items.length === 0) { setErr("Savat bo'sh"); return; }
        setBusy(true);
        try {
            const r = await fetch("/api/belis/orders", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
                    buyerName: name, buyerPhone: phone,
                    address: fulfill === "PICKUP" ? null : address,
                    city: fulfill === "PICKUP" ? null : city,
                    fulfillType: fulfill,
                    paymentMethod: payment,
                    note: note.trim() || undefined,
                }),
            });
            const d = await r.json();
            if (r.ok && d?.order?.id) {
                router.push(`/belis/buyurtma/${d.order.id}` as never);
            } else {
                setErr(d?.error ?? "Buyurtma yuborilmadi");
            }
        } catch { setErr("Tarmoq xatosi"); }
        finally { setBusy(false); }
    }

    if (loading) return <div className="text-center py-20"><Loader2 className="w-6 h-6 animate-spin inline" style={{ color: BELIS.gold }} /></div>;
    if (items.length === 0) {
        return (
            <div className="max-w-md mx-auto text-center py-20 px-4">
                <p style={{ color: BELIS.text2 }}>Savat bo&apos;sh</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            <h1 style={{ fontFamily: "'Playfair Display', serif", color: BELIS.gold, fontSize: 36, textAlign: "center", margin: "0 0 24px" }}>
                {t("title")}
            </h1>

            {/* Aloqa */}
            <Section title={t("contactInfo")}>
                <Field label={t("name")}>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={80}
                        className="w-full px-3 py-2.5 rounded-lg bg-transparent focus:outline-none"
                        style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}`, color: BELIS.text }} />
                </Field>
                <Field label={t("phone")}>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20}
                        placeholder="+998 __ ___ __ __"
                        className="w-full px-3 py-2.5 rounded-lg bg-transparent focus:outline-none"
                        style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}`, color: BELIS.text }} />
                </Field>
            </Section>

            {/* Yetkazish */}
            <Section title={t("delivery.title")}>
                <FulfillOption active={fulfill === "YANDEX_DELIVERY"} onClick={() => setFulfill("YANDEX_DELIVERY")}
                    icon={Truck} title={t("delivery.yandex")} sub={subtotal >= 500_000 ? "Bepul" : "25 000 so'm"} />
                <FulfillOption active={fulfill === "BTS_EXPRESS"} onClick={() => setFulfill("BTS_EXPRESS")}
                    icon={Package} title={t("delivery.bts")} sub={subtotal >= 1_000_000 ? "Bepul" : "40 000 so'm"} />
                <FulfillOption active={fulfill === "PICKUP"} onClick={() => setFulfill("PICKUP")}
                    icon={MapPin} title={t("delivery.pickup")} sub={`Bepul · ${BELIS_LOCATION.dms}`} />

                {fulfill !== "PICKUP" && (
                    <>
                        <Field label={t("address")}>
                            <textarea value={address} onChange={e => setAddress(e.target.value)} maxLength={300} rows={2}
                                className="w-full px-3 py-2.5 rounded-lg bg-transparent focus:outline-none"
                                style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}`, color: BELIS.text }} />
                        </Field>
                        <Field label="Shahar / viloyat">
                            <input type="text" value={city} onChange={e => setCity(e.target.value)} maxLength={60}
                                className="w-full px-3 py-2.5 rounded-lg bg-transparent focus:outline-none"
                                style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}`, color: BELIS.text }} />
                        </Field>
                    </>
                )}
            </Section>

            {/* To'lov */}
            <Section title={t("payment.title")}>
                <FulfillOption active={payment === "CARD"} onClick={() => setPayment("CARD")}
                    icon={CreditCard} title={t("payment.card")} sub="Sotuvchi kartasiga o'tkazma" />
                <FulfillOption active={payment === "CASH"} onClick={() => fulfill === "PICKUP" && setPayment("CASH")}
                    icon={Coins} title={t("payment.cash")} sub={fulfill === "PICKUP" ? "Belis'ga kelib" : "Faqat pickup bilan"}
                    disabled={fulfill !== "PICKUP"} />
            </Section>

            {/* Izoh */}
            <Section title={t("note")}>
                <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={500} rows={2}
                    placeholder="Sotuvchiga qo'shimcha izoh (ixtiyoriy)"
                    className="w-full px-3 py-2.5 rounded-lg bg-transparent focus:outline-none"
                    style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}`, color: BELIS.text }} />
            </Section>

            {/* Umumiy */}
            <div className="p-4 rounded-2xl mt-4"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                <Row label="Mahsulotlar" value={fmt(subtotal)} />
                <Row label="Yetkazish" value={delivery === 0 ? "Bepul" : fmt(delivery)} />
                <div className="h-px my-2" style={{ background: BELIS.borderSoft }} />
                <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold" style={{ color: BELIS.text }}>Jami</span>
                    <span className="text-xl font-black" style={{ color: BELIS.gold }}>{fmt(total)}</span>
                </div>
            </div>

            {err && (
                <p className="mt-3 text-center text-xs py-2 rounded-lg"
                    style={{ background: BELIS.errSoft, color: BELIS.err }}>{err}</p>
            )}

            <button onClick={submit} disabled={busy}
                className="w-full mt-4 py-3.5 rounded-xl text-sm font-black transition hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, boxShadow: "0 6px 20px rgba(212,175,55,0.40)", fontFamily: "'Montserrat', sans-serif" }}>
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("processing")}</> : t("submit")}
            </button>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: BELIS.text2, fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>{title}</p>
            <div className="space-y-2">{children}</div>
        </div>
    );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[11px] mb-1" style={{ color: BELIS.text2 }}>{label}</label>
            {children}
        </div>
    );
}
function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-sm py-0.5">
            <span style={{ color: BELIS.text2 }}>{label}</span>
            <span style={{ color: BELIS.text }}>{value}</span>
        </div>
    );
}
function FulfillOption({ active, disabled, onClick, icon: Icon, title, sub }: {
    active: boolean; disabled?: boolean; onClick: () => void; icon: React.ElementType; title: string; sub: string;
}) {
    return (
        <button onClick={onClick} disabled={disabled}
            className="w-full flex items-center gap-3 p-3 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
                background: active ? "rgba(212,175,55,0.10)" : BELIS.bg,
                border: `1px solid ${active ? BELIS.gold : BELIS.border}`,
            }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: active ? BELIS.gold : BELIS.surface }}>
                <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: active ? BELIS.onGold : BELIS.text2 }} />
            </div>
            <div className="flex-1 text-left">
                <p className="text-sm font-bold" style={{ color: BELIS.text }}>{title}</p>
                <p className="text-[10px]" style={{ color: BELIS.text2 }}>{sub}</p>
            </div>
        </button>
    );
}
