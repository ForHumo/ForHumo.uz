"use client";

// BN mahsulot qaytarish — 4-qadamli wizard (K3).
// Xaridor buyurtma detail sahifasida "Qaytarish" tugmani bosadi.
// API: POST /api/bn/returns { orderId, reason, detail?, images? }

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
    X, ChevronRight, ChevronLeft, Loader2, CheckCircle2, RotateCw, ImagePlus, Trash2, Wallet, Repeat,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { BN } from "@/lib/bn-theme";

type Step = 1 | 2 | 3 | 4 | 5;
type Method = "refund" | "exchange";

const REASONS: Array<{ key: string; labelKey: string }> = [
    { key: "quality",    labelKey: "reasonQuality" },
    { key: "wrong",      labelKey: "reasonWrong" },
    { key: "broken",     labelKey: "reasonBroken" },
    { key: "notAsDesc",  labelKey: "reasonNotAsDesc" },
    { key: "other",      labelKey: "reasonOther" },
];

export function BnReturnButton({ orderId, orderCode }: { orderId: string; orderCode: string }) {
    const [open, setOpen] = useState(false);
    const t = useTranslations("bn.return");
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-black"
                style={{ background: BN.errSoft, color: BN.err }}
            >
                <RotateCw className="w-3.5 h-3.5" />
                {t("openBtn")}
            </button>
            {open && <BnReturnModal orderId={orderId} orderCode={orderCode} onClose={() => setOpen(false)} />}
        </>
    );
}

