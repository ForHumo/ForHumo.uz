"use client";

// Chat lock modal — 3 rejim:
//   mode="setup"  → yangi lock yaratish (PIN yoki biometric tanlash)
//   mode="unlock" → mavjud lock'ni ochish
//   mode="remove" → lock'ni olib tashlash (avval unlock so'raladi)
//
// Client-side lock; server bilmaydi.

import { useEffect, useRef, useState } from "react";
import { X, Lock, Unlock, Fingerprint, Delete, Loader2, AlertCircle } from "lucide-react";
import {
    getLock, setPinLock, verifyPin, biometricAvailable,
    setBiometricLock, verifyBiometric, removeLock,
} from "@/lib/chat-lock";

type Mode = "setup" | "unlock" | "remove";

export function NxChatLockModal({
    convId, mode, onClose, onDone,
}: {
    convId: string;
    mode: Mode;
    onClose: () => void;
    onDone: (result: "locked" | "unlocked" | "removed") => void;
}) {
    const existing = getLock(convId);
    // Setup — foydalanuvchi tanlaydi. Unlock/remove — mavjud kind bo'yicha.
    const [kind, setKind] = useState<"pin" | "biometric">(
        mode === "setup" ? "pin" : (existing?.type ?? "pin")
    );
    const [pin, setPin] = useState("");
    const [pinConfirm, setPinConfirm] = useState("");
    const [step, setStep] = useState<1 | 2>(1);      // setup PIN uchun: 1=kiritish, 2=takrorlash
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const canBio = biometricAvailable();

    useEffect(() => { inputRef.current?.focus(); }, [mode, step, kind]);

    async function setupPin() {
        setError(null);
        if (step === 1) {
            if (!/^\d{4,6}$/.test(pin)) { setError("4-6 raqamli PIN kiriting"); return; }
            setStep(2); setPin(""); return;
        }
        // Actually let me reset — different flow needed
    }

    async function submit() {
        setError(null); setBusy(true);
        try {
            if (mode === "setup") {
                if (kind === "biometric") {
                    await setBiometricLock(convId);
                    onDone("locked");
                    return;
                }
                // PIN — 2 qadamli
                if (step === 1) {
                    if (!/^\d{4,6}$/.test(pin)) { setError("4-6 raqamli PIN kiriting"); return; }
                    setPinConfirm(pin);
                    setPin("");
                    setStep(2);
                    return;
                }
                // Step 2 — tasdiqlash
                if (pin !== pinConfirm) { setError("PIN'lar mos kelmadi"); setPin(""); setStep(1); return; }
                await setPinLock(convId, pin);
                onDone("locked");
                return;
            }
            if (mode === "unlock" || mode === "remove") {
                let ok = false;
                if (kind === "biometric") ok = await verifyBiometric(convId);
                else ok = await verifyPin(convId, pin);
                if (!ok) { setError("Noto'g'ri"); setPin(""); return; }
                if (mode === "remove") { removeLock(convId); onDone("removed"); return; }
                onDone("unlocked");
                return;
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Xatolik";
            setError(msg);
        } finally { setBusy(false); }
    }

    const title = mode === "setup"
        ? (step === 2 ? "PIN'ni tasdiqlang" : "Chatni qulflash")
        : mode === "unlock" ? "Chatni ochish" : "Qulfni olib tashlash";
    const subtitle = mode === "setup"
        ? (kind === "biometric" ? "Barmoq izi / yuz orqali qulflash" : "4-6 raqamli PIN o'ylab toping")
        : (kind === "biometric" ? "Barmoq izi / yuzni tekshiring" : "PIN'ni kiriting");

    function addDigit(d: string) {
        setError(null);
        if (pin.length >= 6) return;
        const next = pin + d;
        setPin(next);
        // Auto-submit unlock rejimida
        if ((mode === "unlock" || mode === "remove") && next.length === (existing?.hash?.length ?? 0 > 0 ? 4 : 4)) {
            // Aslida hash uzunligi = 64 (SHA-256 hex). To'g'ri auto-submit: 4-6 raqamda foydalanuvchi bosgach yoki Enter.
            // Auto-submit oldini olamiz — foydalanuvchi Tasdiqlash tugmasini bossin.
        }
    }
    function backDigit() { setError(null); setPin(p => p.slice(0, -1)); }

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            style={{ background: "rgba(3,7,25,0.85)", backdropFilter: "blur(8px)" }}
            onClick={() => !busy && onClose()}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl overflow-hidden"
                style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                    <div className="flex items-center gap-2">
                        {mode === "unlock" ? <Unlock className="w-4 h-4" style={{ color: "#00CEC8" }} />
                            : <Lock className="w-4 h-4" style={{ color: "#00CEC8" }} />}
                        <p className="text-sm font-black text-white">{title}</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                        <X className="w-4 h-4 text-white/70" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-xs text-center" style={{ color: "rgba(140,160,210,0.85)" }}>{subtitle}</p>

                    {/* Setup rejimida rejim tanlash (bir marta) */}
                    {mode === "setup" && step === 1 && (
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setKind("pin")}
                                className="py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                                style={{
                                    background: kind === "pin" ? "rgba(0,206,200,0.15)" : "rgba(43,62,232,0.08)",
                                    border: `1px solid ${kind === "pin" ? "rgba(0,206,200,0.50)" : "rgba(43,62,232,0.20)"}`,
                                    color: kind === "pin" ? "#00CEC8" : "rgba(220,230,255,0.85)",
                                }}>
                                <Lock className="w-3.5 h-3.5" /> PIN
                            </button>
                            <button onClick={() => setKind("biometric")}
                                disabled={!canBio}
                                className="py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-40"
                                style={{
                                    background: kind === "biometric" ? "rgba(0,206,200,0.15)" : "rgba(43,62,232,0.08)",
                                    border: `1px solid ${kind === "biometric" ? "rgba(0,206,200,0.50)" : "rgba(43,62,232,0.20)"}`,
                                    color: kind === "biometric" ? "#00CEC8" : "rgba(220,230,255,0.85)",
                                }}>
                                <Fingerprint className="w-3.5 h-3.5" /> Biometrik
                            </button>
                        </div>
                    )}

                    {/* PIN keypad */}
                    {kind === "pin" && (
                        <>
                            <div className="flex justify-center gap-2 py-2">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="w-3 h-3 rounded-full transition-colors"
                                        style={{
                                            background: i < pin.length ? "#00CEC8" : "rgba(43,62,232,0.30)",
                                            boxShadow: i < pin.length ? "0 0 8px rgba(0,206,200,0.6)" : "none",
                                        }} />
                                ))}
                            </div>
                            {/* Yashirin input klaviatura ko'rsatilishi uchun */}
                            <input
                                ref={inputRef}
                                type="tel"
                                inputMode="numeric"
                                autoComplete="off"
                                value={pin}
                                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                className="w-full h-0 opacity-0 -mt-2 pointer-events-none"
                                aria-label="PIN"
                            />
                            {/* Keypad — 3x4 */}
                            <div className="grid grid-cols-3 gap-2">
                                {["1","2","3","4","5","6","7","8","9"].map(d => (
                                    <button key={d} type="button" onClick={() => addDigit(d)}
                                        className="h-12 rounded-xl text-lg font-black text-white transition active:scale-95"
                                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)" }}>
                                        {d}
                                    </button>
                                ))}
                                <div /> {/* bo'sh joy */}
                                <button type="button" onClick={() => addDigit("0")}
                                    className="h-12 rounded-xl text-lg font-black text-white transition active:scale-95"
                                    style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)" }}>0</button>
                                <button type="button" onClick={backDigit}
                                    className="h-12 rounded-xl flex items-center justify-center transition active:scale-95"
                                    style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}>
                                    <Delete className="w-5 h-5" style={{ color: "#EF4444" }} />
                                </button>
                            </div>
                        </>
                    )}

                    {kind === "biometric" && (
                        <div className="flex flex-col items-center py-6 gap-2">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center"
                                style={{ background: "rgba(0,206,200,0.10)", border: "1px solid rgba(0,206,200,0.30)" }}>
                                <Fingerprint className="w-8 h-8" style={{ color: "#00CEC8" }} />
                            </div>
                            <p className="text-[11px] text-center" style={{ color: "rgba(140,160,210,0.75)" }}>
                                Qurilma biometric prompt'i ochiladi
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-1.5 justify-center text-xs" style={{ color: "#EF4444" }}>
                            <AlertCircle className="w-3.5 h-3.5" /> {error}
                        </div>
                    )}

                    <button onClick={submit} disabled={busy || (kind === "pin" && pin.length < 4)}
                        className="w-full py-3 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        {mode === "setup" && step === 1 && "Keyingi"}
                        {mode === "setup" && step === 2 && "Qulflash"}
                        {mode === "setup" && kind === "biometric" && "Biometricni yoqish"}
                        {mode === "unlock" && "Ochish"}
                        {mode === "remove" && "Qulfni olib tashlash"}
                    </button>
                </div>
            </div>
        </div>
    );
}
