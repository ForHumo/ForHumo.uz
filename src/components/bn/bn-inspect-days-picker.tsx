"use client";

// BN "Ko'rib olish" band muddatini tanlash — 1-7 kun. 1-kun bepul, keyingi har
// kun mahsulot narxidan +3%. Xaridor aniq narxni ko'rib tanlaydi.

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Info, CheckCircle2 } from "lucide-react";
import { BN } from "@/lib/bn-theme";

export function BnInspectDaysPicker({
    productPrice, onCancel, onConfirm,
}: {
    productPrice: number;
    onCancel: () => void;
    onConfirm: (days: number) => void;
}) {
    const [days, setDays] = useState(1);

    const rows = [1, 2, 3, 4, 5, 6, 7].map(d => {
        const pct = d === 1 ? 0 : (d - 1) * 3;
        const fee = Math.round((productPrice * pct) / 100);
        const total = productPrice + fee;
        return { d, pct, fee, total };
    });
    const selected = rows.find(r => r.d === days)!;

    return createPortal(
        <div className="bn-scope fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-2 sm:p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onCancel}
        >
            <div className="w-full max-w-md rounded-3xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <span className="w-10 h-10 rounded-xl grid place-items-center"
                        style={{ background: BN.goldSoft, color: BN.gold }}>
                        <Clock className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-black">Band muddati</p>
                        <p className="text-[11.5px]" style={{ color: BN.text3 }}>
                            1-kun bepul · Keyingi har kun uchun +3%
                        </p>
                    </div>
                    <button onClick={onCancel} className="p-1" style={{ color: BN.text3 }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Kunlar ro'yxati */}
                <div className="p-3 space-y-1.5 max-h-[50vh] overflow-y-auto">
                    {rows.map(r => (
                        <button
                            key={r.d}
                            onClick={() => setDays(r.d)}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
                            style={{
                                background: days === r.d ? BN.goldSoft : BN.surfaceUp,
                                border: `1px solid ${days === r.d ? BN.borderGold : BN.border}`,
                            }}
                        >
                            <div className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 text-[13px] font-black"
                                style={{
                                    background: days === r.d ? BN.gold : BN.surface,
                                    color: days === r.d ? BN.onGold : BN.text2,
                                }}>
                                {r.d}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[14px] font-bold" style={{ color: BN.text }}>
                                    {r.d} kun {r.pct === 0 && (
                                        <span className="text-[11px] font-black ml-1 px-1.5 py-0.5 rounded"
                                            style={{ background: BN.ok, color: "#fff" }}>BEPUL</span>
                                    )}
                                </div>
                                <div className="text-[11px]" style={{ color: BN.text3 }}>
                                    {r.pct === 0 ? "Qo'shimcha to'lovsiz" : `+${r.pct}% (${r.fee.toLocaleString("uz-UZ")} so'm)`}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[14px] font-black tabular-nums"
                                    style={{ color: days === r.d ? BN.gold : BN.text }}>
                                    {r.total.toLocaleString("uz-UZ")}
                                </div>
                                <div className="text-[10px]" style={{ color: BN.text3 }}>so&apos;m</div>
                            </div>
                            {days === r.d && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: BN.gold }} />}
                        </button>
                    ))}
                </div>

                {/* Info */}
                <div className="mx-3 mb-3 p-3 rounded-xl flex items-start gap-2 text-[11.5px]"
                    style={{ background: BN.surfaceUp, color: BN.text2 }}>
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: BN.gold }} />
                    <span>
                        Sotib olsangiz, band muddati narxiga qo&apos;shiladi. Bekor qilsangiz —
                        pul olinmaydi, mahsulot boshqalarga sotuvga qaytadi.
                    </span>
                </div>

                {/* Actions */}
                <div className="p-4 flex items-center gap-2" style={{ borderTop: `1px solid ${BN.border}` }}>
                    <button
                        onClick={onCancel}
                        className="flex-1 h-11 rounded-xl text-[13px] font-bold"
                        style={{ background: BN.surfaceUp, color: BN.text2 }}
                    >
                        Bekor
                    </button>
                    <button
                        onClick={() => onConfirm(days)}
                        className="flex-[2] h-11 rounded-xl text-[13px] font-black flex items-center justify-center gap-2"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        {days} kun band qilish · {selected.total.toLocaleString("uz-UZ")} so&apos;m
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
