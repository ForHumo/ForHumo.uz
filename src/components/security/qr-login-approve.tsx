"use client";

import { useState } from "react";
import { QrCode, ShieldCheck, X, Loader2, Check, Monitor, Clock } from "lucide-react";

interface Props { code: string; deviceHint: string | null; createdAt: string; locale: string }

function parseUa(ua: string | null): { browser: string; os: string } {
    if (!ua) return { browser: "Noma'lum brauzer", os: "Noma'lum OS" };
    const s = ua.toLowerCase();
    const browser = s.includes("edg/")     ? "Edge"
                  : s.includes("chrome/")  ? "Chrome"
                  : s.includes("firefox/") ? "Firefox"
                  : s.includes("safari/")  ? "Safari"
                  : "Brauzer";
    const os = s.includes("windows")   ? "Windows"
             : s.includes("mac os")    ? "macOS"
             : s.includes("linux")     ? "Linux"
             : s.includes("android")   ? "Android"
             : s.includes("iphone") || s.includes("ipad") ? "iOS"
             : "Noma'lum OS";
    return { browser, os };
}

export function QrLoginApprove({ code, deviceHint, createdAt }: Props) {
    const { browser, os } = parseUa(deviceHint);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<"approved" | "cancelled" | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function act(cancel: boolean) {
        if (busy) return;
        setBusy(true); setError(null);
        try {
            const r = await fetch(`/api/auth/qr/${code}/approve`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cancel }),
            });
            const d = await r.json();
            if (!r.ok) { setError(d?.error || "Xato"); setBusy(false); return; }
            setDone(cancel ? "cancelled" : "approved");
        } catch {
            setError("Tarmoq xatosi"); setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-6" style={{ background: "#050818" }}>
            <div className="absolute pointer-events-none" style={{ top: "-15%", left: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse at center, rgba(43,62,232,0.20) 0%, transparent 70%)" }} />
            <div className="absolute pointer-events-none" style={{ bottom: "-15%", right: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse at center, rgba(0,206,200,0.16) 0%, transparent 70%)" }} />

            <div className="relative w-full max-w-sm p-8 rounded-3xl text-center" style={{ background: "rgba(11,18,40,0.75)", border: "1px solid rgba(43,62,232,0.28)", backdropFilter: "blur(20px)" }}>
                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: done === "approved" ? "linear-gradient(135deg,#10B981,#00CEC8)" : done === "cancelled" ? "rgba(220,50,50,0.20)" : "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 8px 32px rgba(43,62,232,0.45)" }}>
                    {done === "approved"  ? <Check className="w-8 h-8 text-white" /> :
                     done === "cancelled" ? <X className="w-8 h-8 text-red-400" /> :
                     <QrCode className="w-8 h-8 text-white" />}
                </div>

                {done === "approved" && (
                    <>
                        <h1 className="text-lg font-black text-white mb-2">Tasdiqlandi</h1>
                        <p className="text-xs text-white/70">Desktop hozir kiradi. Bu sahifani yopishingiz mumkin.</p>
                    </>
                )}
                {done === "cancelled" && (
                    <>
                        <h1 className="text-lg font-black text-white mb-2">Bekor qilindi</h1>
                        <p className="text-xs text-white/70">QR ishlatilmadi.</p>
                    </>
                )}
                {!done && (
                    <>
                        <h1 className="text-lg font-black text-white mb-2">Kirishga ruxsat berasizmi?</h1>
                        <p className="text-xs text-white/70 mb-5">
                            Kimdir sizning hisobingiz bilan quyidagi qurilmaga kirishga urinmoqda:
                        </p>

                        <div className="p-4 rounded-2xl mb-5 text-left" style={{ background: "rgba(5,8,24,0.6)", border: "1px solid rgba(43,62,232,0.20)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                                    <Monitor className="w-5 h-5 text-white/70" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-white">{browser} · {os}</div>
                                    <div className="text-xs text-white/60 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(createdAt).toLocaleTimeString()}</div>
                                </div>
                            </div>
                        </div>

                        {error && <div className="mb-3 text-xs text-red-400">{error}</div>}

                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => act(true)} disabled={busy}
                                className="h-12 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50">
                                <X className="w-4 h-4" /> Rad etish
                            </button>
                            <button onClick={() => act(false)} disabled={busy}
                                className="h-12 rounded-xl text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.4)" }}>
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                Ruxsat
                            </button>
                        </div>
                        <div className="mt-5 text-xs text-white/50">
                            Agar bu siz emas, "Rad etish"ni bosing va parolingizni o'zgartiring.
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
