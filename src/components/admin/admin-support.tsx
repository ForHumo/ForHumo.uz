"use client";

// Admin: Support tiketlar boshqaruvi.
// Chap — ro'yxat (status filter), o'ng — tanlangan tiket thread + composer.

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2, CheckCircle2, RefreshCw, MessageCircle, Sparkles } from "lucide-react";
import { Link } from "@/i18n/routing";

type TicketListItem = {
    id: string; subject: string; status: string; module: string | null;
    email: string;
    profile: { username: string | null; name: string | null; humoId: string | null } | null;
    aiHandled: boolean;
    aiConfidence: number | null;
    escalated: boolean;
    escalatedReason: string | null;
    createdAt: string; updatedAt: string;
    lastMessage: { body: string; fromAdmin: boolean; fromAi?: boolean; readByAdmin: boolean; createdAt: string } | null;
};
type Message = { id: string; body: string; fromAdmin: boolean; fromAi?: boolean; aiConfidence?: number | null; createdAt: string };
type ActiveTicket = {
    id: string; subject: string; status: string; module: string | null; email: string;
    profile: { username: string | null; name: string | null; humoId: string | null; image: string | null } | null;
    aiHandled?: boolean;
    escalated?: boolean;
    escalatedReason?: string | null;
    createdAt: string; updatedAt: string;
};

const MODULE_LABEL: Record<string, string> = {
    bn: "Bozor Narxida", nexus: "Nexus", market: "Market", pay: "For Pay",
    id: "Humo ID", esport: "eSport", ai: "Humo AI", support: "Support",
};

