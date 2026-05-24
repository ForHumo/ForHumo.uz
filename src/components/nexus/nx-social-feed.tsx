"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
    BadgeCheck, Image as ImgIcon, Video, Music2, Smile,
    TrendingUp, Hash, Flame,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock postlar
// ─────────────────────────────────────────────────────────────────────────────
interface Post {
    id: number; user: string; handle: string; time: string; verified: boolean;
    text: string; image?: string; video?: boolean;
    likes: number; comments: number; shares: number;
    liked: boolean; saved: boolean;
    hashtags: string[];
}

const POSTS: Post[] = [
    {
        id: 1, user: "Humo Official", handle: "@humo", time: "2 daqiqa", verified: true,
        text: "Humo Nexus — O'zbekistonning birinchi super-app platformasi rasman ishga tushdi! Musiqa, video, kino, kitob, ijtimoiy tarmoq — hammasi bir joyda.",
        image: "https://picsum.photos/seed/post1/800/450",
        likes: 4821, comments: 312, shares: 892, liked: false, saved: false,
        hashtags: ["HumoNexus", "SuperApp", "OzbekTech"],
    },
    {
        id: 2, user: "Sardor K.", handle: "@sardor_dev", time: "15 daqiqa", verified: false,
        text: "React 19 bilan yangi loyiha boshladim. Hech qachon bu qadar tez bo'lmagan edi. Nexus'dagi o'quv materiallari juda foydali bo'lyapti!",
        likes: 287, comments: 44, shares: 31, liked: true, saved: false,
        hashtags: ["React19", "WebDev", "OzbekDev"],
    },
    {
        id: 3, user: "Madina Ergash", handle: "@madina_music", time: "1 soat", verified: true,
        text: "Yangi qo'shig'im — 'Bahor Ohangi' bugun chiqdi! Sizlar uchun maxsus tayyorladim. Tinglang va fikrlaringizni yozing.",
        image: "https://picsum.photos/seed/post3/800/800",
        likes: 12450, comments: 891, shares: 2341, liked: false, saved: true,
        hashtags: ["BahorOhangi", "MadinaErgash", "OzbekMusic"],
    },
    {
        id: 4, user: "Tech UZ", handle: "@tech_uz", time: "2 soat", verified: true,
        text: "2026 yilda O'zbekistonda texnologiya sektori 340% o'sdi. Eng ko'p o'sgan soha — AI va mobil ilovalar. Sizningcha keyingi 5 yilda qanday bo'ladi?",
        likes: 1832, comments: 276, shares: 445, liked: false, saved: false,
        hashtags: ["TechUZ", "AI", "StartupUZ"],
    },
    {
        id: 5, user: "Kamola F.", handle: "@kamola_art", time: "3 soat", verified: false,
        text: "Bugungi rasm — digital art bilan yangi tajriba. Figma dan Nexus'ga to'g'ridan-to'g'ri yuklash imkoniyati juda qulay!",
        image: "https://picsum.photos/seed/post5/800/1000",
        likes: 924, comments: 87, shares: 112, liked: false, saved: false,
        hashtags: ["DigitalArt", "FigmaDesign", "OzbekArt"],
    },
    {
        id: 6, user: "Startup UZ", handle: "@startupuz", time: "5 soat", verified: true,
        text: "Yangi akselerator dashurimiz ochildi! 10 ta startup uchun $50,000 grant va mentorlik. Ariza topshirish muddati — 15 iyun.",
        likes: 3201, comments: 544, shares: 1200, liked: false, saved: true,
        hashtags: ["StartupUZ", "Akselerator", "Grant"],
    },
];

