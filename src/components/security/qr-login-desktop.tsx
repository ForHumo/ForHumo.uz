"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Loader2, Check, RefreshCw, Smartphone, ShieldCheck } from "lucide-react";

type Status = "IDLE" | "PENDING" | "APPROVED" | "CONSUMED" | "EXPIRED" | "ERROR";

export function QrLoginDesktop({ locale }: { locale: string }) {
    const [code, setCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<Status>("IDLE");
    const [countdown, setCountdown] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    async function start() {
        setStatus("IDLE"); setCode(null); setQrDataUrl(null);
        try {
            const r = await fetch("/api/auth/qr/start", { method: "POST" });
            const d = await r.json();
            if (!r.ok) { setStatus("ERROR"); return; }
            setCode(d.code);
            setExpiresAt(new Date(d.expiresAt));
            setStatus("PENDING");
            // QR sifatida to'liq URL
            const absoluteUrl = `${window.location.origin}/${locale}/qr/${d.code}`;
            const dataUrl = await QRCode.toDataURL(absoluteUrl, { width: 280, margin: 1 });
            setQrDataUrl(dataUrl);
        } catch {
            setStatus("ERROR");
        }
    }

    useEffect(() => { start(); return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

    // Polling status
    useEffect(() => {
        if (!code || status === "APPROVED" || status === "CONSUMED" || status === "EXPIRED" || status === "ERROR") return;
        pollRef.current = setInterval(async () => {
            try {
                const r = await fetch(`/api/auth/qr/${code}/status`);
                const d = await r.json();
                if (d.status === "APPROVED") {
                    setStatus("APPROVED");
                    // Darhol consume
                    const cr = await fetch(`/api/auth/qr/${code}/consume`, { method: "POST" });
                    if (cr.ok) {
                        setStatus("CONSUMED");
                        setTimeout(() => { window.location.href = `/${locale}/nexus`; }, 800);
                    } else {
                        setStatus("ERROR");
                    }
                } else if (d.status === "EXPIRED" || d.status === "NOT_FOUND") {
                    setStatus("EXPIRED");
                }
            } catch { /* keep polling */ }
        }, 2000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [code, status, locale]);

    // Countdown
    useEffect(() => {
        if (!expiresAt) return;
        const t = setInterval(() => {
            const remain = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
            setCountdown(remain);
        }, 500);
        return () => clearInterval(t);
    }, [expiresAt]);

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden flex items-center justify-center p-6" style={{ background: "#050818" }}>
            <div className="absolute pointer-events-none" style={{ top: "-15%", left: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse at center, rgba(43,62,232,0.20) 0%, transparent 70%)" }} />
            <div className="absolute pointer-events-none" style={{ bottom: "-15%", right: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse at center, rgba(0,206,200,0.16) 0%, transparent 70%)" }} />

            <div className="relative w-full max-w-md p-8 rounded-3xl text-center" style={{ background: "rgba(11,18,40,0.75)", border: "1px solid rgba(43,62,232,0.28)", backdropFilter: "blur(20px)" }}>
                <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 8px 32px rgba(43,62,232,0.45)" }}>
                    <QrCode className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-xl font-black text-white mb-2">QR kod bilan kirish</h1>
                <p className="text-xs text-white/70 mb-6">
                    Telefoningizda ForHumo ochib, kamera bilan bu QR ni skanerlang.
                </p>

                {/* QR — turli holatlar */}
                <div className="p-4 rounded-2xl bg-white flex items-center justify-center mb-4" style={{ minHeight: 280 }}>
                    {status === "IDLE" && <Loader2 className="w-8 h-8 animate-spin text-blue-600" />}
                    {status === "PENDING" && qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-64 h-64" />}
                    {status === "APPROVED" && <div className="flex flex-col items-center gap-3 text-blue-600 py-16"><Loader2 className="w-10 h-10 animate-spin" /><div className="text-sm font-bold">Kirilmoqda...</div></div>}
                    {status === "CONSUMED" && <div className="flex flex-col items-center gap-3 text-emerald-600 py-16"><Check className="w-10 h-10" /><div className="text-sm font-bold">Muvaffaqiyatli!</div></div>}
                    {status === "EXPIRED" && <div className="flex flex-col items-center gap-3 text-gray-500 py-16"><RefreshCw className="w-8 h-8" /><div className="text-sm font-bold">Muddati o'tdi</div></div>}
                    {status === "ERROR" && <div className="flex flex-col items-center gap-3 text-red-500 py-16"><div className="text-sm font-bold">Xato — qayta urinib ko'ring</div></div>}
                </div>

                {status === "PENDING" && countdown > 0 && (
                    <div className="text-xs text-white/60 mb-4">
                        Kod amal muddati: <strong className="text-white">{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}</strong>
                    </div>
                )}

                {(status === "EXPIRED" || status === "ERROR") && (
                    <button onClick={start} className="w-full h-11 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 20px rgba(43,62,232,0.4)" }}>
                        <RefreshCw className="w-4 h-4" /> Yangi QR
                    </button>
                )}

                <div className="mt-6 pt-6 border-t border-white/10 text-left space-y-2 text-xs text-white/70">
                    <div className="flex items-start gap-2"><Smartphone className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#00CEC8" }} /><span>ForHumo telefondagi hisobingizni oching</span></div>
                    <div className="flex items-start gap-2"><QrCode className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#00CEC8" }} /><span>Sozlamalar → QR bilan kirish → kamera</span></div>
                    <div className="flex items-start gap-2"><ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#00CEC8" }} /><span>Skanerlab, "Ruxsat" tugmasini bosing</span></div>
                </div>
            </div>
        </div>
    );
}
