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
    Code2, Globe, BookOpen, Mail, Film, Users, Clock, Cpu, ChevronDown, Copy, Download, Home,
    Music, Search, CheckSquare, Square, Link2Off, PanelLeftClose, PanelLeftOpen, RefreshCw, Pencil, type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { AiStarfield } from "@/components/ai/ai-starfield";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { AI_MODELS, DEFAULT_MODEL, findModel } from "@/lib/ai-models";

interface ConvSummary {
    id: string; title: string; topic: string | null; moduleOrigin: string | null;
    mode?: string;
    lastMsgAt: string; createdAt: string; archived: boolean; messageCount: number;
    shareId?: string | null;   // ulashilgan bo'lsa — public URL id
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

// Humo AI — eski monoxrom qora tema (ChatGPT uslubi). Violet-fuchsia EMAS.
// Eski ai-static palitrasi: bg #0d0d0d, matn #ebebeb, primary/CTA light #ECECEC + dark matn.
const T = {
    primary: "#ECECEC",
    soft: "rgba(255,255,255,0.06)",
    onPrimary: "#0d0d0d",
    border: "rgba(255,255,255,0.09)",
    gradient: "#ECECEC",
    shadow: "0 8px 24px rgba(0,0,0,0.5)",
};

// Humo AI rejimlari — global AI'lar (ChatGPT/Gemini) uslubidagi menu.
// chat + code TO'LIQ ishlaydi; pic/vid/cowork hozircha "Soon".
type AiMode = "chat" | "code" | "pic" | "vid" | "music" | "cowork";
const AI_MODES: { id: AiMode; label: string; sub: string; icon: LucideIcon; soon?: boolean }[] = [
    { id: "chat",   label: "Chat Bot",     sub: "Oddiy suhbat",     icon: Sparkles },
    { id: "code",   label: "Gen Code",     sub: "Kod yozib berish", icon: Code2 },
    { id: "pic",    label: "Gen Pic",      sub: "Rasm yaratish",    icon: ImageIcon },
    { id: "vid",    label: "Gen Vid",      sub: "Video yaratish",   icon: Film,      soon: true },
    { id: "music",  label: "Gen Music",    sub: "Musiqa yaratish",  icon: Music,     soon: true },
    { id: "cowork", label: "Humo CoWork",  sub: "Canvas — birga ishlash", icon: Users },
];
const AI_MODE_MAP = Object.fromEntries(AI_MODES.map(m => [m.id, m])) as Record<AiMode, typeof AI_MODES[number]>;

// Composer "+" menyusi (Gemini/ChatGPT uslubi) — faqat o'zimizniki.
type PlusItem = { id: string; label: string; icon: LucideIcon; action: "file" | "mode" | "soon"; mode?: AiMode; soon?: boolean };
const PLUS_ITEMS: PlusItem[] = [
    { id: "file",   label: "File biriktirish",    icon: Paperclip, action: "file" },
    { id: "code",   label: "Kod yozish",          icon: Code2,     action: "mode", mode: "code" },
    { id: "pic",    label: "Rasm yaratish",       icon: ImageIcon, action: "mode", mode: "pic" },
    { id: "vid",    label: "Video yaratish",      icon: Film,      action: "mode", mode: "vid",  soon: true },
    { id: "music",  label: "Musiqa yaratish",     icon: Music,     action: "mode", mode: "music", soon: true },
    { id: "cowork", label: "Humo CoWork",         icon: Users,     action: "mode", mode: "cowork" },
    { id: "search", label: "Saytlardan qidirish", icon: Search,    action: "soon", soon: true },
    { id: "think",  label: "Chuqur fikrlash",     icon: Brain,     action: "soon", soon: true },
];

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
    const [mode, setMode] = useState<AiMode>("chat");        // AI rejimi
    const [model, setModel] = useState<string>(DEFAULT_MODEL); // tanlangan AI model
    const [modelMenuOpen, setModelMenuOpen] = useState(false); // model tanlash dropdown
    const [canvas, setCanvas] = useState<string>("");          // CoWork Canvas hujjati
    const [canvasView, setCanvasView] = useState<"chat" | "canvas">("chat"); // mobil tab
    const [canvasCopied, setCanvasCopied] = useState(false);
    // Chat tanlash (bulk operatsiya)
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    // Composer "+" menyusi (Gemini/ChatGPT uslubi)
    const [plusMenuOpen, setPlusMenuOpen] = useState(false);
    // Sidebar yig'ish (desktop icon-rail) + chat qidiruv
    const [collapsed, setCollapsed] = useState(false);
    const [chatSearch, setChatSearch] = useState("");
    const chatSearchRef = useRef<HTMLInputElement>(null);
    // Xabarni nusxalash + oqimni to'xtatish (Stop)
    const [msgCopied, setMsgCopied] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    function copyMsg(id: string, text: string) {
        if (!text) return;
        navigator.clipboard?.writeText(text).then(() => {
            setMsgCopied(id);
            setTimeout(() => setMsgCopied(prev => prev === id ? null : prev), 1500);
        }).catch(() => {});
    }
    function stopGenerating() {
        abortRef.current?.abort();
    }