export function AdminSupport() {
    const [status, setStatus] = useState<"open" | "pending" | "closed" | "all">("open");
    const [filter, setFilter] = useState<"" | "escalated" | "ai">("");
    const [list, setList] = useState<TicketListItem[]>([]);
    const [segments, setSegments] = useState<{ escalated: number; ai: number }>({ escalated: 0, ai: 0 });
    const [loadingList, setLoadingList] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [active, setActive] = useState<ActiveTicket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingThread, setLoadingThread] = useState(false);
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const loadList = useCallback(async () => {
        setLoadingList(true);
        try {
            const q = new URLSearchParams({ status });
            if (filter) q.set("filter", filter);
            const r = await fetch(`/api/admin/support/tickets?${q.toString()}`, { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setList(j.items ?? []);
                if (j.segments) setSegments(j.segments);
            }
        } finally { setLoadingList(false); }
    }, [status, filter]);

    const loadThread = useCallback(async (id: string) => {
        setLoadingThread(true);
        try {
            const r = await fetch(`/api/admin/support/tickets/${id}`, { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setActive(j.ticket);
                setMessages(j.messages ?? []);
            }
        } finally { setLoadingThread(false); }
    }, []);

    useEffect(() => { loadList(); }, [loadList]);
    useEffect(() => { if (activeId) loadThread(activeId); }, [activeId, loadThread]);
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    async function send(e: React.FormEvent) {
        e.preventDefault();
        if (!activeId || reply.trim().length < 1) return;
        setSending(true);
        try {
            const r = await fetch(`/api/admin/support/tickets/${activeId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: reply.trim() }),
            });
            if (r.ok) {
                const j = await r.json();
                setMessages(m => [...m, j.message]);
                setReply("");
                loadList();
            }
        } finally { setSending(false); }
    }

    async function changeStatus(next: "open" | "pending" | "closed") {
        if (!activeId) return;
        const r = await fetch(`/api/admin/support/tickets/${activeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next }),
        });
        if (r.ok) {
            setActive(a => a ? { ...a, status: next } : a);
            loadList();
        }
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageCircle size={20} /> Support
                </h1>
                <button
                    onClick={loadList}
                    className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                >
                    <RefreshCw size={14} /> Yangilash
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
                {/* Ro'yxat */}
                <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] overflow-hidden">
                    <div className="p-2 border-b border-gray-100 dark:border-white/[0.06] flex gap-1">
                        {(["open", "pending", "closed", "all"] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatus(s)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${
                                    status === s
                                        ? "bg-gray-900 dark:bg-white text-white dark:text-black"
                                        : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.05]"
                                }`}
                            >
                                {s === "open" ? "Ochiq" : s === "pending" ? "Kutmoqda" : s === "closed" ? "Yopiq" : "Barchasi"}
                            </button>
                        ))}
                    </div>

                    {/* C — AI/escalated filter chip'lar */}
                    <div className="px-2 py-1.5 border-b border-gray-100 dark:border-white/[0.06] flex gap-1 flex-wrap">
                        <button
                            onClick={() => setFilter(filter === "escalated" ? "" : "escalated")}
                            className={`px-2 py-1 rounded-md text-[10.5px] font-bold flex items-center gap-1 ${
                                filter === "escalated"
                                    ? "bg-red-500 text-white"
                                    : "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                            }`}
                        >
                            Insonga eskalatsiya
                            {segments.escalated > 0 && (
                                <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-red-500 text-[9px] flex items-center justify-center">
                                    {segments.escalated > 99 ? "99+" : segments.escalated}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setFilter(filter === "ai" ? "" : "ai")}
                            className={`px-2 py-1 rounded-md text-[10.5px] font-bold flex items-center gap-1 ${
                                filter === "ai"
                                    ? "bg-purple-500 text-white"
                                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                            }`}
                        >
                            <Sparkles size={10} /> AI ishlagan
                            {segments.ai > 0 && (
                                <span className="min-w-[16px] h-4 px-1 rounded-full bg-white text-purple-500 text-[9px] flex items-center justify-center">
                                    {segments.ai > 99 ? "99+" : segments.ai}
                                </span>
                            )}
                        </button>
                        {filter && (
                            <button
                                onClick={() => setFilter("")}
                                className="px-2 py-1 rounded-md text-[10.5px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            >
                                Tozalash
                            </button>
                        )}
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto">
                        {loadingList && list.length === 0 ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
                        ) : list.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-500">Tiket yo'q</div>
                        ) : list.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveId(t.id)}
                                className={`w-full text-left p-3 border-b border-gray-100 dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                                    activeId === t.id ? "bg-gray-100 dark:bg-white/[0.05]" : ""
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        {t.escalated && (
                                            <span title="Insonga eskalatsiya"
                                                className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500 text-white flex-shrink-0">
                                                !
                                            </span>
                                        )}
                                        {t.aiHandled && !t.escalated && (
                                            <Sparkles size={11} className="text-purple-500 flex-shrink-0" />
                                        )}
                                        <div className="text-sm font-semibold truncate">{t.subject}</div>
                                    </div>
                                    {t.lastMessage && !t.lastMessage.fromAdmin && !t.lastMessage.readByAdmin && (
                                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 truncate">
                                    {t.profile?.username ? `@${t.profile.username}` : t.email}
                                    {t.module && ` • ${MODULE_LABEL[t.module] ?? t.module}`}
                                </div>
                                {t.lastMessage && (
                                    <div className="text-xs text-gray-400 truncate mt-1">
                                        {t.lastMessage.fromAdmin ? "→ " : "← "}{t.lastMessage.body}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Thread */}
                <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] overflow-hidden flex flex-col min-h-[70vh]">
                    {!activeId ? (
                        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                            Tiket tanlang
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b border-gray-100 dark:border-white/[0.06]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-black">{active?.subject}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {active?.profile?.name ?? active?.email}
                                            {active?.profile?.username && ` (@${active.profile.username})`}
                                            {active?.profile?.humoId && ` • ${active.profile.humoId}`}
                                            {active?.module && ` • ${MODULE_LABEL[active.module] ?? active.module}`}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {active?.profile?.username && (
                                            <Link
                                                href={`/nexus?dm=${active.profile.username}` as never}
                                                target="_blank"
                                                title="Nexus DM'da mijoz bilan yozish"
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-md transition-all"
                                            >
                                                <Sparkles size={11} /> Nexus DM
                                            </Link>
                                        )}
                                        {(["open", "pending", "closed"] as const).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => changeStatus(s)}
                                                disabled={active?.status === s}
                                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                                                    active?.status === s
                                                        ? "bg-gray-900 dark:bg-white text-white dark:text-black"
                                                        : "border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                                }`}
                                            >
                                                {s === "open" ? "Ochiq" : s === "pending" ? "Kutmoqda" : "Yopish"}
                                                {active?.status === "closed" && s === "closed" && <CheckCircle2 size={11} className="inline ml-1" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[55vh]">
                                {loadingThread && messages.length === 0 ? (
                                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
                                ) : messages.map(m => (
                                    <div key={m.id} className={`flex ${m.fromAdmin || m.fromAi ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                                            m.fromAi
                                                ? "bg-purple-500/10 text-purple-900 dark:text-purple-200 border border-purple-500/30 rounded-br-sm"
                                                : m.fromAdmin
                                                ? "bg-gray-900 dark:bg-white text-white dark:text-black rounded-br-sm"
                                                : "bg-gray-100 dark:bg-white/[0.05] text-gray-800 dark:text-gray-200 rounded-bl-sm"
                                        }`}>
                                            {m.fromAi && (
                                                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                                                    <Sparkles size={10} /> AI
                                                    {typeof m.aiConfidence === "number" && (
                                                        <span className="ml-auto">
                                                            {Math.round(m.aiConfidence * 100)}%
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {m.body}
                                            <div className={`text-[10px] mt-1 opacity-60 ${m.fromAdmin || m.fromAi ? "text-right" : ""}`}>
                                                {new Date(m.createdAt).toLocaleString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={bottomRef} />
                            </div>

                            {active?.status !== "closed" && (
                                <form onSubmit={send} className="p-3 border-t border-gray-100 dark:border-white/[0.06] flex gap-2">
                                    <textarea
                                        value={reply}
                                        onChange={e => setReply(e.target.value)}
                                        placeholder="Javob yozing…"
                                        rows={2}
                                        maxLength={4000}
                                        className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/[0.05] border border-gray-200 dark:border-white/[0.06] text-sm focus:outline-none focus:border-gray-400 resize-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={sending || reply.trim().length < 1}
                                        className="px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-black text-sm font-medium disabled:opacity-50 flex items-center gap-1.5 shrink-0 self-end"
                                    >
                                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        Yuborish
                                    </button>
                                </form>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