function BnReturnModal({ orderId, orderCode, onClose }: {
    orderId: string;
    orderCode: string;
    onClose: () => void;
}) {
    const t = useTranslations("bn.return");
    const [step, setStep] = useState<Step>(1);
    const [reasonKey, setReasonKey] = useState<string | null>(null);
    const [detail, setDetail] = useState("");
    const [images, setImages] = useState<string[]>([]);
    const [method, setMethod] = useState<Method>("refund");
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);

    async function upload(file: File) {
        if (images.length >= 5) return;
        setUploading(true); setErr(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("kind", "return");
            const r = await fetch("/api/bn/upload", { method: "POST", body: fd });
            const d = await r.json();
            if (r.ok && d?.url) setImages(prev => [...prev, d.url]);
            else setErr(t("errImage"));
        } catch { setErr(t("errImage")); }
        finally { setUploading(false); }
    }

    async function submit() {
        if (!reasonKey) return;
        setSubmitting(true); setErr(null);
        try {
            const reasonLabel = t(REASONS.find(r => r.key === reasonKey)!.labelKey);
            const methodLine = `\n\n[${method === "refund" ? t("methodRefund") : t("methodExchange")}]`;
            const finalDetail = (detail.trim() + methodLine).trim();
            const r = await fetch("/api/bn/returns", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ orderId, reason: reasonLabel, detail: finalDetail, images }),
            });
            const d = await r.json();
            if (r.ok && d?.ok !== false) setStep(5);
            else setErr(d?.error === "reason_short" ? t("errShort") : d?.error === "order_not_found" ? t("errNoOrder") : d?.error ?? "Xatolik");
        } catch { setErr("Tarmoq xatosi"); }
        finally { setSubmitting(false); }
    }

    if (!mounted) return null;

    const canNext = step === 1 ? !!reasonKey : step === 2 ? true : step === 3 ? true : false;

    const content = (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-2 sm:p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <span
                        className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.errSoft, color: BN.err }}
                    >
                        <RotateCw className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[14.5px] font-black">{t("modalTitle")}</p>
                        <p className="text-[11.5px]" style={{ color: BN.text3 }}>
                            #{orderCode} · {step <= 4 ? `${step}/4` : ""}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1" style={{ color: BN.text3 }}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress */}
                {step <= 4 && (
                    <div className="h-1 flex-shrink-0" style={{ background: `${BN.text3}22` }}>
                        <div
                            className="h-full transition-all"
                            style={{ width: `${(step / 4) * 100}%`, background: BN.gold }}
                        />
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {step === 1 && (
                        <div>
                            <h3 className="text-[15px] font-black mb-3">{t("step1Title")}</h3>
                            <div className="space-y-2">
                                {REASONS.map(r => (
                                    <button
                                        key={r.key}
                                        onClick={() => setReasonKey(r.key)}
                                        className="w-full text-left p-3.5 rounded-xl text-[13px] font-bold transition-colors"
                                        style={{
                                            background: reasonKey === r.key ? BN.goldSoft : BN.surfaceUp,
                                            color: reasonKey === r.key ? BN.gold : BN.text,
                                            border: `1px solid ${reasonKey === r.key ? BN.borderGold : BN.border}`,
                                        }}
                                    >
                                        {t(r.labelKey)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h3 className="text-[15px] font-black mb-3">{t("step2Title")}</h3>
                            <textarea
                                value={detail}
                                onChange={(e) => setDetail(e.target.value.slice(0, 2000))}
                                rows={4}
                                placeholder={t("detailPlaceholder")}
                                className="w-full p-3 rounded-xl text-[13px] resize-none focus:outline-none mb-3"
                                style={{
                                    background: BN.surfaceUp,
                                    color: BN.text,
                                    border: `1px solid ${BN.border}`,
                                }}
                            />

                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) upload(f);
                                    e.target.value = "";
                                }}
                            />

                            <div className="grid grid-cols-3 gap-2">
                                {images.map((url, i) => (
                                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden" style={{ background: BN.surfaceUp }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                            className="absolute top-1 right-1 w-7 h-7 rounded-full grid place-items-center"
                                            style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                                            aria-label="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {images.length < 5 && (
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        disabled={uploading}
                                        className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold disabled:opacity-60"
                                        style={{
                                            background: BN.surfaceUp,
                                            color: BN.text2,
                                            border: `1px dashed ${BN.border}`,
                                        }}
                                    >
                                        {uploading
                                            ? <Loader2 className="w-5 h-5 animate-spin" />
                                            : <><ImagePlus className="w-5 h-5" /><span>{t("addPhotos")}</span></>}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h3 className="text-[15px] font-black mb-3">{t("step3Title")}</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setMethod("refund")}
                                    className="w-full text-left p-4 rounded-xl transition-colors"
                                    style={{
                                        background: method === "refund" ? BN.goldSoft : BN.surfaceUp,
                                        border: `1px solid ${method === "refund" ? BN.borderGold : BN.border}`,
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                                            style={{ background: method === "refund" ? BN.gold : BN.surface, color: method === "refund" ? BN.onGold : BN.text }}
                                        >
                                            <Wallet className="w-4 h-4" />
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-[14px] font-black">{t("methodRefund")}</p>
                                            <p className="text-[12px] mt-0.5" style={{ color: BN.text3 }}>{t("methodRefundSub")}</p>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setMethod("exchange")}
                                    className="w-full text-left p-4 rounded-xl transition-colors"
                                    style={{
                                        background: method === "exchange" ? BN.goldSoft : BN.surfaceUp,
                                        border: `1px solid ${method === "exchange" ? BN.borderGold : BN.border}`,
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                                            style={{ background: method === "exchange" ? BN.gold : BN.surface, color: method === "exchange" ? BN.onGold : BN.text }}
                                        >
                                            <Repeat className="w-4 h-4" />
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-[14px] font-black">{t("methodExchange")}</p>
                                            <p className="text-[12px] mt-0.5" style={{ color: BN.text3 }}>{t("methodExchangeSub")}</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && reasonKey && (
                        <div>
                            <h3 className="text-[15px] font-black mb-3">{t("step4Title")}</h3>
                            <div className="p-4 rounded-xl space-y-2.5" style={{ background: BN.surfaceUp }}>
                                <Row label={t("reviewOrder")} value={`#${orderCode}`} />
                                <Row label={t("reviewReason")} value={t(REASONS.find(r => r.key === reasonKey)!.labelKey)} />
                                <Row label={t("reviewMethod")} value={method === "refund" ? t("methodRefund") : t("methodExchange")} />
                                {images.length > 0 && <Row label={t("reviewImages")} value={`${images.length}`} />}
                                {detail.trim() && (
                                    <p className="text-[12.5px] pt-2 border-t" style={{ borderColor: BN.border, color: BN.text2 }}>
                                        {detail}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="text-center py-8">
                            <span
                                className="w-16 h-16 rounded-full grid place-items-center mx-auto mb-4"
                                style={{ background: `${BN.ok}22`, color: BN.ok }}
                            >
                                <CheckCircle2 className="w-8 h-8" />
                            </span>
                            <p className="text-[18px] font-black mb-1">{t("successTitle")}</p>
                            <p className="text-[13px]" style={{ color: BN.text3 }}>{t("successSub")}</p>
                        </div>
                    )}

                    {err && (
                        <p className="mt-3 text-[12.5px] p-3 rounded-lg" style={{ background: BN.errSoft, color: BN.err }}>{err}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2 p-4 flex-shrink-0" style={{ borderTop: `1px solid ${BN.border}` }}>
                    {step > 1 && step < 5 && (
                        <button
                            onClick={() => setStep(s => (Math.max(1, (s as number) - 1)) as Step)}
                            className="h-11 px-4 rounded-xl text-[13px] font-black flex items-center gap-1"
                            style={{ background: BN.surfaceUp, color: BN.text }}
                        >
                            <ChevronLeft className="w-4 h-4" /> {t("backBtn")}
                        </button>
                    )}
                    {step < 4 && (
                        <button
                            onClick={() => setStep(s => Math.min(4, s + 1) as Step)}
                            disabled={!canNext}
                            className="ml-auto h-11 px-5 rounded-xl text-[13px] font-black flex items-center gap-1 disabled:opacity-60"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            {t("nextBtn")} <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                    {step === 4 && (
                        <button
                            onClick={submit}
                            disabled={submitting}
                            className="ml-auto h-11 px-5 rounded-xl text-[13px] font-black flex items-center gap-2 disabled:opacity-60"
                            style={{ background: BN.err, color: "#fff" }}
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> {t("submitBtn")}</>}
                        </button>
                    )}
                    {step === 5 && (
                        <button
                            onClick={onClose}
                            className="w-full h-11 rounded-xl text-[13px] font-black"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            {t("closeBtn")}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-[13px]">
            <span style={{ color: BN.text3 }}>{label}</span>
            <span className="font-black">{value}</span>
        </div>
    );
}