    function copyCanvas() {
        if (!canvas) return;
        navigator.clipboard?.writeText(canvas).then(() => {
            setCanvasCopied(true);
            setTimeout(() => setCanvasCopied(false), 1500);
        }).catch(() => {});
    }
    function downloadCanvas() {
        if (!canvas) return;
        const looksCode = /```|function |const |import |class |def /.test(canvas);
        const blob = new Blob([canvas], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = looksCode ? "humo-canvas.txt" : "humo-canvas.md";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    useEffect(() => {
        try {
            const m = localStorage.getItem("ai-model");
            if (m && AI_MODELS.some(x => x.id === m)) setModel(m);
        } catch { /* ignore */ }
    }, []);
    function pickModel(id: string) {
        setModel(id);
        setModelMenuOpen(false);
        try { localStorage.setItem("ai-model", id); } catch { /* ignore */ }
    }

    // Sidebar yig'ilgan holati — LocalStorage
    useEffect(() => {
        try { setCollapsed(localStorage.getItem("ai-sidebar-collapsed") === "1"); } catch { /* ignore */ }
    }, []);
    function toggleCollapse() {
        setCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem("ai-sidebar-collapsed", next ? "1" : "0"); } catch { /* ignore */ }
            return next;
        });
    }
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
    // Til tanlash
    const [aiLang, setAiLang] = useState<"uz" | "ru" | "en">("uz");

    useEffect(() => {
        try {
            const l = localStorage.getItem("ai-lang");
            if (l === "uz" || l === "ru" || l === "en") setAiLang(l);
        } catch { /* ignore */ }
    }, []);
    function switchLang(l: "uz" | "ru" | "en") {
        setAiLang(l);
        try { localStorage.setItem("ai-lang", l); } catch { /* ignore */ }
    }
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const prevMsgCountRef = useRef(0);

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

    // Composer "+" menyusi tanlovi
    function handlePlus(item: PlusItem) {
        setPlusMenuOpen(false);
        if (item.action === "file") { fileInputRef.current?.click(); return; }
        if (item.action === "mode" && item.mode) { switchMode(item.mode); return; }
        // soon — hozircha ishlamaydi (Saytlardan qidirish / Chuqur fikrlash)
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
            // Rejim-bo'yicha tarix — faqat joriy rejim suhbatlari
            const r = await fetch(`/api/ai/conversations?mode=${mode}`, { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setConvs(j.conversations ?? []);
            }
        } finally { setLoadingConvs(false); }
    }, [status, mode]);

    useEffect(() => { loadConvs(); }, [loadConvs]);

    // Rejim almashtirish — yangi suhbat (aktiv chatni tozalab) + o'sha rejim tarixi
    function switchMode(m: AiMode) {
        setSidebarOpen(false);
        if (m === mode) return;
        setMode(m);
        setActiveId(null);
        setMessages([]);
        setInput("");
        setCanvas("");
        setCanvasView("chat");
        setSelectMode(false);
        setSelected(new Set());
    }

    // Chat tanlash rejimi (belgilash + bulk o'chirish)
    function toggleSelectMode() {
        setSelectMode(prev => {
            if (prev) setSelected(new Set());
            return !prev;
        });
    }
    function toggleSelectOne(id: string) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }
    function toggleSelectAll() {
        setSelected(prev => prev.size === convs.length ? new Set() : new Set(convs.map(c => c.id)));
    }
    async function deleteSelected() {
        const ids = Array.from(selected);
        if (ids.length === 0) return;
        if (!confirm(`${ids.length} ta suhbat butunlay o'chiriladi. Davom etamizmi?`)) return;
        await Promise.allSettled(
            ids.map(id => fetch(`/api/ai/conversations/${id}`, { method: "DELETE" })),
        );
        setConvs(prev => prev.filter(c => !selected.has(c.id)));
        if (activeId && selected.has(activeId)) { setActiveId(null); setMessages([]); }
        setSelected(new Set());
        setSelectMode(false);
    }

