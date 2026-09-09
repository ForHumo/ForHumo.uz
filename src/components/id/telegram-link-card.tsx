"use client";

// Humo ID → Telegram bog'lash kartochkasi.
// Foydalanuvchi tugmani bosadi → 6-belgi kod olinadi → bot deep-link ochiladi →
// bot avto-tekshiradi va bog'laydi. Muvaffaqiyatli bo'lsa "Bog'langan" holat.

import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, Check, X, Send } from "lucide-react";

interface StatusResp {
    linked: boolean;
    identity: { providerId: string; username: string | null; createdAt: string } | null;
}
interface CodeResp {
    code: string;
    expiresAt: string;
    botUsername: string;
    deepLink: string;
    bnBot: string;
    bnDeepLink: string;
}

export function TelegramLinkCard() {
    const [status, setStatus] = useState<StatusResp | null>(null);
    const [code, setCode] = useState<CodeResp | null>(null);
    const [loading, setLoading] = useState(true);
    const [issuing, setIssuing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [unlinking, setUnlinking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/user/telegram/status", { cache: "no-store" });
            if (r.ok) setStatus(await r.json());
        } catch { /* noop */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const issue = useCallback(async () => {
        setIssuing(true);
        setError(null);
        try {
            const r = await fetch("/api/user/telegram/link-code", { method: "POST" });
            const j = await r.json();
            if (r.ok) setCode(j);
            else setError(j.error ?? "xato");
        } catch {
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
        } finally { setUnlinking(false); }
    }, [load]);

    // Kod muddati o'tsa avtomatik ekrandan olib tashlaymiz
    useEffect(() => {
        if (!code) return;
        const ms = new Date(code.expiresAt).getTime() - Date.now();
        if (ms <= 0) { setCode(null); return; }
        const t = window.setTimeout(() => setCode(null), ms);
        return () => window.clearTimeout(t);
    }, [code]);

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
                        <div className="font-medium text-sm">Telegram bog'langan</div>
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
                    Endi <b>@ForHumo_AIBot</b> va <b>@bozornarxidabot</b> sizni taniydi. Telegram'da
                    buyurtmalaringiz, hamyoningiz va boshqa For Humo ma'lumotlaringiz haqida bilib javob beradi.
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/15 text-sky-600 flex items-center justify-center">
                    <Send className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="font-medium text-sm">Telegram'ga bog'lash</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                        Ixtiyoriy. Telegram'da For Humo botlaridan foydalaning.
                    </div>
                </div>
            </div>

            {!code ? (
                <>
                    <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                        <li>@ForHumo_AIBot — barcha modul haqida savol</li>
                        <li>@bozornarxidabot — mahsulot narxi qidirish</li>
                        <li>Kelasi bildirishnomalar Telegram'ga ham keladi</li>
                    </ul>
                    <button
                        onClick={issue}
                        disabled={issuing}
                        className="w-full py-2 rounded-lg bg-sky-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-sky-700 flex items-center justify-center gap-1.5"
                    >
                        {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Bog'lash uchun kod olish
                    </button>
                    {error && <div className="text-xs text-rose-600">{error}</div>}
                </>
            ) : (
                <>
                    <div className="rounded-lg border border-dashed border-sky-500/40 bg-sky-500/5 p-3">
                        <div className="text-xs text-muted-foreground mb-1">Sizning kod (10 daqiqa amal qiladi):</div>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-2xl font-mono font-bold text-center py-2 tracking-widest">
                                {code.code}
                            </code>
                            <button
                                onClick={copyCode}
                                className="p-2 rounded border border-border hover:bg-muted"
                                title="Nusxa"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground">
                        Botni oching va kod'ni yuboring:
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <a
                            href={code.deepLink}
                            target="_blank"
                            rel="noopener"
                            className="text-center py-2 rounded-lg border border-border hover:bg-muted text-xs flex items-center justify-center gap-1"
                        >
                            @{code.botUsername}
                            <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                            href={code.bnDeepLink}
                            target="_blank"
                            rel="noopener"
                            className="text-center py-2 rounded-lg border border-border hover:bg-muted text-xs flex items-center justify-center gap-1"
                        >
                            @{code.bnBot}
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                        Yoki bot chatida qo'lda yozing: <code>/link {code.code}</code>
                    </div>

                    <button
                        onClick={() => { void load(); }}
                        className="w-full py-1.5 rounded text-xs text-sky-600 hover:underline"
                    >
                        Bog'landimi tekshirish
                    </button>
                </>
            )}
        </div>
    );
}
