"use client";

import { useState } from "react";
import { X, Heart, MessageSquare, Share2, Bookmark, MoreHorizontal, Users, Star, TrendingUp, Image, PenLine, Pin, Send, ChevronDown, BarChart2 } from "lucide-react";
import { useNxPlayer } from "./nx-player-ctx";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
interface CommunityPost {
    id: string;
    author: string;
    avatar: string;
    verified: boolean;
    timeAgo: string;
    type: "text" | "image" | "poll" | "milestone";
    text: string;
    image?: string;
    poll?: { question: string; options: { label: string; votes: number }[]; totalVotes: number };
    milestone?: { label: string; value: string };
    likes: number;
    comments: number;
    liked: boolean;
    saved: boolean;
    pinned?: boolean;
}

const MOCK_POSTS: CommunityPost[] = [
    {
        id: "cp1", author: "Dilnoza Yusupova", avatar: "https://picsum.photos/seed/cp1/80/80",
        verified: true, timeAgo: "2 soat oldin", type: "text", pinned: true,
        text: "Yangi albom ustida ish boshlandi! Juda hayajonliman. Bu safar butunlay boshqacha sound bo'ladi — an'anaviy o'zbek milliy cholg'ulari zamonaviy elektron musiqa bilan qo'shiladi. Kutib turing!",
        likes: 12400, comments: 843, liked: false, saved: false,
    },
    {
        id: "cp2", author: "IT Academy UZ", avatar: "https://picsum.photos/seed/cp2/80/80",
        verified: true, timeAgo: "5 soat oldin", type: "poll",
        text: "Qaysi texnologiyani o'rganishni istaysiz?",
        poll: {
            question: "Qaysi texnologiyani o'rganishni istaysiz?",
            options: [
                { label: "Python va AI/ML",        votes: 4821 },
                { label: "React / Next.js",        votes: 3142 },
                { label: "Mobil: Flutter / Swift", votes: 2318 },
                { label: "Backend: Go / Rust",     votes: 1509 },
            ],
            totalVotes: 11790,
        },
        likes: 3200, comments: 512, liked: false, saved: false,
    },
    {
        id: "cp3", author: "Jasur Umarov", avatar: "https://picsum.photos/seed/cp3/80/80",
        verified: false, timeAgo: "1 kun oldin", type: "image",
        text: "Yangi studiyamiz — bu yerda yaqinda ajoyib video suhbatlar bo'ladi! Kimlar bilan gaplashishimni istaysiz? Izohda yozing!",
        image: "https://picsum.photos/seed/cp3img/500/300",
        likes: 5670, comments: 1243, liked: true, saved: false,
    },
    {
        id: "cp4", author: "Nexus Kitchen", avatar: "https://picsum.photos/seed/cp4/80/80",
        verified: false, timeAgo: "2 kun oldin", type: "milestone",
        text: "100,000 ta obunachiga yetdik! Bu bir yillik mehnat va sevgining natijasi. Har biringizga katta rahmat!",
        milestone: { label: "Obunachi", value: "100,000" },
        likes: 8900, comments: 2100, liked: false, saved: true,
    },
    {
        id: "cp5", author: "Baraka Books", avatar: "https://picsum.photos/seed/cp5/80/80",
        verified: true, timeAgo: "3 kun oldin", type: "text",
        text: "Bu hafta tavsiya: 'Atomic Habits' kitobidagi eng muhim g'oya — odatlaringizni o'zgartirish uchun avval o'zingizni kim ekanligingizni o'zgartirish kerak. Siz o'zingizni qanday tasvirlaysiz?",
        likes: 2300, comments: 678, liked: false, saved: false,
    },
];

