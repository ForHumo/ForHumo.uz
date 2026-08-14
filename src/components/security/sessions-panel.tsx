"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone, Laptop, Loader2, LogOut, Check, ShieldAlert, Clock, QrCode } from "lucide-react";

interface SessionRow {
    id: string;
    jti: string;
    deviceHint: string | null;
    ipHint: string | null;
    origin: string;
    createdAt: string;
    lastSeenAt: string;
}

function parseUa(ua: string | null): { icon: typeof Monitor; label: string } {
    if (!ua) return { icon: Monitor, label: "Noma'lum qurilma" };
    const s = ua.toLowerCase();
    const isMobile = s.includes("mobile") || s.includes("android") || s.includes("iphone");
    const isTablet = s.includes("ipad") || (s.includes("tablet") && !s.includes("mobile"));
    const icon = isMobile ? Smartphone : isTablet ? Laptop : Monitor;
    const browser = s.includes("edg/") ? "Edge" : s.includes("chrome/") ? "Chrome" : s.includes("firefox/") ? "Firefox" : s.includes("safari/") ? "Safari" : "Brauzer";
    const os = s.includes("windows") ? "Windows" : s.includes("mac os") ? "macOS" : s.includes("linux") ? "Linux" : s.includes("android") ? "Android" : (s.includes("iphone") || s.includes("ipad")) ? "iOS" : "";
    return { icon, label: os ? `${browser} · ${os}` : browser };
}

function relTime(iso: string): string {
    const d = new Date(iso);
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "hozirgina";
    if (s < 3600) return `${Math.floor(s / 60)} daq oldin`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
    if (s < 30 * 86400) return `${Math.floor(s / 86400)} kun oldin`;
    return d.toLocaleDateString();
}

export function SessionsPanel() {
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [currentJti, setCurrentJti] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [confirmAll, setConfirmAll] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch("/api/auth/sessions");
            if (r.ok) {
                const d = await r.json();
                setSessions(d.sessions || []);
                setCurrentJti(d.currentJti || null);
            }
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function revoke(id: string) {
        setBusy(id);
        try {
            await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
            setSessions(prev => prev.filter(s => s.id !== id));
        } finally { setBusy(null); }
    }

    async function revokeAll() {
        setBusy("all"); setConfirmAll(false);
        try {
            await fetch("/api/auth/sessions", { method: "DELETE" });
            await load();
        } finally { setBusy(null); }
    }

    const otherCount = sessions.filter(s => s.jti !== currentJti).length;

    return (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 p-5 mt-4">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
                    <Monitor className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="font-black text-base">Aktiv qurilmalar</div>
                    <div className="text-xs opacity-70 mt-0.5">
                        Hisobingizga kirgan barcha qurilmalar. Notanish qurilma bo'lsa darhol chiqarib yuboring.
                    </div>
                </div>
            </div>

            {loading && <div className="text-center py-4 opacity-60"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}

            {!loading && sessions.length === 0 && (
                <div className="text-center py-6 opacity-60 text-xs">Aktiv sessiya topilmadi</div>
            )}

            {!loading && sessions.length > 0 && (
                <div className="space-y-2">
                    {sessions.map(s => {
                        const { icon: Icon, label } = parseUa(s.deviceHint);
                        const isCurrent = s.jti === currentJti;
                        return (
                            <div key={s.id}
                                className={`p-4 rounded-xl flex items-center gap-3 ${isCurrent ? "bg-emerald-500/10 border border-emerald-500/25" : "bg-black/[0.03] dark:bg-white/[0.04]"}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCurrent ? "bg-emerald-500/20 text-emerald-500" : "bg-white/5 text-white/70"}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                                        {label}
                                        {isCurrent && <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-500 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Joriy</span>}
                                        {s.origin === "qr" && <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-500 font-bold flex items-center gap-1"><QrCode className="w-3 h-3" /> QR</span>}
                                    </div>
                                    <div className="text-xs opacity-60 flex items-center gap-2 mt-0.5">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {relTime(s.lastSeenAt)}</span>
                                        {s.ipHint && <span className="opacity-70">· {s.ipHint}</span>}
                                    </div>
                                </div>
                                {!isCurrent && (
                                    <button onClick={() => revoke(s.id)} disabled={busy === s.id}
                                        className="w-9 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center disabled:opacity-50"
                                        title="Chiqarish">
                                        {busy === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {otherCount > 0 && (
                <button onClick={() => setConfirmAll(true)} disabled={busy !== null}
                    className="mt-4 w-full h-11 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    <ShieldAlert className="w-4 h-4" /> Boshqa barcha sessiyalarni chiqarish ({otherCount})
                </button>
            )}

            {confirmAll && (
                <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmAll(false)}>
                    <div className="w-full max-w-sm p-5 rounded-2xl bg-white dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
                        <div className="font-black mb-2">Barchasini chiqarish?</div>
                        <div className="text-xs opacity-70 mb-4">
                            {otherCount} ta boshqa qurilma darhol chiqariladi. Joriy sessiya (bu qurilma) saqlanadi.
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setConfirmAll(false)} className="h-11 rounded-xl bg-black/5 dark:bg-white/5 text-sm font-bold">Bekor</button>
                            <button onClick={revokeAll} className="h-11 rounded-xl bg-red-600 text-white text-sm font-bold">Chiqarish</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
