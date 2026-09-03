"use client";

// BN mahsulot sahifasi pastida referral CTA (M4).
// Auth qilingan foydalanuvchiga o'z referral kodi + share tugmalari.
// Anonim → Google signIn CTA.
//
// Har mahsulot uchun URL formatlanadi: bozornarxida.uz/p/<slug>?ref=<code>&utm_*.

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Gift, Share2, MessageCircle, Copy, Check, LogIn } from "lucide-react";
import { BN } from "@/lib/bn-theme";

interface Props {
    productSlug: string;
    productTitle: string;
}

interface ReferralInfo {
    code: string | null;
    url: string | null;
    rewarded: number;
    totalEarned: number;
}

export function BnProductReferralCta({ productSlug, productTitle }: Props) {
    const { status } = useSession();
    const t = useTranslations("bn.productRef");
    const [ref, setRef] = useState<ReferralInfo | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (status !== "authenticated") return;
        fetch("/api/bn/referral", { cache: "no-store" })
            .then(r => r.json())
            .then((d: ReferralInfo) => {
                if (d?.code) setRef(d);
            })
            .catch(() => {});
    }, [status]);

    if (status === "loading") return null;

    // Anonim — signIn CTA
    if (status === "unauthenticated") {
        return (
            <div
                className="rounded-3xl p-5 mt-6"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
            >
                <div className="flex items-start gap-3">
                    <span
                        className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <Gift className="w-5 h-5" />
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-black">{t("anonTitle")}</p>
                        <p className="text-[12.5px] mt-1" style={{ color: BN.text2 }}>{t("anonSubtitle")}</p>
                        <button
                            onClick={() => signIn("google")}
                            className="mt-3 h-11 px-5 rounded-xl text-[13px] font-black inline-flex items-center gap-1.5"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            <LogIn className="w-4 h-4" />
                            {t("anonBtn")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!ref?.code) return null;

    // Mahsulot uchun personallashtirilgan URL
    const productUrl = `https://bozornarxida.uz/p/${productSlug}?ref=${encodeURIComponent(ref.code)}&utm_source=referral&utm_medium=product_share&utm_campaign=viral`;
    const shareText = t("shareMessage", { product: productTitle });
    const fullText = `${shareText}\n\n${productUrl}`;

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(productUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* noop */ }
    }

    function shareVia(channel: "telegram" | "whatsapp") {
        const url = channel === "telegram"
            ? `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`
            : `https://wa.me/?text=${encodeURIComponent(fullText)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    }

    return (
        <div
            className="rounded-3xl p-5 mt-6"
            style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
        >
            <div className="flex items-start gap-3 mb-4">
                <span
                    className="w-11 h-11 rounded-2xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}
                >
                    <Gift className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black">{t("authTitle")}</p>
                    <p className="text-[12.5px] mt-1" style={{ color: BN.text2 }}>{t("authSubtitle")}</p>
                </div>
                {ref.rewarded > 0 && (
                    <div
                        className="px-2.5 py-1 rounded-lg text-[11px] font-black tabular-nums flex-shrink-0"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        {t("earnedShort", { n: ref.rewarded })}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={() => shareVia("telegram")}
                    className="h-11 rounded-xl text-[12px] font-black flex flex-col items-center justify-center gap-0.5"
                    style={{ background: "#229ED9", color: "#fff" }}
                >
                    <Share2 className="w-4 h-4" />
                    Telegram
                </button>
                <button
                    onClick={() => shareVia("whatsapp")}
                    className="h-11 rounded-xl text-[12px] font-black flex flex-col items-center justify-center gap-0.5"
                    style={{ background: "#25D366", color: "#fff" }}
                >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                </button>
                <button
                    onClick={copyLink}
                    className="h-11 rounded-xl text-[12px] font-black flex flex-col items-center justify-center gap-0.5"
                    style={{ background: copied ? BN.ok : BN.surfaceUp, color: copied ? "#fff" : BN.text }}
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? t("copied") : t("copy")}
                </button>
            </div>
        </div>
    );
}
