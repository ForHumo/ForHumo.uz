"use client";

// DM suhbat tepasida "Uchi-uchidan shifrlangan" banner + peer fingerprint verify modal.
// Peer va men — ikkalasida kalit bor bo'lganida ko'rinadi.

import { useState } from "react";
import { Lock, ShieldCheck, X, Check } from "lucide-react";

interface Props {
    peerName: string;
    peerFingerprint: string;
    myFingerprint: string;
}

// Verification qaror lokal localStorage'ga (peer fingerprint bo'yicha)
const VERIFIED_KEY = "nexus:e2e:verified";
function isVerified(peerFp: string): boolean {
    try {
        const raw = localStorage.getItem(VERIFIED_KEY);
        if (!raw) return false;
        const set = new Set<string>(JSON.parse(raw));
        return set.has(peerFp);
    } catch { return false; }
}
function saveVerified(peerFp: string) {
    try {
        const raw = localStorage.getItem(VERIFIED_KEY);
        const set = new Set<string>(raw ? JSON.parse(raw) : []);
        set.add(peerFp);
        localStorage.setItem(VERIFIED_KEY, JSON.stringify([...set]));
    } catch {}
}

export function NxE2eBanner({ peerName, peerFingerprint, myFingerprint }: Props) {
    const [open, setOpen] = useState(false);
    const [verified, setVerified] = useState(() => isVerified(peerFingerprint));

    function confirm() {
        saveVerified(peerFingerprint);
        setVerified(true);
        setOpen(false);
    }

    return (
        <>
            <button onClick={() => setOpen(true)}
                className="w-full flex items-center gap-2 px-4 py-1.5 text-xs font-bold border-b transition-colors"
                style={{
                    background: verified ? "rgba(16,185,129,0.08)" : "rgba(0,206,200,0.08)",
                    borderColor: verified ? "rgba(16,185,129,0.20)" : "rgba(0,206,200,0.20)",
                    color: verified ? "#10B981" : "#00CEC8",
                }}>
                <Lock className="w-3.5 h-3.5" />
                <span>Uchi-uchidan shifrlangan</span>
                {verified && <><span className="opacity-50">·</span><span className="flex items-center gap-1"><Check className="w-3 h-3" /> Tekshirilgan</span></>}
                <span className="ml-auto opacity-70">Barmoq izini ko'rish</span>
            </button>

            {open && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="font-black text-base flex-1">Xavfsizlik raqamlari</div>
                            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="text-xs opacity-70 leading-relaxed">
                                Bir-biringizga to'g'ri kalit egaligini tasdiqlash uchun barmoq izlarini boshqa aloqa (qo'ng'iroq/uchrashuv) orqali solishtiring.
                                Mos kelsa &mdash; man-in-the-middle yo'q.
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
                                    <div className="text-xs opacity-70 mb-1">Sizniki</div>
                                    <code className="text-sm font-mono font-bold break-all">{myFingerprint}</code>
                                </div>
                                <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.04]">
                                    <div className="text-xs opacity-70 mb-1">{peerName}</div>
                                    <code className="text-sm font-mono font-bold break-all">{peerFingerprint}</code>
                                </div>
                            </div>
                            {verified ? (
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center gap-2">
                                    <Check className="w-4 h-4" /> Bu barmoq izi allaqachon tekshirilgan
                                </div>
                            ) : (
                                <button onClick={confirm}
                                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2">
                                    <ShieldCheck className="w-4 h-4" /> Tekshirdim
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
