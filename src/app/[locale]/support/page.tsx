"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react";
import { useSession } from "next-auth/react";

const inputCls =
    "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors";

export default function SupportPage() {
    const t = useTranslations("Support");
    const { data: session } = useSession();

    const [email,   setEmail]   = useState(session?.user?.email ?? "");
    const [subject, setSubject] = useState("technical");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [done,    setDone]    = useState(false);
    const [error,   setError]   = useState<string | null>(null);

    // Pre-fill email once session loads
    useEffect(() => {
        if (session?.user?.email) setEmail(session.user.email);
    }, [session?.user?.email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/support/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, subject, message }),
            });
            if (!res.ok) throw new Error();
            setDone(true);
        } catch {
            setError(t("error"));
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-16">
                <div className="max-w-sm w-full space-y-6 text-center">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 space-y-4">
                        <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
                        <div>
                            <h1 className="text-xl font-bold text-foreground">{t("success_title")}</h1>
                            <p className="text-sm text-muted-foreground mt-1">{t("success_desc")}</p>
                        </div>
                        <Link href="/id"
                            className="inline-flex items-center justify-center w-full h-11 rounded-xl
                                bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 transition-colors">
                            {t("back")}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 px-4">
            <div className="max-w-lg mx-auto space-y-6">

                <Link href="/id"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={15} />
                    {t("back")}
                </Link>

                <div>
                    <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
                </div>

                {/* FAQ hint */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <p className="text-sm text-muted-foreground">{t("faq_cta")}</p>
                    <Link href="/faq"
                        className="text-xs font-bold text-primary hover:underline">FAQ →</Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">{t("email_label")}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            placeholder="email@example.com"
                            className={inputCls}
                        />
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-foreground">{t("subject_label")}</label>
                        <select
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className={inputCls}
                        >
                            <option value="technical">{t("subject_technical")}</option>
                            <option value="account">{t("subject_account")}</option>
                            <option value="suggestion">{t("subject_suggestion")}</option>
                            <option value="other">{t("subject_other")}</option>
                        </select>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-foreground">{t("message_label")}</label>
                            <span className={`text-xs ${message.length >= 1800 ? "text-amber-500" : "text-muted-foreground"}`}>
                                {message.length}/2000
                            </span>
                        </div>
                        <textarea
                            value={message}
                            onChange={e => setMessage(e.target.value.slice(0, 2000))}
                            placeholder={t("message_placeholder")}
                            rows={5}
                            required
                            minLength={10}
                            className={`${inputCls} resize-none`}
                        />
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-500">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !email || !message || message.length < 10}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground
                            px-4 py-3 text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? (
                            <><Loader2 size={15} className="animate-spin" /> {t("submitting")}</>
                        ) : (
                            <><Send size={15} /> {t("submit")}</>
                        )}
                    </button>

                </form>
            </div>
        </div>
    );
}
