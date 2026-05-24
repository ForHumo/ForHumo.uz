"use client";

import { useState, useRef } from "react";
import {
    X, Plus, Image, Film, Music2, Smile, Hash, MapPin,
    Users, Globe, Lock, ChevronDown, Send, Loader2, CheckCircle2,
    Bold, Italic, Link, AlignLeft, BarChart2, Calendar,
} from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Post turlari
// ─────────────────────────────────────────────────────────────────────────────
type PostType = "text" | "photo" | "video" | "poll" | "event";
type Privacy = "public" | "friends" | "private";

const POST_TYPES: { value: PostType; label: string; icon: React.ElementType; color: string }[] = [
    { value: "text",  label: "Matn",    icon: AlignLeft, color: "#2B3EE8" },
    { value: "photo", label: "Rasm",    icon: Image,     color: "#10B981" },
    { value: "video", label: "Video",   icon: Film,      color: "#EF4444" },
    { value: "poll",  label: "So'rovnoma", icon: BarChart2, color: "#8B5CF6" },
    { value: "event", label: "Tadbir",  icon: Calendar,  color: "#F59E0B" },
];

const PRIVACY_OPTS: { value: Privacy; label: string; icon: React.ElementType }[] = [
    { value: "public",  label: "Hammaga", icon: Globe },
    { value: "friends", label: "Do'stlar", icon: Users },
    { value: "private", label: "Maxfiy",  icon: Lock  },
];

const MOCK_TAGS = ["#HumoNexus", "#UzbekistanMusic", "#AIKelajak", "#ToshkentLive", "#StartupUZ", "#Tech", "#Musiqa", "#Kino"];

