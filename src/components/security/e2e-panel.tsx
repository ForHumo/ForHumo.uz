"use client";

// E2E shifrlash sozlash paneli.
// Bosqich 1 (bu ship): kalit yaratish + serverga public yuklash + fingerprint ko'rsatish.
// Bosqich 2 (keyingi PR): DM composer va message view'ni E2E ga o'tkazish.

import { useEffect, useState } from "react";
import { Lock, Loader2, KeyRound, Copy, Check, AlertCircle, Trash2, RefreshCw, ShieldCheck } from "lucide-react";
import { generateIdentityKeyPair, computeFingerprint } from "@/lib/e2e-crypto";
import { saveMyIdentity, getMyIdentity, clearMyIdentity } from "@/lib/e2e-storage";

interface ServerKey {
    id: string;
    publicKey: string;
    fingerprint: string;
    keyAlgorithm: string;
    deviceLabel: string | null;
    createdAt: string;
    revokedAt: string | null;
}

export function E2ePanel() {
    const [serverKeys, setServerKeys] = useState<ServerKey[]>([]);
    const [localFingerprint, setLocalFingerprint] = useState<string | null>(null);
    const [localKeyId, setLocalKeyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);

    async function load() {
        setLoading(true); setError(null);
        try {
            const [r, id] = await Promise.all([
                fetch("/api/user/e2e/keys").then(x => x.json()),
                getMyIdentity().catch(() => null),
            ]);
            setServerKeys(r.keys || []);
            if (id) {
                setLocalFingerprint(id.fingerprint);
                setLocalKeyId(id.keyId);
            } else {
                setLocalFingerprint(null); setLocalKeyId(null);
            }
        } catch (e) {
            setError((e as Error).message || "Yuklab bo'lmadi");
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function enableOrRotate() {
        if (busy) return;
        setBusy(true); setError(null);
        try {
            // 1. Kalit juftlik generatsiya (brauzerda)
            const pair = await generateIdentityKeyPair();
            // 2. Public'ni serverga
            const r = await fetch("/api/user/e2e/keys", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ publicKey: pair.publicKey, fingerprint: pair.fingerprint }),
            });
            const d = await r.json();
            if (!r.ok) { setError(d?.error || "Yuklab bo'lmadi"); setBusy(false); return; }
            // 3. Private'ni IndexedDB'ga (mahalliy)
            await saveMyIdentity({
                keyId:       d.key.id,
                privateJwk:  pair.privateJwk,
                publicKey:   pair.publicKey,
                fingerprint: pair.fingerprint,
            });
            await load();
        } catch (e) {
            setError((e as Error).message || "Kalit yaratib bo'lmadi");
        } finally { setBusy(false); }
    }

    async function resetLocal() {
        setBusy(true); setError(null); setConfirmReset(false);
        try {
            await clearMyIdentity();
            // Serverdagi aktivni ham revoke qilaylik
            if (localKeyId) {
                await fetch(`/api/user/e2e/keys/${localKeyId}`, { method: "DELETE" });
            }
            await load();
        } finally { setBusy(false); }
    }

    // Aktiv server kalit + lokal fingerprint mos keladimi?
    const activeServerKey = serverKeys.find(k => !k.revokedAt);
    const mismatch = activeServerKey && localFingerprint && activeServerKey.fingerprint !== localFingerprint;
    const noLocal = activeServerKey && !localFingerprint;

    const status: "off" | "on" | "mismatch" | "no-local" =
        !activeServerKey ? "off" :
        mismatch          ? "mismatch" :
        noLocal           ? "no-local" :
        "on";

    async function verify(publicKey: string): Promise<void> {
        const fp = await computeFingerprint(publicKey);
        alert(`Barmoq izi: ${fp}`);
    }

    return (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 p-5 mt-4">
            <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === "on" ? "bg-emerald-500/15 text-emerald-500" : "bg-white/5 text-gray-400"}`}>
                    <Lock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="font-black text-base flex items-center gap-2">
                        End-to-end shifrlash
                        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-500 font-bold">Beta · Bosqich 1/3</span>
                    </div>
                    <div className="text-xs opacity-70 mt-0.5">
                        Kalit juftlik brauzeringizda yaratiladi va shu qurilmada qoladi. Public kalit serverga yuklanadi, private hech qachon chiqmaydi.
                        DM shifrlash haqiqiy oqim keyingi PR'da ulanadi.
                    </div>
                </div>
            </div>

            {loading && <div className="text-center py-4 opacity-60"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}

            {!loading && status === "off" && (
                <div>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-xs mb-3">
                        <div className="font-bold mb-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Nima bo'ladi</div>
                        <ul className="list-disc list-inside space-y-0.5 opacity-90">
                            <li>ECDH P-256 kalit juftlik yaratamiz (Web Crypto)</li>
                            <li>Public kalit serverga yuklanadi (foydalanuvchilar sizga shifrlangan yozishi uchun)</li>
                            <li>Private kalit shu brauzerning IndexedDB'sida qoladi</li>
                        </ul>
                    </div>
                    <button onClick={enableOrRotate} disabled={busy}
                        className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                        Kalit yaratish va yoqish
                    </button>
                </div>
            )}

            {!loading && status === "on" && activeServerKey && (
                <div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 mb-3">
                        <div className="text-xs opacity-70 mb-1">Barmoq izingiz (foydalanuvchi tekshirishi mumkin):</div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm font-mono font-bold">{localFingerprint}</code>
                            <button onClick={() => { if (localFingerprint) { navigator.clipboard.writeText(localFingerprint); setCopied(true); setTimeout(() => setCopied(false), 2000); } }}
                                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center">
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 opacity-70" />}
                            </button>
                        </div>
                        <div className="text-xs opacity-60 mt-1">Qurilma: {activeServerKey.deviceLabel || "Noma'lum"} · {new Date(activeServerKey.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={enableOrRotate} disabled={busy}
                            className="h-11 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            <RefreshCw className="w-4 h-4" /> Yangi kalit
                        </button>
                        <button onClick={() => setConfirmReset(true)} disabled={busy}
                            className="h-11 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            <Trash2 className="w-4 h-4" /> O'chirish
                        </button>
                    </div>
                </div>
            )}

            {!loading && status === "no-local" && activeServerKey && (
                <div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-500 text-xs font-bold flex items-start gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                            <div>Serverda aktiv kalit bor, lekin bu brauzerda private topilmadi.</div>
                            <div className="opacity-80 mt-1">Ehtimol boshqa qurilma/brauzerda yaratgansiz. Bu qurilmada shifrlangan yozib bo'lmaydi. Yangi kalit yaratsangiz eski aktiv revoke bo'ladi.</div>
                        </div>
                    </div>
                    <button onClick={() => verify(activeServerKey.publicKey)} className="w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold mb-2">
                        Server barmoq izini ko'rish
                    </button>
                    <button onClick={enableOrRotate} disabled={busy}
                        className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                        Bu qurilma uchun yangi kalit
                    </button>
                </div>
            )}

            {!loading && status === "mismatch" && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs font-bold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                        <div>Lokal va server kalitlari mos kelmaydi.</div>
                        <div className="opacity-80 mt-1">Bu brauzerda private o'chib ketgan yoki boshqa qurilma yangi kalit yaratgan. Yangi kalit yarating.</div>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-3 p-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            {confirmReset && (
                <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmReset(false)}>
                    <div className="w-full max-w-sm p-5 rounded-2xl bg-white dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
                        <div className="font-black mb-2">E2E ni o'chirish?</div>
                        <div className="text-xs opacity-70 mb-4">
                            Lokal private kalit brauzerdan o'chiriladi va serverdagi aktiv kalit revoke qilinadi.
                            Bu qurilmadagi barcha shifrlangan xabarlarni deshifrlash imkoni qolmaydi.
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setConfirmReset(false)} className="h-11 rounded-xl bg-black/5 dark:bg-white/5 text-sm font-bold">Bekor</button>
                            <button onClick={resetLocal} className="h-11 rounded-xl bg-red-600 text-white text-sm font-bold">O'chirish</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
