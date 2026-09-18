"use client";

// Sotuvchi mahsulot mosligini tahrirlash — mavjud mahsulotга mashina moslik +
// qism raqamini qo'shish/o'zgartirish. BnFitSelector qayta ishlatiladi.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Check } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { bnToast } from "./bn-toast";
import { BnFitSelector, type FitModel } from "./bn-fit-selector";

export function BnEditFitModal({
    productId, productTitle, onClose, onSaved,
}: {
    productId: string;
    productTitle: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [universalFit, setUniversalFit] = useState(false);
    const [fits, setFits] = useState<FitModel[]>([]);
    const [partNumber, setPartNumber] = useState("");
    const [oemNumbers, setOemNumbers] = useState("");

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await fetch(`/api/bn/seller/products/${productId}`);
                if (r.ok) {
                    const d = await r.json();
                    if (!alive) return;
                    setUniversalFit(!!d.universalFit);
                    setFits(Array.isArray(d.fits) ? d.fits : []);
                    setPartNumber(d.partNumber ?? "");
                    setOemNumbers(Array.isArray(d.oemNumbers) ? d.oemNumbers.join(", ") : "");
                }
            } catch { /* jim */ }
            finally { if (alive) setLoading(false); }
        })();
        return () => { alive = false; };
    }, [productId]);

    async function save() {
        setSaving(true);
        try {
            const r = await fetch(`/api/bn/seller/products/${productId}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    partNumber: partNumber.trim() || null,
                    oemNumbers: oemNumbers.split(",").map(s => s.trim()).filter(Boolean),
                    universalFit,
                    fits: universalFit ? [] : fits.map(f => ({ modelId: f.modelId })),
                }),
            });
            if (r.ok) {
                bnToast("Moslik saqlandi", "success");
                onSaved();
                onClose();
            } else {
                bnToast("Saqlanmadi, qayta urining", "error");
            }
        } catch {
            bnToast("Ulanish xatoligi", "error");
        } finally {
            setSaving(false);
        }
    }

    if (typeof document === "undefined") return null;
    return createPortal(
        <div
            className="bn-overlay-in fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
        >
            <div
                className="bn-sheet-in w-full sm:max-w-[520px] max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 pb-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <div className="min-w-0">
                        <h2 className="text-[16px] font-black">Moslik tahrirlash</h2>
                        <p className="text-[12px] truncate" style={{ color: BN.text3 }}>{productTitle}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10 flex-shrink-0" style={{ color: BN.text3 }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: BN.gold }} /></div>
                    ) : (
                        <BnFitSelector
                            universalFit={universalFit}
                            onUniversalChange={setUniversalFit}
                            fits={fits}
                            onFitsChange={setFits}
                            partNumber={partNumber}
                            onPartNumberChange={setPartNumber}
                            oemNumbers={oemNumbers}
                            onOemChange={setOemNumbers}
                        />
                    )}
                </div>

                <div className="p-3" style={{ borderTop: `1px solid ${BN.border}` }}>
                    <button
                        onClick={save}
                        disabled={saving || loading}
                        className="w-full h-12 rounded-xl text-[15px] font-black flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Saqlash
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
