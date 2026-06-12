"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Link2, Send, Users, Check, Share2, MessageCircle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxShare — REAL universal ulashish sahifasi.
// Havola va matn haqiqiy: clipboard, Telegram/WhatsApp share URL, tizim ulashish.
// ─────────────────────────────────────────────────────────────────────────────
export function NxShare() {
    const { shareSheetOpen, shareSheetTitle, shareSheetUrl, closeShareSheet } = useNxPlayer();
    const [copied, setCopied] = useState(false);

    if (!shareSheetOpen) return null;

    const url = shareSheetUrl || (typeof window !== "undefined" ? window.location.href : "https://forhumo.uz");
    const text = shareSheetTitle || "Humo Nexus";
    const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard ruxsati yo'q */ }
    }

    function openExternal(href: string) {
        window.open(href, "_blank", "noopener,noreferrer");
        closeShareSheet();
    }

    async function nativeShare() {
        try { await navigator.share({ title: "Humo Nexus", text, url }); closeShareSheet(); }
        catch { /* foydalanuvchi bekor qildi */ }
    }

    const options = [
        { id: "telegram", label: "Telegram", icon: Send, color: "#0088CC", run: () => openExternal(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`) },
        { id: "whatsapp", label: "WhatsApp", icon: Users, color: "#25D366", run: () => openExternal(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`) },
        ...(canNativeShare ? [{ id: "more", label: "Boshqa...", icon: Share2, color: "#8B5CF6", run: nativeShare }] : [{ id: "msg", label: "SMS / Email", icon: MessageCircle, color: "#2B3EE8", run: () => openExternal(`mailto:?subject=${encodeURIComponent("Humo Nexus")}&body=${encodeURIComponent(text + "\n" + url)}`) }]),
        { id: "copy", label: "Havolani\nko'chirish", icon: copied ? Check : Link2, color: "#00CEC8", run: copyLink },
    ];

    return (
        <>
            <div className="fixed inset-0 z-[80]" style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }} onClick={closeShareSheet} />

            <div className="fixed inset-x-0 bottom-0 z-[80] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[440px] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)" }}
                onClick={e => e.stopPropagation()}>

                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div className="w-10 h-1 rounded-full" style={{ background: "rgba(43,62,232,0.30)" }} />
                </div>

                <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                    <div className="min-w-0">
                        <h3 className="text-sm font-black text-white">Ulashish</h3>
                        {shareSheetTitle && <p className="text-[10px] mt-0.5 truncate max-w-[260px]" style={{ color: "rgba(100,120,170,0.75)" }}>{shareSheetTitle}</p>}
                    </div>
                    <button onClick={closeShareSheet} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="px-5 pb-3 grid grid-cols-4 gap-3">
                    {options.map(opt => {
                        const Icon = opt.icon;
                        return (
                            <button key={opt.id} onClick={opt.run}
                                className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all duration-200 active:scale-95"
                                style={{ background: "rgba(43,62,232,0.07)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${opt.color}20` }}>
                                    <Icon className="w-5 h-5" style={{ color: opt.color }} />
                                </div>
                                <span className="text-[10px] font-bold text-center leading-tight whitespace-pre-line" style={{ color: "rgba(140,160,210,0.80)" }}>
                                    {opt.id === "copy" && copied ? "Ko'chirildi!" : opt.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Havola — real */}
                <div className="px-5 pb-6">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-2xl" style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.60)" }} />
                        <span className="flex-1 text-xs truncate" style={{ color: "rgba(140,160,210,0.70)" }}>{url}</span>
                        <button onClick={copyLink}
                            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200"
                            style={copied
                                ? { background: "rgba(0,206,200,0.15)", color: "#00CEC8", border: "1px solid rgba(0,206,200,0.30)" }
                                : { background: "rgba(43,62,232,0.15)", color: "white", border: "1px solid rgba(43,62,232,0.30)" }}>
                            {copied ? "Ko'chirildi" : "Ko'chirish"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
