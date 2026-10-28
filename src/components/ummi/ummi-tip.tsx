"use client";

// Ummi taklif kartasi — qayta-ishlatiladigan in-app yuza (bosh sahifa, AI chat, Market, eSport, Nexus...).
// O'zi ma'lumotini oladi (GET /api/ai/suggestions). Taklif yo'q / kirmagan / toggle o'chiq /
// rad etilgan bo'lsa — HECH NARSA ko'rsatmaydi (joy egallamaydi, anti-spam jim).
// variant — modul temasiga moslash:
//   "default" (global tokenlar: bosh sahifa/AI — AI o'zi monoxromga override qiladi)
//   "nexus"   (--nx-* dizayn tizimi)
//   "esport"  (--es-* dizayn tizimi, .es-bg scope)

import { useEffect, useState, type CSSProperties } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { X, ArrowRight, HelpCircle } from "lucide-react";
import { UmmiPose } from "@/components/ummi/ummi-pose";
import { pickUmmiPose } from "@/lib/ummi-poses";

interface Suggestion { id: string; kind: string; title: string; body: string; url: string; params?: Record<string, string>; }
type Variant = "default" | "nexus" | "esport";

interface VariantStyle {
    card: CSSProperties;
    eyebrow: CSSProperties;
    title: CSSProperties;
    body: CSSProperties;
    link: CSSProperties;
    dismiss: CSSProperties;
}

const VARIANTS: Record<Exclude<Variant, "default">, VariantStyle> = {
    nexus: {
        card: { background: "var(--nx-surface)", border: "1px solid var(--nx-border)" },
        eyebrow: { color: "var(--nx-accent)" },
        title: { color: "var(--nx-text)" },
        body: { color: "var(--nx-text-2)" },
        link: { color: "var(--nx-accent)" },
        dismiss: { color: "var(--nx-text-3)" },
    },
    esport: {
        card: { background: "var(--es-card)", border: "1px solid var(--es-card-bd)", backdropFilter: "blur(8px)" },
        eyebrow: { color: "var(--es-c1)" },
        title: { color: "var(--es-fg)" },
        body: { color: "var(--es-mut)" },
        link: { color: "var(--es-c1)" },
        dismiss: { color: "var(--es-mut)" },
    },
};

export function UmmiTip({ className = "", variant = "default" }: { className?: string; variant?: Variant }) {
    const t = useTranslations("ummi");
    const locale = useLocale();
    const [s, setS] = useState<Suggestion | null>(null);
    const [hidden, setHidden] = useState(false);
    const [showWhy, setShowWhy] = useState(false);

    useEffect(() => {
        let alive = true;
        fetch(`/api/ai/suggestions?locale=${encodeURIComponent(locale)}`, { cache: "no-store" })
            .then(r => (r.ok ? r.json() : null))
            .then(d => {
                if (alive && d?.suggestion) {
                    setS(d.suggestion);
                    patch(d.suggestion.id, "SEEN");
                }
            })
            .catch(() => { /* jim — yuza ixtiyoriy */ });
        return () => { alive = false; };
    }, [locale]);

    function patch(id: string, status: "SEEN" | "DISMISSED" | "ACTED") {
        fetch(`/api/ai/suggestions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
            keepalive: true,
        }).catch(() => { /* jim */ });
    }

    if (!s || hidden) return null;

    const external = /^https?:\/\//.test(s.url);
    const onOpen = () => patch(s.id, "ACTED");
    const onDismiss = () => { setHidden(true); patch(s.id, "DISMISSED"); };

    // Matn tilga mos — kind + GET bergan params shabloni bilan (saqlangan uz matn fallback).
    let title = s.title, body = s.body;
    const KNOWN = ["belis", "nexus", "bn", "profile", "cart", "pricedrop"];
    if (KNOWN.includes(s.kind)) {
        try {
            const P = s.params ?? {};
            title = t(`s.${s.kind}.title`, P);
            body = t(`s.${s.kind}.body`, P);
        } catch {
            title = s.title; body = s.body;   // shablon/param yetmasa — saqlangan matn
        }
    }

    // "Nega bu taklif?" — shaffoflik (kind'ga mos sabab, params bilan)
    let reason = "";
    try { reason = t(`why.${s.kind}`, s.params ?? {}); } catch { reason = ""; }

    const v = variant === "default" ? null : VARIANTS[variant];

    // Default — global tema tokenlari (Tailwind klasslari); nexus/esport — inline modul tokenlari.
    const cardCls = variant === "default"
        ? "border border-border bg-card/80 backdrop-blur"
        : "";
    const eyebrowCls = variant === "default" ? "text-primary/80" : "";
    const titleCls = variant === "default" ? "text-foreground" : "";
    const bodyCls = variant === "default" ? "text-muted-foreground" : "";
    const linkCls = variant === "default" ? "text-primary" : "";
    const dismissCls = variant === "default" ? "text-muted-foreground hover:text-foreground hover:bg-foreground/5" : "hover:opacity-70";

    const openInner = (<>{t("open")} <ArrowRight className="w-3.5 h-3.5" /></>);
    const openCls = `inline-flex items-center gap-1 text-xs font-bold hover:underline ${linkCls}`;

    return (
        <div
            className={`relative flex items-start gap-3 rounded-2xl p-3.5 shadow-sm ${cardCls} ${className}`}
            style={v?.card}
        >
            <UmmiPose pose={pickUmmiPose({ kind: s.kind })} size={44} className="w-11 h-11 shrink-0 -mt-0.5" />
            <div className="min-w-0 flex-1">
                <div className={`text-[11px] font-bold uppercase tracking-wide mb-0.5 ${eyebrowCls}`} style={v?.eyebrow}>
                    {t("eyebrow")}
                </div>
                <div className={`text-sm font-bold leading-snug ${titleCls}`} style={v?.title}>{title}</div>
                <div className={`text-xs leading-snug mt-0.5 ${bodyCls}`} style={v?.body}>{body}</div>
                <div className="mt-2 flex items-center gap-3">
                    {external ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={onOpen} className={openCls} style={v?.link}>
                            {openInner}
                        </a>
                    ) : (
                        <Link href={s.url} onClick={onOpen} className={openCls} style={v?.link}>
                            {openInner}
                        </Link>
                    )}
                    {reason && (
                        <button
                            onClick={() => setShowWhy(w => !w)}
                            className={`inline-flex items-center gap-1 text-[11px] hover:underline ${bodyCls}`}
                            style={v?.body}
                        >
                            <HelpCircle className="w-3 h-3" /> {t("whyLabel")}
                        </button>
                    )}
                </div>
                {reason && showWhy && (
                    <div className={`text-[11px] leading-snug mt-1.5 ${bodyCls}`} style={v?.body}>
                        {reason}
                    </div>
                )}
            </div>
            <button
                onClick={onDismiss}
                aria-label={t("dismiss")}
                title={t("dismiss")}
                className={`shrink-0 -mt-1 -mr-1 p-1.5 rounded-lg transition-colors ${dismissCls}`}
                style={v?.dismiss}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
