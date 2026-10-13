"use client";

// Ummi taklif kartasi — qayta-ishlatiladigan in-app yuza (bosh sahifa, AI chat, ...).
// O'zi ma'lumotini oladi (GET /api/ai/suggestions). Taklif yo'q / kirmagan / toggle o'chiq /
// rad etilgan bo'lsa — HECH NARSA ko'rsatmaydi (joy egallamaydi, anti-spam jim).
// Dizayn: global tema tokenlari (bg-card/foreground/...) — light/dark + AI monoxromga o'zi moslanadi.

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { X, ArrowRight } from "lucide-react";

interface Suggestion { id: string; kind: string; title: string; body: string; url: string; }

export function UmmiTip({ className = "" }: { className?: string }) {
    const t = useTranslations("ummi");
    const [s, setS] = useState<Suggestion | null>(null);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        let alive = true;
        fetch("/api/ai/suggestions", { cache: "no-store" })
            .then(r => (r.ok ? r.json() : null))
            .then(d => {
                if (alive && d?.suggestion) {
                    setS(d.suggestion);
                    patch(d.suggestion.id, "SEEN");
                }
            })
            .catch(() => { /* jim — yuza ixtiyoriy */ });
        return () => { alive = false; };
    }, []);

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

    const openInner = (
        <>
            {t("open")} <ArrowRight className="w-3.5 h-3.5" />
        </>
    );
    const openCls = "inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline";

    return (
        <div className={`relative flex items-start gap-3 rounded-2xl border border-border bg-card/80 backdrop-blur p-3.5 shadow-sm ${className}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/mascot/ummi.webp"
                alt="Ummi"
                width={40}
                height={40}
                className="w-10 h-10 rounded-xl object-contain shrink-0"
            />
            <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wide text-primary/80 mb-0.5">
                    {t("eyebrow")}
                </div>
                <div className="text-sm font-bold text-foreground leading-snug">{s.title}</div>
                <div className="text-xs text-muted-foreground leading-snug mt-0.5">{s.body}</div>
                <div className="mt-2">
                    {external ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" onClick={onOpen} className={openCls}>
                            {openInner}
                        </a>
                    ) : (
                        <Link href={s.url} onClick={onOpen} className={openCls}>
                            {openInner}
                        </Link>
                    )}
                </div>
            </div>
            <button
                onClick={onDismiss}
                aria-label={t("dismiss")}
                title={t("dismiss")}
                className="shrink-0 -mt-1 -mr-1 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
