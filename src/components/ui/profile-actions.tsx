"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link2, QrCode, X, Download, Trash2, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";

// ── Copy-link button ───────────────────────────────────────────────────────────
export function CopyLinkButton({ url }: { url: string }) {
    const t = useTranslations("HumoID");
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    return (
        <button
            onClick={copy}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl
                border border-border bg-card hover:bg-accent transition-colors"
        >
            <Link2 size={14} />
            {copied ? t("link_copied") : t("copy_link")}
        </button>
    );
}

// ── QR code modal ──────────────────────────────────────────────────────────────
export function QRButton({ url, username }: { url: string; username: string }) {
    const t = useTranslations("HumoID");
    const [open, setOpen] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!open || !canvasRef.current) return;

        // Draw QR using qrcode library loaded dynamically
        import("qrcode").then(QRCode => {
            if (canvasRef.current) {
                QRCode.toCanvas(canvasRef.current, url, {
                    width: 240,
                    margin: 2,
                    color: { dark: "#000000", light: "#ffffff" },
                });
            }
        }).catch(() => {});
    }, [open, url]);

    const download = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `humo-id-${username}.png`;
        a.click();
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl
                    border border-border bg-card hover:bg-accent transition-colors"
            >
                <QrCode size={14} />
                {t("qr_code")}
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="bg-card border border-border rounded-2xl p-6 space-y-4 max-w-xs w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-foreground">{t("qr_title")}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">@{username}</p>
                            </div>
                            <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-accent">
                                <X size={16} className="text-muted-foreground" />
                            </button>
                        </div>

                        <div className="flex justify-center bg-white rounded-xl p-3">
                            <canvas ref={canvasRef} />
                        </div>

                        <p className="text-xs text-center text-muted-foreground">{t("qr_hint")}</p>

                        <button
                            onClick={download}
                            className="w-full flex items-center justify-center gap-2 text-sm font-semibold
                                bg-primary text-primary-foreground rounded-xl px-4 py-2.5 hover:opacity-90 transition-opacity"
                        >
                            <Download size={14} />
                            {t("qr_download")}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Delete account modal ───────────────────────────────────────────────────────
export function DeleteAccountButton({ userEmail }: { userEmail: string }) {
    const t = useTranslations("HumoID");
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (input.toLowerCase() !== userEmail.toLowerCase()) {
            setError(t("delete_account_wrong_email"));
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/user/delete-account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: input }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.error === "email_mismatch") {
                    setError(t("delete_account_wrong_email"));
                    return;
                }
                throw new Error();
            }
            await signOut({ callbackUrl: "/" });
        } catch {
            setError(t("delete_account_error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
            >
                <Trash2 size={14} />
                {t("delete_account")}
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                    onClick={() => !loading && setOpen(false)}
                >
                    <div
                        className="bg-card border border-red-500/30 rounded-2xl p-6 space-y-4 max-w-sm w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <p className="font-bold text-red-500">{t("delete_account_title")}</p>
                            {!loading && (
                                <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-accent">
                                    <X size={16} className="text-muted-foreground" />
                                </button>
                            )}
                        </div>

                        <p className="text-sm text-muted-foreground">{t("delete_account_desc")}</p>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-foreground">
                                {t("delete_account_confirm")}
                            </label>
                            <input
                                type="email"
                                value={input}
                                onChange={e => { setInput(e.target.value); setError(null); }}
                                placeholder={userEmail}
                                disabled={loading}
                                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm
                                    focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500
                                    disabled:opacity-50 transition-colors"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-500">{error}</p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setOpen(false)}
                                disabled={loading}
                                className="flex-1 text-sm font-semibold border border-border rounded-xl px-4 py-2.5
                                    hover:bg-accent transition-colors disabled:opacity-50"
                            >
                                {t("delete_account_cancel")}
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading || !input}
                                className="flex-1 flex items-center justify-center gap-2 text-sm font-bold
                                    bg-red-500 text-white rounded-xl px-4 py-2.5
                                    hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                {t("delete_account_btn")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ── Last login display ─────────────────────────────────────────────────────────
export function LastLoginInfo() {
    const t = useTranslations("HumoID");
    const locale = useLocale();
    const [lastLogin, setLastLogin] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/user/activity")
            .then(r => r.json())
            .then(data => {
                if (data.lastLoginAt) setLastLogin(data.lastLoginAt);
            })
            .catch(() => {});
    }, []);

    if (!lastLogin) return null;

    const date = new Date(lastLogin);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    let label: string;
    if (diffMin < 2) {
        label = t("just_now");
    } else {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
        if (diffMin < 60) label = rtf.format(-diffMin, "minute");
        else if (diffMin < 1440) label = rtf.format(-Math.floor(diffMin / 60), "hour");
        else label = rtf.format(-Math.floor(diffMin / 1440), "day");
    }

    return (
        <span className="text-xs text-muted-foreground">
            {t("last_login")}: {label}
        </span>
    );
}
