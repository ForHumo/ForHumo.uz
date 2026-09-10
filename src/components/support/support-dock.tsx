"use client";

// Global suzuvchi Support paneli — har modul ustida (Nexus / Market / Pay / ID /
// AI / eSport / BN / boshqa). Bosilsa o'ng tomondan slide-in kartochka ochiladi:
// tiketlar ro'yxati → tanlangan tiket ichi → yoki yangi tiket yaratish formi.
// Sahifadan chiqmaydi.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { HeadsetIcon, X, ArrowLeft, Send, Plus, Loader2, MessageCircle, CheckCircle2, AlertTriangle, Lightbulb, Bug, CreditCard, HelpCircle, Clock, ShieldCheck, ChevronRight, Mail } from "lucide-react";
import { Link } from "@/i18n/routing";
import { moduleTheme, type ModuleTheme } from "@/lib/module-theme";
import { usePathname } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

// ── Kategoriya shabloni — har savol alohida qulflangan yorliq + tahrirlanuvchi katak
// (foydalanuvchi shablon matnini o'chira olmasin, faqat javob qismini yozadi)
interface QuickField { key: string; label: string; placeholder?: string; multiline?: boolean; required?: boolean; }
interface QuickCategory {
    id: string;
    icon: typeof Bug;
    title: string;
    desc: string;
    tone: string;
    subject: string;              // sarlavha shabloni (masalan "[BN] Xato haqida")
    fields: QuickField[];         // har biri alohida qulflangan yorliq + kirituvchi katak
}

function buildCategories(moduleLabel: string): QuickCategory[] {
    return [
        {
            id: "bug", icon: Bug,
            title: "Xato / nosozlik",
            desc: "Biror narsa ishlamayapti",
            tone: "text-red-600 dark:text-red-400 bg-red-500/10",
            subject: `[${moduleLabel}] Xato haqida`,
            fields: [
                { key: "expected",  label: "Nima kutgan edim",       placeholder: "Masalan: Buyurtma tugmasi bosilishi kerak edi", required: true, multiline: true },
                { key: "actual",    label: "Nima yuz berdi",         placeholder: "Masalan: Tugma bosilmadi / xato ochilib qoldi", required: true, multiline: true },
                { key: "steps",     label: "Qanday takrorlash mumkin", placeholder: "1) Bosh sahifa\n2) Mahsulot ochish\n3) ...",     multiline: true },
                { key: "device",    label: "Qurilma / brauzer",      placeholder: "Masalan: iPhone 13, Safari 17" },
            ],
        },
        {
            id: "account", icon: ShieldCheck,
            title: "Hisob / kirish",
            desc: "Login, parol, 2FA, ma'lumot",
            tone: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
            subject: "Hisob bilan bog'liq savol",
            fields: [
                { key: "problem",   label: "Muammo qanday",          placeholder: "Masalan: kirolmayapman / 2FA kod kelmayapti", required: true, multiline: true },
                { key: "tried",     label: "Nima urinib ko'rganman", placeholder: "Masalan: parol tikladim, boshqa brauzerdan kirdim", multiline: true },
                { key: "email",     label: "Ro'yxatdan o'tgan email", placeholder: "misol@gmail.com" },
            ],
        },
        {
            id: "billing", icon: CreditCard,
            title: "To'lov / hamyon",
            desc: "For Pay, buyurtma, chek",
            tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
            subject: "To'lov haqida savol",
            fields: [
                { key: "txId",      label: "Tranzaksiya ID (bo'lsa)", placeholder: "Masalan: TX_12345 yoki buyurtma raqami" },
                { key: "amount",    label: "Summa va sana",           placeholder: "Masalan: 150 000 so'm · 15-avg 14:32" },
                { key: "problem",   label: "Muammo",                  placeholder: "Masalan: pul yechildi lekin buyurtma yaratilmadi", required: true, multiline: true },
            ],
        },
        {
            id: "feedback", icon: Lightbulb,
            title: "Taklif / fikr",
            desc: "Yangi imkoniyat, yaxshilash",
            tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
            subject: "Taklif",
            fields: [
                { key: "idea",      label: "G'oya nima",              placeholder: "Masalan: buyurtma statusini SMS orqali yuborilsin", required: true, multiline: true },
                { key: "why",       label: "Nima uchun kerak",        placeholder: "Nima uchun bu foydali bo'ladi", multiline: true },
            ],
        },
        {
            id: "other", icon: HelpCircle,
            title: "Boshqa savol",
            desc: "Umumiy savol yoki murojaat",
            tone: "text-neutral-600 dark:text-neutral-400 bg-neutral-500/10",
            subject: "",
            fields: [
                { key: "subject",   label: "Mavzu (qisqacha)",        placeholder: "Nima haqida", required: true },
                { key: "message",   label: "Xabar",                   placeholder: "Batafsil yozing", required: true, multiline: true },
            ],
        },
    ];
}

