"use client";

// E2E fingerprint verify — peer'ning public key fingerprint'ini ko'rsatadi.
// Foydalanuvchi peer bilan boshqa kanaldan solishtirib "Tasdiqlash" tugmasini bosadi.
// Faqat vizual — hech qanday server yozuvi yo'q (client-side verified marker).

import { useEffect, useState } from "react";
import { X, ShieldCheck, Loader2, KeyRound } from "lucide-react";

type Key = {
    id: string;
    fingerprint: string;
    keyAlgorithm: string;
    deviceLabel: string | null;
    createdAt: string;
};

function formatFingerprint(fp: string): string {
    // Har 4 hex belgini ajratib chiqarish (o'qish qulayligi uchun)
    return fp.toUpperCase().match(/.{1,4}/g)?.join(" ") ?? fp;
}

export function NxDmE2eVerifyModal({
    open, peerId, peerName, onClose,
}: {
    open: boolean;
    peerId: string;
    peerName: string;
    onClose: () => void;
}) {
    const [keys, setKeys] = useState<Key[]>([]);
    const [loading, setLoading] = useState(false);
    const [verifiedIds, setVerifiedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        // Client-side verified markerlarni localStorage'dan yuklaymiz
        try {
            const raw = localStorage.getItem(`nx-e2e-verified-${peerId}`) ?? "[]";
            const arr = JSON.parse(raw) as string[];
            setVerifiedIds(new Set(arr));
        } catch { /* ignore */ }

        fetch(`/api/nexus/e2e/${peerId}`)
            .then(r => r.ok ? r.json() : { keys: [] })
            .then(d => setKeys(d.keys ?? []))
            .finally(() => setLoading(false));
    }, [open, peerId]);

    function toggleVerify(id: string) {
        const s = new Set(verifiedIds);
        if (s.has(id)) s.delete(id); else s.add(id);
        setVerifiedIds(s);
        try {
            localStorage.setItem(`nx-e2e-verified-${peerId}`, JSON.stringify(Array.from(s)));
        } catch { /* ignore */ }
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
                        <ShieldCheck className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        E2E verify · {peerName}
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="p-3 rounded-xl text-[11px]"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.25)", color: "rgba(200,214,247,0.9)" }}>
                        Peer'ning shifrlash kaliti fingerprint'i quyida. Boshqa aloqa kanali (jonli, telefon) orqali
                        solishtirib, bir xil bo&apos;lsa &quot;Tasdiqlangan&quot; belgisini qo&apos;ying.
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#2B3EE8" }} />
                        </div>
                    ) : keys.length === 0 ? (
                        <div className="text-center py-8">
                            <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-40" style={{ color: "#00CEC8" }} />
                            <p className="text-sm" style={{ color: "rgba(160,176,224,0.75)" }}>
                                Peer'da hali E2E kaliti yo&apos;q
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {keys.map(k => {
                                const verified = verifiedIds.has(k.id);
                                return (
                                    <div key={k.id} className="p-3 rounded-xl"
                                        style={{
                                            background: "rgba(11,18,40,0.55)",
                                            border: `1px solid ${verified ? "#00CEC8" : "rgba(43,62,232,0.14)"}`,
                                        }}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <KeyRound className="w-3.5 h-3.5" style={{ color: "#00CEC8" }} />
                                            <span className="text-[10px] font-black uppercase tracking-widest"
                                                style={{ color: "rgba(160,176,224,0.8)" }}>
                                                {k.keyAlgorithm}
                                            </span>
                                            {k.deviceLabel && (
                                                <span className="text-[10px]" style={{ color: "rgba(140,160,210,0.7)" }}>
                                                    · {k.deviceLabel}
                                                </span>
                                            )}
                                            <div className="flex-1" />
                                            {verified && (
                                                <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded"
                                                    style={{ background: "rgba(0,206,200,0.14)", color: "#00CEC8" }}>
                                                    <ShieldCheck className="w-2.5 h-2.5" /> Tasdiqlangan
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-mono break-all mb-2"
                                            style={{ color: "rgba(200,214,247,0.85)" }}>
                                            {formatFingerprint(k.fingerprint)}
                                        </p>
                                        <p className="text-[10px] mb-2" style={{ color: "rgba(140,160,210,0.7)" }}>
                                            {new Date(k.createdAt).toLocaleString("uz-UZ")}
                                        </p>
                                        <button onClick={() => toggleVerify(k.id)}
                                            className="w-full h-8 rounded-lg text-[11px] font-black"
                                            style={verified
                                                ? { background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", color: "#EF4444" }
                                                : { background: "rgba(0,206,200,0.14)", border: "1px solid rgba(0,206,200,0.35)", color: "#00CEC8" }}>
                                            {verified ? "Tasdiqlashni bekor qilish" : "Tasdiqlash"}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
