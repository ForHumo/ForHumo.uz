"use client";

// Belis shartnoma to'liq matn modali (booking wizard'da "Shartnomani ko'rish").

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileText, Download } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BELIS_CONTRACT_SECTIONS, BELIS_CONTRACT_VERSION, belisContractPlainText } from "@/lib/belis-contract";

export function BelisContractModal({ onClose }: { onClose: () => void }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    function downloadTxt() {
        const blob = new Blob([belisContractPlainText()], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `belis-shartnoma-${BELIS_CONTRACT_VERSION}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(58,53,32,0.65)" }} onClick={onClose}>
            <div className="w-full sm:max-w-lg max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${BELIS.border}` }}>
                    <span className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        <FileText className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-black" style={{ color: BELIS.text }}>Sarpo ijara shartnomasi</p>
                        <p className="text-[11.5px]" style={{ color: BELIS.text3 }}>Versiya: {BELIS_CONTRACT_VERSION}</p>
                    </div>
                    <button onClick={onClose} className="p-1" style={{ color: BELIS.text3 }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {BELIS_CONTRACT_SECTIONS.map(s => (
                        <section key={s.n}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-7 h-7 rounded-lg grid place-items-center text-[11px] font-black flex-shrink-0"
                                    style={{ background: BELIS.goldSoft, color: BELIS.onGold }}>
                                    {s.n}
                                </span>
                                <h3 className="text-[13.5px] font-black" style={{ color: BELIS.text }}>{s.title}</h3>
                            </div>
                            <ul className="space-y-1.5 pl-9">
                                {s.items.map((it, i) => (
                                    <li key={i} className="text-[12.5px] leading-relaxed relative"
                                        style={{ color: BELIS.text2 }}>
                                        <span className="absolute -left-3 top-1.5 w-1 h-1 rounded-full"
                                            style={{ background: BELIS.goldDeep }} />
                                        {it}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 p-4" style={{ borderTop: `1px solid ${BELIS.border}` }}>
                    <button onClick={downloadTxt}
                        className="h-11 px-3 rounded-xl text-[12px] font-black flex items-center gap-1.5"
                        style={{ background: BELIS.bg, color: BELIS.text }}>
                        <Download className="w-4 h-4" /> Yuklash
                    </button>
                    <button onClick={onClose}
                        className="flex-1 h-11 rounded-xl text-[13px] font-black"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        Tushundim
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