function fmtNum(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "K";
    return n.toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// NxCommunity
// ─────────────────────────────────────────────────────────────────────────────
export function NxCommunity() {
    const { communityOpen, setCommunityOpen, openShareSheet, setPollsOpen, openComments } = useNxPlayer();
    const [posts,       setPosts]       = useState(MOCK_POSTS);
    const [tab,         setTab]         = useState<"feed" | "popular">("feed");
    const [votedPolls,  setVotedPolls]  = useState<Record<string, number>>({});
    const [composerOpen, setComposerOpen] = useState(false);
    const [newText,      setNewText]      = useState("");
    const [menuPostId,   setMenuPostId]   = useState<string | null>(null);

    const toggleLike = (id: string) => {
        setPosts(prev => prev.map(p => p.id === id
            ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
            : p
        ));
    };
    const toggleSave = (id: string) => {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, saved: !p.saved } : p));
    };
    const votePoll = (postId: string, optIdx: number) => {
        if (votedPolls[postId] !== undefined) return;
        setVotedPolls(prev => ({ ...prev, [postId]: optIdx }));
        setPosts(prev => prev.map(p => {
            if (p.id !== postId || !p.poll) return p;
            const opts = p.poll.options.map((o, i) =>
                i === optIdx ? { ...o, votes: o.votes + 1 } : o
            );
            return { ...p, poll: { ...p.poll, options: opts, totalVotes: p.poll.totalVotes + 1 } };
        }));
    };

    const submitPost = () => {
        if (!newText.trim()) return;
        const newPost: CommunityPost = {
            id: `cp${Date.now()}`, author: "Siz", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=me",
            verified: false, timeAgo: "Hozir", type: "text",
            text: newText.trim(), likes: 0, comments: 0, liked: false, saved: false,
        };
        setPosts(prev => [newPost, ...prev]);
        setNewText("");
        setComposerOpen(false);
    };

    const displayed = tab === "popular"
        ? [...posts].sort((a, b) => b.likes - a.likes)
        : posts;

    if (!communityOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[55]"
                style={{ background: "rgba(5,8,24,0.80)", backdropFilter: "blur(8px)" }}
                onClick={() => setCommunityOpen(false)} />

            <div
                className="fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-3xl overflow-hidden md:inset-x-auto md:inset-y-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[500px] md:max-h-[90vh] md:rounded-3xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border: "1px solid rgba(43,62,232,0.22)",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.70)",
                    maxHeight: "92vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)" }}>
                            <Users className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-white">Jamiyat</h2>
                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.80)" }}>
                                Yaratuvchilar yangiliklari va so'rovnomalari
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setCommunityOpen(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-full"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-5 pb-3 flex gap-2 flex-shrink-0">
                    {(["feed", "popular"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200"
                            style={tab === t ? {
                                background: "linear-gradient(135deg,#2B3EE8,#8B5CF6)",
                                color: "white",
                            } : {
                                background: "rgba(43,62,232,0.10)",
                                border: "1px solid rgba(43,62,232,0.22)",
                                color: "rgba(140,160,210,0.85)",
                            }}>
                            {t === "feed" ? (
                                <span className="flex items-center gap-1"><PenLine className="w-3 h-3" /> So'nggi</span>
                            ) : (
                                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Mashhur</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Posts */}
                <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>
                    {/* Inline post composer */}
                    <div className="mb-4">
                        {!composerOpen ? (
                            <button
                                onClick={() => setComposerOpen(true)}
                                className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all duration-150 active:scale-[0.99]"
                                style={{ background: "rgba(43,62,232,0.07)", border: "1px dashed rgba(43,62,232,0.28)" }}>
                                <div className="w-7 h-7 rounded-xl overflow-hidden flex-shrink-0"
                                    style={{ border: "1.5px solid rgba(43,62,232,0.30)" }}>
                                    <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=me" alt="" className="w-full h-full object-cover bg-white" />
                                </div>
                                <span className="text-sm flex-1" style={{ color: "rgba(120,140,190,0.55)" }}>
                                    Jamiyat bilan ulashing...
                                </span>
                                <div className="flex items-center gap-2">
                                    <Image className="w-4 h-4" style={{ color: "rgba(43,62,232,0.40)" }} />
                                    <BarChart2 className="w-4 h-4" style={{ color: "rgba(43,62,232,0.40)" }} />
                                </div>
                            </button>
                        ) : (
                            <div className="p-4 rounded-2xl"
                                style={{ background: "rgba(11,18,40,0.70)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                <textarea
                                    autoFocus rows={3} value={newText}
                                    onChange={e => setNewText(e.target.value)}
                                    placeholder="Nima haqida o'ylayapsiz?"
                                    className="w-full bg-transparent text-sm text-white outline-none resize-none"
                                    style={{ caretColor: "#00CEC8" }}
                                />
                                <div className="flex items-center gap-2 mt-3 pt-3"
                                    style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                                    <button
                                        onClick={() => setNewText(t => t + " 🖼️")}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150 active:scale-95"
                                        style={{ background: "rgba(43,62,232,0.10)", color: "rgba(140,160,210,0.70)" }}>
                                        <Image className="w-3.5 h-3.5" /> Rasm
                                    </button>
                                    <button
                                        onClick={() => { setComposerOpen(false); setNewText(""); setCommunityOpen(false); setPollsOpen(true); }}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150 active:scale-95"
                                        style={{ background: "rgba(43,62,232,0.10)", color: "rgba(140,160,210,0.70)" }}>
                                        <BarChart2 className="w-3.5 h-3.5" /> So'rovnoma
                                    </button>
                                    <div className="flex-1" />
                                    <button onClick={() => { setComposerOpen(false); setNewText(""); }}
                                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
                                        style={{ color: "rgba(100,120,170,0.70)" }}>
                                        Bekor
                                    </button>
                                    <button
                                        onClick={submitPost}
                                        disabled={!newText.trim()}
                                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-black text-white transition-all duration-150"
                                        style={newText.trim()
                                            ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }
                                            : { background: "rgba(43,62,232,0.15)", color: "rgba(140,160,210,0.40)" }
                                        }>
                                        <Send className="w-3.5 h-3.5" /> Ulashish
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        {displayed.map(post => (
                            <div key={post.id}
                                className="p-4 rounded-2xl"
                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.14)" }}>

                                {/* Pinned badge */}
                                {post.pinned && (
                                    <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg w-fit"
                                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                        <Pin className="w-3 h-3" style={{ color: "rgba(43,62,232,0.70)" }} />
                                        <span className="text-[9px] font-bold" style={{ color: "rgba(43,62,232,0.70)" }}>
                                            Mahkamlangan post
                                        </span>
                                    </div>
                                )}
                                {/* Author row */}
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={post.avatar} alt={post.author}
                                        className="w-9 h-9 rounded-xl object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-bold text-white truncate">{post.author}</span>
                                            {post.verified && (
                                                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                                                    style={{ background: "#2B3EE8" }}>
                                                    <Star className="w-2 h-2 text-white fill-white" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px]" style={{ color: "rgba(80,100,150,0.70)" }}>
                                            {post.timeAgo}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setMenuPostId(menuPostId === post.id ? null : post.id)}
                                        className="w-7 h-7 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90 relative"
                                        style={{ background: menuPostId === post.id ? "rgba(43,62,232,0.20)" : "rgba(43,62,232,0.10)" }}>
                                        <MoreHorizontal className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.60)" }} />
                                    </button>
                                </div>

                                {/* Milestone badge */}
                                {post.type === "milestone" && post.milestone && (
                                    <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl"
                                        style={{ background: "linear-gradient(135deg,rgba(43,62,232,0.20),rgba(139,92,246,0.20))", border: "1px solid rgba(43,62,232,0.30)" }}>
                                        <div className="text-2xl font-black" style={{ color: "#2B3EE8" }}>
                                            {post.milestone.value}
                                        </div>
                                        <div className="text-xs font-bold" style={{ color: "rgba(140,160,210,0.85)" }}>
                                            {post.milestone.label}
                                        </div>
                                    </div>
                                )}

                                {/* Text */}
                                <p className="text-sm leading-relaxed mb-3" style={{ color: "rgba(200,215,240,0.90)" }}>
                                    {post.text}
                                </p>

                                {/* Image */}
                                {post.image && (
                                    <div className="mb-3 rounded-xl overflow-hidden">
                                        <img src={post.image} alt="" className="w-full object-cover" style={{ maxHeight: 220 }} />
                                    </div>
                                )}

                                {/* Poll */}
                                {post.poll && (() => {
                                    const voted = votedPolls[post.id];
                                    const total = post.poll.totalVotes;
                                    return (
                                        <div className="mb-3 flex flex-col gap-2">
                                            {post.poll.options.map((opt, i) => {
                                                const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                                                const isVoted = voted === i;
                                                const hasVoted = voted !== undefined;
                                                return (
                                                    <button key={i}
                                                        onClick={() => votePoll(post.id, i)}
                                                        disabled={hasVoted}
                                                        className="w-full text-left px-3 py-2.5 rounded-xl relative overflow-hidden transition-all duration-200"
                                                        style={{
                                                            border: `1px solid ${isVoted ? "rgba(43,62,232,0.60)" : "rgba(43,62,232,0.22)"}`,
                                                            background: "rgba(11,18,40,0.50)",
                                                        }}>
                                                        {hasVoted && (
                                                            <div className="absolute inset-0 rounded-xl"
                                                                style={{
                                                                    width: `${pct}%`,
                                                                    background: isVoted
                                                                        ? "rgba(43,62,232,0.25)"
                                                                        : "rgba(43,62,232,0.08)",
                                                                    transition: "width 0.5s ease",
                                                                }} />
                                                        )}
                                                        <div className="relative flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-white">{opt.label}</span>
                                                            {hasVoted && (
                                                                <span className="text-xs font-black" style={{ color: isVoted ? "#2B3EE8" : "rgba(140,160,210,0.60)" }}>
                                                                    {pct}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                            <p className="text-[9px]" style={{ color: "rgba(80,100,150,0.60)" }}>
                                                {fmtNum(total)} ta ovoz
                                            </p>
                                        </div>
                                    );
                                })()}

                                {/* Actions */}
                                <div className="flex items-center gap-4 pt-1"
                                    style={{ borderTop: "1px solid rgba(43,62,232,0.10)" }}>
                                    <button onClick={() => toggleLike(post.id)}
                                        className="flex items-center gap-1.5 text-xs font-bold transition-all duration-200">
                                        <Heart className={`w-4 h-4 transition-colors duration-200 ${post.liked ? "fill-red-500" : ""}`}
                                            style={{ color: post.liked ? "#EF4444" : "rgba(140,160,210,0.60)" }} />
                                        <span style={{ color: post.liked ? "#EF4444" : "rgba(140,160,210,0.70)" }}>
                                            {fmtNum(post.likes)}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => openComments(post.text.slice(0, 50))}
                                        className="flex items-center gap-1.5 text-xs font-bold transition-all duration-150 active:scale-95">
                                        <MessageSquare className="w-4 h-4" style={{ color: "rgba(140,160,210,0.60)" }} />
                                        <span style={{ color: "rgba(140,160,210,0.70)" }}>{fmtNum(post.comments)}</span>
                                    </button>
                                    <button onClick={() => toggleSave(post.id)} className="flex items-center gap-1.5 text-xs">
                                        <Bookmark className={`w-4 h-4 transition-colors duration-200 ${post.saved ? "fill-blue-500" : ""}`}
                                            style={{ color: post.saved ? "#2B3EE8" : "rgba(140,160,210,0.60)" }} />
                                    </button>
                                    <button
                                        onClick={() => openShareSheet(post.text.slice(0, 60))}
                                        className="flex items-center gap-1.5 text-xs ml-auto">
                                        <Share2 className="w-4 h-4" style={{ color: "rgba(140,160,210,0.60)" }} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
