"use client";

import { useState } from "react";
import { X, Loader2, Check } from "lucide-react";
import { useTranslations } from "next-intl";

const BLUE = "#2563EB", CYAN = "#22D3EE";
const TRUCK_TYPES = ["tent", "ref", "open_top", "fura", "isuzu"];
const CURRENCIES = ["UZS", "USD", "RUB"];

const inputCls = "w-full h-11 rounded-xl px-3.5 text-sm outline-none";
const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,99,235,0.28)", color: "#E8EDF7", caretColor: CYAN } as const;

export function YukGoPostModal({
    open, onClose, onPosted, onNeedLogin, defaultPhone = "",
}: {
    open: boolean;
    onClose: () => void;
    onPosted: () => void;
    onNeedLogin: () => void;
    defaultPhone?: string;
}) {
    const t = useTranslations("yukgo");
    const [type, setType] = useState<"CARGO" | "TRUCK">("CARGO");
    const [fromCity, setFromCity] = useState("");
    const [toCity, setToCity] = useState("");
    const [cargo, setCargo] = useState("");
    const [weight, setWeight] = useState("");
    const [truckTypes, setTruckTypes] = useState<string[]>([]);
    const [price, setPrice] = useState("");
    const [currency, setCurrency] = useState("UZS");
    const [negotiable, setNegotiable] = useState(false);
    const [phone, setPhone] = useState(defaultPhone);
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    if (!open) return null;

    const toggleTruck = (tt: string) =>
        setTruckTypes(s => s.includes(tt) ? s.filter(x => x !== tt) : [...s, tt]);

    const canSubmit = (fromCity.trim() || toCity.trim()) && phone.replace(/\D/g, "").length >= 7 && consent && !busy;

    async function submit() {
        if (!canSubmit) return;
        setBusy(true); setErr(null);
        try {
            const r = await fetch("/api/yukgo/listings/native", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type, fromCity, toCity, cargo,
                    weightTons: weight ? Number(weight) : null,
                    truckTypes,
                    priceAmount: price ? Number(price) : null,
                    priceCurrency: currency, priceNegotiable: negotiable,
                    phone,
                }),
            });
            if (r.status === 401) { onNeedLogin(); return; }
            const d = await r.json().catch(() => ({}));
            if (!r.ok) {
                setErr(d.error === "daily_limit" ? t("postLimit") : d.error === "route_required" ? t("postRouteErr") : d.error === "phone_required" ? t("postPhoneErr") : t("postErr"));
                return;
            }
            onPosted();
        } catch { setErr(t("postErr")); }
        finally { setBusy(false); }
    }

    return (
        <>
            <div className="fixed inset-0 z-[110]" style={{ background: "rgba(5,8,20,0.82)", backdropFilter: "blur(6px)" }} onClick={onClose} />
            <div className="fixed inset-x-3 bottom-3 top-14 z-[110] rounded-2xl p-5 overflow-y-auto md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] md:max-h-[88vh]"
                style={{ background: "#0E1528", border: "1px solid rgba(37,99,235,0.35)" }}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-white">{t("postTitle")}</h3>
                    <button onClick={onClose}><X className="w-5 h-5" style={{ color: "#6B7A99" }} /></button>
                </div>

                {/* Tur */}
                <div className="flex gap-2 mb-3">
                    {(["CARGO", "TRUCK"] as const).map(v => (
                        <button key={v} onClick={() => setType(v)}
                            className="flex-1 h-10 rounded-xl text-sm font-black transition active:scale-95"
                            style={type === v
                                ? { background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: "#fff" }
                                : { background: "rgba(37,99,235,0.10)", border: "1px solid rgba(37,99,235,0.25)", color: "#9FB3D9" }}>
                            {v === "CARGO" ? t("tabCargo") : t("tabTrucks")}
                        </button>
                    ))}
                </div>

                {/* Yo'nalish */}
                <div className="flex gap-2 mb-3">
                    <input value={fromCity} onChange={e => setFromCity(e.target.value)} placeholder={t("fromPh")} className={inputCls} style={inputStyle} />
                    <input value={toCity} onChange={e => setToCity(e.target.value)} placeholder={t("toPh")} className={inputCls} style={inputStyle} />
                </div>

                {/* Yuk nomi (faqat CARGO) */}
                {type === "CARGO" && (
                    <input value={cargo} onChange={e => setCargo(e.target.value)} placeholder={t("cargoPh")} className={`${inputCls} mb-3`} style={inputStyle} />
                )}

                {/* Vazn */}
                <input value={weight} onChange={e => setWeight(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder={t("weightPh")} className={`${inputCls} mb-3`} style={inputStyle} />

                {/* Mashina turi */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {TRUCK_TYPES.map(tt => (
                        <button key={tt} onClick={() => toggleTruck(tt)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95"
                            style={truckTypes.includes(tt)
                                ? { background: "rgba(34,211,238,0.18)", border: "1px solid rgba(34,211,238,0.5)", color: "#E8EDF7" }
                                : { background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", color: "#9FB3D9" }}>
                            {t(`truck_${tt}`)}
                        </button>
                    ))}
                </div>

                {/* Narx */}
                <div className="flex gap-2 mb-2">
                    <input value={price} onChange={e => setPrice(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder={t("pricePh")} className={inputCls} style={inputStyle} />
                    <div className="flex gap-1 flex-shrink-0">
                        {CURRENCIES.map(c => (
                            <button key={c} onClick={() => setCurrency(c)}
                                className="w-12 h-11 rounded-xl text-xs font-black transition active:scale-95"
                                style={currency === c
                                    ? { background: `linear-gradient(135deg,${BLUE},${CYAN})`, color: "#fff" }
                                    : { background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", color: "#9FB3D9" }}>
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={() => setNegotiable(v => !v)} className="flex items-center gap-2 mb-3 text-xs" style={{ color: negotiable ? CYAN : "#6B7A99" }}>
                    <span className="w-4 h-4 rounded flex items-center justify-center" style={{ border: `1px solid ${negotiable ? CYAN : "#4B5B7A"}`, background: negotiable ? "rgba(34,211,238,0.15)" : "transparent" }}>
                        {negotiable && <Check className="w-3 h-3" style={{ color: CYAN }} />}
                    </span>
                    {t("negotiable")}
                </button>

                {/* Telefon */}
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel" placeholder={t("phonePh")} className={`${inputCls} mb-3`} style={inputStyle} />

                {/* Rozilik */}
                <button onClick={() => setConsent(v => !v)} className="flex items-start gap-2 mb-4 text-left text-[11px]" style={{ color: "#9FB3D9" }}>
                    <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ border: `1px solid ${consent ? CYAN : "#4B5B7A"}`, background: consent ? "rgba(34,211,238,0.15)" : "transparent" }}>
                        {consent && <Check className="w-3 h-3" style={{ color: CYAN }} />}
                    </span>
                    {t("postConsent")}
                </button>

                {err && <p className="text-[11px] text-red-400 mb-2 text-center">{err}</p>}

                <button onClick={submit} disabled={!canSubmit}
                    className="w-full h-12 rounded-xl text-sm font-black text-white disabled:opacity-50" style={{ background: `linear-gradient(135deg,${BLUE},${CYAN})` }}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t("postSubmit")}
                </button>
                <p className="text-[10px] mt-3 text-center" style={{ color: "#4B5B7A" }}>{t("postHint2")}</p>
            </div>
        </>
    );
}
