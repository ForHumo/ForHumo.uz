"use client";

import { useState, useEffect, useRef } from "react";
import { upload } from "@vercel/blob/client";
import {
    X, Plus, Image as ImgIcon, Film, Hash, MapPin,
    Users, Globe, Lock, ChevronDown, Send, Loader2, CheckCircle2,
    AlignLeft, BarChart2, Trash2, Star, Sparkles,
} from "lucide-react";

function AiBtn({ busy, onClick, label }: { busy: boolean; onClick: () => void; label: string }) {
    return (
        <button onClick={onClick} disabled={busy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 disabled:opacity-50"
            style={{ background: "rgba(0,206,200,0.08)", border: "1px solid rgba(0,206,200,0.25)", color: "rgba(150,230,225,0.95)" }}>
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}{label}
        </button>
    );
}
import { useNxPlayer } from "./nx-player-ctx";
import { NxLocationPicker, type NxGeoValue } from "./nx-location-picker";

// ─────────────────────────────────────────────────────────────────────────────
// NxCreatePost — REAL: postlar DB'ga yoziladi, media blob'ga yuklanadi,
// so'rovnoma/maxfiylik/joylashuv backend bilan ishlaydi, teglar trendingdan.
// Yangi post "nexus:post-created" eventi orqali lentaga darhol tushadi.
// ─────────────────────────────────────────────────────────────────────────────

type PostType = "text" | "photo" | "video" | "poll";
type Privacy = "PUBLIC" | "FOLLOWERS" | "SUBSCRIBERS" | "PRIVATE";

const POST_TYPES: { value: PostType; label: string; icon: React.ElementType; color: string }[] = [
    { value: "text", label: "Matn", icon: AlignLeft, color: "#2B3EE8" },
    { value: "photo", label: "Rasm", icon: ImgIcon, color: "#10B981" },
    { value: "video", label: "Video", icon: Film, color: "#EF4444" },
    { value: "poll", label: "So'rovnoma", icon: BarChart2, color: "#8B5CF6" },
];

const PRIVACY_OPTS: { value: Privacy; label: string; icon: React.ElementType }[] = [
    { value: "PUBLIC", label: "Hammaga", icon: Globe },
    { value: "FOLLOWERS", label: "Kuzatuvchilar", icon: Users },
    { value: "SUBSCRIBERS", label: "Pullik obunachilar", icon: Star },
    { value: "PRIVATE", label: "Faqat men", icon: Lock },
];

const POLL_DURATIONS = [
    { hours: 24, label: "1 kun" },
    { hours: 72, label: "3 kun" },
    { hours: 168, label: "1 hafta" },
];

const isVid = (u: string) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);

