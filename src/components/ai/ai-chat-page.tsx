"use client";

// Humo AI Chat — native React sahifa (iframe o'rniga).
// Chap: suhbatlar ro'yxati (mavzular). O'ng: chat oynasi.
// Har xabar DB'da saqlanadi, AI foydalanuvchini eslab qoladi.

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import {
    Send, Loader2, Plus, MessageSquare, Sparkles, Trash2, LogIn,
    Archive, Menu, X as XIcon, User as UserIcon, Brain, ShieldCheck,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { moduleTheme } from "@/lib/module-theme";

interface ConvSummary {
    id: string; title: string; topic: string | null; moduleOrigin: string | null;
    lastMsgAt: string; createdAt: string; archived: boolean; messageCount: number;
}
interface MsgRow {
    id: string; role: "user" | "ai" | "system"; body: string;
    audioUrl?: string | null; attachmentUrl?: string | null;
    aiModel?: string | null; createdAt: string;
}

const T = moduleTheme("ai");

export function AiChatPage() {
    const { status } = useSession();
    const [convs, setConvs] = useState<ConvSummary[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [messages, setMessages] = useState<MsgRow[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [loadingConvs, setLoadingConvs] = useState(false);
    const [loadingThread, setLoadingThread] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);   // mobile
    const bottomRef = useRef<HTMLDivElement>(null);

    // Yuklash — suhbatlar ro'yxati
    const loadConvs = useCallback(async () => {
        if (status !== "authenticated") return;
        setLoadingConvs(true);
        try {
            const r = await fetch("/api/ai/conversations", { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setConvs(j.conversations ?? []);
            }
        } finally { setLoadingConvs(false); }
    }, [status]);

    useEffect(() => { loadConvs(); }, [loadConvs]);

    // Bir suhbatni ochish
    const loadThread = useCallback(async (id: string) => {
        setLoadingThread(true);
        try {
            const r = await fetch(`/api/ai/conversations/${id}`, { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setMessages(j.messages ?? []);
            }
        } finally { setLoadingThread(false); }
    }, []);

    useEffect(() => {
        if (activeId) loadThread(activeId);
        else setMessages([]);
    }, [activeId, loadThread]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function sendMessage(e?: React.FormEvent) {
        e?.preventDefault();
        const text = input.trim();
        if (!text || sending) return;
        setSending(true);
        setInput("");

        // Optimistic UI
        const tempMsg: MsgRow = {
            id: `tmp-${Date.now()}`, role: "user", body: text,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const r = await fetch("/api/ai/converse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text,
                    conversationId: activeId ?? undefined,
                }),
            });
            const j = await r.json();
            if (!r.ok) {
                const errMsg: MsgRow = {
                    id: `err-${Date.now()}`, role: "ai",
                    body: j?.message || j?.error || "Xatolik yuz berdi",
                    createdAt: new Date().toISOString(),
                };
                setMessages(prev => [...prev.filter(m => m.id !== tempMsg.id), tempMsg, errMsg]);
                return;
            }
            const newConvId = j.conversationId as string;
            const [userReal, aiReal] = j.messages ?? [];
            setMessages(prev => [
                ...prev.filter(m => m.id !== tempMsg.id),
                { ...userReal, role: "user" },
                { ...aiReal, role: "ai" },
            ]);
            if (!activeId) {
                setActiveId(newConvId);
                loadConvs();
            } else {
                // Convs'da lastMsgAt yangilash uchun
                loadConvs();
            }
        } finally {
            setSending(false);
        }
    }

    async function newChat() {
        setActiveId(null);
        setMessages([]);
        setInput("");
        setSidebarOpen(false);
    }

    async function deleteConv(id: string) {
        if (!confirm("Bu suhbatni butunlay o'chirasizmi?")) return;
        const r = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
        if (r.ok) {
            setConvs(prev => prev.filter(c => c.id !== id));
            if (activeId === id) { setActiveId(null); setMessages([]); }
        }
    }

    async function archiveConv(id: string, current: boolean) {
        const r = await fetch(`/api/ai/conversations/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ archived: !current }),
        });
        if (r.ok) loadConvs();
    }

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.primary }} />
            </div>
        );
    }

    if (status === "unauthenticated") {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="max-w-sm w-full text-center rounded-3xl p-8 border" style={{ borderColor: T.border }}>
                    <span className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4"
                        style={{ background: T.gradient, color: T.onPrimary }}>
                        <Brain className="w-7 h-7" />
                    </span>
                    <h1 className="text-xl font-black mb-2">Humo AI</h1>
                    <p className="text-sm text-muted-foreground mb-4">
                        Chat tarixingizni saqlash va sizni yaxshi tanish uchun kiring.
                    </p>
                    <button onClick={() => signIn("google")}
                        className="w-full h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
                        style={{ background: T.gradient }}>
                        <LogIn className="w-4 h-4" /> Google bilan kirish
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <button className="md:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setSidebarOpen(false)} aria-label="Yopish" />
            )}

            {/* Sidebar — suhbatlar */}
            <aside className={`w-72 flex-shrink-0 border-r flex flex-col
                ${sidebarOpen ? "fixed inset-y-0 left-0 z-40" : "hidden md:flex"}`}
                style={{ borderColor: T.border, background: "var(--background)" }}>
                <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: T.border }}>
                    <button onClick={newChat}
                        className="flex-1 flex items-center gap-2 h-10 px-3 rounded-xl text-sm font-black"
                        style={{ background: T.gradient, color: T.onPrimary, boxShadow: T.shadow }}>
                        <Plus className="w-4 h-4" /> Yangi chat
                    </button>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loadingConvs && convs.length === 0 ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : convs.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                            Hali suhbat yo&apos;q.<br />Yangi chat bilan boshlang.
                        </div>
                    ) : (
                        convs.map(c => {
                            const active = c.id === activeId;
                            return (
                                <div key={c.id} className="group relative">
                                    <button
                                        onClick={() => { setActiveId(c.id); setSidebarOpen(false); }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                                            active ? "font-black" : "font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                                        }`}
                                        style={active ? { background: T.soft, color: T.primary } : { color: "var(--foreground)" }}
                                    >
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate flex-1">{c.title}</span>
                                            {c.archived && <Archive className="w-3 h-3 opacity-50 flex-shrink-0" />}
                                        </div>
                                        <p className="text-[10px] opacity-60 pl-5">
                                            {c.moduleOrigin && `${c.moduleOrigin} · `}
                                            {c.messageCount} xabar
                                        </p>
                                    </button>
                                    <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5">
                                        <button onClick={() => archiveConv(c.id, c.archived)}
                                            title={c.archived ? "Qayta faollashtir" : "Arxivlash"}
                                            className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]">
                                            <Archive className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => deleteConv(c.id)}
                                            title="O'chirish"
                                            className="p-1 rounded hover:bg-red-500/10 text-red-500">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Bottom — sozlamalar */}
                <div className="p-2 border-t space-y-1" style={{ borderColor: T.border }}>
                    <Link href={"/ai/knowledge" as never}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                        <ShieldCheck className="w-3.5 h-3.5" style={{ color: T.primary }} />
                        Bilim bazam
                    </Link>
                    <Link href={"/id" as never}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                        <UserIcon className="w-3.5 h-3.5 opacity-60" />
                        Profilim
                    </Link>
                </div>
            </aside>

            {/* Main — chat */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-14 border-b flex items-center gap-2 px-4 flex-shrink-0"
                    style={{ borderColor: T.border }}>
                    <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2">
                        <Menu className="w-5 h-5" />
                    </button>
                    <span className="w-8 h-8 rounded-lg grid place-items-center"
                        style={{ background: T.gradient, color: T.onPrimary }}>
                        <Brain className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-black truncate">Humo AI</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                            {activeId ? (convs.find(c => c.id === activeId)?.title ?? "Suhbat") : "Yangi chat"}
                        </p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {!activeId && messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4">
                            <span className="w-16 h-16 rounded-2xl grid place-items-center mb-4"
                                style={{ background: T.gradient, color: T.onPrimary }}>
                                <Sparkles className="w-8 h-8" />
                            </span>
                            <h2 className="text-xl font-black mb-2">Salom! Men — Humo AI</h2>
                            <p className="text-sm text-muted-foreground max-w-md">
                                For Humo modullari haqida yordam beraman. Sizni yaxshi tanish uchun
                                suhbatlarimizni eslab qolaman (faqat siz uchun, shifrlangan).
                            </p>
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
                                {[
                                    "Belisdan sarpo qutisini qanday ijaraga olaman?",
                                    "For Pay hamyondan qanday to'lov qilish mumkin?",
                                    "Nexus'da yangi post qanday yaratiladi?",
                                    "Menga mos bir Belis komplekt taklif qiling",
                                ].map(sample => (
                                    <button key={sample}
                                        onClick={() => setInput(sample)}
                                        className="text-left p-2.5 rounded-xl border text-xs hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                                        style={{ borderColor: T.border }}>
                                        {sample}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {loadingThread && messages.length === 0 && (
                        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    )}

                    {messages.map(m => {
                        const isUser = m.role === "user";
                        return (
                            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                <div className="max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words"
                                    style={{
                                        background: isUser ? T.gradient : "var(--card, rgba(0,0,0,0.04))",
                                        color: isUser ? T.onPrimary : "var(--foreground)",
                                        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                    }}>
                                    {m.body}
                                    <div className={`text-[10px] mt-1 opacity-60 ${isUser ? "text-right" : ""}`}>
                                        {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                                        {m.aiModel && ` · ${m.aiModel}`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>

                <form onSubmit={sendMessage} className="border-t p-3 flex gap-2" style={{ borderColor: T.border }}>
                    <input
                        value={input}
                        onChange={e => setInput(e.target.value.slice(0, 4000))}
                        placeholder="Humo AI'ga xabar yozing..."
                        className="flex-1 h-11 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2"
                        style={{ borderColor: T.border, ["--tw-ring-color" as string]: T.primary + "50" }}
                        disabled={sending}
                    />
                    <button type="submit" disabled={sending || !input.trim()}
                        className="w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-50"
                        style={{ background: T.gradient, color: T.onPrimary }}>
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </main>
        </div>
    );
}
