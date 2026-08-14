"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Shield, ShieldCheck, ShieldOff, KeyRound, Copy, Check, Loader2, AlertCircle, Download, RefreshCw } from "lucide-react";
import QRCode from "qrcode";

type Mode = "idle" | "setup" | "verify" | "backup" | "disable";

interface Props {
    enabled: boolean;
    enabledAt: string | null;
    accountName: string;
}

export function TwoFaPanel({ enabled: enabledInitial, enabledAt: enabledAtInitial, accountName }: Props) {
    const [enabled, setEnabled] = useState(enabledInitial);
    const [enabledAt, setEnabledAt] = useState<string | null>(enabledAtInitial);
    const [mode, setMode] = useState<Mode>("idle");
    const [secret, setSecret] = useState<string | null>(null);
    const [otpauth, setOtpauth] = useState<string | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (otpauth) QRCode.toDataURL(otpauth, { width: 240, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    }, [otpauth]);

    useEffect(() => { if (mode === "verify" || mode === "disable") inputRef.current?.focus(); }, [mode]);

    async function startSetup() {
        setLoading(true); setError(null);
        try {
            const res = await fetch("/api/user/2fa/setup", { method: "POST" });
            const data = await res.json();
            if (!res.ok) { setError(data?.error || "Xatolik"); setLoading(false); return; }
            setSecret(data.secret);
            setOtpauth(data.otpauth);
            setMode("verify");
            setCode("");
        } finally { setLoading(false); }
    }

    async function verifyAndEnable() {
        if (loading) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch("/api/user/2fa/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data?.error || "Kod noto'g'ri"); setLoading(false); return; }
            setBackupCodes(data.backupCodes);
            setEnabled(true);
            setEnabledAt(new Date().toISOString());
            setSecret(null); setOtpauth(null); setQrDataUrl(null);
            setMode("backup");
        } finally { setLoading(false); }
    }

    async function disable2fa() {
        if (loading) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch("/api/user/2fa/disable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data?.error || "Kod noto'g'ri"); setLoading(false); return; }
            setEnabled(false);
            setEnabledAt(null);
            setMode("idle");
            setCode("");
        } finally { setLoading(false); }
    }

    async function regenerateBackup() {
        if (loading) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch("/api/user/2fa/backup-codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data?.error || "Kod noto'g'ri"); setLoading(false); return; }
            setBackupCodes(data.backupCodes);
            setMode("backup");
            setCode("");
        } finally { setLoading(false); }
    }

    function copyBackupCodes() {
        if (!backupCodes) return;
        const text = `ForHumo.uz — 2FA zaxira kodlari\nAkkaunt: ${accountName}\nSana: ${new Date().toISOString().slice(0, 10)}\n\n${backupCodes.join("\n")}\n\nHar kod bir marta ishlatiladi. Xavfsiz joyda saqlang.`;
        navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }

    function downloadBackupCodes() {
        if (!backupCodes) return;
        const text = `ForHumo.uz — 2FA zaxira kodlari\nAkkaunt: ${accountName}\nSana: ${new Date().toISOString().slice(0, 10)}\n\n${backupCodes.join("\n")}\n\nHar kod bir marta ishlatiladi. Xavfsiz joyda saqlang.`;
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `forhumo-2fa-backup-codes-${accountName}.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    const finishedBackup = useMemo(() => backupCodes && mode === "backup", [backupCodes, mode]);

    return (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 p-5">
            <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? "bg-emerald-500/15 text-emerald-500" : "bg-white/5 text-gray-400"}`}>
                    {enabled ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                    <div className="font-black text-base">Ikkinchi bosqichli autentifikatsiya (2FA)</div>
                    <div className="text-xs opacity-70 mt-0.5">
                        {enabled
                            ? <>Yoqilgan {enabledAt ? `— ${new Date(enabledAt).toLocaleDateString()}` : ""}. Har kirishda authenticator kodi so'raladi.</>
                            : <>Google parolingizga qo'shimcha himoya. Authenticator ilovasi kerak (Google Authenticator, Authy, 1Password).</>}
                    </div>
                </div>
            </div>

            {/* IDLE — yoqmagan holat */}
            {mode === "idle" && !enabled && (
                <button onClick={startSetup} disabled={loading} className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuklanmoqda</> : <><Shield className="w-4 h-4" /> 2FA ni yoqish</>}
                </button>
            )}

            {/* IDLE — yoqilgan holat: boshqarish */}
            {mode === "idle" && enabled && (
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { setMode("disable"); setCode(""); setError(null); }} className="h-11 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold flex items-center justify-center gap-2">
                        <ShieldOff className="w-4 h-4" /> O'chirish
                    </button>
                    <button onClick={() => { setMode("disable"); setCode(""); setError(null); }} className="hidden" />
                    <button onClick={() => { setMode("verify"); setCode(""); setError(null); setBackupCodes(null); }} className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold flex items-center justify-center gap-2 border border-white/10" style={{ gridColumn: "auto" }}>
                        <RefreshCw className="w-4 h-4" /> Yangi zaxira kodlar
                    </button>
                </div>
            )}

            {/* SETUP → VERIFY: QR + kod kiritish */}
            {mode === "verify" && !enabled && (
                <div>
                    <div className="p-4 rounded-xl bg-white flex items-center justify-center mb-3">
                        {qrDataUrl ? <img src={qrDataUrl} alt="QR" className="w-56 h-56" /> : <div className="w-56 h-56 flex items-center justify-center text-gray-400 text-xs">QR yuklanmoqda...</div>}
                    </div>
                    <div className="text-xs opacity-70 mb-2">Yoki qo'lda kiriting:</div>
                    <div className="flex items-center gap-2 mb-4">
                        <code className="flex-1 px-3 py-2 rounded-lg bg-black/40 text-white text-xs font-mono break-all">{secret}</code>
                        <button onClick={() => secret && navigator.clipboard.writeText(secret)} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"><Copy className="w-4 h-4" /></button>
                    </div>
                    <div className="text-xs opacity-70 mb-2">Authenticator ilovasi ko'rsatgan 6 raqamli kodni kiriting:</div>
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                        placeholder="000000"
                        className="w-full h-12 text-center rounded-xl text-lg font-mono tracking-widest outline-none bg-white/5 border border-white/10"
                    />
                    {error && <div className="mt-2 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {error}</div>}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        <button onClick={() => setMode("idle")} className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold">Bekor qilish</button>
                        <button onClick={verifyAndEnable} disabled={code.length !== 6 || loading} className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Tasdiqlash
                        </button>
                    </div>
                </div>
            )}

            {/* VERIFY qayta: zaxira kod yangilash uchun (2FA yoqilgan) */}
            {mode === "verify" && enabled && (
                <div>
                    <div className="text-xs opacity-70 mb-2">Zaxira kodlarni qayta yaratish uchun joriy TOTP kodni kiriting:</div>
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                        placeholder="000000"
                        className="w-full h-12 text-center rounded-xl text-lg font-mono tracking-widest outline-none bg-white/5 border border-white/10"
                    />
                    {error && <div className="mt-2 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {error}</div>}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        <button onClick={() => setMode("idle")} className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold">Bekor qilish</button>
                        <button onClick={regenerateBackup} disabled={code.length !== 6 || loading} className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Yangilash
                        </button>
                    </div>
                </div>
            )}

            {/* DISABLE */}
            {mode === "disable" && (
                <div>
                    <div className="text-xs opacity-70 mb-2">2FA ni o'chirish uchun joriy TOTP kodni yoki zaxira kodni kiriting:</div>
                    <input
                        ref={inputRef}
                        type="text"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={e => { setCode(e.target.value); setError(null); }}
                        placeholder="000000 yoki AAAA-BBBB-CCCC"
                        className="w-full h-12 text-center rounded-xl text-base font-mono outline-none bg-white/5 border border-white/10"
                    />
                    {error && <div className="mt-2 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {error}</div>}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        <button onClick={() => setMode("idle")} className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold">Bekor qilish</button>
                        <button onClick={disable2fa} disabled={code.length < 6 || loading} className="h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />} O'chirish
                        </button>
                    </div>
                </div>
            )}

            {/* BACKUP: yangi kodlar ko'rsatiladi (bir marta) */}
            {finishedBackup && backupCodes && (
                <div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-bold flex items-start gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Bu kodlarni saqlab qo'ying — telefoningizdan mahrum bo'lsangiz kirishga imkon beradi. Har biri bir marta ishlaydi.</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {backupCodes.map((c, i) => (
                            <code key={i} className="px-3 py-2 rounded-lg bg-black/40 text-white text-sm font-mono text-center">{c}</code>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <button onClick={copyBackupCodes} className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold flex items-center justify-center gap-2">
                            {copied ? <><Check className="w-4 h-4 text-emerald-500" /> Ko'chirildi</> : <><Copy className="w-4 h-4" /> Ko'chirish</>}
                        </button>
                        <button onClick={downloadBackupCodes} className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold flex items-center justify-center gap-2">
                            <Download className="w-4 h-4" /> Yuklab olish
                        </button>
                    </div>
                    <button onClick={() => { setMode("idle"); setBackupCodes(null); }} className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">
                        Tayyor
                    </button>
                </div>
            )}
        </div>
    );
}