// ── Brand ikonkalar — inline SVG (rasmiy shakl)
function TelegramIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
            <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.24 3.64 11.95c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.7L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
        </svg>
    );
}
function GmailIcon({ className }: { className?: string }) {
    // "Gmail" konvert shakli — brand quyi taqiqli hudud emas (oddiy geometrik)
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
        </svg>
    );
}

function SupportWelcome({ moduleLabel, onQuickStart, theme }: { moduleLabel: string; onQuickStart: (c: QuickCategory) => void; theme: ModuleTheme }) {
    const categories = buildCategories(moduleLabel);

    return (
        <div className="p-4 space-y-4">
            {/* Salom + rasmiy Humo Support logo */}
            <div className="text-center pt-2 pb-1">
                <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-2 overflow-hidden bg-white dark:bg-neutral-900 shadow-lg"
                    style={{ boxShadow: theme.shadow }}>
                    <Image src="/logos/humo-support.png" alt="Humo Support" width={48} height={48} className="object-contain" />
                </div>
                <div className="text-base font-black">Salom! Qanday yordam beray?</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                    Muammoingizni tanlang — biz sizga tez yordam beramiz.
                </div>
            </div>

            {/* PRIMARY — Nexus DM (Humo Nexus rasmiy logo bilan) */}
            <Link
                href="/nexus?dm=support"
                className="flex items-center gap-3 p-3 rounded-xl shadow-lg group hover:shadow-xl transition-all"
                style={{ background: theme.gradient, color: theme.onPrimary, boxShadow: theme.shadow }}
            >
                <span className="w-10 h-10 rounded-xl bg-white/95 grid place-items-center flex-shrink-0 overflow-hidden">
                    <Image src="/logos/humo-nexus.png" alt="Humo Nexus" width={32} height={32} className="object-contain" />
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
                        onClick={() => onQuickStart(c)}
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

            {/* Boshqa aloqa kanallari — rasmiy brand ikonlar */}
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <div className="text-xs font-bold text-neutral-500 mb-2">Yoki bevosita:</div>
                <div className="grid grid-cols-2 gap-2">
                    <a href="https://t.me/ForHumo_Support" target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 h-10 rounded-lg text-xs font-bold transition-colors"
                        style={{ background: "#229ED9", color: "#fff" }}>
                        <TelegramIcon className="w-4 h-4" /> Telegram
                    </a>
                    <a href="mailto:ceo@forhumo.uz"
                        className="flex items-center justify-center gap-1.5 h-10 rounded-lg text-xs font-bold transition-colors"
                        style={{ background: "#EA4335", color: "#fff" }}>
                        <GmailIcon className="w-4 h-4" /> Email
                    </a>
                </div>
                <div className="text-[10.5px] text-neutral-500 text-center mt-2">
                    ceo@forhumo.uz · t.me/ForHumo_Support
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
    const [activeCategory, setActiveCategory] = useState<QuickCategory | null>(null);
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
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

    const [loadedOnce, setLoadedOnce] = useState(false);
    const loadList = useCallback(async () => {
        setLoading(true);
        // Xavfsizlik: 10s'dan keyin so'zsiz loading = false
        // (agar tarmoq javob bermasa spinner cheksiz aylanmasin)
        const guard = window.setTimeout(() => setLoading(false), 10000);
        try {
            const r = await fetch("/api/support/tickets", { cache: "no-store" });
            if (r.ok) {
                const j = await r.json().catch(() => ({}));
                setTickets(Array.isArray(j?.items) ? j.items : []);
            } else {
                setTickets([]);   // 401/500 → bo'sh, welcome ekran ko'rinadi
            }
        } catch {
            setTickets([]);
        } finally {
            window.clearTimeout(guard);
            setLoading(false);
            setLoadedOnce(true);
        }
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
        // Strukturalangan kategoriya bo'lsa — javoblardan matn tuzamiz
        let finalSubject = subject.trim();
        let finalMessage = firstMsg.trim();
        if (activeCategory) {
            // Har bir katak: label + javob (bo'sh emas bo'lganlar). Ba'zilari majburiy.
            const missing = activeCategory.fields.find(f => f.required && !(fieldValues[f.key] ?? "").trim());
            if (missing) return;
            // Sarlavha shabloni + birinchi majburiy javob (agar bor bo'lsa "subject" katagi bo'lmasa)
            const subjectFromField = fieldValues["subject"]?.trim();
            finalSubject = subjectFromField || activeCategory.subject || activeCategory.title;
            const parts = [`Modul: ${MODULE_LABEL[currentModule] ?? currentModule}`];
            for (const f of activeCategory.fields) {
                if (f.key === "subject") continue;   // sarlavhaga tushdi
                const v = (fieldValues[f.key] ?? "").trim();
                if (v) parts.push(`${f.label}: ${v}`);
            }
            finalMessage = parts.join("\n");
        }
        if (finalSubject.length < 3 || finalMessage.length < 5) return;
        setSending(true);
        try {
            const r = await fetch("/api/support/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject: finalSubject, message: finalMessage, module: currentModule }),
            });
            if (r.ok) {
                const j = await r.json();
                setTickets(list => [j.ticket, ...list]);
                setSubject(""); setFirstMsg("");
                setActiveCategory(null); setFieldValues({});
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
                                    onClick={() => { setView("list"); setActiveId(null); setActiveCategory(null); setFieldValues({}); }}
                                    className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    aria-label="Orqaga"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                            )}
                            {view === "list" && (
                                <span className="w-8 h-8 rounded-lg overflow-hidden bg-white dark:bg-neutral-900 grid place-items-center flex-shrink-0">
                                    <Image src="/logos/humo-support.png" alt="" width={28} height={28} className="object-contain" />
                                </span>
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
                                        <span className="w-10 h-10 rounded-xl bg-white/95 grid place-items-center flex-shrink-0 overflow-hidden">
                                            <Image src="/logos/humo-nexus.png" alt="Humo Nexus" width={32} height={32} className="object-contain" />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-black">Nexus DM&apos;da yozing</p>
                                            <p className="text-[11px] opacity-90 mt-0.5">Real-time · push xabar bilan</p>
                                        </div>
                                        <ChevronRight size={16} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                                    </Link>

                                    {loading && tickets.length === 0 && !loadedOnce ? (
                                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-neutral-400" /></div>
                                    ) : tickets.length === 0 ? (
                                        <SupportWelcome
                                            moduleLabel={MODULE_LABEL[currentModule] ?? "For Humo"}
                                            theme={theme}
                                            onQuickStart={(cat) => {
                                                setActiveCategory(cat);
                                                setFieldValues({});
                                                setSubject(cat.subject);
                                                setFirstMsg("");
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
                                    {/* Modul chip — qulflangan (foydalanuvchi o'chira olmaydi) */}
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
                                        <span className="text-[11px] text-neutral-500 font-bold">Modul:</span>
                                        <span className="text-[13px] font-black" style={{ color: theme.primary }}>
                                            {MODULE_LABEL[currentModule] ?? currentModule}
                                        </span>
                                    </div>

                                    {activeCategory ? (
                                        <>
                                            {/* Sarlavha shabloni — qulflangan, kategoriya tanlanganda avto */}
                                            {activeCategory.subject && (
                                                <div>
                                                    <label className="block text-[11px] text-neutral-500 mb-1 font-bold">Mavzu</label>
                                                    <div className="w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm text-neutral-500 select-none">
                                                        {activeCategory.subject}
                                                    </div>
                                                </div>
                                            )}
                                            {/* Har savol alohida katak */}
                                            {activeCategory.fields.map(f => (
                                                <div key={f.key}>
                                                    <label className="block text-[11px] text-neutral-500 mb-1 font-bold">
                                                        {f.label} {f.required && <span className="text-red-500">*</span>}
                                                    </label>
                                                    {f.multiline ? (
                                                        <textarea
                                                            value={fieldValues[f.key] ?? ""}
                                                            onChange={e => setFieldValues(v => ({ ...v, [f.key]: e.target.value }))}
                                                            placeholder={f.placeholder}
                                                            rows={3}
                                                            maxLength={1000}
                                                            className="w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 resize-none"
                                                        />
                                                    ) : (
                                                        <input
                                                            value={fieldValues[f.key] ?? ""}
                                                            onChange={e => setFieldValues(v => ({ ...v, [f.key]: e.target.value }))}
                                                            placeholder={f.placeholder}
                                                            maxLength={200}
                                                            className="w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        // Kategoriya tanlanmagan (masalan Yangi murojaat tugmasi bilan) — oddiy 2 katak
                                        <>
                                            <div>
                                                <label className="block text-[11px] text-neutral-500 mb-1 font-bold">Mavzu</label>
                                                <input
                                                    value={subject}
                                                    onChange={e => setSubject(e.target.value)}
                                                    placeholder="Qisqa mavzu"
                                                    maxLength={100}
                                                    className="w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] text-neutral-500 mb-1 font-bold">Xabar</label>
                                                <textarea
                                                    value={firstMsg}
                                                    onChange={e => setFirstMsg(e.target.value)}
                                                    placeholder="Muammoni batafsil yozing"
                                                    rows={6}
                                                    maxLength={2000}
                                                    className="w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 resize-none"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={
                                            sending || (
                                                activeCategory
                                                    ? activeCategory.fields.some(f => f.required && !(fieldValues[f.key] ?? "").trim())
                                                    : subject.trim().length < 3 || firstMsg.trim().length < 5
                                            )
                                        }
                                        className="w-full py-2.5 rounded-full text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                                        style={{ background: theme.gradient, color: theme.onPrimary }}
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
                                            <Image src="/logos/humo-nexus.png" alt="" width={14} height={14} className="object-contain" />
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
