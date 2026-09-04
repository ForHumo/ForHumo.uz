"use client";

// /support — Yordam markazi (B yondashuv, unified).
// - Auth foydalanuvchiga: 1-primary Nexus DM'da yozish (real-time chat + push)
//                        2-tez forma (klassik ticket)
//                        3-FAQ
//                        4-so'nggi tiketlar ro'yxati
// - Anonim foydalanuvchiga: FAQ + tez forma (email bilan) + kirish CTA
//
// Sevinch/foundera aloqasi kelasakda telefon/telegram; hozir Nexus DM asosiy.

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import {
    ArrowLeft, CheckCircle2, Loader2, Send, MessageCircle, HelpCircle,
    Sparkles, LogIn, ChevronRight, Clock, LifeBuoy, Mail,
} from "lucide-react";
import { useSession, signIn } from "next-auth/react";

const inputCls =
    "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors";

interface RecentTicket {
    id: string;
    subject: string;
    status: string;
    updatedAt: string;
    unread: number;
}

export default function SupportPage() {
    const t = useTranslations("Support");
    const { data: session, status } = useSession();
    const router = useRouter();
    const isAuth = status === "authenticated";

    const [tickets, setTickets] = useState<RecentTicket[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [email, setEmail] = useState(session?.user?.email ?? "");
    const [subject, setSubject] = useState("technical");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (session?.user?.email) setEmail(session.user.email);
    }, [session?.user?.email]);

    // So'nggi tiketlar (auth bo'lsa)
    useEffect(() => {
        if (!isAuth) return;
        setLoadingTickets(true);
        fetch("/api/support/tickets", { cache: "no-store" })
            .then(r => r.ok ? r.json() : { items: [] })
            .then(d => setTickets((d.items ?? []).slice(0, 5)))
            .catch(() => setTickets([]))
            .finally(() => setLoadingTickets(false));
    }, [isAuth]);

    async function handleSubmit(e: React.FormEvent) {
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
    }

    // Yuborilgan holat
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
                        <button
                            onClick={() => router.push("/nexus?dm=support")}
                            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold flex items-center justify-center gap-2"
                        >
                            <Sparkles size={16} /> Nexus DM&apos;da davom ettirish
                        </button>
                        <Link href="/id" className="inline-flex items-center justify-center w-full h-11 rounded-xl border border-border text-sm font-bold hover:bg-card transition-colors">
                            {t("back")}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-2xl mx-auto space-y-6">

                <Link href="/id"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={15} /> {t("back")}
                </Link>

                {/* Hero */}
                <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-500/20">
                    <div className="flex items-start gap-3 mb-3">
                        <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 grid place-items-center text-white flex-shrink-0">
                            <LifeBuoy size={22} />
                        </span>
                        <div>
                            <h1 className="text-2xl font-black">Yordam kerakmi?</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Har qanday savol, xatolik yoki taklif bo&apos;lsa — birga hal qilamiz.
                            </p>
                        </div>
                    </div>
                </div>

                {/* PRIMARY — Nexus DM (auth uchun) */}
                {isAuth ? (
                    <button
                        onClick={() => router.push("/nexus?dm=support")}
                        className="w-full text-left rounded-2xl p-5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 hover:scale-[1.01] active:scale-[0.99] transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <span className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center flex-shrink-0">
                                <Sparkles size={22} />
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-black">Nexus DM&apos;da yozing</p>
                                <p className="text-[12.5px] mt-0.5 opacity-90">
                                    Real-time chat · Push xabar · @support darhol javob beradi
                                </p>
                            </div>
                            <ChevronRight size={20} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                ) : (
                    <div className="rounded-2xl p-5 bg-card border border-border">
                        <p className="text-sm font-semibold mb-3">Chat orqali tezroq yordam olish uchun tizimga kiring</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => signIn("google")}
                                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold flex items-center justify-center gap-2"
                            >
                                <LogIn size={16} /> Google bilan kirish
                            </button>
                            <button
                                onClick={() => setFormOpen(true)}
                                className="h-11 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-card transition-colors"
                            >
                                Yoki forma
                            </button>
                        </div>
                    </div>
                )}

                {/* So'nggi tiketlar (auth) */}
                {isAuth && (loadingTickets || tickets.length > 0) && (
                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                            <Clock size={14} className="text-muted-foreground" />
                            <p className="text-[13px] font-black">So&apos;nggi murojaatlar</p>
                        </div>
                        {loadingTickets && tickets.length === 0 ? (
                            <div className="p-6 flex justify-center"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
                        ) : (
                            <div className="divide-y divide-border">
                                {tickets.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => router.push(`/support?ticket=${t.id}`)}
                                        className="w-full text-left px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] flex items-center gap-3"
                                    >
                                        <span className={`w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 ${
                                            t.status === "closed" ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                                            : t.status === "pending" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                                            : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                        }`}>
                                            {t.status === "closed" ? <CheckCircle2 size={14} /> : <MessageCircle size={14} />}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold truncate">{t.subject}</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {t.status === "closed" ? "Yopilgan" : t.status === "pending" ? "Javob berildi" : "Kutilmoqda"}
                                                {" · "}
                                                {new Date(t.updatedAt).toLocaleDateString("uz-UZ")}
                                            </p>
                                        </div>
                                        {t.unread > 0 && (
                                            <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black bg-red-500 text-white flex items-center justify-center">
                                                {t.unread}
                                            </span>
                                        )}
                                        <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* FAQ */}
                <Link href="/faq"
                    className="block rounded-2xl border border-border bg-card p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-amber-500/10 grid place-items-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                            <HelpCircle size={18} />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-black">Ko&apos;p so&apos;raladigan savollar</p>
                            <p className="text-[11.5px] text-muted-foreground mt-0.5">Balki javob shu yerda</p>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                </Link>

                {/* Tez forma — auth bo'lmagan yoki foydalanuvchi so'raganda */}
                {(!isAuth || formOpen) && (
                    <details className="rounded-2xl border border-border bg-card overflow-hidden group" open={!isAuth || formOpen}>
                        <summary className="px-4 py-3 flex items-center gap-3 cursor-pointer list-none">
                            <span className="w-10 h-10 rounded-xl bg-neutral-500/10 grid place-items-center text-neutral-600 dark:text-neutral-400 flex-shrink-0">
                                <Mail size={18} />
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13.5px] font-black">
                                    {isAuth ? "Yoki forma orqali yuboring" : "Email orqali murojaat"}
                                </p>
                                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                                    Sekinroq bo&apos;lishi mumkin (24 soat ichida javob)
                                </p>
                            </div>
                        </summary>

                        <form onSubmit={handleSubmit} className="p-4 pt-2 space-y-4 border-t border-border">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground">{t("email_label")}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    placeholder="email@example.com"
                                    className={inputCls}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground">{t("subject_label")}</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { v: "technical",  l: t("subject_technical") },
                                        { v: "account",    l: t("subject_account") },
                                        { v: "suggestion", l: t("subject_suggestion") },
                                        { v: "other",      l: t("subject_other") },
                                    ].map(o => (
                                        <button
                                            key={o.v}
                                            type="button"
                                            onClick={() => setSubject(o.v)}
                                            className={`h-10 px-3 rounded-lg text-[12.5px] font-semibold border transition-colors ${
                                                subject === o.v
                                                    ? "bg-blue-500 text-white border-blue-500"
                                                    : "border-border bg-card hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                                            }`}
                                        >
                                            {o.l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-muted-foreground">{t("message_label")}</label>
                                    <span className={`text-[10px] ${message.length >= 1800 ? "text-amber-500" : "text-muted-foreground"}`}>
                                        {message.length}/2000
                                    </span>
                                </div>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value.slice(0, 2000))}
                                    placeholder={t("message_placeholder")}
                                    rows={4}
                                    required
                                    minLength={10}
                                    className={`${inputCls} resize-none`}
                                />
                            </div>

                            {error && (
                                <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-[12px] text-red-500">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !email || !message || message.length < 10}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground h-11 text-[13px] font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? <><Loader2 size={14} className="animate-spin" /> {t("submitting")}</>
                                    : <><Send size={14} /> {t("submit")}</>}
                            </button>
                        </form>
                    </details>
                )}
            </div>
        </div>
    );
}
