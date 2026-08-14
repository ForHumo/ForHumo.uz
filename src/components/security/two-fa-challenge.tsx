"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, KeyRound, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export function TwoFaChallenge({ accountName, nextUrl }: { accountName: string; nextUrl: string }) {
    const [code, setCode] = useState("");
    const [useBackup, setUseBackup] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, [useBackup]);

    async function submit(e?: React.FormEvent) {
        e?.preventDefault();
        if (loading) return;
        setError(null);
        setLoading(true);
        try {
            const res = await fetch("/api/user/2fa/challenge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data?.error || "Kod noto'g'ri");
                setLoading(false);
                return;
            }
            // Muvaffaqiyat — asl manzilga
            window.location.href = nextUrl;
        } catch {
            setError("Tarmoq xatosi. Qayta urinib ko'ring.");
            setLoading(false);
        }
    }

    // TOTP: faqat 6 raqam. Backup: harf+raqam+tire.
    function onInput(v: string) {
        setError(null);
        if (useBackup) {
            setCode(v.toUpperCase().slice(0, 20));
        } else {
            const digits = v.replace(/\D/g, "").slice(0, 6);
            setCode(digits);
            if (digits.length === 6) {
                // Avto-yuborish
                setTimeout(() => submit(), 100);
            }
        }
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-6" style={{ background: "#050818" }}>
            <div className="absolute pointer-events-none" style={{ top: "-15%", left: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse at center, rgba(43,62,232,0.20) 0%, transparent 70%)" }} />
            <div className="absolute pointer-events-none" style={{ bottom: "-15%", right: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse at center, rgba(0,206,200,0.16) 0%, transparent 70%)" }} />

            <form onSubmit={submit} className="relative w-full max-w-md p-8 rounded-3xl" style={{ background: "rgba(11,18,40,0.75)", border: "1px solid rgba(43,62,232,0.28)", backdropFilter: "blur(20px)" }}>
                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 8px 32px rgba(43,62,232,0.45)" }}>
                    <ShieldCheck className="w-8 h-8 text-white" />
                </div>

                <h1 className="text-xl font-black text-white text-center mb-1">Ikkinchi bosqich</h1>
                <p className="text-sm text-center mb-1" style={{ color: "rgba(150,170,220,0.85)" }}>
                    <span className="font-bold text-white">{accountName}</span>
                </p>
                <p className="text-xs text-center mb-6" style={{ color: "rgba(120,140,190,0.75)" }}>
                    {useBackup
                        ? "Zaxira kodlaringizdan birini kiriting."
                        : "Authenticator ilovangizdan 6 raqamli kodni kiriting."}
                </p>

                <input
                    ref={inputRef}
                    type="text"
                    inputMode={useBackup ? "text" : "numeric"}
                    autoComplete="one-time-code"
                    value={code}
                    onChange={e => onInput(e.target.value)}
                    placeholder={useBackup ? "AAAA-BBBB-CCCC" : "000000"}
                    className="w-full h-14 text-center rounded-xl text-white text-2xl font-mono tracking-widest outline-none"
                    style={{ background: "rgba(5,8,24,0.6)", border: "1px solid rgba(43,62,232,0.35)", letterSpacing: useBackup ? "0.15em" : "0.35em" }}
                />

                {error && (
                    <div className="mt-3 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold" style={{ background: "rgba(220,50,50,0.12)", color: "#ff9090", border: "1px solid rgba(220,50,50,0.25)" }}>
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || (useBackup ? code.length < 8 : code.length !== 6)}
                    className="mt-4 w-full h-12 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.4)" }}
                >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Tekshirilmoqda</> : <>Davom etish <ArrowRight className="w-4 h-4" /></>}
                </button>

                <button
                    type="button"
                    onClick={() => { setUseBackup(v => !v); setCode(""); setError(null); }}
                    className="mt-4 w-full text-xs font-bold flex items-center justify-center gap-1 transition-colors hover:text-white"
                    style={{ color: "rgba(120,140,190,0.85)" }}
                >
                    <KeyRound className="w-3.5 h-3.5" />
                    {useBackup ? "Authenticator kodini ishlatish" : "Zaxira kodni ishlatish"}
                </button>
            </form>
        </div>
    );
}