export function NxCreatePost() {
    const { createPostOpen, setCreatePostOpen } = useNxPlayer();

    const [postType, setPostType] = useState<PostType>("text");
    const [text, setText] = useState("");
    const [privacy, setPrivacy] = useState<Privacy>("PUBLIC");
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [pollHours, setPollHours] = useState(24);
    const [geo, setGeo] = useState<NxGeoValue | null>(null);
    const [media, setMedia] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [trendTags, setTrendTags] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [publishing, setPublishing] = useState(false);
    const [published, setPublished] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [canSub, setCanSub] = useState(false);    // pullik obuna yoqilgan ijodkormanmi
    const [price, setPrice] = useState<number>(0);     // 0 = bepul; >0 = pullik
    const [subsFree, setSubsFree] = useState(false);   // true = pullik obunachi kuzatuvchi bepul ko'radi
    const [aiBusy, setAiBusy] = useState<null | "caption" | "tags" | "translate">(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Trending teglar — real (kashfiyot API)
    useEffect(() => {
        if (!createPostOpen || trendTags.length) return;
        fetch("/api/nexus/discover")
            .then(r => r.json())
            .then(d => {
                const raw = d.trendingTags ?? [];
                const names = raw.map((t: { tag?: string } | string) => typeof t === "string" ? t : t.tag).filter(Boolean).slice(0, 8);
                setTrendTags(names);
            })
            .catch(() => { });
    }, [createPostOpen, trendTags.length]);

    // Pullik obuna variantini faqat obunasi yoqilgan ijodkorga ko'rsatish
    useEffect(() => {
        if (!createPostOpen) return;
        fetch("/api/nexus/creator").then(r => r.json()).then(d => setCanSub((d.subPrice ?? 0) > 0)).catch(() => { });
    }, [createPostOpen]);

    if (!createPostOpen) return null;

    const privacyOptions = PRIVACY_OPTS.filter(p => p.value !== "SUBSCRIBERS" || canSub);
    const privacyOpt = PRIVACY_OPTS.find(p => p.value === privacy)!;
    const PrivacyIcon = privacyOpt.icon;

    function reset() {
        setText(""); setPostType("text"); setPrivacy("PUBLIC");
        setPollOptions(["", ""]); setPollHours(24); setGeo(null); setPrice(0); setSubsFree(false);
        setMedia([]); setTags([]); setErr(null); setUploading(false);
        setPublishing(false); setPublished(false);
    }
    function close() { reset(); setCreatePostOpen(false); }

    const toggleTag = (tag: string) =>
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

    // AI yordam (Gemini) — tavsif yozish / teglar / tarjima
    async function aiAssist(action: "caption" | "tags" | "translate", to?: "uz" | "ru" | "en") {
        if (aiBusy) return;
        const input = text.trim();
        if (!input) { setErr("Avval bir necha so'z yozing — AI uni rivojlantiradi"); return; }
        setAiBusy(action); setErr(null);
        try {
            const res = await fetch("/api/nexus/ai-assist", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, input, kind: "post", to }),
            });
            const d = await res.json();
            if (!res.ok) { setErr(d.error || "AI xatosi"); return; }
            if (action === "caption" && d.result) setText(d.result);
            if (action === "translate" && d.result) setText(d.result);
            if (action === "tags" && Array.isArray(d.tags)) setTags(prev => [...new Set([...prev, ...d.tags])].slice(0, 12));
        } catch {
            setErr("AI javob bermadi");
        } finally { setAiBusy(null); }
    }

    const addPollOption = () => { if (pollOptions.length < 4) setPollOptions(prev => [...prev, ""]); };
    const updatePollOption = (i: number, val: string) =>
        setPollOptions(prev => prev.map((o, idx) => idx === i ? val : o));
    const removePollOption = (i: number) => {
        if (pollOptions.length > 2) setPollOptions(prev => prev.filter((_, idx) => idx !== i));
    };

    async function pickFiles(files: FileList | null) {
        if (!files?.length) return;
        setUploading(true); setErr(null);
        try {
            const maxCount = postType === "photo" ? 9 : 1;
            for (const file of Array.from(files).slice(0, maxCount - media.length)) {
                const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                const blob = await upload(`nexus/${Date.now()}-${safe}`, file, {
                    access: "public", handleUploadUrl: "/api/market/upload/client-token",
                });
                setMedia(prev => [...prev, blob.url]);
            }
        } catch { setErr("Media yuklanmadi, qayta urinib ko'ring"); }
        finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
    }

    const validPoll = pollOptions.filter(o => o.trim()).length >= 2;
    const canPublish = postType === "poll"
        ? (text.trim().length > 0 && validPoll)
        : (text.trim().length > 0 || media.length > 0);

    async function publish() {
        if (!canPublish || publishing || uploading) return;
        setPublishing(true); setErr(null);

        // Tanlangan trending teglarni matnga qo'shamiz (hashtag pipeline matndan ajratadi)
        let finalText = text.trim();
        const missing = tags.filter(t => !finalText.toLowerCase().includes(`#${t.toLowerCase()}`));
        if (missing.length) finalText += (finalText ? "\n" : "") + missing.map(t => `#${t}`).join(" ");

        try {
            const r = await fetch("/api/nexus/posts", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: finalText,
                    media,
                    privacy,
                    location: geo?.name || null,
                    locationLat: geo?.lat ?? null,
                    locationLng: geo?.lng ?? null,
                    price: price > 0 ? Math.floor(price) : 0,
                    subsFree: price > 0 && subsFree,
                    pollOptions: postType === "poll" ? pollOptions.map(o => o.trim()).filter(Boolean) : [],
                    pollDurationHours: pollHours,
                }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) { setErr(d.error || "Xatolik yuz berdi"); setPublishing(false); return; }
            // Lentaga darhol qo'shish
            if (d.post) window.dispatchEvent(new CustomEvent("nexus:post-created", { detail: d.post }));
            setPublishing(false); setPublished(true);
            setTimeout(close, 1200);
        } catch { setErr("Tarmoq xatosi"); setPublishing(false); }
    }

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={close} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[90vh] md:rounded-3xl"
                style={{ background: "rgba(8,12,32,0.98)", border: "1px solid rgba(43,62,232,0.22)", boxShadow: "0 32px 80px rgba(0,0,0,0.70)", maxHeight: "92vh" }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <Plus className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-black text-white">Yangi post</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button onClick={() => setShowPrivacy(p => !p)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150"
                                style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)", color: "rgba(140,160,210,0.90)" }}>
                                <PrivacyIcon className="w-3 h-3" />
                                {privacyOpt.label}
                                <ChevronDown className="w-3 h-3" />
                            </button>
                            {showPrivacy && (
                                <div className="absolute right-0 top-full mt-1 z-10 rounded-xl overflow-hidden w-36"
                                    style={{ background: "rgba(11,18,40,0.98)", border: "1px solid rgba(43,62,232,0.25)", boxShadow: "0 8px 24px rgba(0,0,0,0.60)" }}>
                                    {privacyOptions.map(({ value, label, icon: Icon }) => (
                                        <button key={value}
                                            onClick={() => { setPrivacy(value); setShowPrivacy(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-bold transition-all duration-100"
                                            style={{ color: privacy === value ? "#00CEC8" : "rgba(160,180,230,0.85)" }}>
                                            <Icon className="w-3.5 h-3.5" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={close}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* Post turi */}
                <div className="px-4 py-3 flex gap-2 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {POST_TYPES.map(pt => {
                        const Icon = pt.icon;
                        const isActive = postType === pt.value;
                        return (
                            <button key={pt.value} onClick={() => setPostType(pt.value)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0 transition-all duration-200"
                                style={isActive
                                    ? { background: `${pt.color}22`, border: `1px solid ${pt.color}55`, color: pt.color }
                                    : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(140,160,210,0.80)" }}>
                                <Icon className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">{pt.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
                    {/* Matn */}
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder={
                            postType === "text" ? "Nima haqida o'ylayapsiz? #teglar yozsangiz avtomatik ajratiladi" :
                            postType === "photo" ? "Rasm uchun tavsif yozing..." :
                            postType === "video" ? "Video uchun tavsif yozing..." :
                            "So'rovnoma savolingizni kiriting..."
                        }
                        rows={4}
                        className="w-full bg-transparent text-sm text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none resize-none mb-2"
                        style={{ minHeight: 80 }}
                    />

                    {/* AI yordam (Humo AI) */}
                    {postType !== "poll" && (
                        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black mr-0.5" style={{ color: "#00CEC8" }}><Sparkles className="w-3 h-3" />AI</span>
                            <AiBtn busy={aiBusy === "caption"} onClick={() => aiAssist("caption")} label="Tavsif yoz" />
                            <AiBtn busy={aiBusy === "tags"} onClick={() => aiAssist("tags")} label="Teglar" />
                            <AiBtn busy={aiBusy === "translate"} onClick={() => aiAssist("translate", "ru")} label="RU" />
                            <AiBtn busy={aiBusy === "translate"} onClick={() => aiAssist("translate", "en")} label="EN" />
                            <AiBtn busy={aiBusy === "translate"} onClick={() => aiAssist("translate", "uz")} label="UZ" />
                        </div>
                    )}

                    {/* Media yuklash (rasm 9 tagacha / video 1 ta) */}
                    {(postType === "photo" || postType === "video") && (
                        <div className="mb-4">
                            {media.length > 0 && (
                                <div className={`grid gap-1.5 mb-2 ${media.length > 1 ? "grid-cols-3" : "grid-cols-1"}`}>
                                    {media.map((url, i) => (
                                        <div key={url} className="relative rounded-xl overflow-hidden" style={{ background: "rgba(43,62,232,0.10)" }}>
                                            {isVid(url)
                                                ? <video src={url} className="w-full h-24 object-cover" />
                                                : <img src={url} alt="" className={`w-full object-cover ${media.length > 1 ? "h-24" : "max-h-64"}`} />}
                                            <button onClick={() => setMedia(prev => prev.filter((_, idx) => idx !== i))}
                                                className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.65)" }}>
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {((postType === "photo" && media.length < 9) || (postType === "video" && media.length < 1)) && (
                                <label className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-2xl cursor-pointer transition-all duration-150"
                                    style={{ background: "rgba(43,62,232,0.06)", border: "2px dashed rgba(43,62,232,0.25)" }}>
                                    {uploading ? (
                                        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "#00CEC8" }} />
                                    ) : postType === "photo" ? (
                                        <ImgIcon className="w-8 h-8" style={{ color: "rgba(43,62,232,0.50)" }} />
                                    ) : (
                                        <Film className="w-8 h-8" style={{ color: "rgba(239,68,68,0.50)" }} />
                                    )}
                                    <p className="text-xs font-bold" style={{ color: "rgba(140,160,210,0.70)" }}>
                                        {uploading ? "Yuklanmoqda..." : postType === "photo" ? `Rasm tanlang (${media.length}/9)` : "Video tanlang"}
                                    </p>
                                    <input ref={fileRef} type="file"
                                        accept={postType === "photo" ? "image/*" : "video/*"}
                                        multiple={postType === "photo"}
                                        onChange={e => pickFiles(e.target.files)}
                                        disabled={uploading}
                                        className="sr-only" />
                                </label>
                            )}
                        </div>
                    )}

                    {/* So'rovnoma variantlari */}
                    {postType === "poll" && (
                        <div className="mb-4 flex flex-col gap-2">
                            {pollOptions.map((opt, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        value={opt}
                                        onChange={e => updatePollOption(i, e.target.value)}
                                        placeholder={`${i + 1}-variant`}
                                        maxLength={60}
                                        className="flex-1 px-4 py-3 rounded-xl bg-transparent text-sm text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none"
                                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)" }}
                                    />
                                    {pollOptions.length > 2 && (
                                        <button onClick={() => removePollOption(i)}
                                            className="w-11 flex items-center justify-center rounded-xl"
                                            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {pollOptions.length < 4 && (
                                <button onClick={addPollOption}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px dashed rgba(43,62,232,0.30)", color: "rgba(140,160,210,0.80)" }}>
                                    <Plus className="w-3.5 h-3.5" /> Variant qo&apos;shish
                                </button>
                            )}
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs" style={{ color: "rgba(80,100,150,0.70)" }}>Davomiyligi:</span>
                                <div className="flex gap-1">
                                    {POLL_DURATIONS.map(d => (
                                        <button key={d.hours} onClick={() => setPollHours(d.hours)}
                                            className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all duration-150"
                                            style={pollHours === d.hours
                                                ? { background: "rgba(43,62,232,0.30)", color: "#00CEC8" }
                                                : { background: "rgba(43,62,232,0.10)", color: "rgba(140,160,210,0.80)" }}>{d.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Trending teglar — real */}
                    {trendTags.length > 0 && (
                        <div className="mb-4">
                            <p className="text-[10px] font-bold mb-2 px-1" style={{ color: "rgba(80,100,150,0.70)" }}>
                                Trenddagi teglar
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {trendTags.map(tag => {
                                    const active = tags.includes(tag);
                                    return (
                                        <button key={tag} onClick={() => toggleTag(tag)}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-150"
                                            style={active
                                                ? { background: "rgba(43,62,232,0.25)", border: "1px solid rgba(43,62,232,0.50)", color: "#00CEC8" }
                                                : { background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(140,160,210,0.80)" }}>
                                            <Hash className="w-2.5 h-2.5" />
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Joylashuv — HAR DOIM kartada tanlanadi (qo'lda kirish yo'q) */}
                    <div className="mb-2 flex items-center gap-2">
                        <NxLocationPicker value={geo} onChange={setGeo} />
                    </div>

                    {/* Pullik post — bir marta sotib olish */}
                    <div className="mb-2 rounded-2xl p-3" style={{ background: "rgba(245,179,1,0.06)", border: "1px solid rgba(245,179,1,0.22)" }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Star className="w-3.5 h-3.5" style={{ color: "#F5B301" }} />
                            <span className="text-xs font-black text-white">Pullik post</span>
                            <span className="text-[10px] ml-auto" style={{ color: "rgba(200,180,140,0.75)" }}>
                                {price > 0 ? `${price.toLocaleString("uz-UZ")} so'm` : "Bepul"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <input type="number" min={0} max={100_000_000} step={1000}
                                value={price || ""}
                                onChange={e => setPrice(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                                placeholder="Narx (0 = bepul)"
                                className="flex-1 h-9 px-3 rounded-xl text-sm text-white outline-none"
                                style={{ background: "rgba(5,8,24,0.60)", border: "1px solid rgba(245,179,1,0.25)", caretColor: "#F5B301" }} />
                            <div className="flex gap-1">
                                {[0, 5000, 10000, 25000].map(v => (
                                    <button key={v} type="button" onClick={() => setPrice(v)}
                                        className="px-2 py-1 rounded-lg text-[10px] font-black transition active:scale-95"
                                        style={price === v
                                            ? { background: "linear-gradient(135deg,#F5B301,#F97316)", color: "#fff" }
                                            : { background: "rgba(245,179,1,0.08)", border: "1px solid rgba(245,179,1,0.22)", color: "rgba(200,180,140,0.85)" }}>
                                        {v === 0 ? "Bepul" : `${(v/1000)}k`}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {price > 0 && (
                            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg" style={{ background: "rgba(0,206,200,0.05)", border: "1px solid rgba(0,206,200,0.14)" }}>
                                <input type="checkbox" checked={subsFree} onChange={e => setSubsFree(e.target.checked)} className="w-3.5 h-3.5" />
                                <span className="text-[11px]" style={{ color: "rgba(150,220,215,0.90)" }}>
                                    Pullik obunachi kuzatuvchilarga <b>bepul</b> ko&apos;rsatish (qolganlar sotib oladi)
                                </span>
                            </label>
                        )}
                        {price > 0 && (
                            <p className="text-[10px] mt-1.5" style={{ color: "rgba(200,180,140,0.65)" }}>
                                Har xaridor bir marta sotib oladi — keyin cheksiz ko&apos;radi. Pul For Pay hamyoningizga o&apos;tadi.
                            </p>
                        )}
                    </div>

                    {err && <p className="text-xs text-red-400 font-bold px-1 mt-2">{err}</p>}
                </div>

                {/* E'lon qilish */}
                <div className="px-5 pb-5 pt-2 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                    {published ? (
                        <div className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2"
                            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.30)" }}>
                            <CheckCircle2 className="w-5 h-5" style={{ color: "#10B981" }} />
                            <span className="text-sm font-black" style={{ color: "#10B981" }}>E&apos;lon qilindi — lentada!</span>
                        </div>
                    ) : (
                        <button onClick={publish} disabled={!canPublish || publishing || uploading}
                            className="w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all duration-200"
                            style={canPublish && !publishing && !uploading
                                ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 8px 24px rgba(43,62,232,0.35)" }
                                : { background: "rgba(43,62,232,0.15)", opacity: 0.6 }}>
                            {publishing
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> E&apos;lon qilinmoqda...</>
                                : <><Send className="w-4 h-4" /> E&apos;lon qilish</>
                            }
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
