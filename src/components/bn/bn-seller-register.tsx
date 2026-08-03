"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { BnHeader } from "./bn-header";
import { Store, Loader2, Check, Clock, AlertTriangle, ArrowRight } from "lucide-react";

interface SellerInfo {
    id: string; status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
    shopName: string; rejectReason: string | null;
}

export function BnSellerRegister() {
    const router = useRouter();
    const [existing, setExisting] = useState<SellerInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Form fields
    const [yattNumber, setYattNumber] = useState("");
    const [fullName, setFullName] = useState("");
    const [passportSeries, setPassportSeries] = useState("");
    const [passportNumber, setPassportNumber] = useState("");
    const [phone, setPhone] = useState("+998");
    const [shopName, setShopName] = useState("");
    const [description, setDescription] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("Toshkent");
    const [bankName, setBankName] = useState("");
    const [bankAccount, setBankAccount] = useState("");
    const [bankMFO, setBankMFO] = useState("");

    useEffect(() => {
        fetch("/api/bn/sellers")
            .then(r => r.json())
            .then(d => setExisting(d.seller))
            .finally(() => setLoading(false));
    }, []);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        setErr(null); setBusy(true);
        try {
            const res = await fetch("/api/bn/sellers", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    yattNumber, fullName, passportSeries, passportNumber, phone, shopName,
                    description, address, city, bankName, bankAccount, bankMFO,
                }),
            });
            const d = await res.json();
            if (!res.ok) { setErr(d.error || "Xato"); return; }
            setExisting(d.seller);
        } finally { setBusy(false); }
    }

    return (
        <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#fafafa" }}>
            <BnHeader />

            <div className="max-w-2xl mx-auto px-4 py-6 pb-16">
                {loading ? (
                    <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EAB308" }} /></div>
                ) : existing ? (
                    /* Ariza allaqachon yuborilgan */
                    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={
                                    existing.status === "APPROVED" ? { background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)" } :
                                    existing.status === "REJECTED" ? { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)" } :
                                    { background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.35)" }
                                }>
                                {existing.status === "APPROVED" ? <Check className="w-8 h-8" style={{ color: "#10B981" }} /> :
                                 existing.status === "REJECTED" ? <AlertTriangle className="w-8 h-8" style={{ color: "#EF4444" }} /> :
                                 <Clock className="w-8 h-8" style={{ color: "#EAB308" }} />}
                            </div>
                            <p className="text-lg font-black mb-1">
                                {existing.status === "APPROVED" ? "Sotuvchi sifatida tasdiqlangansiz" :
                                 existing.status === "REJECTED" ? "Ariza rad etilgan" :
                                 existing.status === "SUSPENDED" ? "Hisobingiz vaqtincha to'xtatilgan" :
                                 "Ariza ko'rib chiqilmoqda"}
                            </p>
                            <p className="text-sm mb-4" style={{ color: "rgba(200,200,200,0.75)" }}>
                                Do&apos;kon: <span className="font-bold text-white">{existing.shopName}</span>
                            </p>
                            {existing.status === "REJECTED" && existing.rejectReason && (
                                <p className="text-xs px-4 py-2 rounded-lg inline-block" style={{ background: "rgba(239,68,68,0.10)", color: "#ff8a96" }}>
                                    Sabab: {existing.rejectReason}
                                </p>
                            )}
                            {existing.status === "APPROVED" && (
                                <button onClick={() => router.push("/bn/seller/dashboard")}
                                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-black"
                                    style={{ background: "#EAB308" }}>
                                    Sotuvchi paneliga o&apos;tish <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                            {existing.status === "PENDING" && (
                                <p className="text-xs" style={{ color: "rgba(200,200,200,0.65)" }}>
                                    Administrator arizangizni ko&apos;rib chiqmoqda. Tez orada javob keladi.
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 text-center">
                            <div className="w-14 h-14 rounded-2xl inline-flex items-center justify-center mb-3"
                                style={{ background: "#0a0a0a", border: "2px solid #EAB308" }}>
                                <Store className="w-6 h-6" style={{ color: "#EAB308" }} />
                            </div>
                            <h1 className="text-2xl font-black mb-2">Sotuvchi bo&apos;lish</h1>
                            <p className="text-sm max-w-md mx-auto" style={{ color: "rgba(200,200,200,0.75)" }}>
                                Sergeli mashina bozori onlayn. YaTT bilan ro&apos;yxatdan o&apos;ting, mahsulotlaringizni qo&apos;shing.
                                Sotgan zahoti pul o&apos;z bank hisobingizga tushadi.
                            </p>
                        </div>

                        <form onSubmit={submit} className="space-y-5">
                            {/* Shaxsiy ma'lumot */}
                            <fieldset className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
                                <legend className="px-2 text-[10px] font-black uppercase tracking-widest" style={{ color: "#EAB308" }}>Shaxsiy</legend>
                                <div className="space-y-3">
                                    <Field label="YaTT raqami (9-11 raqam) *" value={yattNumber} onChange={setYattNumber} placeholder="123456789" />
                                    <Field label="F.I.SH. (rasmiy) *" value={fullName} onChange={setFullName} placeholder="Karimov Alisher Sohibovich" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Passport seriya" value={passportSeries} onChange={setPassportSeries} placeholder="AA" />
                                        <Field label="Passport raqam" value={passportNumber} onChange={setPassportNumber} placeholder="1234567" />
                                    </div>
                                    <Field label="Telefon *" value={phone} onChange={setPhone} placeholder="+998901234567" />
                                </div>
                            </fieldset>

                            {/* Do'kon */}
                            <fieldset className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
                                <legend className="px-2 text-[10px] font-black uppercase tracking-widest" style={{ color: "#EAB308" }}>Do&apos;kon</legend>
                                <div className="space-y-3">
                                    <Field label="Do'kon nomi *" value={shopName} onChange={setShopName} placeholder="Sergeli Auto Parts" />
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(200,200,200,0.75)" }}>Tavsif</label>
                                        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 1000))}
                                            rows={2} placeholder="Nima sotamiz? Qaysi mashinalarga? ..."
                                            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }} />
                                    </div>
                                    <Field label="Manzil (do'kon)" value={address} onChange={setAddress} placeholder="Sergeli mashina bozor, Qator 12, Do'kon 45" />
                                    <Field label="Shahar" value={city} onChange={setCity} placeholder="Toshkent" />
                                </div>
                            </fieldset>

                            {/* Bank */}
                            <fieldset className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
                                <legend className="px-2 text-[10px] font-black uppercase tracking-widest" style={{ color: "#EAB308" }}>
                                    Bank (payout uchun — keyin ham to&apos;ldirsangiz bo&apos;ladi)
                                </legend>
                                <div className="space-y-3">
                                    <Field label="Bank nomi" value={bankName} onChange={setBankName} placeholder="Xalq banki" />
                                    <Field label="Hisob raqami (20 raqam)" value={bankAccount} onChange={setBankAccount} placeholder="20208000000000000001" />
                                    <Field label="MFO (5 raqam)" value={bankMFO} onChange={setBankMFO} placeholder="00842" />
                                </div>
                            </fieldset>

                            {err && (
                                <p className="text-sm px-4 py-3 rounded-lg" style={{ background: "rgba(239,68,68,0.10)", color: "#ff8a96", border: "1px solid rgba(239,68,68,0.25)" }}>{err}</p>
                            )}

                            <button type="submit" disabled={busy}
                                className="w-full py-3.5 rounded-xl text-sm font-black text-black disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ background: "#EAB308" }}>
                                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                                Ariza yuborish
                            </button>

                            <p className="text-[11px] text-center" style={{ color: "rgba(200,200,200,0.55)" }}>
                                Ariza yuborilgach admin ko&apos;rib chiqadi. Tasdiqlangach mahsulot qo&apos;shishingiz mumkin.
                            </p>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(200,200,200,0.75)" }}>{label}</label>
            <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full h-10 rounded-lg px-3 text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }} />
        </div>
    );
}