// ─────────────────────────────────────────────────────────────────────────────
// NxCreatePost
// ─────────────────────────────────────────────────────────────────────────────
export function NxCreatePost() {
    const { createPostOpen, setCreatePostOpen } = useNxPlayer();

    const [postType,     setPostType]     = useState<PostType>("text");
    const [text,         setText]         = useState("");
    const [privacy,      setPrivacy]      = useState<Privacy>("public");
    const [showPrivacy,  setShowPrivacy]  = useState(false);
    const [pollOptions,  setPollOptions]  = useState(["", ""]);
    const [pollDuration, setPollDuration] = useState("1 kun");
    const [location,     setLocation]     = useState("");
    const [tags,         setTags]         = useState<string[]>([]);
    const [publishing,   setPublishing]   = useState(false);
    const [published,    setPublished]    = useState(false);
    const [mediaCount,   setMediaCount]   = useState(0);
    const textRef = useRef<HTMLTextAreaElement>(null);

    if (!createPostOpen) return null;

    const privacyOpt = PRIVACY_OPTS.find(p => p.value === privacy)!;
    const PrivacyIcon = privacyOpt.icon;

    const toggleTag = (tag: string) => {
        setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const addPollOption = () => {
        if (pollOptions.length < 4) setPollOptions(prev => [...prev, ""]);
    };

    const updatePollOption = (i: number, val: string) => {
        setPollOptions(prev => prev.map((o, idx) => idx === i ? val : o));
    };

    const canPublish = text.trim().length > 0 || postType === "photo" || postType === "video";

    const publish = () => {
        if (!canPublish || publishing) return;
        setPublishing(true);
        setTimeout(() => {
            setPublishing(false);
            setPublished(true);
            setTimeout(() => {
                setPublished(false);
                setCreatePostOpen(false);
                // Reset state
                setText(""); setPostType("text"); setPrivacy("public");
                setPollOptions(["", ""]); setLocation(""); setTags([]);
                setMediaCount(0);
            }, 1500);
        }, 1200);
    };

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setCreatePostOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[90vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "92vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            <Plus className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-base font-black text-white">Yangi post</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Privacy selector */}
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
                                    {PRIVACY_OPTS.map(({ value, label, icon: Icon }) => (
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
                        <button onClick={() => setCreatePostOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <X className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* Post type tabs */}
                <div className="px-4 py-3 flex gap-2 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {POST_TYPES.map(pt => {
                        const Icon = pt.icon;
                        const isActive = postType === pt.value;
                        return (
                            <button key={pt.value} onClick={() => setPostType(pt.value)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0 transition-all duration-200"
                                style={isActive ? {
                                    background: `${pt.color}22`,
                                    border: `1px solid ${pt.color}55`,
                                    color: pt.color,
                                } : {
                                    background: "rgba(43,62,232,0.08)",
                                    border: "1px solid rgba(43,62,232,0.18)",
                                    color: "rgba(140,160,210,0.80)",
                                }}>
                                <Icon className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">{pt.label}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-4" style={{ scrollbarWidth: "none" }}>
                    {/* Text area */}
                    <div className="relative mb-3">
                        <textarea
                            ref={textRef}
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder={
                                postType === "text"  ? "Nima haqida o'ylayapsiz?" :
                                postType === "photo" ? "Rasm uchun tavsif yozing..." :
                                postType === "video" ? "Video uchun sarlavha yozing..." :
                                postType === "poll"  ? "So'rovnoma savolingizni kiriting..." :
                                "Tadbir tavsifini yozing..."
                            }
                            maxLength={500}
                            rows={4}
                            className="w-full bg-transparent text-sm text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none resize-none"
                            style={{ minHeight: 80 }}
                        />
                        <p className="text-right text-[9px] mt-1" style={{ color: "rgba(80,100,150,0.50)" }}>
                            {text.length}/500
                        </p>
                    </div>

                    {/* Photo/Video upload area */}
                    {(postType === "photo" || postType === "video") && (
                        <div className="mb-4">
                            <button
                                onClick={() => setMediaCount(c => Math.min(c + 1, postType === "photo" ? 9 : 1))}
                                className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-2xl transition-all duration-150"
                                style={{ background: "rgba(43,62,232,0.06)", border: "2px dashed rgba(43,62,232,0.25)" }}>
                                {postType === "photo" ? (
                                    <Image className="w-8 h-8" style={{ color: "rgba(43,62,232,0.50)" }} />
                                ) : (
                                    <Film className="w-8 h-8" style={{ color: "rgba(239,68,68,0.50)" }} />
                                )}
                                <p className="text-xs font-bold" style={{ color: "rgba(140,160,210,0.70)" }}>
                                    {postType === "photo" ? "Rasm tanlash yoki tortib tashlang" : "Video tanlang (maks. 15 daqiqa)"}
                                </p>
                                {mediaCount > 0 && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                                        style={{ background: "rgba(43,62,232,0.20)" }}>
                                        <CheckCircle2 className="w-3 h-3" style={{ color: "#10B981" }} />
                                        <span className="text-xs font-bold" style={{ color: "#10B981" }}>
                                            {mediaCount} {postType === "photo" ? "rasm" : "video"} tanlangan
                                        </span>
                                    </div>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Poll options */}
                    {postType === "poll" && (
                        <div className="mb-4 flex flex-col gap-2">
                            {pollOptions.map((opt, i) => (
                                <input key={i}
                                    value={opt}
                                    onChange={e => updatePollOption(i, e.target.value)}
                                    placeholder={`${i + 1}-variant`}
                                    maxLength={60}
                                    className="w-full px-4 py-3 rounded-xl bg-transparent text-sm text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.22)" }}
                                />
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
                                    {["1 kun", "3 kun", "1 hafta"].map(d => (
                                        <button key={d} onClick={() => setPollDuration(d)}
                                            className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all duration-150"
                                            style={pollDuration === d ? {
                                                background: "rgba(43,62,232,0.30)",
                                                color: "#00CEC8",
                                            } : {
                                                background: "rgba(43,62,232,0.10)",
                                                color: "rgba(140,160,210,0.80)",
                                            }}>{d}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Hashtag suggestions */}
                    <div className="mb-4">
                        <p className="text-[10px] font-bold mb-2 px-1" style={{ color: "rgba(80,100,150,0.70)" }}>
                            Teglar
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {MOCK_TAGS.map(tag => {
                                const active = tags.includes(tag);
                                return (
                                    <button key={tag} onClick={() => toggleTag(tag)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-150"
                                        style={active ? {
                                            background: "rgba(43,62,232,0.25)",
                                            border: "1px solid rgba(43,62,232,0.50)",
                                            color: "#00CEC8",
                                        } : {
                                            background: "rgba(43,62,232,0.08)",
                                            border: "1px solid rgba(43,62,232,0.18)",
                                            color: "rgba(140,160,210,0.80)",
                                        }}>
                                        <Hash className="w-2.5 h-2.5" />
                                        {tag.slice(1)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.06)", border: "1px solid rgba(43,62,232,0.16)" }}>
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(43,62,232,0.60)" }} />
                            <input
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="Joylashuv qo'shish..."
                                className="flex-1 bg-transparent text-xs text-white placeholder:text-[rgba(80,100,150,0.60)] outline-none"
                            />
                        </div>
                    </div>

                    {/* Formatting toolbar */}
                    <div className="flex items-center gap-2 px-1">
                        {[
                            { icon: Bold,  label: "Qalin" },
                            { icon: Italic,label: "Kursiv" },
                            { icon: Link,  label: "Havola" },
                            { icon: Smile, label: "Tabassum" },
                            { icon: Music2,label: "Musiqa" },
                        ].map(({ icon: Icon, label }) => (
                            <button key={label} title={label}
                                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150"
                                style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)" }}>
                                <Icon className="w-3.5 h-3.5" style={{ color: "rgba(100,130,200,0.80)" }} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Publish button */}
                <div className="px-5 pb-5 pt-2 flex-shrink-0"
                    style={{ borderTop: "1px solid rgba(43,62,232,0.12)" }}>
                    {published ? (
                        <div className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2"
                            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.30)" }}>
                            <CheckCircle2 className="w-5 h-5" style={{ color: "#10B981" }} />
                            <span className="text-sm font-black" style={{ color: "#10B981" }}>Muvaffaqiyatli e'lon qilindi!</span>
                        </div>
                    ) : (
                        <button onClick={publish} disabled={!canPublish || publishing}
                            className="w-full py-3.5 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all duration-200"
                            style={canPublish && !publishing ? {
                                background: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
                                boxShadow: "0 8px 24px rgba(43,62,232,0.35)",
                            } : {
                                background: "rgba(43,62,232,0.15)",
                                opacity: 0.6,
                            }}>
                            {publishing
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> E'lon qilinmoqda...</>
                                : <><Send className="w-4 h-4" /> E'lon qilish</>
                            }
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
