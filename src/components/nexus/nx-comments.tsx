"use client";

import { useState, useRef, useEffect } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, Heart, MessageCircle, Send, ChevronDown,
    ThumbsUp, MoreHorizontal, Reply, Flag,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Mock izohlar
// ─────────────────────────────────────────────────────────────────────────────
interface Comment {
    id: number; user: string; text: string; time: string;
    likes: number; liked: boolean;
    replies?: Comment[];
    showReplies?: boolean;
}

const MOCK_COMMENTS: Comment[] = [
    {
        id: 1, user: "Sardor", text: "Zo'r video! Davom eting, hammasi tushunarli tushuntirilgan.", time: "2 soat", likes: 148, liked: false,
        replies: [
            { id: 11, user: "Madina",  text: "To'liq rozi! Men ham ko'p narsa o'rgandim.", time: "1 soat", likes: 23, liked: false },
            { id: 12, user: "Kamola",  text: "Rahmat sizga ham!",                           time: "45 daqiqa", likes: 8, liked: false },
        ],
    },
    {
        id: 2, user: "Dilnoza", text: "Bu platformani ko'p odamlarga tavsiya qilaman, juda qulay!", time: "4 soat", likes: 94, liked: true,
        replies: [
            { id: 21, user: "Islom", text: "Ha, men ham tavsiya qilaman!", time: "3 soat", likes: 17, liked: false },
        ],
    },
    { id: 3, user: "Bobur",   text: "Qachon yangi qism chiqadi? Sabrsizlik bilan kutmoqdaman!", time: "6 soat",  likes: 62,  liked: false },
    { id: 4, user: "Zulfiya", text: "Eng yaxshi kontentlar shu yerda. Sifat juda yuqori!", time: "8 soat",  likes: 201, liked: false },
    { id: 5, user: "Jasur",   text: "5/5 baho beraman. Rahmat muallif!",                    time: "10 soat", likes: 38,  liked: false },
    { id: 6, user: "Anvar",   text: "Bu mavzu bo'yicha boshqa resurslar bormi?",             time: "12 soat", likes: 15,  liked: false },
    { id: 7, user: "Gulnora", text: "Nihoyat o'zbek tilida sifatli kontent!",               time: "1 kun",   likes: 276, liked: false },
    { id: 8, user: "Sherzod", text: "Keyingi videoda boshqa mavzularni ham ko'rsating.",    time: "1 kun",   likes: 45,  liked: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxComments
// ─────────────────────────────────────────────────────────────────────────────
export function NxComments() {
    const { commentsOpen, commentsFor, closeComments } = useNxPlayer();
    const [comments, setComments] = useState<Comment[]>(MOCK_COMMENTS);
    const [input, setInput]       = useState("");
    const [replyTo, setReplyTo]   = useState<number | null>(null);
    const [sort, setSort]         = useState<"top" | "new">("top");
    const endRef = useRef<HTMLDivElement>(null);

    const totalCount = comments.reduce((s, c) => s + 1 + (c.replies?.length ?? 0), 0);

    const addComment = () => {
        if (!input.trim()) return;
        if (replyTo !== null) {
            setComments(prev => prev.map(c => c.id === replyTo ? {
                ...c,
                replies: [...(c.replies ?? []), {
                    id: Date.now(), user: "Siz", text: input.trim(),
                    time: "Hozir", likes: 0, liked: false,
                }],
            } : c));
            setReplyTo(null);
        } else {
            setComments(prev => [{
                id: Date.now(), user: "Siz", text: input.trim(),
                time: "Hozir", likes: 0, liked: false,
            }, ...prev]);
        }
        setInput("");
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const toggleLike = (id: number, parentId?: number) => {
        setComments(prev => prev.map(c => {
            if (!parentId && c.id === id) return { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) };
            if (parentId && c.id === parentId) return {
                ...c,
                replies: c.replies?.map(r => r.id === id
                    ? { ...r, liked: !r.liked, likes: r.likes + (r.liked ? -1 : 1) }
                    : r
                ),
            };
            return c;
        }));
    };

    const toggleReplies = (id: number) => {
        setComments(prev => prev.map(c => c.id === id ? { ...c, showReplies: !c.showReplies } : c));
    };

    const sorted = [...comments].sort((a, b) => sort === "top" ? b.likes - a.likes : 0);

    if (!commentsOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[65]"
                style={{ background: "rgba(5,8,24,0.70)", backdropFilter: "blur(8px)" }}
                onClick={closeComments}
            />

            {/* Panel */}
            <div
                className="fixed inset-x-0 bottom-0 z-[65] flex flex-col rounded-t-3xl overflow-hidden
                           md:inset-x-auto md:inset-y-auto md:top-16 md:right-4 md:bottom-auto
                           md:w-[420px] md:max-h-[calc(100vh-80px)] md:rounded-2xl"
                style={{
                    background: "rgba(8,12,32,0.98)",
                    border:     "1px solid rgba(43,62,232,0.22)",
                    boxShadow:  "0 24px 64px rgba(0,0,0,0.70)",
                    maxHeight:  "85vh",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <MessageCircle className="w-5 h-5" style={{ color: "#2B3EE8" }} />
                    <div className="flex-1">
                        <h3 className="text-base font-black text-white">Izohlar</h3>
                        <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.75)" }}>
                            {totalCount} ta izoh — {commentsFor ?? ""}
                        </p>
                    </div>
                    {/* Sort */}
                    <button
                        onClick={() => setSort(s => s === "top" ? "new" : "top")}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                        style={{ background: "rgba(43,62,232,0.10)", color: "rgba(140,160,210,0.85)" }}
                    >
                        <ChevronDown className="w-3 h-3" />
                        {sort === "top" ? "Eng yaxshi" : "Yangi"}
                    </button>
                    <button onClick={closeComments}
                        className="w-8 h-8 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.18)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                {/* Izoh ro'yxati */}
                <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
                    {sorted.map(c => (
                        <div key={c.id} className="mb-4">
                            <CommentRow comment={c} onLike={id => toggleLike(id)} onReply={() => setReplyTo(c.id)} />
                            {/* Javoblar */}
                            {(c.replies?.length ?? 0) > 0 && (
                                <div className="ml-10 mt-2">
                                    <button
                                        onClick={() => toggleReplies(c.id)}
                                        className="flex items-center gap-1.5 text-[11px] font-bold mb-2"
                                        style={{ color: "#2B3EE8" }}
                                    >
                                        <Reply className="w-3 h-3" />
                                        {c.showReplies ? "Yashirish" : `${c.replies!.length} ta javob`}
                                    </button>
                                    {c.showReplies && c.replies?.map(r => (
                                        <CommentRow key={r.id} comment={r} small
                                            onLike={id => toggleLike(id, c.id)} onReply={() => setReplyTo(c.id)} />
                                    ))}
                                </div>
                            )}
                            {replyTo === c.id && (
                                <div className="ml-10 mt-2 flex items-center gap-2">
                                    <input
                                        autoFocus type="text" value={input} onChange={e => setInput(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && addComment()}
                                        placeholder={`@${c.user} ga javob...`}
                                        className="flex-1 h-8 rounded-xl px-3 text-xs text-white outline-none"
                                        style={{ background: "rgba(43,62,232,0.10)", border: "1px solid rgba(43,62,232,0.22)", caretColor: "#00CEC8" }}
                                    />
                                    <button onClick={addComment}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        <Send className="w-3.5 h-3.5 text-white" />
                                    </button>
                                    <button onClick={() => setReplyTo(null)}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl"
                                        style={{ background: "rgba(43,62,232,0.10)" }}>
                                        <X className="w-3.5 h-3.5 text-white" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>

                {/* Input */}
                <div className="flex-shrink-0 px-4 py-3 flex items-center gap-2"
                    style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                    <div className="w-7 h-7 rounded-xl overflow-hidden flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <img src="https://api.dicebear.com/9.x/avataaars/svg?seed=me" alt="" className="w-full h-full object-cover" />
                    </div>
                    <input
                        type="text" value={replyTo ? input : input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addComment()}
                        placeholder="Izoh qoldiring..."
                        className="flex-1 h-9 rounded-xl px-3.5 text-sm text-white outline-none"
                        style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.16)", caretColor: "#00CEC8" }}
                    />
                    <button onClick={addComment}
                        className="w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95 flex-shrink-0"
                        style={input.trim()
                            ? { background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", boxShadow: "0 4px 14px rgba(43,62,232,0.40)" }
                            : { background: "rgba(43,62,232,0.08)" }
                        }
                    >
                        <Send className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Izoh kartasi
// ─────────────────────────────────────────────────────────────────────────────
function CommentRow({ comment: c, onLike, onReply, small }: {
    comment: Comment; onLike: (id: number) => void;
    onReply?: () => void; small?: boolean;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <div className="flex gap-2.5 mb-3">
            <div className={`${small ? "w-7 h-7" : "w-9 h-9"} rounded-xl overflow-hidden flex-shrink-0`}
                style={{ border: "1.5px solid rgba(43,62,232,0.22)" }}>
                <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${c.user}`}
                    alt={c.user} className="w-full h-full object-cover bg-white" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <span className="text-xs font-bold text-white">{c.user}</span>
                        <span className="text-[10px] ml-2" style={{ color: "rgba(80,100,150,0.70)" }}>{c.time}</span>
                    </div>
                    <button onClick={() => setMenuOpen(!menuOpen)} className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-lg"
                        style={{ background: menuOpen ? "rgba(43,62,232,0.12)" : "transparent" }}>
                        <MoreHorizontal className="w-3.5 h-3.5" style={{ color: "rgba(80,100,150,0.60)" }} />
                    </button>
                </div>
                <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: "rgba(200,215,245,0.90)" }}>{c.text}</p>
                <div className="flex items-center gap-3 mt-1.5">
                    <button onClick={() => onLike(c.id)} className="flex items-center gap-1 text-[11px] font-bold transition-all duration-150 active:scale-95"
                        style={{ color: c.liked ? "#EF4444" : "rgba(80,100,150,0.75)" }}>
                        <Heart className={`w-3 h-3 ${c.liked ? "fill-current" : ""}`} />
                        {c.likes}
                    </button>
                    {onReply && (
                        <button onClick={onReply} className="flex items-center gap-1 text-[11px]"
                            style={{ color: "rgba(80,100,150,0.75)" }}>
                            <Reply className="w-3 h-3" />
                            Javob
                        </button>
                    )}
                    <button className="flex items-center gap-1 text-[11px]"
                        style={{ color: "rgba(80,100,150,0.75)" }}>
                        <ThumbsUp className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
