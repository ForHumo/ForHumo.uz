"use client";

// Kanal ulashish modali — QR + havola + Telegram/WhatsApp/copy.
// `qrcode` paketi mavjud (loyihada allaqachon o'rnatilgan — Humo ID QR uchun).

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Copy, Check, Send, MessageCircle, Link2, QrCode } from "lucide-react";

export function NxChannelShareModal({
    open, handle, channelName, onClose,
}: {
    open: boolean;
    handle: string | null;
    channelName: string;
    onClose: () => void;
}) {
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const publicUrl = handle && typeof window !== "undefined"
        ? `${window.location.origin}/nexus/ch/${encodeURIComponent(handle)}`
        : "";

    useEffect(() => {
        if (!open || !publicUrl) return;
        QRCode.toDataURL(publicUrl, {
            width: 320, margin: 1,
            color: { dark: "#050818", light: "#ffffff" },
        }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    }, [open, publicUrl]);

    if (!open) return null;

    async function copy() {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {}
    }

    function shareTg() {
        const url = `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(channelName)}`;
        window.open(url, "_blank", "noopener");
    }
    function shareWa() {
        const text = `${channelName} — ${publicUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    }
    async function nativeShare() {
        if (navigator.share) {
            try { await navigator.share({ title: channelName, url: publicUrl }); } catch {}
        }
    }

    if (!handle) {
        return (
            <>
                <div className="fixed inset-0 z-[320] bg-black/70 backdrop-blur-sm" onClick={onClose} />
                <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-0 md:mx-auto md:max-w-md z-[321] p-6 rounded-3xl"
                    style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}>
                    <h3 className="text-base font-black text-white mb-2">Ulash uchun @handle kerak</h3>
                    <p className="text-sm mb-4" style={{ color: "rgba(160,176,224,0.85)" }}>
                        Xususiy kanal handle&apos;siz. Sozlamalardan @handle qo&apos;shing.
                    </p>
                    <button onClick={onClose} className="w-full h-11 rounded-full font-black text-sm"
                        style={{ background: "#2B3EE8", color: "white" }}>
                        Yopish
                    </button>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-0 md:mx-auto md:max-w-md z-[321] rounded-3xl overflow-hidden"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <QrCode className="w-4 h-4" style={{ color: "#00CEC8" }} /> Kanal ulash
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {qrDataUrl ? (
                        <div className="flex justify-center">
                            <div className="p-3 rounded-2xl bg-white">
                                <img src={qrDataUrl} alt="QR" className="w-56 h-56" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center py-16">
                            <div className="w-40 h-40 rounded-2xl animate-pulse" style={{ background: "rgba(43,62,232,0.15)" }} />
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block"
                            style={{ color: "rgba(160,176,224,0.7)" }}>
                            Ommaviy havola
                        </label>
                        <div className="flex items-center gap-1 rounded-xl overflow-hidden"
                            style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)" }}>
                            <div className="flex-1 min-w-0 px-3 py-2.5">
                                <p className="text-xs text-white truncate">{publicUrl}</p>
                            </div>
                            <button onClick={copy} className="h-11 px-3 flex-shrink-0"
                                style={{ background: copied ? "rgba(0,206,200,0.20)" : "rgba(43,62,232,0.20)" }}>
                                {copied
                                    ? <Check className="w-4 h-4" style={{ color: "#00CEC8" }} />
                                    : <Copy className="w-4 h-4" style={{ color: "white" }} />}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={shareTg}
                            className="flex flex-col items-center gap-1 py-3 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.20)", color: "white" }}>
                            <Send className="w-4 h-4" />
                            <span className="text-xs font-bold">Telegram</span>
                        </button>
                        <button onClick={shareWa}
                            className="flex flex-col items-center gap-1 py-3 rounded-xl"
                            style={{ background: "rgba(37,211,102,0.20)", color: "white" }}>
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs font-bold">WhatsApp</span>
                        </button>
                        <button onClick={nativeShare}
                            className="flex flex-col items-center gap-1 py-3 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.20)", color: "white" }}>
                            <Link2 className="w-4 h-4" />
                            <span className="text-xs font-bold">Boshqa</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
