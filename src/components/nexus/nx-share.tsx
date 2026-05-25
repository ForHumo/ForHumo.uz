"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Link2, MessageCircle, Send, Users, QrCode, Check, Globe } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxShare — universal share sheet
// Barcha komponentlardagi "Ulashish" tugmalari shu sahifani ochadi
// ─────────────────────────────────────────────────────────────────────────────
const SHARE_OPTIONS = [
    { id: "messages",  label: "Xabarlar",  icon: MessageCircle, color: "#2B3EE8"  },
    { id: "telegram",  label: "Telegram",  icon: Send,          color: "#0088CC"  },
    { id: "whatsapp",  label: "WhatsApp",  icon: Users,         color: "#25D366"  },
    { id: "story",     label: "Story",     icon: Globe,         color: "#8B5CF6"  },
    { id: "qr",        label: "QR kod",    icon: QrCode,        color: "#F59E0B"  },
    { id: "copy",      label: "Havolani\nko'chirish", icon: Link2, color: "#00CEC8" },
];

export function NxShare() {
    const { shareSheetOpen, shareSheetTitle, closeShareSheet } = useNxPlayer();
    const [copied, setCopied] = useState(false);
    const [sentTo, setSentTo] = useState<string | null>(null);

    if (!shareSheetOpen) return null;

    const handleOption = (id: string) => {
        if (id === "copy") {
            setCopied(true);
            setSentTo("copy");
            setTimeout(() => { setCopied(false); setSentTo(null); }, 2000);
        } else {
            setSentTo(id);
            setTimeout(() => {
                setSentTo(null);
                closeShareSheet();
            }, 900);
        }
    };

    const mockLink = `https://humo.uz/share/${encodeURIComponent(shareSheetTitle).slice(0, 24)}`;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[80]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={closeShareSheet}
            />

            {/* Sheet */}
            <div
                className="fixed inset-x-0 bottom-0 z-[80] flex flex-col rounded-t-3xl overflow-hidden
                           md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2
                           md:-translate-x-1/2 md:-translate-y-1/2
                           md:w-[440px] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div className="w-10 h-1 rounded-full" style={{ background: "rgba(43,62,232,0.30)" }} />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                    <div>
                        <h3 className="text-sm font-black text-white">Ulashish</h3>
                        {shareSheetTitle && (
                            <p className="text-[10px] mt-0.5 truncate max-w-[260px]"
                                style={{ color: "rgba(100,120,170,0.75)" }}>
                                {shareSheetTitle}
                            </p>
                        )}
                    </div>
                    <button onClick={closeShareSheet}
                        className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Share options grid */}
                <div className="px-5 pb-3 grid grid-cols-3 gap-3">
                    {SHARE_OPTIONS.map(opt => {
                        const Icon    = opt.icon;
                        const done    = sentTo === opt.id;
                        const isCopy  = opt.id === "copy";
                        return (
                            <button
                                key={opt.id}
                                onClick={() => handleOption(opt.id)}
                                className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all duration-200 active:scale-95"
                                style={{
                                    background: done
                                        ? `${opt.color}20`
                                        : "rgba(43,62,232,0.07)",
                                    border: `1px solid ${done ? opt.color + "50" : "rgba(43,62,232,0.15)"}`,
                                }}>
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                                    style={{ background: `${opt.color}20` }}>
                                    {done && isCopy && copied
                                        ? <Check className="w-5 h-5" style={{ color: opt.color }} />
                                        : done && !isCopy
                                        ? <Check className="w-5 h-5" style={{ color: opt.color }} />
                                        : <Icon className="w-5 h-5" style={{ color: opt.color }} />
                                    }
                                </div>
                                <span className="text-[10px] font-bold text-center leading-tight whitespace-pre-line"
                                    style={{ color: done ? opt.color : "rgba(140,160,210,0.80)" }}>
                                    {isCopy && done ? "Ko'chirildi!" : opt.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Link preview */}
                <div className="px-5 pb-6">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-2xl"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <Link2 className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(43,62,232,0.60)" }} />
                        <span className="flex-1 text-xs truncate" style={{ color: "rgba(140,160,210,0.70)" }}>
                            {mockLink}
                        </span>
                        <button
                            onClick={() => handleOption("copy")}
                            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all duration-200"
                            style={copied
                                ? { background: "rgba(0,206,200,0.15)", color: "#00CEC8", border: "1px solid rgba(0,206,200,0.30)" }
                                : { background: "rgba(43,62,232,0.15)", color: "white", border: "1px solid rgba(43,62,232,0.30)" }
                            }>
                            {copied ? "Ko'chirildi" : "Ko'chirish"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
