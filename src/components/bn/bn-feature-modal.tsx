"use client";

// BN Featured Listing modal — sotuvchi mahsulotni 24/72/168 soatga
// top-search'da yuqoriga chiqarish uchun to'laydi.
// Product detail sahifasida sotuvchi egasi bo'lsa "Boost qilish" tugmasi.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { X, Rocket, Loader2, CheckCircle2, Clock } from "lucide-react";
import { BN } from "@/lib/bn-theme";
import { formatMoney } from "@/lib/money";

interface Pricing { hours: number; amount: number; labelUz: string; labelRu: string; labelEn: string; }
interface Active { id: string; paidAmount: number; startsAt: string; expiresAt: string; }
interface Data { active: Active | null; pricing: readonly Pricing[]; }

export function BnFeatureButton({ productSlug }: { productSlug: string }) {
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<Data | null>(null);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const t = (u: string, r: string, e: string) => locale === "ru" ? r : locale === "en" ? e : u;

    useEffect(() => {
        if (!open) return;
        (async () => {
            try {
                const r = await fetch(`/api/bn/products/${productSlug}/feature`);
                if (!r.ok) throw new Error();
                setData(await r.json());
            } catch {
                setData(null);
            }
        })();
    }, [open, productSlug]);

    async function buy(hours: number) {
        setBusy(true); setErr(null);
        try {
            const r = await fetch(`/api/bn/products/${productSlug}/feature`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hours }),
            });
            const d = await r.json();
            if (!r.ok) {
                setErr(d?.error === "insufficient_balance"
                    ? t("Hamyonda pul yetmadi", "Недостаточно средств", "Insufficient balance")
                    : t("Xatolik", "Ошибка", "Error"));
                return;
            }
            setDone(true);
            setTimeout(() => { setOpen(false); setDone(false); }, 1500);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-semibold"
                style={{ background: "linear-gradient(135deg, #F5B301, #B8951F)", color: BN.onGold }}
            >
                <Rocket className="w-4 h-4" />
                {t("Boost qilish", "Продвинуть", "Boost")}
            </button>

            {open && typeof document !== "undefined" && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.65)" }}
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="w-full max-w-[460px] rounded-2xl overflow-hidden"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 flex items-start justify-between gap-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
                            <div>
                                <div className="text-[16px] font-bold flex items-center gap-2" style={{ color: BN.text }}>
                                    <Rocket className="w-5 h-5" style={{ color: BN.gold }} />
                                    {t("Mahsulotni boost qiling", "Продвиньте товар", "Boost your product")}
                                </div>
                                <div className="text-[13px] mt-1" style={{ color: BN.text2 }}>
                                    {t("Qidiruv natijalarida yuqorida turadi", "Показывается вверху поиска", "Appears on top of search")}
                                </div>
                            </div>
                            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/5" style={{ color: BN.text3 }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {data?.active ? (
                            <div className="p-5 flex flex-col items-center gap-2">
                                <Clock className="w-10 h-10" style={{ color: BN.gold }} />
                                <div className="text-[14px] font-semibold text-center" style={{ color: BN.text }}>
                                    {t("Boost aktiv", "Продвижение активно", "Boost active")}
                                </div>
                                <div className="text-[12px] text-center" style={{ color: BN.text3 }}>
                                    {t("Tugash", "Окончание", "Ends")}: {new Date(data.active.expiresAt).toLocaleString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ")}
                                </div>
                            </div>
                        ) : done ? (
                            <div className="p-8 flex flex-col items-center gap-3">
                                <CheckCircle2 className="w-16 h-16" style={{ color: BN.ok }} />
                                <div className="text-[15px] font-semibold" style={{ color: BN.text }}>
                                    {t("Boost yoqildi!", "Продвижение включено!", "Boost activated!")}
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 space-y-3">
                                {data?.pricing.map(p => (
                                    <button
                                        key={p.hours}
                                        onClick={() => buy(p.hours)}
                                        disabled={busy}
                                        className="w-full flex items-center justify-between p-4 rounded-xl transition-colors hover:bg-white/5 disabled:opacity-50"
                                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}
                                    >
                                        <div className="text-left">
                                            <div className="text-[14px] font-bold" style={{ color: BN.text }}>
                                                {locale === "ru" ? p.labelRu : locale === "en" ? p.labelEn : p.labelUz}
                                            </div>
                                            <div className="text-[11px]" style={{ color: BN.text3 }}>
                                                {t("Top qidiruv, oltin badge", "Топ поиск, золотой значок", "Top search, gold badge")}
                                            </div>
                                        </div>
                                        <div className="text-[15px] font-bold" style={{ color: BN.gold }}>
                                            {formatMoney(p.amount, "UZS")}
                                        </div>
                                    </button>
                                ))}
                                {err && <p className="text-[12px] text-center" style={{ color: BN.err }}>{err}</p>}
                                {busy && <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin" style={{ color: BN.gold }} /></div>}
                            </div>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
