"use client";

// E2E kalitlarim modali — Signal/WhatsApp uslub kalit yaratish/boshqarish.
// Private key IndexedDB'da; public key server'da UserE2eKey jadvalida.
// Foydalanuvchi 1+ kalit'ga ega bo'lishi mumkin (multi-device); bittasi active.

import { useEffect, useState } from "react";
import {
    X, KeyRound, Loader2, Plus, Trash2, ShieldCheck, AlertTriangle,
    CheckCircle2, Info, Star,
} from "lucide-react";
import {
    generateKeyPair, exportPublicKey, exportPrivateKey,
    computeFingerprint, detectDeviceLabel,
} from "@/lib/nexus-e2e";
import {
    saveKey, listKeys, setActive, deleteKey, type StoredKey,
} from "@/lib/nexus-e2e-store";

type ServerKey = {
    id: string;
    fingerprint: string;
    keyAlgorithm: string;
    deviceLabel: string | null;
    createdAt: string;
};

function formatFingerprint(fp: string): string {
    return fp.toUpperCase().match(/.{1,4}/g)?.join(" ") ?? fp;
}

function timeAgo(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return "hozir";
    if (s < 3600) return `${Math.floor(s / 60)} daq`;
    if (s < 86400) return `${Math.floor(s / 3600)} soat`;
    return `${Math.floor(s / 86400)} kun`;
}