const TRENDING_TAGS = [
    { tag: "HumoNexus", posts: "24.5K" },
    { tag: "OzbekTech", posts: "18.2K" },
    { tag: "MadinaErgash", posts: "12.1K" },
    { tag: "BahorOhangi", posts: "9.8K" },
    { tag: "React19", posts: "7.3K" },
    { tag: "StartupUZ", posts: "5.9K" },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxSocialFeed
// ─────────────────────────────────────────────────────────────────────────────
export function NxSocialFeed() {
    const { openComments, openChannel } = useNxPlayer();
    const [posts, setPosts] = useState<Post[]>(POSTS);
    const [postText, setPostText] = useState("");
    const [postSending, setPostSending] = useState(false);
    const [tab, setTab] = useState<"following" | "explore">("following");

    const toggleLike = (id: number) => {
        setPosts(prev => prev.map(p => p.id === id
            ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }
            : p
        ));
    };
    const toggleSave = (id: number) => {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, saved: !p.saved } : p));
    };

    const submitPost = () => {
        if (!postText.trim()) return;
        setPostSending(true);
        setTimeout(() => {
            const newPost: Post = {
                id: Date.now(), user: "Siz", handle: "@me", time: "Hozir", verified: false,
                text: postText.trim(),
                likes: 0, comments: 0, shares: 0, liked: false, saved: false,
                hashtags: [],
            };
            setPosts(prev => [newPost, ...prev]);
            setPostText("");
            setPostSending(false);
        }, 800);
    };

    return (
        <div className="max-w-2xl mx-auto">
            {/* ── Tab ── */}
            <div className="flex gap-0 mx-4 mt-4 mb-3 rounded-2xl overflow-hidden"
                style={{ background: "rgba(8,14,32,0.70)", border: "1px solid rgba(43,62,232,0.18)" }}>
                {(["following", "explore"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className="flex-1 py-2.5 text-xs font-black transition-all duration-200"
                        style={tab === t ? {
                            background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "#fff",
                        } : { color: "rgba(140,160,210,0.75)" }}
                    >
                        {t === "following" ? "Obunalar" : "Kashfiyot"}
                    </button>
                ))}
            </div>

            {/* ── Post yaratish ── */}
            <div className="mx-4 mb-4 p-4 rounded-2xl"
                style={{ background: "rgba(8,14,32,0.70)", border: "1px solid rgba(43,62,232,0.18)" }}>
                <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=me" alt="" className="w-full h-full object-cover" />
                    </div>
                    <textarea
                        value={postText}
                        onChange={e => setPostText(e.target.value)}
                        placeholder="Nima haqida o'ylayapsiz?"
                        rows={2}
                        className="flex-1 bg-transparent text-sm text-white outline-none resize-none leading-relaxed"
                        style={{ caretColor: "#00CEC8" }}
                    />
                </div>
                {postText && (
                    <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {[ImgIcon, Video, Music2, Smile].map((Icon, i) => (
                                <button key={i} className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150"
                                    style={{ background: "rgba(43,62,232,0.08)" }}>
                                    <Icon className="w-3.5 h-3.5" style={{ color: "rgba(140,160,210,0.60)" }} />
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={submitPost}
                            disabled={postSending}
                            className="px-4 py-1.5 rounded-xl text-xs font-black text-white transition-all duration-150 active:scale-95"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", opacity: postSending ? 0.7 : 1 }}
                        >
                            {postSending ? "Yuborilmoqda..." : "Ulashish"}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Trending tags (explore) ── */}
            {tab === "explore" && (
                <div className="mx-4 mb-4 p-4 rounded-2xl"
                    style={{ background: "rgba(8,14,32,0.70)", border: "1px solid rgba(43,62,232,0.18)" }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Flame className="w-4 h-4" style={{ color: "#F97316" }} />
                        <h4 className="text-xs font-black uppercase tracking-widest" style={{ color: "rgba(43,62,232,0.70)" }}>
                            Trendda
                        </h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {TRENDING_TAGS.map(t => (
                            <button key={t.tag}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95"
                                style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)", color: "rgba(140,160,210,0.90)" }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.20)"; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(43,62,232,0.10)"; }}
                            >
                                <Hash className="w-3 h-3" style={{ color: "#2B3EE8" }} />
                                {t.tag}
                                <span className="text-[9px]" style={{ color: "rgba(80,100,150,0.70)" }}>{t.posts}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Postlar ── */}
            <div className="flex flex-col gap-3 px-4 pb-4">
                {posts.map(p => (
                    <PostCard key={p.id} post={p}
                        onLike={() => toggleLike(p.id)}
                        onSave={() => toggleSave(p.id)}
                        onComment={() => openComments(p.text.slice(0, 40) + "...")}
                        onAuthor={() => openChannel(p.handle)}
                    />
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PostCard
// ─────────────────────────────────────────────────────────────────────────────
function PostCard({ post: p, onLike, onSave, onComment, onAuthor }: {
    post: Post;
    onLike: () => void; onSave: () => void;
    onComment: () => void; onAuthor: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(8,14,32,0.70)", border: "1px solid rgba(43,62,232,0.18)" }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <button onClick={onAuthor} className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-2xl overflow-hidden"
                        style={{ border: "2px solid rgba(43,62,232,0.30)" }}>
                        <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${p.user}`}
                            alt={p.user} className="w-full h-full object-cover bg-white" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", border: "2px solid rgba(8,14,32,1)" }} />
                </button>
                <div className="flex-1 min-w-0">
                    <button onClick={onAuthor} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                        <span className="text-sm font-bold text-white">{p.user}</span>
                        {p.verified && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#00CEC8" }} />}
                    </button>
                    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "rgba(80,100,150,0.75)" }}>
                        <span>{p.handle}</span>
                        <span>·</span>
                        <span>{p.time}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="px-3 py-1 rounded-xl text-[10px] font-black transition-all duration-150 active:scale-95"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)", color: "#2B3EE8" }}
                    >
                        Kuzatish
                    </button>
                    <button onClick={() => setMenuOpen(!menuOpen)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg"
                        style={{ background: menuOpen ? "rgba(43,62,232,0.12)" : "transparent" }}>
                        <MoreHorizontal className="w-4 h-4" style={{ color: "rgba(80,100,150,0.70)" }} />
                    </button>
                </div>
            </div>

            {/* Matn */}
            <div className="px-4 pb-3">
                <p className="text-sm leading-relaxed" style={{ color: "rgba(200,215,245,0.90)" }}>
                    {p.text}
                </p>
                {p.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {p.hashtags.map(h => (
                            <span key={h} className="text-xs font-bold" style={{ color: "#2B3EE8" }}>
                                #{h}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Rasm */}
            {p.image && (
                <div className="relative mx-4 mb-3 rounded-xl overflow-hidden aspect-video">
                    {!imgLoaded && (
                        <div className="absolute inset-0 animate-pulse" style={{ background: "rgba(43,62,232,0.10)" }} />
                    )}
                    <img src={p.image} alt="" className="w-full h-full object-cover"
                        onLoad={() => setImgLoaded(true)} style={{ opacity: imgLoaded ? 1 : 0, transition: "opacity 0.3s" }} />
                </div>
            )}

            {/* Harakatlar */}
            <div className="flex items-center gap-1 px-4 pb-4 pt-1"
                style={{ borderTop: "1px solid rgba(43,62,232,0.08)" }}>
                {/* Like */}
                <button onClick={onLike}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95"
                    style={{ color: p.liked ? "#EF4444" : "rgba(80,100,150,0.80)" }}>
                    <Heart className={`w-4 h-4 transition-transform ${p.liked ? "scale-125 fill-current" : ""}`} />
                    {formatCount(p.likes)}
                </button>
                {/* Comment */}
                <button onClick={onComment}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95"
                    style={{ color: "rgba(80,100,150,0.80)" }}>
                    <MessageCircle className="w-4 h-4" />
                    {formatCount(p.comments)}
                </button>
                {/* Share */}
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95"
                    style={{ color: "rgba(80,100,150,0.80)" }}>
                    <Share2 className="w-4 h-4" />
                    {formatCount(p.shares)}
                </button>
                <div className="flex-1" />
                {/* Save */}
                <button onClick={onSave}
                    className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95"
                    style={{ color: p.saved ? "#00CEC8" : "rgba(80,100,150,0.80)" }}>
                    <Bookmark className={`w-4 h-4 ${p.saved ? "fill-current" : ""}`} />
                </button>
            </div>
        </div>
    );
}

function formatCount(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}
