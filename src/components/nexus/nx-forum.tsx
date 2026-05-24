"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, ChevronLeft, ChevronUp, ChevronDown, MessageSquare,
    Plus, Pin, TrendingUp, Clock, Flame,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type SortMode = "hot" | "new" | "top";

interface Reply {
    id: string;
    author: string;
    avatar: string;
    body: string;
    upvotes: number;
    time: string;
}

interface Thread {
    id: string;
    topic: string;
    title: string;
    body: string;
    author: string;
    avatar: string;
    upvotes: number;
    replies: Reply[];
    pinned: boolean;
    time: string;
    flair?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock ma'lumotlar
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_THREADS: Thread[] = [
    {
        id: "th1", topic: "Musiqa", pinned: true,
        title: "Humo Nexus'da musiqa yuklash qanday ishlaydi? (To'liq qo'llanma)",
        body: "Ko'pchilik so'ragan savol. Creator Studio'ga kirib 'Yuklash' tugmasini bosasiz. MP3, FLAC, WAV qo'llab-quvvatlanadi. Kamida 128 kbps bo'lishi shart.",
        author: "Humo Team", avatar: "HT", upvotes: 892, time: "2 soat",
        flair: "Rasmiy",
        replies: [
            { id: "r1", author: "Shahlo M", avatar: "SM", body: "Rahmat! FLAC yukladim, ajoyib chiqdi.", upvotes: 45, time: "1 soat" },
            { id: "r2", author: "Jasur B",  avatar: "JB", body: "Cover rasm hajmi qancha bo'lishi kerak?", upvotes: 12, time: "45 daqiqa" },
        ],
    },
    {
        id: "th2", topic: "Video", pinned: false,
        title: "4K video yuklashda muammo — kimda ham shunday?",
        body: "4K MP4 yuklayapman, 2 soatdan ortiq bo'lyapti. Tarmoq tezligi 100 Mbps. Boshqalarda ham shundaymi?",
        author: "Doniyor K", avatar: "DK", upvotes: 234, time: "5 soat",
        flair: "Savol",
        replies: [
            { id: "r3", author: "Tech UZ",  avatar: "TU", body: "4K uchun kompressiya vaqt oladi, normal.", upvotes: 67, time: "4 soat" },
            { id: "r4", author: "Kamol A",  avatar: "KA", body: "Handbrake bilan oldin kompress qiling.", upvotes: 89, time: "3 soat" },
            { id: "r5", author: "Doniyor K",avatar: "DK", body: "Raxmat, Handbrake yordamlashdi!", upvotes: 23, time: "2 soat" },
        ],
    },
    {
        id: "th3", topic: "Jamiyat", pinned: false,
        title: "O'zbek kontenti uchun maxsus bo'lim kerak",
        body: "Platformada o'zbek tili va madaniyatiga bag'ishlangan alohida kategoriya bo'lsa ajoyib bo'lardi. Kim qo'shimcha fikr bera oladi?",
        author: "Malika R", avatar: "MR", upvotes: 567, time: "1 kun",
        flair: "Taklif",
        replies: [
            { id: "r6", author: "Botir S",  avatar: "BS", body: "100% roziman. Milliy bayramlar bo'limiga ham kerak.", upvotes: 134, time: "23 soat" },
            { id: "r7", author: "Nafisa T", avatar: "NT", body: "Va o'zbek milliy musiqasi uchun ham!", upvotes: 98,  time: "20 soat" },
        ],
    },
    {
        id: "th4", topic: "Creator", pinned: false,
        title: "Jonli efirda reklama daromadi qanday hisoblanadi?",
        body: "Kecha 3 soatlik jonli efir o'tkazdim. Daromad hisobiga hech narsa tushmadi. Creator Studio'da nima qarash kerak?",
        author: "Sherzod A", avatar: "SA", upvotes: 189, time: "12 soat",
        flair: "Savol",
        replies: [
            { id: "r8", author: "Pro User",  avatar: "PU", body: "Analytics > Live > Ad Revenue bo'limiga qarang.", upvotes: 56, time: "11 soat" },
        ],
    },
    {
        id: "th5", topic: "Musiqa", pinned: false,
        title: "Spotify'dan Humo Nexus'ga o'tish tajribam — 2 oylik hisobot",
        body: "2 oy davomida Nexus'da musiqa tinglash tajribam: interfeys 9/10, sifat 10/10, katalog 7/10 (ba'zi qo'shiqlar hali yo'q). Umuman olganda, Spotify'dan yaxshiroq topmoqdaman.",
        author: "Azizbek N", avatar: "AN", upvotes: 1234, time: "2 kun",
        flair: "Taassurot",
        replies: [
            { id: "r9",  author: "Dilorom J", avatar: "DJ", body: "Sifat haqiqatan ham ajoyib. FLAC catalogi kengaymoqda.", upvotes: 234, time: "1 kun" },
            { id: "r10", author: "Rustam Y",  avatar: "RY", body: "Katalog bo'yicha to'g'ri aytdingiz, lekin har hafta yangilanmoqda.", upvotes: 167, time: "22 soat" },
        ],
    },
];

const TOPICS = ["Barchasi", "Musiqa", "Video", "Creator", "Jamiyat", "Texnika", "Taklif"];

const SORT_ICONS = { hot: Flame, new: Clock, top: TrendingUp } as const;

// ─────────────────────────────────────────────────────────────────────────────
// NxForum
// ─────────────────────────────────────────────────────────────────────────────
export function NxForum() {
    const { forumOpen, setForumOpen } = useNxPlayer();

    const [topic,   setTopic]   = useState("Barchasi");
    const [sort,    setSort]    = useState<SortMode>("hot");
    const [thread,  setThread]  = useState<Thread | null>(null);
    const [votes,   setVotes]   = useState<Record<string, 1 | -1 | 0>>({});
    const [replyTxt, setReplyTxt] = useState("");
    const [newPostOpen, setNewPostOpen] = useState(false);

    if (!forumOpen) return null;

    // ── Thread detail ──────────────────────────────────────────────────────
    if (thread) {
        const myVote = votes[thread.id] ?? 0;
        const displayVotes = thread.upvotes + myVote;

        const handleVote = (dir: 1 | -1) => {
            setVotes(prev => {
                const cur = prev[thread.id] ?? 0;
                return { ...prev, [thread.id]: cur === dir ? 0 : dir };
            });
        };

        return (
            <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
                {/* Header */}
                <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                    <button onClick={() => setThread(null)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{thread.topic}</p>
                        <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                            {thread.replies.length} javob
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: "none" }}>
                    {/* Thread body */}
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                {thread.avatar}
                            </div>
                            <span className="text-[11px] font-bold text-white">{thread.author}</span>
                            <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>{thread.time} oldin</span>
                            {thread.flair && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(43,62,232,0.25)", color: "rgba(150,170,255,0.90)" }}>
                                    {thread.flair}
                                </span>
                            )}
                        </div>
                        <h2 className="text-sm font-black text-white mb-2">{thread.title}</h2>
                        <p className="text-[12px] leading-relaxed mb-4" style={{ color: "rgba(160,176,224,0.80)" }}>
                            {thread.body}
                        </p>

                        {/* Vote row */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 rounded-full px-2 py-1"
                                style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.20)" }}>
                                <button onClick={() => handleVote(1)}>
                                    <ChevronUp className="w-4 h-4" style={{ color: myVote === 1 ? "#00CEC8" : "rgba(140,160,210,0.50)" }} />
                                </button>
                                <span className="text-xs font-black text-white px-1">{displayVotes}</span>
                                <button onClick={() => handleVote(-1)}>
                                    <ChevronDown className="w-4 h-4" style={{ color: myVote === -1 ? "#EF4444" : "rgba(140,160,210,0.50)" }} />
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5" style={{ color: "rgba(100,120,170,0.60)" }} />
                                <span className="text-[11px]" style={{ color: "rgba(100,120,170,0.60)" }}>
                                    {thread.replies.length} javob
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px mb-5" style={{ background: "rgba(43,62,232,0.15)" }} />

                    {/* Replies */}
                    <div className="flex flex-col gap-4 mb-6">
                        {thread.replies.map(r => (
                            <div key={r.id} className="flex gap-3">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    {r.avatar}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[11px] font-bold text-white">{r.author}</span>
                                        <span className="text-[9px]" style={{ color: "rgba(100,120,170,0.50)" }}>{r.time} oldin</span>
                                    </div>
                                    <p className="text-[12px] leading-relaxed mb-2" style={{ color: "rgba(160,176,224,0.80)" }}>
                                        {r.body}
                                    </p>
                                    <div className="flex items-center gap-1 w-fit rounded-full px-1.5 py-0.5"
                                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                                        <ChevronUp className="w-3 h-3" style={{ color: "rgba(140,160,210,0.50)" }} />
                                        <span className="text-[10px] font-bold text-white">{r.upvotes}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reply input */}
                <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.15)" }}>
                    <div className="flex gap-2">
                        <input
                            value={replyTxt}
                            onChange={e => setReplyTxt(e.target.value)}
                            placeholder="Javob yozing..."
                            className="flex-1 bg-transparent text-sm text-white placeholder-blue-900 outline-none px-3 py-2.5 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)" }}
                        />
                        <button
                            disabled={!replyTxt.trim()}
                            onClick={() => setReplyTxt("")}
                            className="px-4 py-2.5 rounded-xl text-sm font-black transition-all duration-200"
                            style={{
                                background: replyTxt.trim() ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.15)",
                                color: replyTxt.trim() ? "white" : "rgba(100,120,170,0.50)",
                            }}
                        >
                            Jo'nat
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Thread list ────────────────────────────────────────────────────────
    let visible = topic === "Barchasi"
        ? [...MOCK_THREADS]
        : MOCK_THREADS.filter(t => t.topic === topic);

    if (sort === "hot")  visible.sort((a, b) => (b.upvotes + b.replies.length * 10) - (a.upvotes + a.replies.length * 10));
    if (sort === "new")  visible.sort((a, b) => a.time.localeCompare(b.time));
    if (sort === "top")  visible.sort((a, b) => b.upvotes - a.upvotes);

    // Pinned always first
    visible.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    return (
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={() => setForumOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Forum</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>Muhokama va savollar</p>
                </div>
                <button
                    onClick={() => setNewPostOpen(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}
                >
                    <Plus className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Topic filter */}
            <div className="flex gap-2 px-4 py-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
                {TOPICS.map(t => (
                    <button key={t} onClick={() => setTopic(t)}
                        className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all duration-200"
                        style={{
                            background: topic === t ? "rgba(43,62,232,0.35)" : "rgba(43,62,232,0.08)",
                            border: `1px solid ${topic === t ? "rgba(43,62,232,0.60)" : "rgba(43,62,232,0.15)"}`,
                            color: topic === t ? "white" : "rgba(140,160,210,0.70)",
                        }}>
                        {t}
                    </button>
                ))}
            </div>

            {/* Sort tabs */}
            <div className="flex gap-3 px-4 pb-3 flex-shrink-0">
                {(["hot", "new", "top"] as SortMode[]).map(s => {
                    const Icon = SORT_ICONS[s];
                    const labels = { hot: "Mashhur", new: "Yangi", top: "Top" };
                    return (
                        <button key={s} onClick={() => setSort(s)}
                            className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all"
                            style={{
                                background: sort === s ? "rgba(43,62,232,0.20)" : "transparent",
                                color: sort === s ? "white" : "rgba(100,120,170,0.60)",
                            }}>
                            <Icon className="w-3 h-3" />
                            {labels[s]}
                        </button>
                    );
                })}
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
                {visible.map(t => {
                    const myVote = votes[t.id] ?? 0;
                    return (
                        <button key={t.id} onClick={() => { setThread(t); setReplyTxt(""); }}
                            className="w-full text-left p-4 rounded-2xl transition-all duration-200 active:scale-[0.98]"
                            style={{
                                background: "rgba(8,12,32,0.95)",
                                border: `1px solid ${t.pinned ? "rgba(43,62,232,0.40)" : "rgba(43,62,232,0.15)"}`,
                            }}>
                            {/* Meta row */}
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    {t.avatar}
                                </div>
                                <span className="text-[10px] font-bold text-white">{t.author}</span>
                                <span className="text-[9px]" style={{ color: "rgba(100,120,170,0.50)" }}>{t.time} oldin</span>
                                {t.pinned && <Pin className="w-3 h-3 ml-auto" style={{ color: "#00CEC8" }} />}
                                {t.flair && !t.pinned && (
                                    <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                        style={{ background: "rgba(43,62,232,0.20)", color: "rgba(150,170,255,0.80)" }}>
                                        {t.flair}
                                    </span>
                                )}
                            </div>

                            <p className="text-[12px] font-bold text-white leading-snug mb-2 line-clamp-2">{t.title}</p>
                            <p className="text-[11px] leading-relaxed mb-3 line-clamp-2" style={{ color: "rgba(140,160,210,0.65)" }}>
                                {t.body}
                            </p>

                            {/* Stats */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <ChevronUp className="w-3.5 h-3.5" style={{ color: myVote === 1 ? "#00CEC8" : "rgba(100,120,170,0.50)" }} />
                                    <span className="text-[11px] font-bold text-white">{t.upvotes + myVote}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" style={{ color: "rgba(100,120,170,0.50)" }} />
                                    <span className="text-[11px]" style={{ color: "rgba(100,120,170,0.60)" }}>{t.replies.length}</span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto"
                                    style={{ background: "rgba(43,62,232,0.12)", color: "rgba(120,140,200,0.70)" }}>
                                    {t.topic}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* New post modal */}
            {newPostOpen && (
                <div className="absolute inset-0 z-10 flex flex-col" style={{ background: "#050818" }}>
                    <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                        style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                        <button onClick={() => setNewPostOpen(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <X className="w-5 h-5 text-white" />
                        </button>
                        <p className="flex-1 text-sm font-black text-white">Yangi mavzu</p>
                        <button
                            onClick={() => setNewPostOpen(false)}
                            className="px-4 py-1.5 rounded-xl text-xs font-black text-white"
                            style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                            Joylashtirish
                        </button>
                    </div>
                    <div className="flex-1 px-4 py-4 flex flex-col gap-4">
                        <input
                            placeholder="Mavzu sarlavhasi..."
                            className="w-full bg-transparent text-sm font-bold text-white placeholder-blue-900 outline-none px-3 py-3 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)" }}
                        />
                        <textarea
                            placeholder="Mavzu mazmuni..."
                            rows={8}
                            className="w-full bg-transparent text-sm text-white placeholder-blue-900 outline-none px-3 py-3 rounded-xl resize-none"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.20)" }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
