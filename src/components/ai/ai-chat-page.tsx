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
    Music, Search, CheckSquare, Square, Link2Off, PanelLeftClose, PanelLeftOpen, RefreshCw, Pencil, AudioLines, type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { AiStarfield } from "@/components/ai/ai-starfield";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { HumoLive } from "@/components/ai/humo-live";
import { AI_MODELS, DEFAULT_MODEL, findModel } from "@/lib/ai-models";
import { aiT, aiTn, aiLangFromLocale, type AiLang } from "@/lib/ai-i18n";

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
    attachments?: { url: string; type: string }[] | null;   // bir nechta biriktirma
    aiModel?: string | null; createdAt: string;
    followUps?: string[];   // AI'dan tavsiya keyingi savollar
    generating?: boolean;   // rasm yaratilyapti — shimmer placeholder (faqat client)
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
const AI_MODES: { id: AiMode; label: string; sub: string; icon: LucideIcon; soon?: boolean; neu?: boolean }[] = [
    { id: "chat",   label: "Chat Bot",     sub: "Oddiy suhbat",     icon: Sparkles },
    { id: "code",   label: "Gen Code",     sub: "Kod yozib berish", icon: Code2 },
    { id: "pic",    label: "Gen Pic",      sub: "Rasm yaratish",    icon: ImageIcon, neu: true },
    { id: "vid",    label: "Gen Vid",      sub: "Video yaratish",   icon: Film,      soon: true },
    { id: "music",  label: "Gen Music",    sub: "Musiqa yaratish",  icon: Music,     soon: true },
    { id: "cowork", label: "Humo CoWork",  sub: "Canvas — birga ishlash", icon: Users, neu: true },
];
const AI_MODE_MAP = Object.fromEntries(AI_MODES.map(m => [m.id, m])) as Record<AiMode, typeof AI_MODES[number]>;

// Composer "+" menyusi (Gemini/ChatGPT uslubi) — faqat o'zimizniki.
type PlusItem = { id: string; label: string; icon: LucideIcon; action: "file" | "mode" | "soon" | "search" | "think" | "live"; mode?: AiMode; soon?: boolean };
const PLUS_ITEMS: PlusItem[] = [
    { id: "file",   label: "File biriktirish",    icon: Paperclip,  action: "file" },
    { id: "live",   label: "Humo Live",           icon: AudioLines, action: "live" },
    { id: "code",   label: "Kod yozish",          icon: Code2,      action: "mode", mode: "code" },
    { id: "pic",    label: "Rasm yaratish",       icon: ImageIcon,  action: "mode", mode: "pic" },
    { id: "vid",    label: "Video yaratish",      icon: Film,       action: "mode", mode: "vid",  soon: true },
    { id: "music",  label: "Musiqa yaratish",     icon: Music,      action: "mode", mode: "music", soon: true },
    { id: "cowork", label: "Humo CoWork",         icon: Users,      action: "mode", mode: "cowork" },
    { id: "search", label: "Saytlardan qidirish", icon: Search,     action: "search" },
    { id: "think",  label: "Chuqur fikrlash",     icon: Brain,      action: "think" },
];

// Chat rejimida "rasm yarat" tipidagi so'rovni aniqlash (uz/ru/en) → avto Gen Pic
const IMAGE_REQUEST_RE = /(rasm|surat|rasmini|suratini)\s*\S*\s*(yarat|chiz|ishlab|yasab|chizib|yaratib)|(yarat|chiz|chizib|yaratib)\w*\s+(bitta\s+)?(rasm|surat)|нарису|создай\s+(изображени|картин|рисун)|сгенерир\w*\s+(изображени|картин)|нарисовать|create\s+(an?\s+|the\s+)?(image|picture|photo|drawing)|generate\s+(an?\s+|the\s+)?(image|picture|photo)|make\s+(an?\s+|me\s+)?(image|picture)|draw\s+(a|an|me|the)/i;
function looksLikeImageRequest(text: string): boolean {
    return IMAGE_REQUEST_RE.test(text);
}

