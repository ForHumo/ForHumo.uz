"use client";

// Global suzuvchi Support paneli — har modul ustida (Nexus / Market / Pay / ID /
// AI / eSport / BN / boshqa). Bosilsa o'ng tomondan slide-in kartochka ochiladi:
// tiketlar ro'yxati → tanlangan tiket ichi → yoki yangi tiket yaratish formi.
// Sahifadan chiqmaydi.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeadsetIcon, X, ArrowLeft, Send, Plus, Loader2, MessageCircle, CheckCircle2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

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

    // Tashqi tugmalar (masalan Market header'i) event orqali ochishi mumkin
    useEffect(() => {
        const h = () => { setOpen(true); setView(activeId ? "thread" : "list"); };
        window.addEventListener("support:open", h);
        return () => window.removeEventListener("support:open", h);
    }, [activeId]);

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
                                    {loading && tickets.length === 0 ? (
                                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-neutral-400" /></div>
                                    ) : tickets.length === 0 ? (
                                        <div className="p-6 text-center text-sm text-neutral-500">
                                            Hali murojaatlaringiz yo'q.
                                        </div>
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

                        {/* Bottom */}
                        {authStatus === "authenticated" && view === "list" && (
                            <button
                                onClick={() => setView("new")}
                                className="m-3 py-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium flex items-center justify-center gap-2"
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
