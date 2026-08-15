"use client";

// Sticker picker MVP — Twemoji SVG'larni katta stickerlar sifatida ko'rsatadi.
// Kelajakda haqiqiy sticker paketlar (animatsion WEBP) bilan almashtiriladi.
// Foydalanuvchi tanlagan sticker mediaType='sticker' bilan yuboriladi.

import { useState } from "react";
import { X, Search } from "lucide-react";
import { twemojiUrl } from "@/lib/twemoji";

// 6 ta kategoriya, har biri ~10 sticker (jami ~60)
const STICKER_PACKS: Array<{ key: string; label: string; stickers: string[] }> = [
    {
        key: "faces",
        label: "Yuzlar",
        stickers: ["😀","😂","🥰","😍","🤩","😎","🤔","😴","😭","😱","🥺","😇","🙃","😜","🤗","🤯","🥳","😏","😅","🙄"],
    },
    {
        key: "hearts",
        label: "Sevgi",
        stickers: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟"],
    },
    {
        key: "gestures",
        label: "Imo-ishoralar",
        stickers: ["👍","👎","👌","✌️","🤞","🤟","🤘","👋","🙌","👏","🙏","💪","🫡","🤝","👊","✊","🤙","☝️"],
    },
    {
        key: "celebration",
        label: "Bayram",
        stickers: ["🎉","🎊","🎂","🎁","🎈","🎇","🎆","✨","🎀","🏆","🥇","🥈","🥉","🏅","🎖️","💐","🌹","🌸"],
    },
    {
        key: "food",
        label: "Ovqat",
        stickers: ["🍕","🍔","🍟","🌭","🥗","🍜","🍣","🍱","🍰","🎂","🍩","🍪","🍫","🍿","☕","🍵","🥤","🍺"],
    },
    {
        key: "nature",
        label: "Tabiat",
        stickers: ["🌞","🌙","⭐","🌈","🔥","💧","⚡","☁️","☔","❄️","🌊","🌍","🌸","🌻","🌳","🌴","🍀","🌷"],
    },
];

// Sticker mediaUrl — Twemoji CDN SVG (2x kattaligida yaxshi ko'rinadi)
function stickerUrl(emoji: string): string {
    return twemojiUrl(emoji);
}

interface Props {
    onClose: () => void;
    onPick: (url: string, emoji: string) => void;
}

export function NxStickerPicker({ onClose, onPick }: Props) {
    const [activePack, setActivePack] = useState<string>(STICKER_PACKS[0].key);
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const all = q ? STICKER_PACKS.flatMap(p => p.stickers) : STICKER_PACKS.find(p => p.key === activePack)?.stickers ?? [];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
            onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "#0B1228", border: "1px solid rgba(43,62,232,0.30)", maxHeight: "70vh" }}>
                {/* Header — search */}
                <div className="p-3 flex items-center gap-2 border-b"
                    style={{ borderColor: "rgba(43,62,232,0.20)" }}>
                    <div className="flex-1 flex items-center gap-2 rounded-lg px-3"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)" }}>
                        <Search className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(140,160,210,0.55)" }} />
                        <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Sticker qidirish..."
                            className="flex-1 h-9 bg-transparent text-white text-sm focus:outline-none" />
                    </div>
                    <button onClick={onClose}
                        className="w-9 h-9 flex items-center justify-center rounded-lg"
                        style={{ background: "rgba(43,62,232,0.10)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Pack tabs */}
                {!q && (
                    <div className="px-2 py-1.5 border-b flex gap-1 overflow-x-auto nx-hide-scrollbar"
                        style={{ borderColor: "rgba(43,62,232,0.14)" }}>
                        {STICKER_PACKS.map(p => (
                            <button key={p.key} onClick={() => setActivePack(p.key)}
                                className="flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold transition"
                                style={activePack === p.key ? {
                                    background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff",
                                } : {
                                    background: "rgba(43,62,232,0.06)", color: "rgba(140,160,210,0.80)",
                                    border: "1px solid rgba(43,62,232,0.15)",
                                }}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Sticker grid */}
                <div className="flex-1 overflow-y-auto nx-scrollbar p-3">
                    <div className="grid grid-cols-5 gap-2">
                        {all.map((e, i) => (
                            <button key={`${e}-${i}`}
                                onClick={() => onPick(stickerUrl(e), e)}
                                className="aspect-square rounded-lg flex items-center justify-center hover:bg-white/[0.05] active:scale-90 transition-transform">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={stickerUrl(e)} alt={e} draggable={false} loading="lazy"
                                    className="w-12 h-12" />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-2 border-t text-center text-[10px]"
                    style={{ borderColor: "rgba(43,62,232,0.14)", color: "rgba(140,160,210,0.55)" }}>
                    Static sticker set — kelajakda animatsion sticker paketlari ham qo&apos;shiladi
                </div>
            </div>
        </div>
    );
}