export function NxDmE2eSetupModal({
    open, profileId, onClose,
}: {
    open: boolean;
    profileId: string;
    onClose: () => void;
}) {
    const [serverKeys, setServerKeys] = useState<ServerKey[]>([]);
    const [localKeys, setLocalKeys] = useState<StoredKey[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        loadAll();
    }, [open, profileId]);

    async function loadAll() {
        setLoading(true);
        try {
            const [srv, loc] = await Promise.all([
                fetch("/api/nexus/e2e/keys").then(r => r.ok ? r.json() : { keys: [] }),
                listKeys(profileId).catch(() => []),
            ]);
            setServerKeys(srv.keys ?? []);
            setLocalKeys(loc);
        } finally {
            setLoading(false);
        }
    }

    async function generateNew() {
        setGenerating(true);
        setError(null);
        setSuccess(null);
        try {
            const kp = await generateKeyPair();
            const publicKeyBase64 = await exportPublicKey(kp.publicKey);
            const privateJwk = await exportPrivateKey(kp.privateKey);
            const fingerprint = await computeFingerprint(publicKeyBase64);
            const deviceLabel = detectDeviceLabel();

            // Server'ga public key yuborish
            const r = await fetch("/api/nexus/e2e/keys", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    publicKey: publicKeyBase64,
                    keyAlgorithm: "ECDH-P256",
                    deviceLabel,
                }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok || !d.keyId) {
                setError(d?.error ?? "Serverga saqlashda xato");
                return;
            }

            // IndexedDB'ga private key yozish
            await saveKey({
                keyId: d.keyId,
                profileId,
                publicKeyBase64,
                fingerprint,
                privateJwk,
                deviceLabel,
                createdAt: Date.now(),
                isActive: true,
            });
            // Boshqa kalitlarni faol emas qilish
            await setActive(profileId, d.keyId);

            setSuccess("Yangi kalit yaratildi va faollashtirildi");
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Kalit yaratishda xato");
        } finally {
            setGenerating(false);
        }
    }

    async function activate(keyId: string) {
        await setActive(profileId, keyId);
        await loadAll();
    }

    async function revokeServer(keyId: string) {
        if (!confirm("Kalitni revoke qilasizmi? Bu qurilma bilan yozilgan eski xabarlar deshifrlanishi mumkin bo'lmasligi mumkin.")) return;
        try {
            await fetch("/api/nexus/e2e/keys", {
                method: "DELETE", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyId }),
            });
            await deleteKey(keyId).catch(() => {});
            await loadAll();
        } catch { /* silent */ }
    }

    if (!open) return null;

    // Har server key uchun local'da private bormi tekshiramiz
    const serverKeysWithStatus = serverKeys.map(sk => {
        const local = localKeys.find(lk => lk.keyId === sk.id);
        return {
            ...sk,
            hasPrivate: !!local,
            isActive: local?.isActive ?? false,
        };
    });

    return (
        <>
            <div className="fixed inset-0 z-[330] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[331] flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[480px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <KeyRound className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        E2E shifrlash kalitlari
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: "none" }}>
                    <div className="p-3 rounded-xl flex items-start gap-2"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)" }}>
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00CEC8" }} />
                        <p className="text-[11px] leading-snug" style={{ color: "rgba(220,230,250,0.92)" }}>
                            <b>End-to-End shifrlash</b> — xabarlar faqat sizda va boshqa peer qurilmasida ochiladi.
                            Server ham, hech kim ham matnini ko&apos;ra olmaydi. <b>Private kalit</b> shu brauzer'da qoladi.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl flex items-start gap-2"
                            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)" }}>
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                            <p className="text-[11px] leading-snug" style={{ color: "#EF4444" }}>{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="p-3 rounded-xl flex items-start gap-2"
                            style={{ background: "rgba(0,206,200,0.10)", border: "1px solid rgba(0,206,200,0.30)" }}>
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#00CEC8" }} />
                            <p className="text-[11px] leading-snug" style={{ color: "rgba(200,240,235,0.95)" }}>{success}</p>
                        </div>
                    )}

                    <button onClick={generateNew} disabled={generating}
                        className="w-full h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #2B3EE8, #00CEC8)", color: "white" }}>
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Yangi kalit yaratish (shu qurilma)
                    </button>

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                            style={{ color: "rgba(160,176,224,0.7)" }}>
                            Mening kalitlarim ({serverKeysWithStatus.length})
                        </p>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#2B3EE8" }} />
                            </div>
                        ) : serverKeysWithStatus.length === 0 ? (
                            <div className="p-6 rounded-xl text-center"
                                style={{ background: "rgba(11,18,40,0.55)", border: "1px dashed rgba(43,62,232,0.20)" }}>
                                <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-40" style={{ color: "#00CEC8" }} />
                                <p className="text-sm" style={{ color: "rgba(160,176,224,0.75)" }}>
                                    Kalit yo&apos;q. Yuqoridagi tugma bilan yarating.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {serverKeysWithStatus.map(k => (
                                    <div key={k.id} className="p-3 rounded-xl"
                                        style={{
                                            background: "rgba(11,18,40,0.55)",
                                            border: `1px solid ${k.isActive ? "#00CEC8" : "rgba(43,62,232,0.14)"}`,
                                        }}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <KeyRound className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                            <span className="text-[10px] font-black uppercase tracking-widest"
                                                style={{ color: "rgba(160,176,224,0.85)" }}>
                                                {k.keyAlgorithm}
                                            </span>
                                            <div className="flex-1" />
                                            {k.isActive && (
                                                <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded"
                                                    style={{ background: "rgba(0,206,200,0.14)", color: "#00CEC8" }}>
                                                    <Star className="w-2.5 h-2.5" fill="#00CEC8" /> Faol
                                                </span>
                                            )}
                                            {!k.hasPrivate && (
                                                <span title="Bu qurilmada private key yo'q"
                                                    className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded"
                                                    style={{ background: "rgba(245,179,1,0.14)", color: "#F5B301" }}>
                                                    Boshqa qurilma
                                                </span>
                                            )}
                                        </div>
                                        {k.deviceLabel && (
                                            <p className="text-[10px] mb-1" style={{ color: "rgba(160,176,224,0.85)" }}>
                                                {k.deviceLabel}
                                            </p>
                                        )}
                                        <p className="text-[10px] font-mono break-all mb-2"
                                            style={{ color: "rgba(200,214,247,0.85)" }}>
                                            {formatFingerprint(k.fingerprint)}
                                        </p>
                                        <p className="text-[10px] mb-2" style={{ color: "rgba(140,160,210,0.7)" }}>
                                            {timeAgo(k.createdAt)}
                                        </p>
                                        <div className="flex gap-1.5">
                                            {k.hasPrivate && !k.isActive && (
                                                <button onClick={() => activate(k.id)}
                                                    className="flex-1 h-8 rounded-lg text-[11px] font-black"
                                                    style={{ background: "rgba(0,206,200,0.14)", border: "1px solid rgba(0,206,200,0.35)", color: "#00CEC8" }}>
                                                    Faollashtirish
                                                </button>
                                            )}
                                            <button onClick={() => revokeServer(k.id)}
                                                className="flex-1 h-8 rounded-lg text-[11px] font-black flex items-center justify-center gap-1"
                                                style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#EF4444" }}>
                                                <Trash2 className="w-3 h-3" />
                                                Revoke
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                            style={{ color: "rgba(160,176,224,0.7)" }}>
                            Xavfsizlik eslatmalari
                        </p>
                        <ul className="text-[11px] space-y-1.5" style={{ color: "rgba(180,195,235,0.85)" }}>
                            <li className="flex items-start gap-1.5">
                                <ShieldCheck className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                <span>Private kalit brauzer'ning shifrlangan IndexedDB'da saqlanadi</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <ShieldCheck className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#00CEC8" }} />
                                <span>Har qurilma alohida kalit yaratadi (multi-device)</span>
                            </li>
                            <li className="flex items-start gap-1.5">
                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#F5B301" }} />
                                <span>Brauzer ma&apos;lumotlarini tozalasangiz — kalit yo&apos;qoladi (backup yo&apos;q)</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
}
