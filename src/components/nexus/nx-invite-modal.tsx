"use client";

// Guruh/kanal taklif havolalari boshqaruvi (Telegram/Discord uslubi).
// - Yangi havola yaratish (muddat + max ishlatish)
// - QR kod ko'rsatish
// - Copy, share
// - Bekor qilish

import { useEffect, useState } from "react";
import { X, Link as LinkIcon, Loader2, Copy, Trash2, Plus, QrCode, Check, Users, Infinity as InfinityIcon, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { formatLastSeen } from "@/lib/last-seen";

interface Invite {
    id: string;
    code: string;
    url: string;
    createdById: string;
    expiresAt: string | null;
    maxUses: number | null;
    usesCount: number;
    revokedAt: string | null;
    createdAt: string;
}

const EXPIRE_OPTIONS = [
    { value: 0, label: "Doimiy" },
    { value: 1, label: "1 soat" },
    { value: 24, label: "1 kun" },
    { value: 168, label: "1 hafta" },
    { value: 720, label: "1 oy" },
];

const USES_OPTIONS = [
    { value: 0, label: "Cheklovsiz" },
    { value: 1, label: "1" },
    { value: 10, label: "10" },
    { value: 50, label: "50" },
    { value: 100, label: "100" },
];

export function NxInviteModal({
    channelId, channelName, onClose,
}: {
    channelId: string;
    channelName: string;
    onClose: () => void;
}) {
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [expireIdx, setExpireIdx] = useState(3); // default 1 hafta
    const [usesIdx, setUsesIdx] = useState(0);     // default cheklovsiz
    const [qrFor, setQrFor] = useState<Invite | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/invites`);
            if (r.ok) {
                const d = await r.json();
                setInvites(d.invites ?? []);
            }
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, [channelId]);

    async function create() {
        setCreating(true);
        try {
            const r = await fetch(`/api/nexus/channels/${channelId}/invites`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    expiresInHours: EXPIRE_OPTIONS[expireIdx].value,
                    maxUses: USES_OPTIONS[usesIdx].value,
                }),
            });
            if (r.ok) load();
            else {
                const d = await r.json().catch(() => ({}));
                alert(d?.error ?? "Yaratib bo'lmadi");
            }
        } finally { setCreating(false); }
    }

    async function revoke(inviteId: string) {
        if (!confirm("Havolani bekor qilishni tasdiqlaysizmi? Bu qaytarib bo'lmaydi.")) return;
        const r = await fetch(`/api/nexus/channels/${channelId}/invites/${inviteId}`, { method: "DELETE" });
        if (r.ok) load();
    }

    async function copyUrl(inv: Invite) {
        const fullUrl = `${window.location.origin}${inv.url}`;
        const ok = await copyToClipboard(fullUrl);
        if (ok) {
            setCopied(inv.id);
            setTimeout(() => setCopied(null), 2000);
        }
    }

    async function share(inv: Invite) {
        const fullUrl = `${window.location.origin}${inv.url}`;
        if (typeof navigator !== "undefined" && (navigator as { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> }).share) {
            try {
                await navigator.share!({
                    title: `${channelName} — Nexus`,
                    text: `${channelName} guruhiga qo'shiling`,
                    url: fullUrl,
                });
                return;
            } catch { /* user cancelled */ }
        }
        void copyUrl(inv);
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
            onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "85vh" }}>
                {/* Header */}
                <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                    <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        <p className="text-sm font-black text-white">Taklif havolalari</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                        <X className="w-4 h-4 text-white/70" />
                    </button>
                </div>

                {qrFor ? (
                    <QrView invite={qrFor} onBack={() => setQrFor(null)} channelName={channelName} />
                ) : (
                    <>
                        {/* Yangi havola yaratish */}
                        <div className="p-4 border-b space-y-3" style={{ borderColor: "rgba(43,62,232,0.15)" }}>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.65)" }}>Muddat</label>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {EXPIRE_OPTIONS.map((o, i) => (
                                            <button key={o.value} type="button" onClick={() => setExpireIdx(i)}
                                                className="px-2 py-1 rounded-md text-[10px] font-bold transition"
                                                style={expireIdx === i ? {
                                                    background: "rgba(0,206,200,0.14)", color: "#00CEC8",
                                                    border: "1px solid rgba(0,206,200,0.35)",
                                                } : {
                                                    background: "rgba(43,62,232,0.08)", color: "rgba(140,160,210,0.85)",
                                                    border: "1px solid rgba(43,62,232,0.20)",
                                                }}>
                                                {o.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(140,160,210,0.65)" }}>Ishlatish</label>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {USES_OPTIONS.map((o, i) => (
                                            <button key={o.value} type="button" onClick={() => setUsesIdx(i)}
                                                className="px-2 py-1 rounded-md text-[10px] font-bold transition"
                                                style={usesIdx === i ? {
                                                    background: "rgba(0,206,200,0.14)", color: "#00CEC8",
                                                    border: "1px solid rgba(0,206,200,0.35)",
                                                } : {
                                                    background: "rgba(43,62,232,0.08)", color: "rgba(140,160,210,0.85)",
                                                    border: "1px solid rgba(43,62,232,0.20)",
                                                }}>
                                                {o.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button onClick={create} disabled={creating}
                                className="w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 disabled:opacity-40"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Yangi havola
                            </button>
                        </div>

                        {/* Ro'yxat */}
                        <div className="flex-1 overflow-y-auto p-3">
                            {loading ? (
                                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/40" /></div>
                            ) : invites.length === 0 ? (
                                <p className="text-center text-xs py-6" style={{ color: "rgba(140,160,210,0.60)" }}>
                                    Hali havolalar yo&apos;q
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {invites.map(inv => (
                                        <div key={inv.id} className="p-2.5 rounded-xl"
                                            style={{
                                                background: inv.revokedAt ? "rgba(239,68,68,0.06)" : "rgba(43,62,232,0.06)",
                                                border: `1px solid ${inv.revokedAt ? "rgba(239,68,68,0.20)" : "rgba(43,62,232,0.20)"}`,
                                                opacity: inv.revokedAt ? 0.5 : 1,
                                            }}>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <code className="flex-1 text-[10px] font-mono text-white truncate">
                                                    {typeof window !== "undefined" ? window.location.origin : ""}{inv.url}
                                                </code>
                                                {!inv.revokedAt && (
                                                    <>
                                                        <button onClick={() => copyUrl(inv)} title="Nusxa olish"
                                                            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                                            {copied === inv.id
                                                                ? <Check className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />
                                                                : <Copy className="w-3.5 h-3.5 text-white/70" />
                                                            }
                                                        </button>
                                                        <button onClick={() => setQrFor(inv)} title="QR kod"
                                                            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                                            <QrCode className="w-3.5 h-3.5 text-white/70" />
                                                        </button>
                                                        <button onClick={() => share(inv)} title="Ulashish"
                                                            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                                                            <Share2 className="w-3.5 h-3.5 text-white/70" />
                                                        </button>
                                                        <button onClick={() => revoke(inv.id)} title="Bekor qilish"
                                                            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-500/10 text-red-400">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px]" style={{ color: "rgba(140,160,210,0.70)" }}>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3" />
                                                    {inv.usesCount}{inv.maxUses ? ` / ${inv.maxUses}` : ""}
                                                </span>
                                                <span>
                                                    {inv.revokedAt ? "Bekor qilingan" : inv.expiresAt
                                                        ? formatLastSeen(inv.expiresAt, false).replace(" oldin", "'da tugaydi")
                                                        : <span className="flex items-center gap-0.5"><InfinityIcon className="w-3 h-3" /> Doimiy</span>}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// QR ko'rsatuvchi kichkina view
function QrView({ invite, onBack, channelName }: { invite: Invite; onBack: () => void; channelName: string }) {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${invite.url}` : invite.url;

    useEffect(() => {
        QRCode.toDataURL(fullUrl, {
            width: 400, margin: 2,
            color: { dark: "#050818", light: "#ffffff" },
        }).then(setDataUrl).catch(() => {});
    }, [fullUrl]);

    return (
        <div className="p-6 flex flex-col items-center gap-4">
            <button onClick={onBack} className="self-start text-xs font-bold" style={{ color: "#00CEC8" }}>
                ← Orqaga
            </button>
            <p className="text-sm font-black text-white text-center">{channelName}</p>
            <p className="text-[10px] font-mono text-white/60 text-center break-all">{fullUrl}</p>
            <div className="w-64 h-64 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{ background: "#fff" }}>
                {dataUrl ? (
                    <img src={dataUrl} alt="QR" className="w-full h-full object-contain" />
                ) : (
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#050818" }} />
                )}
            </div>
            <p className="text-[10px] text-center" style={{ color: "rgba(140,160,210,0.70)" }}>
                Kamera bilan skanerlab qo&apos;shiling
            </p>
        </div>
    );
}