export function AiChatPage({ locale, orAvailable = false }: { locale?: string; orAvailable?: boolean } = {}) {
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
    // Composer "+" menyusi (Gemini/ChatGPT uslubi) + web-qidiruv + chuqur fikrlash
    const [plusMenuOpen, setPlusMenuOpen] = useState(false);
    const [webSearch, setWebSearch] = useState(false);
    const [deepThink, setDeepThink] = useState(false);
    const [liveOpen, setLiveOpen] = useState(false);   // Humo Live (ovozli suhbat) overlay
    // Sidebar yig'ish (desktop icon-rail) + chat qidiruv
    const [collapsed, setCollapsed] = useState(false);
    const [chatSearch, setChatSearch] = useState("");
    const chatSearchRef = useRef<HTMLInputElement>(null);
    // Xabarni nusxalash + oqimni to'xtatish (Stop) + rasm lightbox
    const [msgCopied, setMsgCopied] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const composerInputRef = useRef<HTMLInputElement>(null);
    const [lightbox, setLightbox] = useState<string | null>(null);

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
    // O'z xabaringni tahrirlash — matnni yozish maydoniga qaytaradi (o'zgartirib qayta yuborasiz)
    function editUserMsg(text: string) {
        setInput(text);
        setTimeout(() => composerInputRef.current?.focus(), 30);
    }
    // Promptni ulashish — navigator.share, bo'lmasa nusxa
    async function sharePrompt(id: string, text: string) {
        if (!text) return;
        if (typeof navigator !== "undefined" && navigator.share) {
            try { await navigator.share({ text }); } catch { /* foydalanuvchi bekor qildi */ }
            return;
        }
        copyMsg(id, text);
    }
    // Yaratilgan rasmni yuklab olish (foydalanuvchi bosganda)
    async function downloadImage(url: string) {
        try {
            const r = await fetch(url);
            const blob = await r.blob();
            const objUrl = URL.createObjectURL(blob);
            const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace("svg+xml", "svg");
            const a = document.createElement("a");
            a.href = objUrl; a.download = `humo-ai-${Date.now()}.${ext}`;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
        } catch {
            window.open(url, "_blank", "noopener");
        }
    }
    // Yozish maydoniga paste — rasm/fayl bo'lsa biriktiramiz (matn odatdagidek joylashadi)
    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
        const files = e.clipboardData?.files;
        if (files && files.length > 0) {
            const f = files[0];
            if (f && (f.type.startsWith("image/") || f.type === "application/pdf")) {
                e.preventDefault();
                uploadAttachment(f);
            }
        }
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
    // Model ishlaydimi: Gemini (bepul, kalit bor) doim; OpenRouter faqat kalit qo'shilganda.
    const modelWorks = useCallback((prov: string) => prov === "gemini" || orAvailable, [orAvailable]);
    function pickModel(id: string) {
        const m = AI_MODELS.find(x => x.id === id);
        if (m && !modelWorks(m.provider)) return;   // ishlamaydigan model (Tez orada) — tanlanmaydi
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
    const [attachments, setAttachments] = useState<{ url: string; type: "image" | "file"; name: string }[]>([]);   // 6 tagacha
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // TTS (voice output) — Gemini TTS (tabiiy o'zbek) + brauzer zaxira
    const [ttsEnabled, setTtsEnabled] = useState(false);
    const [ttsSpeakingId, setTtsSpeakingId] = useState<string | null>(null);
    const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
    const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
    const ttsVoiceRef = useRef<"Kore" | "Puck">("Kore");
    const [shareCopied, setShareCopied] = useState<string | null>(null);
    // Til tanlash — dastlabki til route locale'dan (forhumo.uz/ru/ai → ru), keyin saqlangan tanlov ustun.
    const [aiLang, setAiLang] = useState<AiLang>(() => aiLangFromLocale(locale));
    const t = useCallback((key: string) => aiT(aiLang, key), [aiLang]);
    const tn = useCallback((key: string, n: number) => aiTn(aiLang, key, n), [aiLang]);

    useEffect(() => {
        try {
            const l = localStorage.getItem("ai-lang");
            if (l === "uz" || l === "ru" || l === "en") setAiLang(l);   // foydalanuvchi oldin tanlagan bo'lsa — ustun
        } catch { /* ignore */ }
    }, []);
    function switchLang(l: AiLang) {
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
    // Sahifadan chiqilganda ovozni to'xtatamiz (audio orqada qolib ketmasin)
    useEffect(() => {
        return () => {
            try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
            try { ttsAudioRef.current?.pause(); } catch { /* ignore */ }
        };
    }, []);
    function toggleTts() {
        setTtsEnabled(prev => {
            const next = !prev;
            try { localStorage.setItem("ai-tts-enabled", next ? "1" : "0"); } catch { /* ignore */ }
            if (!next) stopSpeaking();
            return next;
        });
    }
    // Har qanday o'qishni to'xtatish (Gemini audio + brauzer synth)
    function stopSpeaking() {
        try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
        const a = ttsAudioRef.current;
        if (a) { try { a.pause(); a.src = ""; } catch { /* ignore */ } ttsAudioRef.current = null; }
        setTtsSpeakingId(null);
        setTtsLoadingId(null);
    }
    // Brauzer TTS (bepul zaxira — Gemini ishlamasa)
    function speakBrowser(id: string, text: string) {
        if (typeof window === "undefined" || !window.speechSynthesis) { setTtsSpeakingId(null); return; }
        window.speechSynthesis.cancel();
        const clean = text.replace(/```[\s\S]*?```/g, " kod bloki ").replace(/[*_`#>|]/g, "");
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = "uz-UZ";
        utter.rate = 1.0;
        utter.onend = () => setTtsSpeakingId(prev => prev === id ? null : prev);
        utter.onerror = () => setTtsSpeakingId(prev => prev === id ? null : prev);
        window.speechSynthesis.speak(utter);
        setTtsSpeakingId(id);
    }
    // "Ovoz bilan o'qish" — tabiiy o'zbek Gemini TTS, xato bo'lsa brauzerga tushadi
    async function speakMessage(id: string, text: string) {
        if (ttsSpeakingId === id || ttsLoadingId === id) { stopSpeaking(); return; }
        stopSpeaking();
        if (!text?.trim()) return;
        setTtsLoadingId(id);
        try {
            const r = await fetch("/api/ai/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, voice: ttsVoiceRef.current }),
            });
            if (!r.ok) throw new Error("tts_failed");
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            ttsAudioRef.current = audio;
            audio.onended = () => { setTtsSpeakingId(prev => prev === id ? null : prev); URL.revokeObjectURL(url); ttsAudioRef.current = null; };
            audio.onerror = () => { setTtsSpeakingId(prev => prev === id ? null : prev); URL.revokeObjectURL(url); ttsAudioRef.current = null; };
            setTtsLoadingId(null);
            setTtsSpeakingId(id);
            await audio.play();
        } catch {
            setTtsLoadingId(null);
            speakBrowser(id, text);   // bepul zaxira
        }
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

    async function uploadFiles(files: File[]) {
        if (uploading) return;
        const room = 6 - attachments.length;
        const toUpload = files.slice(0, Math.max(0, room));
        if (toUpload.length === 0) return;
        setUploading(true);
        try {
            for (const file of toUpload) {
                const fd = new FormData();
                fd.append("file", file);
                const r = await fetch("/api/ai/upload", { method: "POST", body: fd });
                if (!r.ok) continue;
                const d = await r.json();
                const isImage = file.type.startsWith("image/");
                setAttachments(prev => prev.length >= 6 ? prev : [...prev, { url: d.url, type: isImage ? "image" : "file", name: file.name }]);
            }
        } finally { setUploading(false); }
    }
    const uploadAttachment = (file: File) => uploadFiles([file]);

    // Composer "+" menyusi tanlovi
    function handlePlus(item: PlusItem) {
        setPlusMenuOpen(false);
        if (item.action === "file") { fileInputRef.current?.click(); return; }
        if (item.action === "mode" && item.mode) { switchMode(item.mode); return; }
        if (item.action === "search") { setWebSearch(v => !v); return; }
        if (item.action === "think") { setDeepThink(v => !v); return; }
        if (item.action === "live") { setLiveOpen(true); return; }
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
        if (!confirm(tn("confirm.deleteN", ids.length))) return;
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
        if ((!text && attachments.length === 0) || sending) return;
        setSending(true);
        setInput("");
        const attSnapshot = attachments;
        setAttachments([]);

        // Optimistic UI
        const tempMsg: MsgRow = {
            id: `tmp-${Date.now()}`, role: "user", body: text,
            attachments: attSnapshot.map(a => ({ url: a.url, type: a.type })),
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);

        // Biriktirma bo'lsa oddiy endpoint (streaming vision qo'llamaymiz), aks holda streaming
        const useStreaming = attSnapshot.length === 0;

        try {
            // Chat Bot rejimida ham "rasm yarat" so'ralsa — avto Gen Pic (ChatGPT/Gemini kabi)
            const wantsImage = mode === "pic" || (mode === "chat" && attSnapshot.length === 0 && looksLikeImageRequest(text));
            if (wantsImage) {
                await sendImagen(text, tempMsg.id, mode);
            } else if (useStreaming) {
                await sendStreaming(text, tempMsg.id, []);
            } else {
                await sendClassic(text, tempMsg.id, attSnapshot);
            }
            loadConvs();
        } finally {
            setSending(false);
        }
    }

    // Gen Pic — rasm yaratish (Cloudflare Flux yoki Gemini flash-image). convMode = suhbat rejimi.
    async function sendImagen(prompt: string, tempId: string, convMode: AiMode = "pic") {
        const genId = `gen-${Date.now()}`;
        setMessages(prev => [
            ...prev.map(m => m.id === tempId ? { ...m, body: prompt } : m),
            { id: genId, role: "ai", body: "Rasm yaratilyapti...", generating: true, createdAt: new Date().toISOString() },
        ]);
        try {
            const r = await fetch("/api/ai/imagen", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, conversationId: activeId ?? undefined, mode: convMode }),
            });
            const j = await r.json();
            if (!r.ok) {
                setMessages(prev => prev.map(m => m.id === genId ? { ...m, body: j?.error || "Rasm yaratilmadi.", generating: false } : m));
                return;
            }
            const aiReal = j.messages?.[1];
            if (aiReal) setMessages(prev => prev.map(m => m.id === genId ? { ...aiReal, role: "ai", generating: false } : m));
            if (!activeId && j.conversationId) setActiveId(j.conversationId);
        } catch {
            setMessages(prev => prev.map(m => m.id === genId ? { ...m, body: "Tarmoq xatosi.", generating: false } : m));
        }
    }

    async function sendClassic(text: string, tempId: string, atts: { url: string; type: "image" | "file"; name: string }[]) {
        const attPayload = atts.map(a => ({ url: a.url, type: a.type }));
        const r = await fetch("/api/ai/converse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text || "(fayl yubordim, tahlil qiling)",
                conversationId: activeId ?? undefined,
                attachments: attPayload,
                language: aiLang,
                mode,
                webSearch,
            }),
        });
        const j = await r.json();
        if (!r.ok) {
            setMessages(prev => [
                ...prev.filter(m => m.id !== tempId),
                { id: `tmp-user-${Date.now()}`, role: "user", body: text, attachments: attPayload, createdAt: new Date().toISOString() },
                { id: `err-${Date.now()}`, role: "ai", body: j?.message || j?.error || "Xatolik", createdAt: new Date().toISOString() },
            ]);
            return;
        }
        const [userReal, aiReal] = j.messages ?? [];
        const followUps: string[] = Array.isArray(j.followUps) ? j.followUps.slice(0, 3) : [];
        setMessages(prev => [
            ...prev.filter(m => m.id !== tempId),
            { ...userReal, role: "user", attachments: attPayload },
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

    async function sendStreaming(text: string, tempId: string, atts: { url: string; type: "image" | "file"; name: string }[]) {
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
                    language: aiLang, mode, model, webSearch, deepThink,
                }),
            });
            const status = await consumeAiStream(r, streamMsgId, controller);
            if (status === "aborted" && !activeId) loadConvs();
        } catch (e) {
            const aborted = controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError");
            if (aborted) { if (!activeId) loadConvs(); return; }
            console.error("streaming failed:", e);
            // Fallback classic
            await sendClassic(text, streamMsgId, atts);
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
                body: JSON.stringify({ conversationId: activeId, language: aiLang, mode, model, webSearch, deepThink, regenerate: true }),
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
        if (!confirm(t("confirm.deleteChat"))) return;
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
            window.prompt(t("prompt.copyLink"), full);
        }
    }

    // Chat nomini o'zgartirish (PATCH title)
    async function renameConv(id: string, current: string) {
        const name = window.prompt(t("prompt.chatName"), current);
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
        if (!confirm(t("confirm.unshare"))) return;
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
                        {t("auth.signinDesc")}
                    </p>
                    <button onClick={() => signIn("google")}
                        className="w-full h-11 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
                        style={{ background: T.gradient }}>
                        <LogIn className="w-4 h-4" /> {t("auth.google")}
                    </button>
                </div>
            </div>
        );
    }

    // Yig'ilgan panelda faqat ikonkalar; mobil drawer ochilsa to'liq ko'rinadi
    const showLabels = !collapsed || sidebarOpen;
    const chatQuery = chatSearch.trim().toLowerCase();
    const shownConvs = chatQuery ? convs.filter(c => c.title.toLowerCase().includes(chatQuery)) : convs;
    // Rejim-aware "ishlash" holati (javob boshlanguncha ko'rinadigan animatsiya matni)
    const workingLabel = webSearch ? t("work.search") : deepThink ? t("work.think")
        : mode === "code" ? t("work.code") : mode === "cowork" ? t("work.cowork") : t("work.default");
    const codeLike = mode === "code" || mode === "cowork";

    return (
        <div className="dark relative h-full flex text-[var(--foreground)] overflow-hidden" style={{ background: "transparent" }}>
            {/* Qora cosmic fon + uchib yuruvchi yulduzlar (eski AI'dagi sevimli fon) */}
            <AiStarfield />

            {/* AI animatsiyalari: rasm shimmer + rejim "ishlash" nuqtalari + kod chizig'i */}
            <style>{`
@keyframes aiShimmer{0%{background-position:-468px 0}100%{background-position:468px 0}}
.ai-shimmer{background:linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.12) 37%,rgba(255,255,255,0.05) 63%);background-size:800px 100%;animation:aiShimmer 1.4s ease-in-out infinite}
@keyframes aiDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
.ai-typing{display:inline-flex;gap:4px;align-items:center}
.ai-typing i{width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;animation:aiDot 1.2s infinite ease-in-out}
.ai-typing i:nth-child(2){animation-delay:.2s}
.ai-typing i:nth-child(3){animation-delay:.4s}
@keyframes aiCodeLine{0%{background-position:-200px 0}100%{background-position:200px 0}}
.ai-codeline{height:8px;border-radius:4px;background:linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.16) 50%,rgba(255,255,255,0.06) 75%);background-size:400px 100%;animation:aiCodeLine 1.1s linear infinite}
`}</style>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <button className="md:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setSidebarOpen(false)} aria-label={t("common.close")} />
            )}

            {/* Sidebar — Humo AI (yig'iladigan: to'liq ↔ icon-rail) */}
            <aside className={`w-[86vw] max-w-72 ${collapsed ? "md:w-[68px]" : "md:w-72"} flex-shrink-0 border-r flex flex-col md:relative md:z-10 transition-[width] duration-200
                ${sidebarOpen ? "fixed inset-y-0 left-0 z-40" : "hidden md:flex"}`}
                style={{ borderColor: T.border, background: "rgba(13,13,13,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>

                {/* Tepa — Humo AI logo + panelni yig'ish/yopish */}
                <div className={`h-14 border-b flex items-center flex-shrink-0 ${showLabels ? "px-3 gap-2" : "px-0 justify-center"}`} style={{ borderColor: T.border }}>
                    {showLabels ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logos/humo-ai-white.png" alt="Humo AI" className="w-7 h-7 flex-shrink-0 select-none" draggable={false} />
                            <span className="font-black text-sm flex-1 truncate text-[var(--foreground)]">Humo AI</span>
                            <button onClick={toggleCollapse} title={t("sidebar.collapse")} aria-label={t("sidebar.collapse")}
                                className="hidden md:grid w-8 h-8 rounded-lg place-items-center hover:bg-white/[0.06]" style={{ color: "var(--muted-foreground)" }}>
                                <PanelLeftClose className="w-4 h-4" />
                            </button>
                            <button onClick={() => setSidebarOpen(false)} className="md:hidden w-8 h-8 grid place-items-center" style={{ color: "var(--muted-foreground)" }}>
                                <XIcon className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <button onClick={toggleCollapse} title={t("sidebar.expand")} aria-label={t("sidebar.expand")}
                            className="w-10 h-10 grid place-items-center rounded-lg hover:bg-white/[0.06]" style={{ color: "var(--muted-foreground)" }}>
                            <PanelLeftOpen className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* REJIMLAR */}
                <div className={`border-b flex-shrink-0 ${showLabels ? "px-2 pt-2 pb-2" : "px-0 py-2"}`} style={{ borderColor: T.border }}>
                    {showLabels && <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{t("sidebar.modes")}</p>}
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
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase"
                                            style={{ background: "rgba(255,255,255,0.09)", color: "var(--muted-foreground)" }}>{t("badge.soon")}</span>
                                    )}
                                    {m.neu && (
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase"
                                            style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>{t("badge.new")}</span>
                                    )}
                                </button>
                            ) : (
                                <button key={m.id} onClick={() => switchMode(m.id)} title={m.label + (m.soon ? ` (${t("badge.soon")})` : "")}
                                    className="w-9 h-9 rounded-lg grid place-items-center relative"
                                    style={{ background: active ? "#ECECEC" : "rgba(255,255,255,0.05)", color: active ? "#0d0d0d" : "var(--muted-foreground)" }}>
                                    <m.icon className="w-4 h-4" />
                                    {m.soon && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "var(--muted-foreground)" }} />}
                                    {m.neu && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />}
                                </button>
                            );
                        })}
                        {/* Humo Live — ovozli suhbat (overlay ochadi) */}
                        {showLabels ? (
                            <button onClick={() => setLiveOpen(true)}
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-white/[0.04]">
                                <span className="w-7 h-7 rounded-lg grid place-items-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}>
                                    <AudioLines className="w-4 h-4" />
                                </span>
                                <span className="text-[12.5px] font-bold truncate flex-1 text-[var(--foreground)]">Humo Live</span>
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>{t("badge.new")}</span>
                            </button>
                        ) : (
                            <button onClick={() => setLiveOpen(true)} title={t("live.voiceTooltip")}
                                className="w-9 h-9 rounded-lg grid place-items-center relative" style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted-foreground)" }}>
                                <AudioLines className="w-4 h-4" />
                                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
                            </button>
                        )}
                    </div>
                </div>

                {/* CHATLAR sarlavha + Tanlash (faqat to'liq holatda) */}
                {showLabels && (
                    <div className="px-4 pt-2.5 pb-1 flex items-center justify-between flex-shrink-0">
                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>{t("sidebar.chats")}</p>
                        {convs.length > 0 && (
                            <button onClick={toggleSelectMode}
                                className="text-[10px] font-bold hover:underline" style={{ color: "var(--muted-foreground)" }}>
                                {selectMode ? t("common.cancel") : t("common.select")}
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
                            <span className="text-[12.5px] font-black flex-1 text-[var(--foreground)]">{t("sidebar.newChat")}</span>
                        </button>
                        <div className="relative mt-1">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
                            <input ref={chatSearchRef} value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                                placeholder={t("sidebar.searchChat")}
                                className="w-full h-8 pl-8 pr-2 rounded-lg text-[12px] border focus:outline-none focus:ring-1"
                                style={{ borderColor: T.border, background: "rgba(26,26,26,0.6)", color: "var(--foreground)", ["--tw-ring-color" as string]: T.primary + "40" }} />
                        </div>
                    </div>
                ) : (
                    <div className="py-2 flex flex-col items-center gap-1 flex-shrink-0 border-b" style={{ borderColor: T.border }}>
                        <button onClick={newChat} title={t("sidebar.newChat")} aria-label={t("sidebar.newChat")}
                            className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: T.gradient, color: T.onPrimary }}>
                            <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setCollapsed(false); try { localStorage.setItem("ai-sidebar-collapsed", "0"); } catch { /* ignore */ } setTimeout(() => chatSearchRef.current?.focus(), 80); }}
                            title={t("sidebar.searchChat")} aria-label={t("sidebar.searchChat")}
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
                            {t("sidebar.selectAll")} ({selected.size})
                        </button>
                        <button onClick={deleteSelected} disabled={selected.size === 0}
                            className="flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-lg text-red-500 hover:bg-red-500/10 disabled:opacity-30 ml-auto">
                            <Trash2 className="w-3.5 h-3.5" /> {t("common.delete")}
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
                            {chatQuery ? t("sidebar.noMatch") : <>{t("sidebar.empty1")}<br />{t("sidebar.empty2")}</>}
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
                                                {c.messageCount} {t("chat.msgWord")}
                                            </span>
                                        </span>
                                    </button>
                                    {!selectMode && (
                                        <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5"
                                            style={{ background: "rgba(13,13,13,0.85)", borderRadius: 8 }}>
                                            <button onClick={() => shareConv(c.id)}
                                                title={c.shareId ? t("item.reshare") : t("item.share")}
                                                className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]">
                                                {shareCopied === c.id
                                                    ? <Check className="w-3 h-3 text-green-500" />
                                                    : <Share2 className="w-3 h-3" style={c.shareId ? { color: "#4ade80" } : undefined} />}
                                            </button>
                                            {c.shareId && (
                                                <button onClick={() => unshareConv(c.id)}
                                                    title={t("item.unshare")}
                                                    className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]">
                                                    <Link2Off className="w-3 h-3" />
                                                </button>
                                            )}
                                            <button onClick={() => renameConv(c.id, c.title)}
                                                title={t("item.rename")}
                                                className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]">
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => archiveConv(c.id, c.archived)}
                                                title={c.archived ? t("item.unarchive") : t("item.archive")}
                                                className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]">
                                                <Archive className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => deleteConv(c.id)}
                                                title={t("common.delete")}
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
                            {t("sidebar.knowledge")}
                        </Link>
                        <Link href={"/id" as never}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                            <UserIcon className="w-3.5 h-3.5 opacity-60" />
                            {t("sidebar.profile")}
                        </Link>
                    </div>
                ) : (
                    <div className="py-2 border-t flex flex-col items-center gap-1 flex-shrink-0" style={{ borderColor: T.border }}>
                        <Link href={"/id/knowledge" as never} title={t("sidebar.knowledge")}
                            className="w-9 h-9 rounded-lg grid place-items-center hover:bg-white/[0.06]">
                            <ShieldCheck className="w-4 h-4" style={{ color: T.primary }} />
                        </Link>
                        <Link href={"/id" as never} title={t("sidebar.profile")}
                            className="w-9 h-9 rounded-lg grid place-items-center hover:bg-white/[0.06]">
                            <UserIcon className="w-4 h-4 opacity-60" />
                        </Link>
                    </div>
                )}
            </aside>

            {/* Main — chat */}
            <main className="relative z-10 flex-1 flex flex-col min-w-0 min-h-0">
                <header className="h-14 border-b flex items-center gap-2 px-4 flex-shrink-0"
                    style={{ borderColor: T.border, background: "rgba(13,13,13,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                    <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2">
                        <Menu className="w-5 h-5" />
                    </button>
                    <Link href="/" title="For Humo" aria-label={t("header.home")}
                        className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 hover:bg-white/[0.06] transition-colors"
                        style={{ color: "var(--muted-foreground)" }}>
                        <Home className="w-[18px] h-[18px]" />
                    </Link>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logos/humo-ai-white.png" alt="Humo AI" className="w-8 h-8 flex-shrink-0 select-none" draggable={false} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-black truncate">Humo AI</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                            {AI_MODE_MAP[mode].label}{" · "}{activeId ? (convs.find(c => c.id === activeId)?.title ?? t("header.conv")) : t("sidebar.newChat")}
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
                            title={t("model.title")}
                            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-bold hover:brightness-110"
                            style={{ background: "var(--card, rgba(0,0,0,0.04))", color: "var(--foreground)" }}>
                            <Cpu className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
                            <span className="max-w-[84px] truncate hidden sm:inline">{findModel(model).label}</span>
                            <ChevronDown className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} />
                        </button>
                        {modelMenuOpen && (
                            <>
                                <button className="fixed inset-0 z-40" onClick={() => setModelMenuOpen(false)} aria-label={t("common.close")} />
                                <div className="absolute right-0 mt-1.5 w-60 rounded-xl overflow-hidden z-50 py-1"
                                    style={{ background: "rgba(20,20,20,0.98)", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                                    {AI_MODELS.map(m => {
                                        const active = model === m.id;
                                        const works = modelWorks(m.provider);
                                        return (
                                            <button key={m.id} onClick={() => pickModel(m.id)} disabled={!works}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.05] disabled:cursor-not-allowed"
                                                style={{ ...(active ? { background: T.soft } : {}), opacity: works ? 1 : 0.55 }}>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[12px] font-bold truncate text-[var(--foreground)]">{m.label}</span>
                                                        {works ? (
                                                            <span className="text-[8px] font-black px-1 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}>{t("badge.new")}</span>
                                                        ) : (
                                                            <span className="text-[8px] font-black px-1 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(255,255,255,0.09)", color: "var(--muted-foreground)" }}>{t("badge.soon")}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] block truncate" style={{ color: "var(--muted-foreground)" }}>{works ? (m.note ?? "") : t("model.soonHint")}</span>
                                                </div>
                                                {active && works && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--foreground)" }} />}
                                            </button>
                                        );
                                    })}
                                    <div className="px-3 pt-1.5 pb-1 mt-1 border-t" style={{ borderColor: T.border }}>
                                        <span className="text-[9px] leading-tight block" style={{ color: "var(--muted-foreground)" }}>{t("model.premiumNote")}</span>
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
                        title={ttsEnabled ? t("tts.toggleOff") : t("tts.toggleOn")}
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
                                {t("kb.title")}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {kbCount === 0 ? t("kb.desc0") : tn("kb.descN", kbCount ?? 0)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <Link href={"/id/discover" as never}
                                    className="h-8 px-3 rounded-lg text-[11px] font-black flex items-center gap-1"
                                    style={{ background: T.gradient, color: T.onPrimary }}>
                                    {t("kb.start")}
                                </Link>
                                <button onClick={dismissKbBanner}
                                    className="text-[11px] text-muted-foreground hover:underline">
                                    {t("kb.later")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={scrollAreaRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                    {/* SOON rejimlar (Gen Pic / Gen Vid / Humo CoWork) — chiroyli placeholder */}
                    {AI_MODE_MAP[mode].soon && (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4">
                            <span className="w-16 h-16 rounded-2xl grid place-items-center mb-5"
                                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${T.border}` }}>
                                {(() => { const Ic = AI_MODE_MAP[mode].icon; return <Ic className="w-8 h-8" style={{ color: "var(--muted-foreground)" }} />; })()}
                            </span>
                            <div className="flex items-center gap-2 mb-2">
                                <h2 className="text-2xl font-black text-[var(--foreground)]">{AI_MODE_MAP[mode].label}</h2>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase"
                                    style={{ background: "rgba(255,255,255,0.09)", color: "var(--muted-foreground)" }}>{t("badge.soon")}</span>
                            </div>
                            <p className="text-sm text-muted-foreground max-w-xs inline-flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 flex-shrink-0" /> {t("mode.soonTitleHint")}
                            </p>
                        </div>
                    )}
                    {!AI_MODE_MAP[mode].soon && !activeId && messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logos/humo-ai-white.png" alt="Humo AI" className="w-[74px] h-[74px] mb-6 select-none"
                                style={{ animation: "aiLogoFloat 4s ease-in-out infinite" }} draggable={false} />
                            <p className="text-[13px] mb-2" style={{ color: "var(--muted-foreground)" }}>
                                {t("empty.welcome")}
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-light mb-8 tracking-tight"
                                style={{ background: "linear-gradient(135deg,#ECECEC 20%,#8A8A8A 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                                {mode === "pic" ? t("empty.titlePic") : mode === "cowork" ? t("empty.titleCowork") : t("empty.titleChat")}
                            </h1>
                            <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                                {(mode === "pic" ? [
                                    { icon: ImageIcon, title: t("sugg.pic.landscape.t"), sub: t("sugg.pic.landscape.s"), p: t("sugg.pic.landscape.p") },
                                    { icon: Users,     title: t("sugg.pic.portrait.t"),  sub: t("sugg.pic.portrait.s"),  p: t("sugg.pic.portrait.p") },
                                    { icon: Cpu,       title: t("sugg.pic.logo.t"),      sub: t("sugg.pic.logo.s"),      p: t("sugg.pic.logo.p") },
                                    { icon: Sparkles,  title: t("sugg.pic.fantasy.t"),   sub: t("sugg.pic.fantasy.s"),   p: t("sugg.pic.fantasy.p") },
                                ] : [
                                    { icon: Code2,    title: t("sugg.chat.code.t"),      sub: t("sugg.chat.code.s"),      p: t("sugg.chat.code.p") },
                                    { icon: Globe,    title: t("sugg.chat.translate.t"), sub: t("sugg.chat.translate.s"), p: t("sugg.chat.translate.p") },
                                    { icon: BookOpen, title: t("sugg.chat.explain.t"),   sub: t("sugg.chat.explain.s"),   p: t("sugg.chat.explain.p") },
                                    { icon: Mail,     title: t("sugg.chat.letter.t"),    sub: t("sugg.chat.letter.s"),    p: t("sugg.chat.letter.p") },
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
                                    {m.generating ? (
                                        <div className="w-56 sm:w-64">
                                            <div className="ai-shimmer rounded-xl w-full aspect-square" />
                                            <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                                                <Loader2 className="w-3 h-3 animate-spin" /> {t("msg.imageGenerating")}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {Array.isArray(m.attachments) && m.attachments.length > 0 ? (
                                                <div className={`mb-2 grid gap-1.5 ${m.attachments.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                                                    {m.attachments.map((a, ai) => a.type === "image" ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img key={ai} src={a.url} alt="" onClick={() => setLightbox(a.url)}
                                                            className="w-full max-h-56 rounded-lg cursor-zoom-in object-cover" />
                                                    ) : (
                                                        <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-[11px] underline opacity-90 py-1">
                                                            <Paperclip className="w-3 h-3 flex-shrink-0" /> {t("msg.file")} {ai + 1}
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <>
                                                    {m.attachmentType === "image" && m.attachmentUrl && (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={m.attachmentUrl} alt="" onClick={() => setLightbox(m.attachmentUrl!)}
                                                            className="mb-2 max-w-full max-h-72 rounded-lg cursor-zoom-in" />
                                                    )}
                                                    {m.attachmentUrl && m.attachmentType !== "image" && (
                                                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer"
                                                            className="mb-2 flex items-center gap-1.5 text-[11px] underline opacity-90">
                                                            <Paperclip className="w-3 h-3 flex-shrink-0" /> {t("msg.attachedFile")}
                                                        </a>
                                                    )}
                                                </>
                                            )}
                                            {isUser ? m.body : (
                                                m.body
                                                    ? <AiMarkdown>{m.body}</AiMarkdown>
                                                    : (sending && idx === messages.length - 1 ? (
                                                        <div className="flex flex-col gap-2 py-0.5" style={{ color: "var(--muted-foreground)" }}>
                                                            <div className="flex items-center gap-2 text-[13px] font-semibold">
                                                                <span className="ai-typing"><i /><i /><i /></span>
                                                                {workingLabel}...
                                                            </div>
                                                            {codeLike && (
                                                                <div className="space-y-1.5 w-44">
                                                                    <div className="ai-codeline w-full" />
                                                                    <div className="ai-codeline w-4/5" />
                                                                    <div className="ai-codeline w-3/5" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null)
                                            )}
                                            {/* Streaming caret — matn kela boshlagach */}
                                            {!isUser && sending && idx === messages.length - 1 && m.body && (
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
                                                            title={t("common.copy")}
                                                            className="opacity-70 hover:opacity-100 transition-opacity">
                                                            {msgCopied === m.id
                                                                ? <Check className="w-3 h-3 text-green-500" />
                                                                : <Copy className="w-3 h-3" />}
                                                        </button>
                                                        <button onClick={() => speakMessage(m.id, m.body)}
                                                            title={ttsLoadingId === m.id ? t("tts.loading") : ttsSpeakingId === m.id ? t("tts.stop") : t("tts.read")}
                                                            className="opacity-70 hover:opacity-100 transition-opacity">
                                                            {ttsLoadingId === m.id
                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                : ttsSpeakingId === m.id
                                                                    ? <VolumeX className="w-3 h-3" />
                                                                    : <Volume2 className="w-3 h-3" />}
                                                        </button>
                                                        {isLastAi && !sending && (
                                                            <button onClick={regenerate}
                                                                title={t("msg.regenerate")}
                                                                className="opacity-70 hover:opacity-100 transition-opacity">
                                                                <RefreshCw className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                                {!isUser && m.attachmentType === "image" && m.attachmentUrl && (
                                                    <button onClick={() => downloadImage(m.attachmentUrl!)}
                                                        title={t("common.download")}
                                                        className="opacity-70 hover:opacity-100 transition-opacity">
                                                        <Download className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {isUser && m.body && m.body !== "(rasm)" && (
                                                    <>
                                                        <button onClick={() => copyMsg(m.id, m.body)}
                                                            title={t("common.copy")}
                                                            className="opacity-70 hover:opacity-100 transition-opacity">
                                                            {msgCopied === m.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                        <button onClick={() => editUserMsg(m.body)}
                                                            title={t("common.edit")}
                                                            className="opacity-70 hover:opacity-100 transition-opacity">
                                                            <Pencil className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={() => sharePrompt(m.id, m.body)}
                                                            title={t("msg.sharePrompt")}
                                                            className="opacity-70 hover:opacity-100 transition-opacity">
                                                            <Share2 className="w-3 h-3" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    )}
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
                    {/* "Ishlash" indikatori — oxirgi xabar user bo'lsa (vision/classic yo'li) */}
                    {sending && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                        <div className="flex justify-start">
                            <div className="max-w-[75%] px-3.5 py-2.5" style={{ background: "rgba(26,26,26,0.78)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px 16px 16px 4px" }}>
                                <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--muted-foreground)" }}>
                                    <span className="ai-typing"><i /><i /><i /></span> {workingLabel}...
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Biriktirmalar preview — bir nechta (6 tagacha) */}
                {(attachments.length > 0 || uploading) && (
                    <div className="mx-3 mt-2 flex flex-wrap gap-2">
                        {attachments.map((a, i) => (
                            <div key={i} className="relative">
                                {a.type === "image" ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={a.url} alt="" className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: T.border }} />
                                ) : (
                                    <div className="w-16 h-16 rounded-lg border flex flex-col items-center justify-center gap-1 px-1" style={{ borderColor: T.border, background: T.soft }}>
                                        <Paperclip className="w-4 h-4" style={{ color: T.primary }} />
                                        <span className="text-[8px] truncate w-full text-center" style={{ color: "var(--muted-foreground)" }}>{a.name.slice(0, 12)}</span>
                                    </div>
                                )}
                                <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full grid place-items-center"
                                    style={{ background: "#0d0d0d", border: `1px solid ${T.border}`, color: "#fff" }}>
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        {uploading && (
                            <div className="w-16 h-16 rounded-lg border grid place-items-center" style={{ borderColor: T.border }}>
                                <Loader2 className="w-4 h-4 animate-spin" style={{ color: T.primary }} />
                            </div>
                        )}
                    </div>
                )}

                {/* Web-qidiruv / chuqur fikrlash yoniq — indikator chiplar */}
                {(webSearch || deepThink) && !AI_MODE_MAP[mode].soon && (
                    <div className="mx-3 mt-2 flex flex-wrap gap-1.5">
                        {webSearch && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                style={{ background: T.soft, color: T.primary, border: `1px solid ${T.border}` }}>
                                <Search className="w-3 h-3" /> {t("plus.search")}
                                <button type="button" onClick={() => setWebSearch(false)} title={t("common.delete")} className="ml-0.5 opacity-70 hover:opacity-100">
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {deepThink && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                style={{ background: T.soft, color: T.primary, border: `1px solid ${T.border}` }}>
                                <Brain className="w-3 h-3" /> {t("plus.think")}
                                <button type="button" onClick={() => setDeepThink(false)} title={t("common.delete")} className="ml-0.5 opacity-70 hover:opacity-100">
                                    <XIcon className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                    </div>
                )}

                {!AI_MODE_MAP[mode].soon && (
                <form onSubmit={sendMessage} className="border-t p-2 sm:p-3 flex gap-1.5 sm:gap-2 items-end" style={{ borderColor: T.border, background: "rgba(13,13,13,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                    {/* "+" menyu (fayl / rejimlar / kelajak vositalar) */}
                    <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple hidden
                        onChange={e => { const fs = e.target.files; if (fs && fs.length) uploadFiles(Array.from(fs)); e.target.value = ""; }} />
                    <div className="relative flex-shrink-0">
                        <button type="button" onClick={() => setPlusMenuOpen(o => !o)}
                            disabled={uploading}
                            title={t("composer.more")} aria-label={t("composer.more")}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center disabled:opacity-40 hover:brightness-95 transition-transform"
                            style={{ background: T.soft, color: T.primary, transform: plusMenuOpen ? "rotate(45deg)" : "none" }}>
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                        {plusMenuOpen && (
                            <>
                                <button type="button" className="fixed inset-0 z-40" onClick={() => setPlusMenuOpen(false)} aria-label={t("common.close")} />
                                <div className="absolute bottom-full left-0 mb-2 w-60 rounded-2xl overflow-hidden z-50 py-1.5"
                                    style={{ background: "rgba(20,20,20,0.98)", border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                                    {PLUS_ITEMS.map((it, i) => {
                                        const active = it.action === "mode" ? it.mode === mode : it.id === "search" ? webSearch : it.id === "think" ? deepThink : false;
                                        return (
                                            <div key={it.id}>
                                                {(i === 2 || i === 7) && <div className="my-1 h-px" style={{ background: T.border }} />}
                                                <button type="button" onClick={() => handlePlus(it)}
                                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-white/[0.05] transition-colors"
                                                    style={active ? { background: T.soft } : {}}>
                                                    <it.icon className="w-[18px] h-[18px] flex-shrink-0" style={{ color: active ? "var(--foreground)" : "var(--muted-foreground)" }} />
                                                    <span className="text-[13px] font-semibold flex-1 truncate text-[var(--foreground)]">{t("plus." + it.id)}</span>
                                                    {it.soon && (
                                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase"
                                                            style={{ background: "rgba(255,255,255,0.09)", color: "var(--muted-foreground)" }}>{t("badge.soon")}</span>
                                                    )}
                                                    {active && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--foreground)" }} />}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Humo Live — ovozli suhbat (barcha rejimlarda) */}
                    <button type="button" onClick={() => setLiveOpen(true)}
                        title={t("composer.liveTooltip")} aria-label="Humo Live"
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center flex-shrink-0 hover:brightness-95"
                        style={{ background: T.soft, color: T.primary }}>
                        <AudioLines className="w-4 h-4" />
                    </button>

                    {/* Matn + mikrofon + jo'natish — bitta "pill" (jo'natish hech qachon ekrandan chiqmaydi) */}
                    <div className="flex-1 min-w-0 flex items-center gap-1 rounded-2xl border pr-1 focus-within:ring-1"
                        style={{ borderColor: recording ? T.primary : T.border, background: "rgba(26,26,26,0.6)", ["--tw-ring-color" as string]: T.primary + "55" }}>
                        <input
                            ref={composerInputRef}
                            value={input}
                            onChange={e => setInput(e.target.value.slice(0, 4000))}
                            onPaste={handlePaste}
                            placeholder={recording ? t("ph.listening") : mode === "pic" ? t("ph.pic") : mode === "cowork" ? t("ph.cowork") : mode === "code" ? t("ph.code") : t("ph.chat")}
                            className="flex-1 min-w-0 h-11 px-3.5 bg-transparent text-sm focus:outline-none rounded-2xl"
                            style={{ color: "var(--foreground)" }}
                            disabled={sending}
                        />

                        {/* Voice input */}
                        {voiceSupported && !sending && (
                            <button type="button" onClick={toggleVoice}
                                title={recording ? t("tts.stop") : t("voice.start")}
                                className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                                style={{ background: recording ? "#EF4444" : "transparent", color: recording ? "#fff" : T.primary }}>
                                {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>
                        )}

                        {sending ? (
                            <button type="button" onClick={stopGenerating}
                                title={t("tts.stop")} aria-label={t("tts.stop")}
                                className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0"
                                style={{ background: T.gradient, color: T.onPrimary }}>
                                <span className="w-3 h-3 rounded-sm bg-current" />
                            </button>
                        ) : (
                            <button type="submit" disabled={!input.trim() && attachments.length === 0}
                                className="w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 disabled:opacity-40 transition-opacity"
                                style={{ background: T.gradient, color: T.onPrimary }}>
                                <Send className="w-4 h-4" />
                            </button>
                        )}
                    </div>
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
                            {canvas && <span className="text-[10px] flex-shrink-0" style={{ color: "var(--muted-foreground)" }}>{canvas.length} {t("canvas.charsWord")}</span>}
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={copyCanvas} disabled={!canvas} title={t("canvas.copy")}
                                className="w-8 h-8 rounded-lg grid place-items-center hover:bg-white/[0.06] disabled:opacity-30" style={{ color: "var(--muted-foreground)" }}>
                                {canvasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button onClick={downloadCanvas} disabled={!canvas} title={t("common.download")}
                                className="w-8 h-8 rounded-lg grid place-items-center hover:bg-white/[0.06] disabled:opacity-30" style={{ color: "var(--muted-foreground)" }}>
                                <Download className="w-4 h-4" />
                            </button>
                            <button onClick={() => setCanvasView("chat")} title={t("canvas.backToChat")} aria-label={t("canvas.backToChat")}
                                className="lg:hidden w-8 h-8 rounded-lg grid place-items-center" style={{ color: "var(--muted-foreground)" }}>
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <textarea value={canvas} onChange={e => setCanvas(e.target.value)}
                        placeholder={t("canvas.placeholder")}
                        className="flex-1 w-full p-4 bg-transparent text-[13px] leading-relaxed resize-none outline-none font-mono"
                        style={{ color: "var(--foreground)" }} spellCheck={false} />
                </aside>
            )}

            {/* Rasm lightbox (to'liq ekran ko'rish + yuklab olish) — ChatGPT uslubi */}
            {lightbox && (
                <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: "rgba(0,0,0,0.92)" }}
                    onClick={() => setLightbox(null)}>
                    <div className="h-14 px-4 flex items-center justify-end gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => downloadImage(lightbox)}
                            className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-sm font-bold"
                            style={{ background: T.gradient, color: T.onPrimary }}>
                            <Download className="w-4 h-4" /> {t("common.download")}
                        </button>
                        <button onClick={() => setLightbox(null)}
                            className="w-9 h-9 rounded-lg grid place-items-center hover:bg-white/[0.1]" style={{ color: "#fff" }}>
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 overflow-auto" onClick={() => setLightbox(null)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={lightbox} alt="" onClick={e => e.stopPropagation()}
                            className="max-w-full max-h-full rounded-xl object-contain" />
                    </div>
                </div>
            )}

            {/* Humo Live — real-vaqt ovozli suhbat overlay */}
            {liveOpen && <HumoLive onClose={() => setLiveOpen(false)} lang={aiLang} />}

        </div>
    );
}
