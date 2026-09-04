"use client";

// Global suzuvchi Support paneli — har modul ustida (Nexus / Market / Pay / ID /
// AI / eSport / BN / boshqa). Bosilsa o'ng tomondan slide-in kartochka ochiladi:
// tiketlar ro'yxati → tanlangan tiket ichi → yoki yangi tiket yaratish formi.
// Sahifadan chiqmaydi.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeadsetIcon, X, ArrowLeft, Send, Plus, Loader2, MessageCircle, CheckCircle2, AlertTriangle, Lightbulb, Bug, CreditCard, HelpCircle, Clock, ShieldCheck, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/routing";
import { moduleTheme, type ModuleTheme } from "@/lib/module-theme";
import { usePathname } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

// ── Welcome ekran (birinchi marta kirganda / murojaat yo'q holatda) ─────────
interface QuickStart { subject: string; message: string }
interface QuickCategory { id: string; icon: typeof Bug; title: string; desc: string; sample: QuickStart; tone: string }

function SupportWelcome({ moduleLabel, onQuickStart, theme }: { moduleLabel: string; onQuickStart: (pre: QuickStart) => void; theme: ModuleTheme }) {
    const categories: QuickCategory[] = [
        {
            id: "bug",
            icon: Bug,
            title: "Xato / nosozlik",
            desc: "Biror narsa ishlamayapti",
            tone: "text-red-600 dark:text-red-400 bg-red-500/10",
            sample: {
                subject: `[${moduleLabel}] Xato haqida`,
                message: `Modul: ${moduleLabel}\nNima kutgan edim: \nNima yuz berdi: \nQanday takrorlash mumkin: `,
            },
        },
        {
            id: "account",
            icon: ShieldCheck,
            title: "Hisob / kirish",
            desc: "Login, parol, 2FA, ma'lumot",
            tone: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
            sample: {
                subject: "Hisob bilan bog'liq savol",
                message: "Muammoni batafsil yozing: ",
            },
        },
        {
            id: "billing",
            icon: CreditCard,
            title: "To'lov / hamyon",
            desc: "For Pay, buyurtma, chek",
            tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
            sample: {
                subject: "To'lov haqida savol",
                message: "Tranzaksiya ma'lumotlari (id, sana, summa): \nMuammo: ",
            },
        },
        {
            id: "feedback",
            icon: Lightbulb,
            title: "Taklif / fikr",
            desc: "Yangi imkoniyat, yaxshilash",
            tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
            sample: {
                subject: "Taklif",
                message: "Fikrimni ulashmoqchiman: ",
            },
        },
        {
            id: "other",
            icon: HelpCircle,
            title: "Boshqa savol",
            desc: "Bo'sh forma",
            tone: "text-neutral-600 dark:text-neutral-400 bg-neutral-500/10",
            sample: { subject: "", message: "" },
        },
    ];

    return (
        <div className="p-4 space-y-4">
            {/* Salom + tavsif */}
            <div className="text-center pt-2 pb-1">
                <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-lg"
                    style={{ background: theme.gradient, boxShadow: theme.shadow }}>
                    <HeadsetIcon className="w-6 h-6" style={{ color: theme.onPrimary }} />
                </div>
                <div className="text-base font-black">Salom! Qanday yordam beray?</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                    Muammoingizni tanlang — biz sizga tez yordam beramiz.
                </div>
            </div>

            {/* Response time indikator */}
            {/* PRIMARY — Nexus DM (B yondashuv, modul-themed) */}
            <Link
                href="/nexus?dm=support"
                className="flex items-center gap-3 p-3 rounded-xl shadow-lg group hover:shadow-xl transition-all"
                style={{ background: theme.gradient, color: theme.onPrimary, boxShadow: theme.shadow }}
            >
                <span className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm grid place-items-center flex-shrink-0">
                    <Sparkles className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black">Nexus DM&apos;da yozing</p>
                    <p className="text-[11px] opacity-90 mt-0.5">Real-time chat · Push xabar</p>
                </div>
                <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
            </Link>

            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Yoki quyidagi mavzudan tanlang</span>
            </div>

            {/* Kategoriya kartalar */}
            <div className="space-y-2">
                {categories.map(c => (
                    <button
                        key={c.id}
                        onClick={() => onQuickStart(c.sample)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors text-left group"
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.tone}`}>
                            <c.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{c.title}</div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{c.desc}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-700 group-hover:text-neutral-500 dark:group-hover:text-neutral-500 transition-colors flex-shrink-0" />
                    </button>
                ))}
            </div>

            {/* Boshqa aloqa kanallari */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <div className="text-xs font-bold text-neutral-500 mb-2">Yoki bevosita:</div>
                <div className="grid grid-cols-2 gap-2">
                    <a href="https://t.me/ForHumo_Support" target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] text-xs font-bold transition-colors">
                        <MessageCircle className="w-3.5 h-3.5" /> Telegram
                    </a>
                    <a href="mailto:support@forhumo.uz"
                        className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-colors">
                        <AlertTriangle className="w-3.5 h-3.5" /> Email
                    </a>
                </div>
            </div>

            <div className="text-[10px] text-center text-neutral-400 dark:text-neutral-600 pt-1">
                Barcha murojaatlar shifrlangan va faqat Support jamoasiga ko'rinadi.
            </div>
        </div>
    );
}


type Ticket = {
    id: string;
    subject: string;
    status: "open" | "pending" | "closed" | string;
    module: string | null;
    createdAt: string;
    updatedAt: string;
    lastMessage: { body: string; fromAdmin: boolean; createdAt: string } | null;
    unread: number;
};
type Message = { id: string; body: string; fromAdmin: boolean; createdAt: string };

const MODULE_LABEL: Record<string, string> = {
    bn: "Bozor Narxida", nexus: "Nexus", market: "Market", pay: "For Pay",
    id: "Humo ID", esport: "eSport", ai: "Humo AI", support: "Support",
};

function detectModule(pathname: string, host?: string): string {
    if (host?.includes("bozornarxida")) return "bn";
    if (pathname.includes("/nexus")) return "nexus";
    if (pathname.includes("/market")) return "market";
    if (pathname.includes("/pay")) return "pay";
    if (pathname.includes("/esport") || pathname.includes("/teams") || pathname.includes("/players") || pathname.includes("/tournaments")) return "esport";
    if (pathname.includes("/ai")) return "ai";
    if (pathname.includes("/id")) return "id";
    if (pathname.includes("/bn")) return "bn";
    return "support";
}

export function SupportDock() {
    const { data: session, status: authStatus } = useSession();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<"list" | "thread" | "new">("list");
    const [activeId, setActiveId] = useState<string | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(0);
    const [subject, setSubject] = useState("");
    const [firstMsg, setFirstMsg] = useState("");
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);
    const [host, setHost] = useState("");
    const threadEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => { setHost(location.hostname); }, []);

    const currentModule = useMemo(() => detectModule(pathname ?? "", host), [pathname, host]);
    const theme = useMemo(() => moduleTheme(currentModule), [currentModule]);

    // Tashqi tugmalar (masalan Market header'i) event orqali ochishi mumkin
    useEffect(() => {
        const h = () => { setOpen(true); setView(activeId ? "thread" : "list"); };
        window.addEventListener("support:open", h);
        return () => window.removeEventListener("support:open", h);
    }, [activeId]);

    // Deep-link: `?ticket=<id>` (masalan SUPPORT bildirishnomasidan)
    // Panelni ochib to'g'ridan-to'g'ri o'sha tiketni ko'rsatadi.
    useEffect(() => {
        if (authStatus !== "authenticated") return;
        try {
            const u = new URL(window.location.href);
            const tid = u.searchParams.get("ticket");
            if (tid) {
                setActiveId(tid);
                setView("thread");
                setOpen(true);
                // URL'ni tozalab qo'yamiz — refresh'da qayta ochilmasin
                u.searchParams.delete("ticket");
                window.history.replaceState({}, "", u.pathname + (u.search ? u.search : ""));
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authStatus]);

    // Suzuvchi tugma butunlay yashiringan — barcha modul navbarlarida (id/ai/nexus/
    // market/esport/pay/bn) Support tugmasi bor va bosh sahifada global header'da
    // "Support" nav qismi bor. Panel esa `support:open` event orqali ochiladi.
    const hideFloating = true;
    void pathname;

    // Badge — kirgan bo'lsa har 60s
    useEffect(() => {
        if (authStatus !== "authenticated") return;
        let alive = true;
        const load = async () => {
            try {
                const r = await fetch("/api/support/unread", { cache: "no-store" });
                if (!alive) return;
                if (r.ok) { const j = await r.json(); setUnread(j.count ?? 0); }
            } catch {}
        };
        load();
        const t = setInterval(load, 60_000);
        return () => { alive = false; clearInterval(t); };
    }, [authStatus]);

    const loadList = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/support/tickets", { cache: "no-store" });
            if (r.ok) { const j = await r.json(); setTickets(j.items ?? []); }
        } finally { setLoading(false); }
    }, []);

    const loadThread = useCallback(async (id: string) => {
        setLoading(true);
        try {
            const r = await fetch(`/api/support/tickets/${id}`, { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setMessages(j.messages ?? []);
            }
            // O'qildi belgilash
            await fetch(`/api/support/tickets/${id}`, { method: "PATCH" });
            setUnread(u => Math.max(0, u - (tickets.find(t => t.id === id)?.unread ?? 0)));
            setTickets(list => list.map(t => t.id === id ? { ...t, unread: 0 } : t));
        } finally { setLoading(false); }
    }, [tickets]);

    // Ochilganda ro'yxatni yuklash
    useEffect(() => {
        if (!open || authStatus !== "authenticated") return;
        if (view === "list") loadList();
        if (view === "thread" && activeId) loadThread(activeId);
    }, [open, view, activeId, authStatus, loadList, loadThread]);

    // Thread pastga scroll
    useEffect(() => {
        if (view === "thread") threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, view]);

    // Escape yopadi
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        window.addEventListener("keydown", h);
        return () => window.removeEventListener("keydown", h);
    }, [open]);

    async function createTicket(e: React.FormEvent) {
        e.preventDefault();
        if (subject.trim().length < 3 || firstMsg.trim().length < 5) return;
        setSending(true);
        try {
            const r = await fetch("/api/support/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject: subject.trim(), message: firstMsg.trim(), module: currentModule }),
            });
            if (r.ok) {
                const j = await r.json();
                setTickets(list => [j.ticket, ...list]);
                setSubject(""); setFirstMsg("");
                setActiveId(j.ticket.id);
                setView("thread");
            }
        } finally { setSending(false); }
    }

    async function sendReply(e: React.FormEvent) {
        e.preventDefault();
        if (!activeId || reply.trim().length < 1) return;
        setSending(true);
        try {
            const r = await fetch(`/api/support/tickets/${activeId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: reply.trim() }),
            });
            if (r.ok) {
                const j = await r.json();
                setMessages(m => [...m, j.message]);
                setReply("");
            }
        } finally { setSending(false); }
    }

    return (
        <>
            {/* Suzuvchi tugma */}
            {!hideFloating && (
            <button
                type="button"
                aria-label="Support"
                onClick={() => { setOpen(o => !o); setView(activeId ? "thread" : "list"); }}
                className="fixed z-[9998] rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
                style={{
                    right: "calc(16px + env(safe-area-inset-right))",
                    bottom: "calc(96px + env(safe-area-inset-bottom))",
                    width: 52, height: 52,
                }}
            >
                <HeadsetIcon size={22} strokeWidth={2} />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white dark:border-neutral-900">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>
            )}

            {/* Panel */}
            {open && (
                <>
                    {/* Fon (mobile'da to'la) */}
                    <div className="fixed inset-0 z-[9998] bg-black/40 md:bg-transparent" onClick={() => setOpen(false)} />
                    <div
                        role="dialog"
                        aria-label="Support"
                        className="fixed z-[9999] bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden
                            inset-x-3 bottom-3 top-16 rounded-2xl
                            md:inset-auto md:right-4 md:bottom-4 md:top-auto md:w-[380px] md:h-[600px] md:max-h-[calc(100vh-32px)]"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-2 px-3 py-3 border-b border-neutral-200 dark:border-neutral-800">
                            {view !== "list" && (
                                <button
                                    onClick={() => { setView("list"); setActiveId(null); }}
                                    className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    aria-label="Orqaga"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">
                                    {view === "list" && "Humo Support"}
                                    {view === "new" && "Yangi murojaat"}
                                    {view === "thread" && (tickets.find(t => t.id === activeId)?.subject ?? "Suhbat")}
                                </div>
                                {view === "list" && (
                                    <div className="text-[11px] text-neutral-500">
                                        {MODULE_LABEL[currentModule] ?? "For Humo"} • biz yordam beramiz
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                aria-label="Yopish"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {authStatus === "unauthenticated" ? (
                                <div className="p-6 flex flex-col items-center justify-center text-center gap-3 h-full">
                                    <HeadsetIcon size={40} className="text-neutral-400" />
                                    <div className="text-sm text-neutral-500">
                                        Support bilan bog'lanish uchun tizimga kiring.
                                    </div>
                                    <button
                                        onClick={() => signIn("google")}
                                        className="mt-2 px-4 py-2 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium"
                                    >
                                        Kirish
                                    </button>
                                </div>
                            ) : view === "list" ? (
                                <div className="p-2">
                                    {/* PRIMARY — Nexus DM'ga o'tish. B yondashuvda asosiy CTA */}
                                    <Link
                                        href="/nexus?dm=support"
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-3 p-3 mb-2 rounded-xl shadow-lg group hover:shadow-xl transition-all"
                                        style={{ background: theme.gradient, color: theme.onPrimary, boxShadow: theme.shadow }}
                                    >
                                        <span className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm grid place-items-center flex-shrink-0">
                                            <Sparkles size={18} />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-black">Nexus DM&apos;da yozing</p>
                                            <p className="text-[11px] opacity-90 mt-0.5">Real-time · push xabar bilan</p>
                                        </div>
                                        <ChevronRight size={16} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                                    </Link>

                                    {loading && tickets.length === 0 ? (
                                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-neutral-400" /></div>
                                    ) : tickets.length === 0 ? (
                                        <SupportWelcome
                                            moduleLabel={MODULE_LABEL[currentModule] ?? "For Humo"}
                                            theme={theme}
                                            onQuickStart={(pre) => {
                                                setSubject(pre.subject);
                                                setFirstMsg(pre.message);
                                                setView("new");
                                            }}
                                        />
                                    ) : (
                                        <div className="space-y-1">
                                            {tickets.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => { setActiveId(t.id); setView("thread"); }}
                                                    className="w-full text-left p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900 flex gap-3 items-start"
                                                >
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                                        t.status === "closed" ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                                                        : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                                    }`}>
                                                        {t.status === "closed" ? <CheckCircle2 size={16} /> : <MessageCircle size={16} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-sm font-medium truncate">{t.subject}</div>
                                                            {t.unread > 0 && (
                                                                <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                                                    {t.unread > 9 ? "9+" : t.unread}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {t.lastMessage && (
                                                            <div className="text-xs text-neutral-500 truncate mt-0.5">
                                                                {t.lastMessage.fromAdmin ? "Support: " : "Siz: "}
                                                                {t.lastMessage.body}
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-neutral-400 mt-0.5">
                                                            {t.module && `${MODULE_LABEL[t.module] ?? t.module} • `}
                                                            {new Date(t.updatedAt).toLocaleString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : view === "new" ? (
                                <form onSubmit={createTicket} className="p-4 space-y-3">
                                    <div className="text-xs text-neutral-500">
                                        Modul: <span className="font-medium text-neutral-700 dark:text-neutral-300">{MODULE_LABEL[currentModule] ?? currentModule}</span>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-500 mb-1">Mavzu</label>
                                        <input
                                            value={subject}
                                            onChange={e => setSubject(e.target.value)}
                                            placeholder="Qisqa mavzu"
                                            maxLength={100}
                                            className="w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-500 mb-1">Xabar</label>
                                        <textarea
                                            value={firstMsg}
                                            onChange={e => setFirstMsg(e.target.value)}
                                            placeholder="Muammoni batafsil yozing"
                                            rows={6}
                                            maxLength={2000}
                                            className="w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 resize-none"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={sending || subject.trim().length < 3 || firstMsg.trim().length < 5}
                                        className="w-full py-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                                        Yuborish
                                    </button>
                                </form>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {/* Nexus DM'da davom — bir bosishda @support DM'ga o'tadi.
                                        Push+notif tayyor bo'lgani uchun mobil'da qulflangan holda ham eshitiladi. */}
                                    <Link
                                        href="/nexus?dm=support"
                                        onClick={() => setOpen(false)}
                                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/40 border border-sky-200/60 dark:border-sky-800/60 text-sky-900 dark:text-sky-200 text-[12px] font-semibold group hover:from-sky-100 hover:to-blue-100 dark:hover:from-sky-950/60 dark:hover:to-blue-950/60 transition-colors"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Nexus DM&apos;da davom ettirish
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>

                                    {loading && messages.length === 0 ? (
                                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-neutral-400" /></div>
                                    ) : messages.map(m => (
                                        <div key={m.id} className={`flex ${m.fromAdmin ? "justify-start" : "justify-end"}`}>
                                            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                                                m.fromAdmin
                                                    ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-bl-sm"
                                                    : "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-br-sm"
                                            }`}>
                                                {m.body}
                                                <div className={`text-[10px] mt-1 opacity-60 ${m.fromAdmin ? "" : "text-right"}`}>
                                                    {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={threadEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Bottom — faqat mavjud tiketlar bor bo'lsa ko'rsatiladi (welcome ekran o'z tugmasiga ega) */}
                        {authStatus === "authenticated" && view === "list" && tickets.length > 0 && (
                            <button
                                onClick={() => setView("new")}
                                className="m-3 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:brightness-110"
                                style={{ background: theme.gradient, color: theme.onPrimary, boxShadow: theme.shadow }}
                            >
                                <Plus size={16} /> Yangi murojaat
                            </button>
                        )}
                        {authStatus === "authenticated" && view === "thread" && activeId && (
                            <form onSubmit={sendReply} className="p-2 border-t border-neutral-200 dark:border-neutral-800 flex gap-2">
                                <input
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                    placeholder="Xabar yozing…"
                                    maxLength={2000}
                                    className="flex-1 px-3 py-2 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || reply.trim().length < 1}
                                    className="w-10 h-10 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center disabled:opacity-50"
                                    aria-label="Yuborish"
                                >
                                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                </button>
                            </form>
                        )}
                    </div>
                </>
            )}
        </>
    );
}
