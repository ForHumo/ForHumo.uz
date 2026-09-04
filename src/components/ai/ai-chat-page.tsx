"use client";

// Humo AI Chat — native React sahifa (iframe o'rniga).
// Chap: suhbatlar ro'yxati (mavzular). O'ng: chat oynasi.
// Har xabar DB'da saqlanadi, AI foydalanuvchini eslab qoladi.

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import {
    Send, Loader2, Plus, MessageSquare, Sparkles, Trash2, LogIn,
    Archive, Menu, X as XIcon, User as UserIcon, Brain, ShieldCheck,
    Mic, MicOff, Paperclip, ImageIcon, Volume2, VolumeX, Share2, Check,
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
    attachmentType?: string | null;
    aiModel?: string | null; createdAt: string;
    followUps?: string[];   // AI'dan tavsiya keyingi savollar
}

// Web Speech API tiplari (browser API — TS deklarasiya)
interface SpeechRecognitionResult { transcript: string; confidence: number }
interface SpeechRecognitionEvent { results: ArrayLike<ArrayLike<SpeechRecognitionResult>>; resultIndex: number }
interface SpeechRecognitionType {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: ((e: Event) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
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
    const [kbCount, setKbCount] = useState<number | null>(null);   // bilim bazasi kattaligi
    const [kbBannerDismissed, setKbBannerDismissed] = useState(false);
    // Voice input
    const [recording, setRecording] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionType | null>(null);
    // Attachment
    const [attachment, setAttachment] = useState<{ url: string; type: "image" | "file"; name: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // TTS (voice output)
    const [ttsEnabled, setTtsEnabled] = useState(false);
    const [ttsSpeakingId, setTtsSpeakingId] = useState<string | null>(null);
    const [shareCopied, setShareCopied] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // TTS toggle — LocalStorage'da saqlanadi
    useEffect(() => {
        try { setTtsEnabled(localStorage.getItem("ai-tts-enabled") === "1"); } catch { /* ignore */ }
    }, []);
    function toggleTts() {
        setTtsEnabled(prev => {
            const next = !prev;
            try { localStorage.setItem("ai-tts-enabled", next ? "1" : "0"); } catch { /* ignore */ }
            if (!next) { window.speechSynthesis?.cancel(); setTtsSpeakingId(null); }
            return next;
        });
    }
    function speakMessage(id: string, text: string) {
        if (typeof window === "undefined" || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        if (ttsSpeakingId === id) { setTtsSpeakingId(null); return; }
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "uz-UZ";
        utter.rate = 1.0;
        utter.onend = () => setTtsSpeakingId(null);
        utter.onerror = () => setTtsSpeakingId(null);
        window.speechSynthesis.speak(utter);
        setTtsSpeakingId(id);
    }

    // Web Speech API detektsiya
    useEffect(() => {
        try {
            const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
            setVoiceSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
        } catch { /* ignore */ }
    }, []);

    function toggleVoice() {
        if (recording) {
            recognitionRef.current?.stop();
            setRecording(false);
            return;
        }
        try {
            const w = window as unknown as {
                SpeechRecognition?: new () => SpeechRecognitionType;
                webkitSpeechRecognition?: new () => SpeechRecognitionType;
            };
            const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
            if (!Ctor) return;
            const r = new Ctor();
            r.lang = "uz-UZ";
            r.continuous = false;
            r.interimResults = true;
            r.onresult = (e: SpeechRecognitionEvent) => {
                let transcript = "";
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    transcript += e.results[i][0].transcript;
                }
                setInput(prev => (prev ? prev + " " : "") + transcript.trim());
            };
            r.onerror = () => setRecording(false);
            r.onend = () => setRecording(false);
            r.start();
            recognitionRef.current = r;
            setRecording(true);
        } catch (e) {
            console.error("voice failed", e);
            setRecording(false);
        }
    }

    async function uploadAttachment(file: File) {
        if (uploading) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const r = await fetch("/api/ai/upload", { method: "POST", body: fd });
            if (!r.ok) { setUploading(false); return; }
            const d = await r.json();
            const isImage = file.type.startsWith("image/");
            setAttachment({ url: d.url, type: isImage ? "image" : "file", name: file.name });
        } finally { setUploading(false); }
    }

    // KB count — banner ko'rsatish uchun
    useEffect(() => {
        if (status !== "authenticated") return;
        fetch("/api/ai/knowledge", { cache: "no-store" })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setKbCount(d.total ?? 0); })
            .catch(() => {});
        try {
            const dismissed = localStorage.getItem("ai-kb-banner-dismissed");
            if (dismissed) setKbBannerDismissed(true);
        } catch { /* ignore */ }
    }, [status]);

    function dismissKbBanner() {
        try { localStorage.setItem("ai-kb-banner-dismissed", "1"); } catch { /* ignore */ }
        setKbBannerDismissed(true);
    }

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
        if ((!text && !attachment) || sending) return;
        setSending(true);
        setInput("");
        const attachmentSnapshot = attachment;
        setAttachment(null);

        // Optimistic UI
        const tempMsg: MsgRow = {
            id: `tmp-${Date.now()}`, role: "user", body: text || "(rasm)",
            attachmentUrl: attachmentSnapshot?.url ?? null,
            attachmentType: attachmentSnapshot?.type ?? null,
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);

        // Rasm bo'lsa oddiy endpoint (streaming vision qo'llamaymiz), aks holda streaming
        const useStreaming = !attachmentSnapshot;

        try {
            if (useStreaming) {
                await sendStreaming(text, tempMsg.id, attachmentSnapshot);
            } else {
                await sendClassic(text, tempMsg.id, attachmentSnapshot);
            }
            loadConvs();
        } finally {
            setSending(false);
        }
    }

    async function sendClassic(text: string, tempId: string, att: typeof attachment) {
        const r = await fetch("/api/ai/converse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text || "(rasm yubordim, tahlil qiling)",
                conversationId: activeId ?? undefined,
                attachmentUrl: att?.url,
                attachmentType: att?.type,
            }),
        });
        const j = await r.json();
        if (!r.ok) {
            setMessages(prev => [
                ...prev.filter(m => m.id !== tempId),
                { id: `tmp-user-${Date.now()}`, role: "user", body: text, attachmentUrl: att?.url ?? null, attachmentType: att?.type ?? null, createdAt: new Date().toISOString() },
                { id: `err-${Date.now()}`, role: "ai", body: j?.message || j?.error || "Xatolik", createdAt: new Date().toISOString() },
            ]);
            return;
        }
        const [userReal, aiReal] = j.messages ?? [];
        const followUps: string[] = Array.isArray(j.followUps) ? j.followUps.slice(0, 3) : [];
        setMessages(prev => [
            ...prev.filter(m => m.id !== tempId),
            { ...userReal, role: "user", attachmentUrl: att?.url ?? null, attachmentType: att?.type ?? null },
            { ...aiReal, role: "ai", followUps },
        ]);
        if (!activeId) setActiveId(j.conversationId);
        // TTS
        if (ttsEnabled && aiReal?.body && aiReal?.id) speakMessage(aiReal.id, aiReal.body);
    }

    async function sendStreaming(text: string, tempId: string, att: typeof attachment) {
        // Streaming AI xabari uchun placeholder — chunk'lar keladi
        const streamMsgId = `stream-${Date.now()}`;
        setMessages(prev => [
            ...prev.filter(m => m.id !== tempId),
            { id: `tmp-user-${Date.now()}`, role: "user", body: text, createdAt: new Date().toISOString() },
            { id: streamMsgId, role: "ai", body: "", createdAt: new Date().toISOString() },
        ]);

        try {
            const r = await fetch("/api/ai/converse-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: text, conversationId: activeId ?? undefined,
                    attachmentUrl: att?.url, attachmentType: att?.type,
                }),
            });
            if (!r.ok || !r.body) throw new Error("stream_failed");

            const reader = r.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let acc = "";
            let doneData: { messages?: MsgRow[]; followUps?: string[]; conversationId?: string } | null = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split("\n\n");
                buffer = events.pop() ?? "";
                for (const evt of events) {
                    const line = evt.trim();
                    if (!line.startsWith("data:")) continue;
                    try {
                        const p = JSON.parse(line.slice(5).trim());
                        if (p.type === "chunk" && p.text) {
                            acc += p.text;
                            setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, body: acc } : m));
                        } else if (p.type === "done") {
                            doneData = p;
                        } else if (p.type === "error") {
                            setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, body: p.message || "Xatolik" } : m));
                            return;
                        }
                    } catch { /* skip */ }
                }
            }

            if (doneData) {
                const aiReal = doneData.messages?.[1];
                if (aiReal) {
                    setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...aiReal, role: "ai", followUps: doneData?.followUps } : m));
                    if (ttsEnabled && aiReal.body && aiReal.id) speakMessage(aiReal.id, aiReal.body);
                }
                if (!activeId && doneData.conversationId) setActiveId(doneData.conversationId);
            }
        } catch (e) {
            console.error("streaming failed:", e);
            // Fallback classic
            await sendClassic(text, streamMsgId, att);
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

    async function shareConv(id: string) {
        const r = await fetch(`/api/ai/conversations/${id}/share`, { method: "POST" });
        if (!r.ok) return;
        const j = await r.json();
        const full = typeof window !== "undefined" ? `${window.location.origin}${j.url}` : j.url;
        try {
            await navigator.clipboard.writeText(full);
            setShareCopied(id);
            setTimeout(() => setShareCopied(prev => prev === id ? null : prev), 2500);
        } catch {
            // fallback: prompt
            window.prompt("Havolani nusxa oling:", full);
        }
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
                                        <button onClick={() => shareConv(c.id)}
                                            title="Ulashish (havola nusxa)"
                                            className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]">
                                            {shareCopied === c.id
                                                ? <Check className="w-3 h-3 text-green-500" />
                                                : <Share2 className="w-3 h-3" />}
                                        </button>
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
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-black truncate">Humo AI</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                            {activeId ? (convs.find(c => c.id === activeId)?.title ?? "Suhbat") : "Yangi chat"}
                        </p>
                    </div>
                    {/* TTS toggle */}
                    <button onClick={toggleTts}
                        title={ttsEnabled ? "Ovoz o'chiq" : "Ovoz yoqish"}
                        className="w-9 h-9 rounded-lg grid place-items-center hover:brightness-95"
                        style={{ background: ttsEnabled ? T.soft : "transparent", color: ttsEnabled ? T.primary : "var(--muted-foreground)" }}>
                        {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                </header>

                {/* Proaktiv KB banner — bilim bazasi 5 dan kam bo'lsa taklif */}
                {kbCount !== null && kbCount < 5 && !kbBannerDismissed && (
                    <div className="mx-4 mt-3 p-3 rounded-xl flex items-start gap-2.5 border"
                        style={{ background: T.soft, borderColor: T.border }}>
                        <span className="w-8 h-8 rounded-lg grid place-items-center flex-shrink-0"
                            style={{ background: T.gradient, color: T.onPrimary }}>
                            <Sparkles className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-black" style={{ color: T.primary }}>
                                Sizni yaxshiroq tanish uchun 1 daqiqa
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {kbCount === 0
                                    ? "AI hozircha siz haqingizda hech narsa bilmaydi. Bir necha savolga javob bering — tavsiyalar aniqroq bo'ladi."
                                    : `Hozir ${kbCount} ta ma'lumot. Yana bir necha savol javob bering — AI aniqroq javob beradi.`}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <Link href={"/id/discover" as never}
                                    className="h-8 px-3 rounded-lg text-[11px] font-black flex items-center gap-1"
                                    style={{ background: T.gradient, color: T.onPrimary }}>
                                    Boshlash →
                                </Link>
                                <button onClick={dismissKbBanner}
                                    className="text-[11px] text-muted-foreground hover:underline">
                                    Keyinroq
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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

                    {messages.map((m, idx) => {
                        const isUser = m.role === "user";
                        const isLastAi = !isUser && idx === messages.length - 1;
                        return (
                            <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                                <div className="max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words"
                                    style={{
                                        background: isUser ? T.gradient : "var(--card, rgba(0,0,0,0.04))",
                                        color: isUser ? T.onPrimary : "var(--foreground)",
                                        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                    }}>
                                    {m.attachmentType === "image" && m.attachmentUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={m.attachmentUrl} alt="" className="mb-2 max-w-full max-h-64 rounded-lg" />
                                    )}
                                    {m.body}
                                    {/* Streaming caret */}
                                    {!isUser && sending && idx === messages.length - 1 && (
                                        <span className="inline-block w-1.5 h-3 ml-0.5 bg-current animate-pulse rounded-sm" />
                                    )}
                                    <div className={`text-[10px] mt-1 opacity-60 flex items-center gap-1.5 ${isUser ? "justify-end" : ""}`}>
                                        <span>
                                            {new Date(m.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                                            {m.aiModel && ` · ${m.aiModel}`}
                                        </span>
                                        {!isUser && m.body && (
                                            <button onClick={() => speakMessage(m.id, m.body)}
                                                title={ttsSpeakingId === m.id ? "To'xtatish" : "Ovoz bilan o'qish"}
                                                className="opacity-70 hover:opacity-100 transition-opacity">
                                                {ttsSpeakingId === m.id
                                                    ? <VolumeX className="w-3 h-3" />
                                                    : <Volume2 className="w-3 h-3" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {/* Quick replies — faqat oxirgi AI xabari */}
                                {isLastAi && Array.isArray(m.followUps) && m.followUps.length > 0 && !sending && (
                                    <div className="mt-2 flex flex-wrap gap-1.5 max-w-[75%]">
                                        {m.followUps.map((f, i) => (
                                            <button key={i}
                                                onClick={() => { setInput(f); }}
                                                className="px-3 py-1.5 rounded-full text-xs font-semibold border hover:brightness-95"
                                                style={{ borderColor: T.border, background: T.soft, color: T.primary }}>
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>

                {/* Attachment preview */}
                {attachment && (
                    <div className="mx-3 mt-2 p-2 rounded-xl border flex items-center gap-2"
                        style={{ borderColor: T.border, background: T.soft }}>
                        {attachment.type === "image" ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={attachment.url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                            <span className="w-12 h-12 rounded-lg grid place-items-center" style={{ background: T.gradient, color: T.onPrimary }}>
                                <Paperclip className="w-4 h-4" />
                            </span>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate">{attachment.name}</p>
                            <p className="text-[10px] text-muted-foreground">{attachment.type === "image" ? "Rasm" : "Fayl"}</p>
                        </div>
                        <button onClick={() => setAttachment(null)}
                            className="w-8 h-8 rounded-lg grid place-items-center hover:brightness-95"
                            style={{ background: T.soft, color: T.primary }}>
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <form onSubmit={sendMessage} className="border-t p-3 flex gap-2 items-end" style={{ borderColor: T.border }}>
                    {/* Attachment button */}
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" hidden
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ""; }} />
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || !!attachment}
                        title="Rasm yoki fayl"
                        className="w-11 h-11 rounded-xl grid place-items-center disabled:opacity-40 hover:brightness-95"
                        style={{ background: T.soft, color: T.primary }}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    </button>

                    <input
                        value={input}
                        onChange={e => setInput(e.target.value.slice(0, 4000))}
                        placeholder={recording ? "Tinglayapman..." : "Humo AI'ga xabar yozing..."}
                        className="flex-1 h-11 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2"
                        style={{ borderColor: recording ? T.primary : T.border, ["--tw-ring-color" as string]: T.primary + "50" }}
                        disabled={sending}
                    />

                    {/* Voice input */}
                    {voiceSupported && (
                        <button type="button" onClick={toggleVoice}
                            title={recording ? "To'xtatish" : "Ovoz bilan"}
                            className="w-11 h-11 rounded-xl grid place-items-center"
                            style={{
                                background: recording ? "#EF4444" : T.soft,
                                color: recording ? "#fff" : T.primary,
                            }}>
                            {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                    )}

                    <button type="submit" disabled={sending || (!input.trim() && !attachment)}
                        className="w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-50"
                        style={{ background: T.gradient, color: T.onPrimary }}>
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </main>
        </div>
    );
}