    // Bir suhbatni ochish
    const loadThread = useCallback(async (id: string) => {
        setLoadingThread(true);
        try {
            const r = await fetch(`/api/ai/conversations/${id}`, { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                let msgs: MsgRow[] = j.messages ?? [];
                // CoWork — saqlangan AI xabaridan Canvas'ni ajratib tiklaymiz
                if (mode === "cowork") {
                    let lastDoc = "";
                    msgs = msgs.map(m => {
                        if (m.role === "ai" && m.body.includes("===CANVAS===")) {
                            const idx = m.body.indexOf("===CANVAS===");
                            lastDoc = m.body.slice(idx + 12).replace(/^\s*\n/, "").trim();
                            return { ...m, body: m.body.slice(0, idx).trim() || "Canvas'ga yozdim." };
                        }
                        return m;
                    });
                    setCanvas(lastDoc);
                    if (lastDoc) setCanvasView("canvas");
                }
                setMessages(msgs);
            }
        } finally { setLoadingThread(false); }
    }, [mode]);

    useEffect(() => {
        if (activeId) loadThread(activeId);
        else setMessages([]);
    }, [activeId, loadThread]);

    // Aqlli auto-scroll: yangi xabar (send/ochish) → pastga; oqim davomida faqat
    // foydalanuvchi pastga yaqin bo'lsa (yuqoriga skroll qilgan bo'lsa yulqib tortmaydi).
    useEffect(() => {
        const el = scrollAreaRef.current;
        const countChanged = messages.length !== prevMsgCountRef.current;
        prevMsgCountRef.current = messages.length;
        if (!el) { bottomRef.current?.scrollIntoView(); return; }
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
        if (countChanged || nearBottom) {
            bottomRef.current?.scrollIntoView({ behavior: countChanged ? "auto" : "smooth" });
        }
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
            if (mode === "pic") {
                await sendImagen(text, tempMsg.id);
            } else if (useStreaming) {
                await sendStreaming(text, tempMsg.id, attachmentSnapshot);
            } else {
                await sendClassic(text, tempMsg.id, attachmentSnapshot);
            }
            loadConvs();
        } finally {
            setSending(false);
        }
    }

    // Gen Pic — Cloudflare Flux orqali rasm yaratish
    async function sendImagen(prompt: string, tempId: string) {
        const genId = `gen-${Date.now()}`;
        setMessages(prev => [
            ...prev.map(m => m.id === tempId ? { ...m, body: prompt } : m),
            { id: genId, role: "ai", body: "Rasm yaratilyapti...", createdAt: new Date().toISOString() },
        ]);
        try {
            const r = await fetch("/api/ai/imagen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, conversationId: activeId ?? undefined }),
            });
            const j = await r.json();
            if (!r.ok) {
                setMessages(prev => prev.map(m => m.id === genId ? { ...m, body: j?.error || "Rasm yaratilmadi." } : m));
                return;
            }
            const aiReal = j.messages?.[1];
            if (aiReal) setMessages(prev => prev.map(m => m.id === genId ? { ...aiReal, role: "ai" } : m));
            if (!activeId && j.conversationId) setActiveId(j.conversationId);
        } catch {
            setMessages(prev => prev.map(m => m.id === genId ? { ...m, body: "Tarmoq xatosi." } : m));
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
                language: aiLang,
                mode,
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

    // SSE oqimini o'qish (sendStreaming + regenerate uchun umumiy).
    // "ok" = tugadi, "aborted" = foydalanuvchi to'xtatdi, "error" = server xatosi.
    async function consumeAiStream(r: Response, streamMsgId: string, controller: AbortController): Promise<"ok" | "aborted" | "error"> {
        if (!r.ok || !r.body) throw new Error("stream_failed");
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let acc = "";
        let doneData: { messages?: MsgRow[]; followUps?: string[]; conversationId?: string } | null = null;
        let errored = false;
        try {
            outer: while (true) {
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
                            if (mode === "cowork") {
                                const idx = acc.indexOf("===CANVAS===");
                                if (idx >= 0) {
                                    const note = acc.slice(0, idx).trim() || "Canvas'ga yozyapman...";
                                    const doc = acc.slice(idx + 12).replace(/^\s*\n/, "");
                                    setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, body: note } : m));
                                    setCanvas(doc);
                                    setCanvasView("canvas");
                                } else {
                                    setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, body: acc } : m));
                                }
                            } else {
                                setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, body: acc } : m));
                            }
                        } else if (p.type === "done") {
                            doneData = p;
                        } else if (p.type === "error") {
                            setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, body: p.message || "Xatolik" } : m));
                            errored = true;
                            break outer;
                        }
                    } catch { /* skip */ }
                }
            }
        } catch (e) {
            const aborted = controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError");
            if (aborted) return "aborted";
            throw e;
        }
        if (errored) return "error";
        if (doneData) {
            const aiReal = doneData.messages?.[1];
            if (aiReal) {
                let body = aiReal.body;
                if (mode === "cowork") {
                    const idx = body.indexOf("===CANVAS===");
                    if (idx >= 0) {
                        const doc = body.slice(idx + 12).replace(/^\s*\n/, "").trim();
                        body = body.slice(0, idx).trim() || "Canvas'ga yozdim.";
                        setCanvas(doc);
                        setCanvasView("canvas");
                    }
                }
                setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...aiReal, body, role: "ai", followUps: doneData?.followUps } : m));
                if (ttsEnabled && body && aiReal.id) speakMessage(aiReal.id, body);
            }
            if (!activeId && doneData.conversationId) setActiveId(doneData.conversationId);
        }
        return "ok";
    }

    async function sendStreaming(text: string, tempId: string, att: typeof attachment) {
        // Streaming AI xabari uchun placeholder — chunk'lar keladi
        const streamMsgId = `stream-${Date.now()}`;
        setMessages(prev => [
            ...prev.filter(m => m.id !== tempId),
            { id: `tmp-user-${Date.now()}`, role: "user", body: text, createdAt: new Date().toISOString() },
            { id: streamMsgId, role: "ai", body: "", createdAt: new Date().toISOString() },
        ]);

        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const r = await fetch("/api/ai/converse-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    message: text, conversationId: activeId ?? undefined,
                    attachmentUrl: att?.url, attachmentType: att?.type,
                    language: aiLang, mode, model,
                }),
            });
            const status = await consumeAiStream(r, streamMsgId, controller);
            if (status === "aborted" && !activeId) loadConvs();
        } catch (e) {
            const aborted = controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError");
            if (aborted) { if (!activeId) loadConvs(); return; }
            console.error("streaming failed:", e);
            // Fallback classic
            await sendClassic(text, streamMsgId, att);
        } finally {
            abortRef.current = null;
        }
    }

    // Qayta generatsiya — oxirgi AI javobini almashtiradi (yangi user xabari qo'shilmaydi)
    async function regenerate() {
        if (sending || !activeId) return;
        const hasUser = messages.some(m => m.role === "user");
        if (!hasUser) return;
        setSending(true);
        const streamMsgId = `stream-${Date.now()}`;
        setMessages(prev => {
            const copy = [...prev];
            for (let i = copy.length - 1; i >= 0; i--) { if (copy[i].role === "ai") { copy.splice(i, 1); break; } }
            copy.push({ id: streamMsgId, role: "ai", body: "", createdAt: new Date().toISOString() });
            return copy;
        });
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            const r = await fetch("/api/ai/converse-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({ conversationId: activeId, language: aiLang, mode, model, regenerate: true }),
            });
            await consumeAiStream(r, streamMsgId, controller);
        } catch (e) {
            const aborted = controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError");
            if (!aborted) {
                console.error("regenerate failed:", e);
                setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, body: "Qayta generatsiya bo'lmadi." } : m));
            }
        } finally {
            abortRef.current = null;
            setSending(false);
            loadConvs();
        }
    }

    async function newChat() {
        setActiveId(null);
        setMessages([]);
        setInput("");
        setSidebarOpen(false);
        setCanvas("");
        setCanvasView("chat");
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
        // Public havola faol bo'ldi — lokal holatni belgilaymiz (unshare tugmasi chiqadi)
        if (j.shareId) setConvs(prev => prev.map(c => c.id === id ? { ...c, shareId: j.shareId } : c));
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

    // Chat nomini o'zgartirish (PATCH title)
    async function renameConv(id: string, current: string) {
        const name = window.prompt("Chat nomi:", current);
        if (name === null) return;
        const trimmed = name.trim().slice(0, 60);
        if (!trimmed || trimmed === current) return;
        const r = await fetch(`/api/ai/conversations/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: trimmed }),
        });
        if (r.ok) setConvs(prev => prev.map(c => c.id === id ? { ...c, title: trimmed } : c));
    }

    // Ulashishni bekor qilish — public havola ishlamay qoladi
    async function unshareConv(id: string) {
        if (!confirm("Ulashilgan havola o'chiriladi — havola bo'yicha kirganlar endi ko'ra olmaydi. Davom etamizmi?")) return;
        const r = await fetch(`/api/ai/conversations/${id}/share`, { method: "DELETE" });
        if (r.ok) setConvs(prev => prev.map(c => c.id === id ? { ...c, shareId: null } : c));
    }

    if (status === "loading") {
        return (
            <div className="dark relative min-h-screen flex items-center justify-center text-[var(--foreground)]" style={{ background: "transparent" }}>
                <AiStarfield />
                <Loader2 className="relative z-10 w-6 h-6 animate-spin" style={{ color: T.primary }} />
            </div>
        );
    }

    if (status === "unauthenticated") {
        return (
            <div className="dark relative min-h-screen flex items-center justify-center px-4 text-[var(--foreground)]" style={{ background: "transparent" }}>
                <AiStarfield />
                <div className="relative z-10 max-w-sm w-full text-center rounded-3xl p-8 border" style={{ borderColor: T.border, background: "rgba(13,13,13,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
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

    // Yig'ilgan panelda faqat ikonkalar; mobil drawer ochilsa to'liq ko'rinadi
    const showLabels = !collapsed || sidebarOpen;
    const chatQuery = chatSearch.trim().toLowerCase();
    const shownConvs = chatQuery ? convs.filter(c => c.title.toLowerCase().includes(chatQuery)) : convs;

    return (
        <div className="dark relative min-h-screen flex text-[var(--foreground)]" style={{ background: "transparent" }}>
            {/* Qora cosmic fon + uchib yuruvchi yulduzlar (eski AI'dagi sevimli fon) */}
            <AiStarfield />

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <button className="md:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setSidebarOpen(false)} aria-label="Yopish" />
            )}

            {/* Sidebar — Humo AI (yig'iladigan: to'liq ↔ icon-rail) */}
            <aside className={`w-72 ${collapsed ? "md:w-[68px]" : "md:w-72"} flex-shrink-0 border-r flex flex-col md:relative md:z-10 transition-[width] duration-200
                ${sidebarOpen ? "fixed inset-y-0 left-0 z-40" : "hidden md:flex"}`}
                style={{ borderColor: T.border, background: "rgba(13,13,13,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>

                {/* Tepa — Humo AI logo + panelni yig'ish/yopish */}
                <div className={`h-14 border-b flex items-center flex-shrink-0 ${showLabels ? "px-3 gap-2" : "px-0 justify-center"}`} style={{ borderColor: T.border }}>
                    {showLabels ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logos/humo-ai-white.png" alt="Humo AI" className="w-7 h-7 flex-shrink-0 select-none" draggable={false} />
                            <span className="font-black text-sm flex-1 truncate text-[var(--foreground)]">Humo AI</span>
                            <button onClick={toggleCollapse} title="Panelni yig'ish" aria-label="Panelni yig'ish"
                                className="hidden md:grid w-8 h-8 rounded-lg place-items-center hover:bg-white/[0.06]" style={{ color: "var(--muted-foreground)" }}>
                                <PanelLeftClose className="w-4 h-4" />
                            </button>
                            <button onClick={() => setSidebarOpen(false)} className="md:hidden w-8 h-8 grid place-items-center" style={{ color: "var(--muted-foreground)" }}>
                                <XIcon className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <button onClick={toggleCollapse} title="Panelni ochish" aria-label="Panelni ochish"
                            className="w-10 h-10 grid place-items-center rounded-lg hover:bg-white/[0.06]" style={{ color: "var(--muted-foreground)" }}>
                            <PanelLeftOpen className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* REJIMLAR */}
                <div className={`border-b flex-shrink-0 ${showLabels ? "px-2 pt-2 pb-2" : "px-0 py-2"}`} style={{ borderColor: T.border }}>
                    {showLabels && <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Rejimlar</p>}
                    <div className={showLabels ? "space-y-0.5" : "flex flex-col items-center gap-1"}>
                        {AI_MODES.map(m => {
                            const active = mode === m.id;
                            return showLabels ? (
                                <button key={m.id} onClick={() => switchMode(m.id)}
                                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
                                    style={active ? { background: T.soft } : {}}>
                                    <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0"
                                        style={{ background: active ? "#ECECEC" : "rgba(255,255,255,0.05)", color: active ? "#0d0d0d" : "var(--muted-foreground)" }}>
                                        <m.icon className="w-4 h-4" />
                                    </span>
                                    <span className="text-[12.5px] font-bold truncate flex-1 text-[var(--foreground)]">{m.label}</span>
                                    {m.soon && (
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                                            style={{ background: "rgba(255,255,255,0.09)", color: "var(--muted-foreground)" }}>SOON</span>
                                    )}
                                </button>
                            ) : (
                                <button key={m.id} onClick={() => switchMode(m.id)} title={m.label + (m.soon ? " (Soon)" : "")}
                                    className="w-9 h-9 rounded-lg grid place-items-center relative"
                                    style={{ background: active ? "#ECECEC" : "rgba(255,255,255,0.05)", color: active ? "#0d0d0d" : "var(--muted-foreground)" }}>
                                    <m.icon className="w-4 h-4" />
                                    {m.soon && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--muted-foreground)" }} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* CHATLAR sarlavha + Tanlash (faqat to'liq holatda) */}
                {showLabels && (
                    <div className="px-4 pt-2.5 pb-1 flex items-center justify-between flex-shrink-0">
                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Chatlar</p>
                        {convs.length > 0 && (
                            <button onClick={toggleSelectMode}
                                className="text-[10px] font-bold hover:underline" style={{ color: "var(--muted-foreground)" }}>
                                {selectMode ? "Bekor" : "Tanlash"}
                            </button>
                        )}
                    </div>
                )}

                {/* Yangi chat — ro'yxatning birinchi elementi + qidiruv */}
                {showLabels ? (
                    <div className="px-2 pb-1 flex-shrink-0">
                        <button onClick={newChat}
                            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-white/[0.04]">
                            <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0" style={{ background: T.gradient, color: T.onPrimary }}>
                                <Plus className="w-4 h-4" />
                            </span>
                            <span className="text-[12.5px] font-black flex-1 text-[var(--foreground)]">Yangi chat</span>
                        </button>
                        <div className="relative mt-1">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                            <input ref={chatSearchRef} value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                                placeholder="Chat qidirish..."
                                className="w-full h-8 pl-8 pr-2 rounded-lg text-[12px] border focus:outline-none focus:ring-1"
                                style={{ borderColor: T.border, background: "rgba(26,26,26,0.6)", color: "var(--foreground)", ["--tw-ring-color" as string]: T.primary + "40" }} />
                        </div>
                    </div>
                ) : (
                    <div className="py-2 flex flex-col items-center gap-1 flex-shrink-0 border-b" style={{ borderColor: T.border }}>
                        <button onClick={newChat} title="Yangi chat" aria-label="Yangi chat"
                            className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: T.gradient, color: T.onPrimary }}>
                            <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setCollapsed(false); try { localStorage.setItem("ai-sidebar-collapsed", "0"); } catch { /* ignore */ } setTimeout(() => chatSearchRef.current?.focus(), 80); }}
                            title="Chat qidirish" aria-label="Chat qidirish"
                            className="w-9 h-9 rounded-lg grid place-items-center hover:bg-white/[0.06]" style={{ color: "var(--muted-foreground)" }}>
                            <Search className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Tanlash rejimi — hammasini belgilash + o'chirish */}
                {showLabels && selectMode && convs.length > 0 && (
                    <div className="px-3 pb-2 flex items-center gap-2 flex-shrink-0">
                        <button onClick={toggleSelectAll}
                            className="flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg hover:bg-white/[0.05]"
                            style={{ color: "var(--foreground)" }}>
                            {selected.size === convs.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            Hammasi ({selected.size})
                        </button>
                        <button onClick={deleteSelected} disabled={selected.size === 0}
                            className="flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-30 ml-auto">
                            <Trash2 className="w-3.5 h-3.5" /> O&apos;chirish
                        </button>
                    </div>
                )}

                {/* Chat ro'yxati — faqat to'liq holatda ko'rinadi */}
                {!showLabels ? (
                    <div className="flex-1" />
                ) : (
                    <div className="flex-1 overflow-y-auto p-2 pt-0 space-y-1">
                    {loadingConvs && convs.length === 0 ? (
                        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : shownConvs.length === 0 ? (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                            {chatQuery ? "Mos chat topilmadi." : <>Hali suhbat yo&apos;q.<br />Yangi chat bilan boshlang.</>}
                        </div>
                    ) : (
                        shownConvs.map(c => {
                            const active = c.id === activeId;
                            const checked = selected.has(c.id);
                            return (
                                <div key={c.id} className="group relative">
                                    <button
                                        onClick={() => {
                                            if (selectMode) { toggleSelectOne(c.id); return; }
                                            setActiveId(c.id); setSidebarOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-start gap-2 ${
                                            active && !selectMode ? "font-black" : "font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                                        }`}
                                        style={(active && !selectMode) || (selectMode && checked) ? { background: T.soft, color: T.primary } : { color: "var(--foreground)" }}
                                    >
                                        {selectMode && (
                                            <span className="mt-0.5 flex-shrink-0">
                                                {checked
                                                    ? <CheckSquare className="w-4 h-4" style={{ color: T.primary }} />
                                                    : <Square className="w-4 h-4 opacity-50" />}
                                            </span>
                                        )}
                                        <span className="flex-1 min-w-0">
                                            <span className="flex items-center gap-2 mb-0.5">
                                                <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate flex-1">{c.title}</span>
                                                {c.shareId && <Share2 className="w-3 h-3 flex-shrink-0" style={{ color: "#4ade80" }} />}
                                                {c.archived && <Archive className="w-3 h-3 opacity-50 flex-shrink-0" />}
                                            </span>
                                            <span className="block text-[10px] opacity-60 pl-5">
                                                {c.moduleOrigin && `${c.moduleOrigin} · `}
                                                {c.messageCount} xabar
                                            </span>
                                        </span>
                                    </button>
                                    {!selectMode && (
                                        <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5"
                                            style={{ background: "rgba(13,13,13,0.85)", borderRadius: 8 }}>
                                            <button onClick={() => shareConv(c.id)}
                                                title={c.shareId ? "Havolani qayta nusxalash" : "Ulashish (havola nusxa)"}
                                                className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]">
                                                {shareCopied === c.id
                                                    ? <Check className="w-3 h-3 text-green-500" />
                                                    : <Share2 className="w-3 h-3" style={c.shareId ? { color: "#4ade80" } : undefined} />}
                                            </button>
                                            {c.shareId && (
                                                <button onClick={() => unshareConv(c.id)}
                                                    title="Ulashishni bekor qilish"
                                                    className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]">
                                                    <Link2Off className="w-3 h-3" />
                                                </button>
                                            )}
                                            <button onClick={() => renameConv(c.id, c.title)}
                                                title="Nomini o'zgartirish"
                                                className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]">
                                                <Pencil className="w-3 h-3" />
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
                                    )}
                                </div>
                            );
                        })
                    )}
                    </div>
                )}

                {/* Bottom — sozlamalar */}
                {showLabels ? (
                    <div className="p-2 border-t space-y-1 flex-shrink-0" style={{ borderColor: T.border }}>
                        <Link href={"/id/knowledge" as never}
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
                ) : (
                    <div className="py-2 border-t flex flex-col items-center gap-1 flex-shrink-0" style={{ borderColor: T.border }}>
                        <Link href={"/id/knowledge" as never} title="Bilim bazam"
                            className="w-9 h-9 rounded-lg grid place-items-center hover:bg-white/[0.06]">
                            <ShieldCheck className="w-4 h-4" style={{ color: T.primary }} />
                        </Link>
                        <Link href={"/id" as never} title="Profilim"
                            className="w-9 h-9 rounded-lg grid place-items-center hover:bg-white/[0.06]">
                            <UserIcon className="w-4 h-4 opacity-60" />
                        </Link>
                    </div>
                )}
            </aside>

            {/* Main — chat */}
            <main className="relative z-10 flex-1 flex flex-col min-w-0">
                <header className="h-14 border-b flex items-center gap-2 px-4 flex-shrink-0"
                    style={{ borderColor: T.border, background: "rgba(13,13,13,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                    <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2">
                        <Menu className="w-5 h-5" />
                    </button>
                    <Link href="/" title="For Humo" aria-label="For Humo'ga qaytish"
                        className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 hover:bg-white/[0.06] transition-colors"
                        style={{ color: "var(--muted-foreground)" }}>
                        <Home className="w-[18px] h-[18px]" />
                    </Link>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logos/humo-ai-white.png" alt="Humo AI" className="w-8 h-8 flex-shrink-0 select-none" draggable={false} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-black truncate">Humo AI</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                            {AI_MODE_MAP[mode].label}{" · "}{activeId ? (convs.find(c => c.id === activeId)?.title ?? "Suhbat") : "Yangi chat"}
                        </p>
                    </div>
                    {/* CoWork — mobil Chat/Canvas toggle */}
                    {mode === "cowork" && (
                        <div className="lg:hidden flex items-center gap-0.5 rounded-lg p-0.5 flex-shrink-0" style={{ background: "var(--card, rgba(0,0,0,0.04))" }}>
                            {(["chat", "canvas"] as const).map(v => (
                                <button key={v} onClick={() => setCanvasView(v)}
                                    className="px-2 h-7 rounded-md text-[10px] font-black transition-colors"
                                    style={{ background: canvasView === v ? T.gradient : "transparent", color: canvasView === v ? T.onPrimary : "var(--muted-foreground)" }}>
                                    {v === "chat" ? "Chat" : "Canvas"}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Model tanlash (OpenRouter — top modellar) */}
                    <div className="relative flex-shrink-0">
                        <button onClick={() => setModelMenuOpen(o => !o)}
                            title="AI model"
                            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-bold hover:brightness-110"
                            style={{ background: "var(--card, rgba(0,0,0,0.04))", color: "var(--foreground)" }}>
                            <Cpu className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
                            <span className="max-w-[84px] truncate hidden sm:inline">{findModel(model).label}</span>
                            <ChevronDown className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} />
                        </button>
                        {modelMenuOpen && (
                            <>
                                <button className="fixed inset-0 z-40" onClick={() => setModelMenuOpen(false)} aria-label="Yopish" />
                                <div className="absolute right-0 mt-1.5 w-60 rounded-xl overflow-hidden z-50 py-1"
                                    style={{ background: "rgba(20,20,20,0.98)", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                                    {AI_MODELS.map(m => {
                                        const active = model === m.id;
                                        return (
                                            <button key={m.id} onClick={() => pickModel(m.id)}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.05]"
                                                style={active ? { background: T.soft } : {}}>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[12px] font-bold truncate text-[var(--foreground)]">{m.label}</span>
                                                        {m.free && <span className="text-[8px] font-black px-1 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>BEPUL</span>}
                                                    </div>
                                                    {m.note && <span className="text-[10px] block truncate" style={{ color: "var(--muted-foreground)" }}>{m.note}</span>}
                                                </div>
                                                {active && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--foreground)" }} />}
                                            </button>
                                        );
                                    })}
                                    <div className="px-3 pt-1.5 pb-1 mt-1 border-t" style={{ borderColor: T.border }}>
                                        <span className="text-[9px] leading-tight block" style={{ color: "var(--muted-foreground)" }}>Premium modellar OpenRouter kaliti qo'shilganda ishlaydi</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Til tanlash */}
                    <div className="hidden sm:flex items-center gap-0.5 rounded-lg p-0.5" style={{ background: "var(--card, rgba(0,0,0,0.04))" }}>
                        {(["uz", "ru", "en"] as const).map(l => (
                            <button key={l} onClick={() => switchLang(l)}
                                className="px-2 h-7 rounded-md text-[10px] font-black transition-colors"
                                style={{
                                    background: aiLang === l ? T.gradient : "transparent",
                                    color: aiLang === l ? T.onPrimary : "var(--muted-foreground)",
                                }}>
                                {l.toUpperCase()}
                            </button>
                        ))}
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

                <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                    {/* SOON rejimlar (Gen Pic / Gen Vid / Humo CoWork) — chiroyli placeholder */}
                    {AI_MODE_MAP[mode].soon && (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4">
                            <span className="w-16 h-16 rounded-2xl grid place-items-center mb-5"
                                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}` }}>
                                {(() => { const Ic = AI_MODE_MAP[mode].icon; return <Ic className="w-8 h-8" style={{ color: "var(--muted-foreground)" }} />; })()}
                            </span>
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-2xl font-black text-[var(--foreground)]">{AI_MODE_MAP[mode].label}</h2>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(255,255,255,0.09)", color: "var(--muted-foreground)" }}>SOON</span>
                            </div>
                            <p className="text-sm text-muted-foreground max-w-xs inline-flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" /> Tez orada — eng yaxshi model bilan ishga tushadi
                            </p>
                        </div>
                    )}
                    {!AI_MODE_MAP[mode].soon && !activeId && messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logos/humo-ai-white.png" alt="Humo AI" className="w-[74px] h-[74px] mb-6 select-none"
                                style={{ animation: "aiLogoFloat 4s ease-in-out infinite" }} draggable={false} />
                            <p className="text-[13px] mb-2" style={{ color: "var(--muted-foreground)" }}>
                                Humo AI&apos;ga xush kelibsiz
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-light mb-8 tracking-tight"
                                style={{ background: "linear-gradient(135deg,#ECECEC 20%,#8A8A8A 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                                {mode === "pic" ? "Qanday rasm yarataylik?" : mode === "cowork" ? "Nima yaratamiz?" : "Bugun nima qilamiz?"}
                            </h1>
                            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                                {(mode === "pic" ? [
                                    { icon: ImageIcon, title: "Manzara", sub: "Tabiat/shahar", p: "Toshkent kunbotishida, iliq ranglar, yuqori sifat" },
                                    { icon: Users, title: "Portret", sub: "Personaj", p: "kelajak jangchisi portreti, kinematik yorug'lik" },
                                    { icon: Cpu, title: "Logo", sub: "Brend/ikon", p: "minimalist logo, moviy gradient, texnologiya" },
                                    { icon: Sparkles, title: "Fantastik", sub: "Xayoliy", p: "kosmosda suzayotgan orol, syurreal, detalli" },
                                ] : [
                                    { icon: Code2, title: "Kod yoz", sub: "Tushuntirmalar bilan", p: "Menga kod yozib ber: " },
                                    { icon: Globe, title: "Tarjima", sub: "O'zbek ↔ Ingliz", p: "Quyidagi matnni tarjima qil: " },
                                    { icon: BookOpen, title: "Tushuntir", sub: "Sodda tilda", p: "Menga sodda tilda tushuntir: " },
                                    { icon: Mail, title: "Xat yoz", sub: "Rasmiy uslubda", p: "Menga rasmiy xat yozib ber: " },
                                ]).map(c => (
                                    <button key={c.title} onClick={() => setInput(c.p)}
                                        className="text-left p-3.5 rounded-xl border flex flex-col gap-0.5 transition-transform duration-150 hover:-translate-y-0.5"
                                        style={{ background: "rgba(26,26,26,0.55)", borderColor: T.border }}>
                                        <c.icon className="w-[22px] h-[22px] mb-1.5" style={{ color: "var(--muted-foreground)" }} />
                                        <span className="text-[12.5px] font-semibold text-[var(--foreground)]">{c.title}</span>
                                        <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{c.sub}</span>
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
                                <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm break-words ${isUser ? "whitespace-pre-wrap" : ""}`}
                                    style={{
                                        background: isUser ? T.gradient : "rgba(26,26,26,0.78)",
                                        color: isUser ? T.onPrimary : "var(--foreground)",
                                        border: isUser ? "none" : "1px solid rgba(255,255,255,0.06)",
                                        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                                    }}>
                                    {m.attachmentType === "image" && m.attachmentUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={m.attachmentUrl} alt="" className="mb-2 max-w-full max-h-64 rounded-lg" />
                                    )}
                                    {m.attachmentUrl && m.attachmentType !== "image" && (
                                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer"
                                            className="mb-2 flex items-center gap-1.5 text-[11px] underline opacity-90">
                                            <Paperclip className="w-3 h-3 flex-shrink-0" /> Biriktirilgan fayl
                                        </a>
                                    )}
                                    {isUser ? m.body : (m.body ? <AiMarkdown>{m.body}</AiMarkdown> : null)}
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
                                            <>
                                                <button onClick={() => copyMsg(m.id, m.body)}
                                                    title="Nusxa olish"
                                                    className="opacity-70 hover:opacity-100 transition-opacity">
                                                    {msgCopied === m.id
                                                        ? <Check className="w-3 h-3 text-green-500" />
                                                        : <Copy className="w-3 h-3" />}
                                                </button>
                                                <button onClick={() => speakMessage(m.id, m.body)}
                                                    title={ttsSpeakingId === m.id ? "To'xtatish" : "Ovoz bilan o'qish"}
                                                    className="opacity-70 hover:opacity-100 transition-opacity">
                                                    {ttsSpeakingId === m.id
                                                        ? <VolumeX className="w-3 h-3" />
                                                        : <Volume2 className="w-3 h-3" />}
                                                </button>
                                                {isLastAi && !sending && (
                                                    <button onClick={regenerate}
                                                        title="Qayta generatsiya"
                                                        className="opacity-70 hover:opacity-100 transition-opacity">
                                                        <RefreshCw className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </>
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

                {!AI_MODE_MAP[mode].soon && (
                <form onSubmit={sendMessage} className="border-t p-3 flex gap-2 items-end" style={{ borderColor: T.border, background: "rgba(13,13,13,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                    {/* "+" menyu (fayl / rejimlar / kelajak vositalar) */}
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" hidden
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ""; }} />
                    <div className="relative flex-shrink-0">
                        <button type="button" onClick={() => setPlusMenuOpen(o => !o)}
                            disabled={uploading}
                            title="Ko'proq" aria-label="Ko'proq"
                            className="w-11 h-11 rounded-xl grid place-items-center disabled:opacity-40 hover:brightness-95 transition-transform"
                            style={{ background: T.soft, color: T.primary, transform: plusMenuOpen ? "rotate(45deg)" : "none" }}>
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                        {plusMenuOpen && (
                            <>
                                <button type="button" className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} aria-label="Yopish" />
                                <div className="absolute bottom-full left-0 mb-2 w-60 rounded-2xl overflow-hidden z-50 py-1.5"
                                    style={{ background: "rgba(20,20,20,0.98)", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                                    {PLUS_ITEMS.map((it, i) => {
                                        const activeMode = it.action === "mode" && it.mode === mode;
                                        return (
                                            <div key={it.id}>
                                                {(i === 1 || i === 6) && <div className="my-1 h-px" style={{ background: T.border }} />}
                                                <button type="button" onClick={() => handlePlus(it)}
                                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-white/[0.05] transition-colors"
                                                    style={activeMode ? { background: T.soft } : {}}>
                                                    <it.icon className="w-[18px] h-[18px] flex-shrink-0" style={{ color: "var(--muted-foreground)" }} />
                                                    <span className="text-[13px] font-semibold flex-1 truncate text-[var(--foreground)]">{it.label}</span>
                                                    {it.soon && (
                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                                                            style={{ background: "rgba(255,255,255,0.09)", color: "var(--muted-foreground)" }}>SOON</span>
                                                    )}
                                                    {activeMode && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--foreground)" }} />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    <input
                        value={input}
                        onChange={e => setInput(e.target.value.slice(0, 4000))}
                        placeholder={recording ? "Tinglayapman..." : mode === "pic" ? "Rasmni tasvirlab bering... (masalan: quyosh botishi, tog'lar)" : mode === "cowork" ? "Nima yaratamiz? (hujjat/kod)" : mode === "code" ? "Kod so'rang..." : "Humo AI'ga xabar yozing..."}
                        className="flex-1 h-11 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2"
                        style={{ borderColor: recording ? T.primary : T.border, background: "rgba(26,26,26,0.6)", ["--tw-ring-color" as string]: T.primary + "50" }}
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

                    {sending ? (
                        <button type="button" onClick={stopGenerating}
                            title="To'xtatish" aria-label="To'xtatish"
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: T.gradient, color: T.onPrimary }}>
                            <span className="w-3 h-3 rounded-sm bg-current" />
                        </button>
                    ) : (
                        <button type="submit" disabled={!input.trim() && !attachment}
                            className="w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-50"
                            style={{ background: T.gradient, color: T.onPrimary }}>
                            <Send className="w-4 h-4" />
                        </button>
                    )}
                </form>
                )}
            </main>

            {/* CoWork — CANVAS paneli (Claude Artifacts uslubi). Desktop: yon-yonda; mobil: tab. */}
            {mode === "cowork" && (
                <aside className={`flex-col border-l relative z-10 min-w-0 lg:flex lg:flex-1
                    ${canvasView === "canvas" ? "flex flex-1 fixed inset-0 z-40 lg:static lg:inset-auto" : "hidden"}`}
                    style={{ borderColor: T.border, background: "rgba(10,10,10,0.96)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                    <div className="h-14 px-4 flex items-center justify-between border-b flex-shrink-0" style={{ borderColor: T.border }}>
                        <div className="flex items-center gap-2 min-w-0">
                            <Users className="w-4 h-4 flex-shrink-0" style={{ color: "var(--muted-foreground)" }} />
                            <span className="text-sm font-black truncate text-[var(--foreground)]">Canvas</span>
                            {canvas && <span className="text-[10px] flex-shrink-0" style={{ color: "var(--muted-foreground)" }}>{canvas.length} belgi</span>}
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={copyCanvas} disabled={!canvas} title="Nusxa"
                                className="w-8 h-8 rounded-lg grid place-items-center hover:bg-white/[0.06] disabled:opacity-30" style={{ color: "var(--muted-foreground)" }}>
                                {canvasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button onClick={downloadCanvas} disabled={!canvas} title="Yuklab olish"
                                className="w-8 h-8 rounded-lg grid place-items-center hover:bg-white/[0.06] disabled:opacity-30" style={{ color: "var(--muted-foreground)" }}>
                                <Download className="w-4 h-4" />
                            </button>
                            <button onClick={() => setCanvasView("chat")} title="Chat" aria-label="Chatga qaytish"
                                className="lg:hidden w-8 h-8 rounded-lg grid place-items-center" style={{ color: "var(--muted-foreground)" }}>
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <textarea value={canvas} onChange={e => setCanvas(e.target.value)}
                        placeholder="Canvas bo'sh. Chatда so'rang — masalan: &quot;Startap uchun biznes-reja yoz&quot; yoki &quot;React login formasi kodini yoz&quot;. AI shu yerга yozadi, siz ham tahrirlashingiz mumkin."
                        className="flex-1 w-full p-4 bg-transparent text-[13px] leading-relaxed resize-none outline-none font-mono"
                        style={{ color: "var(--foreground)" }} spellCheck={false} />
                </aside>
            )}

        </div>
    );
}
