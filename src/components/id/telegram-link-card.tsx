"use client";

// Humo ID → Telegram bog'lash kartochkasi.
// Bir bosishda: kod olinadi → @ForHumo_IDBot deep-link ochiladi (kod avto-yuboriladi) →
// bot avto-bog'laydi va "ulandi + ortga qaytish" xabarini beradi. Karta avto-tekshiradi
// (foydalanuvchi qaytganda o'zi "Bog'langan" holatига o'tadi).

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, ExternalLink, Loader2, Check, X } from "lucide-react";

// Original Telegram logotipi (ko'k doira + oq samolyot)
function TelegramIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <circle cx="12" cy="12" r="12" fill="#229ED9" />
            <path fill="#fff" d="M5.49 11.78 16.4 7.57c.5-.18.95.12.78.89l-1.86 8.78c-.13.6-.49.75-1 .47l-2.76-2.03-1.33 1.28c-.15.15-.27.27-.55.27l.2-2.82 5.12-4.63c.22-.2-.05-.31-.34-.11l-6.33 3.98-2.73-.85c-.59-.19-.6-.59.13-.88z" />
        </svg>
    );
}

interface StatusResp {
    linked: boolean;
    identity: { providerId: string; username: string | null; createdAt: string } | null;
}
interface CodeResp {
    code: string;
    expiresAt: string;
    botUsername: string;
    deepLink: string;
}

export function TelegramLinkCard() {
    const [status, setStatus] = useState<StatusResp | null>(null);
    const [code, setCode] = useState<CodeResp | null>(null);
    const [loading, setLoading] = useState(true);
    const [issuing, setIssuing] = useState(false);
    const [opened, setOpened] = useState(false);
    const [copied, setCopied] = useState(false);
    const [unlinking, setUnlinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<number | null>(null);

    const load = useCallback(async () => {
        try {
            const r = await fetch("/api/user/telegram/status", { cache: "no-store" });
            if (r.ok) {
                const j: StatusResp = await r.json();
                setStatus(j);
                return j.linked;
            }
        } catch { /* noop */ }
        return false;
    }, []);

    useEffect(() => {
        void (async () => { await load(); setLoading(false); })();
    }, [load]);

    // Deep-link ochilgandan keyin avto-tekshirish (3 soniyada, ~2.5 daqiqa)
    useEffect(() => {
        if (!opened) return;
        let ticks = 0;
        pollRef.current = window.setInterval(async () => {
            ticks++;
            const linked = await load();
            if (linked || ticks > 50) {
                if (pollRef.current) window.clearInterval(pollRef.current);
                pollRef.current = null;
                if (linked) { setOpened(false); setCode(null); }
            }
        }, 3000);
        return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    }, [opened, load]);

    // Bir bosishda: kod ol → Telegram'da @ForHumo_IDBot'ni och (popup-bloker'ga qarshi
    // oynani darhol ochib, keyin manzilini qo'yamiz)
    const connect = useCallback(async () => {
        setIssuing(true);
        setError(null);
        const win = window.open("", "_blank");
        try {
            const r = await fetch("/api/user/telegram/link-code", { method: "POST" });
            const j = await r.json();
            if (r.ok) {
                setCode(j);
                setOpened(true);
                if (win) win.location.href = j.deepLink;
                else window.location.href = j.deepLink;
            } else {
                if (win) win.close();
                setError(j.error ?? "xato");
            }
        } catch {
            if (win) win.close();
            setError("tarmoq xato");
        } finally { setIssuing(false); }
    }, []);

    const copyCode = () => {
        if (!code) return;
        navigator.clipboard.writeText(code.code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
    };

    const unlink = useCallback(async () => {
        if (!confirm("Telegram bog'lanishini uzasizmi?")) return;
        setUnlinking(true);
        try {
            await fetch("/api/user/telegram/status", { method: "DELETE" });
            await load();
            setOpened(false); setCode(null);
        } finally { setUnlinking(false); }
    }, [load]);

    if (loading) {
        return (
            <div className="rounded-xl border border-border/50 p-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Telegram holati...
            </div>
        );
    }

    if (status?.linked && status.identity) {
        return (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                        <Check className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-1.5">
                            <TelegramIcon className="w-4 h-4" /> Telegram bog'langan
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {status.identity.username ? `@${status.identity.username} · ` : ""}
                            ID {status.identity.providerId}
                        </div>
                    </div>
                    <button
                        onClick={unlink}
                        disabled={unlinking}
                        className="text-xs px-2.5 py-1 rounded border border-border hover:bg-muted disabled:opacity-50 flex items-center gap-1"
                    >
                        {unlinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        Uzish
                    </button>
                </div>
                <div className="text-xs text-muted-foreground">
                    Muhim bildirishnomalar (buyurtma, to'lov, yutuq) Telegram'ga ham keladi.
                    Har bir modul boti o'z Mini App'ини ochadi.
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#229ED9]/10 flex items-center justify-center">
                    <TelegramIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <div className="font-medium text-sm">Telegram'ga bog'lash</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                        Ixtiyoriy. Telegram'da For Humo botlaridan foydalaning.
                    </div>
                </div>
            </div>

            <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                <li>Muhim bildirishnomalar Telegram'ga ham keladi (buyurtma, to'lov, yutuq)</li>
                <li>Har bir bot o'z Mini App'ини Telegram ichida ochadi</li>
                <li>@ForHumo_AIBot — barcha modul haqida AI savol-javob</li>
            </ul>

            {!opened ? (
                <>
                    <button
                        onClick={connect}
                        disabled={issuing}
                        className="w-full py-2.5 rounded-lg bg-[#229ED9] text-white text-sm font-medium disabled:opacity-50 hover:bg-[#1c8dc2] flex items-center justify-center gap-2"
                    >
                        {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TelegramIcon className="w-4 h-4" />}
                        Telegram'ga bog'lash
                    </button>
                    {error && <div className="text-xs text-rose-600">{error}</div>}
                </>
            ) : (
                <div className="space-y-2.5">
                    <div className="rounded-lg border border-[#229ED9]/30 bg-[#229ED9]/5 p-3 text-xs text-muted-foreground flex items-start gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#229ED9] mt-0.5 flex-shrink-0" />
                        <span>
                            Telegram ochildi. Botда <b>«Ishga tushirish / Start»</b> tugmasini bosing —
                            avtomatik bog'lanadi. Keyin shu sahifaga qaytsangiz, o'zi yangilanadi.
                        </span>
                    </div>

                    {code && (
                        <div className="text-[11px] text-muted-foreground space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span>Ochilmadimi? Kod:</span>
                                <code className="font-mono font-bold tracking-widest text-foreground">{code.code}</code>
                                <button onClick={copyCode} className="p-1 rounded border border-border hover:bg-muted" title="Nusxa">
                                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                            </div>
                            <a
                                href={code.deepLink}
                                target="_blank"
                                rel="noopener"
                                className="inline-flex items-center gap-1 text-[#229ED9] hover:underline"
                            >
                                @{code.botUsername}'ni qo'lda ochish <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}

                    <button
                        onClick={() => { void load(); }}
                        className="w-full py-1.5 rounded text-xs text-[#229ED9] hover:underline"
                    >
                        Bog'landimi tekshirish
                    </button>
                </div>
            )}
        </div>
    );
}
