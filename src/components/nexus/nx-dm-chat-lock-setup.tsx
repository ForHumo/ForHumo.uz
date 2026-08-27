"use client";

// Chat Lock PIN sozlash modali — 4-8 raqamli PIN. Birinchi marta / almashtirish / o'chirish.

import { useEffect, useState } from "react";
import { X, Lock, Loader2, Check, Trash2, KeyRound } from "lucide-react";

type Status = { hasLock: boolean; hintText: string | null };

export function NxDmChatLockSetup({
    open, onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [status, setStatus] = useState<Status | null>(null);
    const [mode, setMode] = useState<"idle" | "create" | "change" | "delete">("idle");
    const [pin, setPin] = useState("");
    const [pin2, setPin2] = useState("");
    const [oldPin, setOldPin] = useState("");
    const [hint, setHint] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setMode("idle"); setPin(""); setPin2(""); setOldPin(""); setError(null);
        fetch("/api/nexus/chat-lock")
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) { setStatus(d); setHint(d.hintText ?? ""); } });
    }, [open]);

    async function create() {
        setError(null);
        if (!/^\d{4,8}$/.test(pin)) { setError("4-8 raqam"); return; }
        if (pin !== pin2) { setError("PIN takrori mos kelmayapti"); return; }
        setBusy(true);
        try {
            const r = await fetch("/api/nexus/chat-lock", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin, hint: hint.trim() || undefined }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok) { setStatus({ hasLock: true, hintText: hint || null }); setMode("idle"); setPin(""); setPin2(""); }
            else setError(d?.error ?? "Xato");
        } finally { setBusy(false); }
    }

    async function change() {
        setError(null);
        if (!/^\d{4,8}$/.test(pin)) { setError("Yangi PIN 4-8 raqam"); return; }
        if (pin !== pin2) { setError("PIN takrori mos kelmayapti"); return; }
        setBusy(true);
        try {
            const r = await fetch("/api/nexus/chat-lock", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ oldPin, newPin: pin }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok) { setMode("idle"); setPin(""); setPin2(""); setOldPin(""); }
            else setError(d?.error ?? "Xato");
        } finally { setBusy(false); }
    }

    async function del() {
        setError(null);
        setBusy(true);
        try {
            const r = await fetch("/api/nexus/chat-lock", {
                method: "DELETE", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin: oldPin }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok) { setStatus({ hasLock: false, hintText: null }); setMode("idle"); setOldPin(""); }
            else setError(d?.error ?? "Xato");
        } finally { setBusy(false); }
    }

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[330] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-0 md:mx-auto md:max-w-md z-[331] rounded-3xl overflow-hidden"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Lock className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        Yopiq chatlar (PIN)
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {mode === "idle" && (
                        <>
                            {!status?.hasLock ? (
                                <>
                                    <p className="text-sm" style={{ color: "rgba(200,214,247,0.9)" }}>
                                        PIN sozlanmagan. PIN sozlab, ba&apos;zi chatlarni yashirin bo&apos;limga o&apos;tkazishingiz mumkin.
                                    </p>
                                    <button onClick={() => setMode("create")}
                                        className="w-full h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2"
                                        style={{ background: "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                                        <KeyRound className="w-4 h-4" />
                                        PIN sozlash
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 rounded-2xl flex items-center gap-3"
                                        style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.30)" }}>
                                        <Lock className="w-5 h-5" style={{ color: "#00CEC8" }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-white">PIN yoqilgan</p>
                                            {status.hintText && (
                                                <p className="text-[11px] mt-0.5" style={{ color: "rgba(160,176,224,0.85)" }}>
                                                    Eslatma: {status.hintText}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => setMode("change")}
                                        className="w-full h-11 rounded-xl font-bold text-sm"
                                        style={{ background: "rgba(43,62,232,0.20)", color: "white" }}>
                                        PIN o&apos;zgartirish
                                    </button>
                                    <button onClick={() => setMode("delete")}
                                        className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                                        style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#EF4444" }}>
                                        <Trash2 className="w-4 h-4" />
                                        PIN'ni butunlay olib tashlash
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {mode === "create" && (
                        <>
                            <PinField label="Yangi PIN (4-8 raqam)" value={pin} onChange={setPin} />
                            <PinField label="PIN'ni takrorlang" value={pin2} onChange={setPin2} />
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-1 block"
                                    style={{ color: "rgba(160,176,224,0.7)" }}>
                                    Eslatma (ixtiyoriy)
                                </label>
                                <input value={hint} onChange={e => setHint(e.target.value.slice(0, 80))}
                                    placeholder="Tug'ilgan yil / oxirgi 4 raqam..."
                                    className="w-full h-10 rounded-lg px-3 text-sm focus:outline-none"
                                    style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white" }} />
                            </div>
                            {error && <ErrorBox error={error} />}
                            <div className="flex gap-2">
                                <button onClick={() => { setMode("idle"); setError(null); }}
                                    className="flex-1 h-11 rounded-xl font-bold text-sm"
                                    style={{ background: "rgba(43,62,232,0.20)", color: "white" }}>
                                    Bekor
                                </button>
                                <button onClick={create} disabled={busy}
                                    className="flex-1 h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2"
                                    style={{ background: "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Saqlash
                                </button>
                            </div>
                        </>
                    )}

                    {mode === "change" && (
                        <>
                            <PinField label="Eski PIN" value={oldPin} onChange={setOldPin} />
                            <PinField label="Yangi PIN" value={pin} onChange={setPin} />
                            <PinField label="Yangi PIN takrori" value={pin2} onChange={setPin2} />
                            {error && <ErrorBox error={error} />}
                            <div className="flex gap-2">
                                <button onClick={() => { setMode("idle"); setError(null); }}
                                    className="flex-1 h-11 rounded-xl font-bold text-sm"
                                    style={{ background: "rgba(43,62,232,0.20)", color: "white" }}>
                                    Bekor
                                </button>
                                <button onClick={change} disabled={busy}
                                    className="flex-1 h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2"
                                    style={{ background: "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    O&apos;zgartirish
                                </button>
                            </div>
                        </>
                    )}

                    {mode === "delete" && (
                        <>
                            <p className="text-sm" style={{ color: "rgba(220,180,180,0.95)" }}>
                                PIN o&apos;chirilsa, barcha yashirin chatlar ochiqqa qaytadi.
                            </p>
                            <PinField label="Amaldagi PIN" value={oldPin} onChange={setOldPin} />
                            {error && <ErrorBox error={error} />}
                            <div className="flex gap-2">
                                <button onClick={() => { setMode("idle"); setError(null); }}
                                    className="flex-1 h-11 rounded-xl font-bold text-sm"
                                    style={{ background: "rgba(43,62,232,0.20)", color: "white" }}>
                                    Bekor
                                </button>
                                <button onClick={del} disabled={busy}
                                    className="flex-1 h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2"
                                    style={{ background: "#EF4444", color: "white" }}>
                                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Olib tashlash
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

function PinField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-1 block"
                style={{ color: "rgba(160,176,224,0.7)" }}>
                {label}
            </label>
            <input type="password" inputMode="numeric" pattern="[0-9]*"
                value={value}
                onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="••••"
                className="w-full h-11 rounded-xl px-3 text-lg text-center tracking-widest focus:outline-none"
                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white", letterSpacing: "0.4em" }} />
        </div>
    );
}

function ErrorBox({ error }: { error: string }) {
    return (
        <div className="p-2.5 rounded-lg text-[11px]"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#EF4444" }}>
            {error}
        </div>
    );
}
