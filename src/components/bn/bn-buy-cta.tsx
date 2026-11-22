"use client";

// Do'kon sahifasida "Xarid qildim" tugmasi + QR skan modal.
// ?buy=1  → "Xarid qildim" modal (mavjud tarixga qo'shish)
// ?scan=1 → 2 tugmali chooser modal (Xarid qilaman | Xarid qildim)
// Tugma — ikkinchi darajali amal: shapka statistikasi qatoridagi matnli havola (BN tokenlari).
// Modallar scroll root'ga portal qilinadi — aks holda pastki navbar (z-50) ularni yopadi.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ShoppingBag, ShoppingCart, X, ChevronRight } from "lucide-react";
import { BnPurchaseModal } from "@/components/bn/bn-purchase-modal";
import { BnLink } from "@/components/bn/bn-nav";
import { BN } from "@/lib/bn-theme";
import { getBnScrollRoot } from "@/components/bn/bn-scroll";

export function BnBuyCta({ shopSlug, shopName }: { shopSlug: string; shopName: string }) {
    const t = useTranslations("bn.shops");
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [chooserOpen, setChooserOpen] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URL(window.location.href).searchParams;
        if (params.get("scan") === "1") {
            setChooserOpen(true);
            const cleaned = new URL(window.location.href);
            cleaned.searchParams.delete("scan");
            window.history.replaceState({}, "", cleaned.toString());
        } else if (params.get("buy") === "1") {
            setPurchaseOpen(true);
            const cleaned = new URL(window.location.href);
            cleaned.searchParams.delete("buy");
            window.history.replaceState({}, "", cleaned.toString());
        }
    }, []);

    return (
        <>
            <button
                onClick={() => setPurchaseOpen(true)}
                className="inline-flex items-center gap-1 transition-colors hover:text-[color:var(--bn-gold)]"
                title={t("logPurchaseHint")}
            >
                <ShoppingBag className="w-3.5 h-3.5" />
                {t("logPurchase")}
            </button>

            {purchaseOpen && createPortal(
                <BnPurchaseModal
                    shopSlug={shopSlug}
                    shopName={shopName}
                    onClose={() => setPurchaseOpen(false)}
                />,
                getBnScrollRoot() ?? document.body,
            )}

            {chooserOpen && createPortal(
                <ScanChooser
                    shopSlug={shopSlug}
                    shopName={shopName}
                    onPurchase={() => { setChooserOpen(false); setPurchaseOpen(true); }}
                    onClose={() => setChooserOpen(false)}
                />,
                getBnScrollRoot() ?? document.body,
            )}
        </>
    );
}

function ScanChooser({
    shopSlug, shopName, onPurchase, onClose,
}: {
    shopSlug: string; shopName: string;
    onPurchase: () => void; onClose: () => void;
}) {
    const t = useTranslations("bn.shopPage");
    return (
        <div className="bn-overlay-in fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
                className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden"
                style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text }}
            >
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${BN.border}` }}>
                    <div>
                        <div className="text-sm font-semibold">{shopName}</div>
                        <div className="text-xs" style={{ color: BN.text3 }}>{t("scanOk")}</div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded transition-opacity hover:opacity-70" style={{ color: BN.text2 }}>
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-2">
                    <p className="text-xs mb-2" style={{ color: BN.text2 }}>
                        {t("scanQuestion")}
                    </p>

                    {/* Xarid qilaman — For Pay bilan */}
                    <BnLink
                        href={`/d/${shopSlug}`}
                        onClick={onClose}
                        className="flex items-center gap-3 p-3 rounded-xl transition-opacity hover:opacity-90"
                        style={{ background: BN.goldSoft, border: `1px solid ${BN.goldEdge}` }}
                    >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: BN.gold, color: BN.onGold }}>
                            <ShoppingCart className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">{t("scanBuy")}</div>
                            <div className="text-xs" style={{ color: BN.text2 }}>
                                {t("scanBuyHint")}
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4" style={{ color: BN.text3 }} />
                    </BnLink>

                    {/* Xarid qildim — tarixga */}
                    <button
                        onClick={onPurchase}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-opacity hover:opacity-90"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}
                    >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: BN.surface, color: BN.text2 }}>
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">{t("scanBought")}</div>
                            <div className="text-xs" style={{ color: BN.text2 }}>
                                {t("scanBoughtHint")}
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4" style={{ color: BN.text3 }} />
                    </button>
                </div>

                <div className="px-4 pb-3 text-[11px]" style={{ color: BN.text3 }}>
                    {t("scanFoot")}
                </div>
            </div>
        </div>
    );
}
