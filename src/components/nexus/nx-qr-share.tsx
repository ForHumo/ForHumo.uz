"use client";

import { useState } from "react";
import { X, QrCode, Copy, Check, Download, Share2 } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Simple QR-like visual (pure CSS — no external lib)
// Each row is a pre-defined pattern for the mock
// ─────────────────────────────────────────────────────────────────────────────
const QR_PATTERN: number[][] = [
    [1,1,1,1,1,1,1,0,1,0,1,0,0,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,0,0,1,0,1,1,1,0,1],
    [1,0,1,1,1,0,1,0,1,1,0,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0],
    [1,1,0,1,1,0,1,1,0,0,1,0,1,1,1,0,1,1,0,1,0],
    [0,1,1,0,0,1,0,0,1,1,0,1,0,0,1,1,0,1,1,0,1],
    [1,0,1,0,1,0,1,0,0,1,1,0,1,0,0,1,1,0,1,0,1],
    [0,1,0,1,0,1,0,1,0,0,1,1,0,1,1,0,0,1,0,1,0],
    [1,0,1,0,1,0,1,0,1,0,0,1,1,0,0,1,1,0,1,0,1],
    [0,0,0,0,0,0,0,0,1,0,1,1,0,0,1,0,1,1,0,0,1],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,0,1,0,1,1,0],
    [1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,1,0,1,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,1,0,1,1,0],
    [1,0,1,1,1,0,1,0,1,0,0,1,0,1,0,1,0,1,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,0,1,1,0,1],
    [1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,1,0,0,1,0],
    [1,1,1,1,1,1,1,0,0,1,1,0,1,0,0,1,0,1,1,0,1],
];

function QrVisual({ color }: { color: string }) {
    const cellSize = 10;
    return (
        <div className="rounded-xl overflow-hidden p-3"
            style={{ background: "white", display: "inline-block" }}>
            <div style={{ display: "grid", gridTemplateRows: `repeat(${QR_PATTERN.length}, ${cellSize}px)` }}>
                {QR_PATTERN.map((row, ri) => (
                    <div key={ri} style={{ display: "flex" }}>
                        {row.map((cell, ci) => (
                            <div key={ci} style={{
                                width: cellSize, height: cellSize,
                                background: cell ? color : "white",
                            }} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// NxQrShare
// ─────────────────────────────────────────────────────────────────────────────
const PROFILE_URL = "https://nexus.humo.uz/@user";

export function NxQrShare() {
    const { qrShareOpen, setQrShareOpen } = useNxPlayer();
    const [copied, setCopied] = useState(false);
    const [qrColor, setQrColor] = useState("#2B3EE8");

    const COLOR_PRESETS = ["#2B3EE8", "#8B5CF6", "#10B981", "#EF4444", "#F97316", "#000000"];

    const copyLink = () => {
        navigator.clipboard.writeText(PROFILE_URL).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!qrShareOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[60]"
                style={{ background: "rgba(5,8,24,0.82)", backdropFilter: "blur(10px)" }}
                onClick={() => setQrShareOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[60] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[380px] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                            <QrCode className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-black text-white">Profil QR kodi</h2>
                    </div>
                    <button onClick={() => setQrShareOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* QR code */}
                <div className="flex flex-col items-center gap-5 px-5 pb-6">
                    <div className="flex flex-col items-center gap-3 p-5 rounded-2xl w-full"
                        style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.16)" }}>
                        <QrVisual color={qrColor} />
                        <div className="text-center">
                            <p className="text-sm font-black text-white">@user</p>
                            <p className="text-[10px] mt-0.5" style={{ color: "rgba(80,100,150,0.70)" }}>
                                nexus.humo.uz/@user
                            </p>
                        </div>
                    </div>

                    {/* Color presets */}
                    <div>
                        <p className="text-[9px] font-bold text-center mb-2"
                            style={{ color: "rgba(80,100,150,0.70)" }}>QR rangi</p>
                        <div className="flex gap-2 justify-center">
                            {COLOR_PRESETS.map(c => (
                                <button key={c}
                                    onClick={() => setQrColor(c)}
                                    className="w-7 h-7 rounded-full transition-all duration-200"
                                    style={{
                                        background: c,
                                        outline: qrColor === c ? `3px solid rgba(255,255,255,0.60)` : "none",
                                        outlineOffset: 2,
                                    }} />
                            ))}
                        </div>
                    </div>

                    {/* URL copy */}
                    <div className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <span className="flex-1 text-xs truncate" style={{ color: "rgba(140,160,210,0.85)" }}>
                            {PROFILE_URL}
                        </span>
                        <button onClick={copyLink}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                            style={copied ? {
                                background: "rgba(16,185,129,0.15)",
                                color: "#10B981",
                            } : {
                                background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)",
                                color: "white",
                            }}>
                            {copied ? <><Check className="w-3 h-3" /> Nusxalandi</> : <><Copy className="w-3 h-3" /> Nusxa</>}
                        </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 w-full">
                        <button
                            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all duration-150"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)", color: "white" }}>
                            <Download className="w-3.5 h-3.5" />
                            Saqlash
                        </button>
                        <button
                            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all duration-150"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)", color: "rgba(140,160,210,0.85)" }}>
                            <Share2 className="w-3.5 h-3.5" />
                            Ulashish
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
