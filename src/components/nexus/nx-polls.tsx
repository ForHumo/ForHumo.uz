"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { X, Plus, BarChart2, Clock, ChevronRight, Trash2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
interface PollOption {
    id: string;
    text: string;
    votes: number;
}

interface Poll {
    id: string;
    question: string;
    creator: string;
    avatar: string;
    options: PollOption[];
    totalVotes: number;
    hoursLeft: number;
    myVote: string | null;
    multi: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_POLLS: Poll[] = [
    {
        id: "p1",
        question: "Humo Nexus'da qaysi kontent turi eng ko'p qiziqtiradi?",
        creator: "Humo Team", avatar: "HT",
        totalVotes: 8432, hoursLeft: 18, myVote: null, multi: false,
        options: [
            { id: "o1", text: "Musiqa", votes: 3120 },
            { id: "o2", text: "Video va Shorts", votes: 2850 },
            { id: "o3", text: "Jonli efirlar", votes: 1560 },
            { id: "o4", text: "Podkastlar", votes: 902 },
        ],
    },
    {
        id: "p2",
        question: "Qaysi yangi funktsiyani birinchi chiqarishimiz kerak?",
        creator: "Jasur Beats", avatar: "JB",
        totalVotes: 3241, hoursLeft: 6, myVote: null, multi: false,
        options: [
            { id: "o5", text: "Kollaboratsiya studiya", votes: 1456 },
            { id: "o6", text: "AI pardoz (filter)", votes: 987 },
            { id: "o7", text: "Offline rejim", votes: 798 },
        ],
    },
    {
        id: "p3",
        question: "Qaysi musiqa janrlari sizga yoqadi? (bir nechta tanlash mumkin)",
        creator: "MusicUZ", avatar: "MU",
        totalVotes: 5670, hoursLeft: 72, myVote: null, multi: true,
        options: [
            { id: "o8",  text: "Pop",        votes: 2100 },
            { id: "o9",  text: "Hip-hop",    votes: 1800 },
            { id: "o10", text: "Rock",        votes: 890 },
            { id: "o11", text: "Milliy",      votes: 880 },
        ],
    },
    {
        id: "p4",
        question: "Nexus'dan kuniga necha soat foydalanasiz?",
        creator: "DevTalk UZ", avatar: "DT",
        totalVotes: 12890, hoursLeft: 0, myVote: "o14", multi: false,
        options: [
            { id: "o12", text: "1 soatdan kam",  votes: 2344 },
            { id: "o13", text: "1–3 soat",        votes: 6780 },
            { id: "o14", text: "3–5 soat",        votes: 2890 },
            { id: "o15", text: "5 soatdan ko'p",  votes: 876  },
        ],
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// NxPolls
// ─────────────────────────────────────────────────────────────────────────────
export function NxPolls() {
    const { pollsOpen, setPollsOpen } = useNxPlayer();

    const [polls,      setPolls]      = useState<Poll[]>(INITIAL_POLLS);
    const [multiVotes, setMultiVotes] = useState<Record<string, Set<string>>>({}); // pollId -> Set<optionId>
    const [createOpen, setCreateOpen] = useState(false);
    const [newQ,       setNewQ]       = useState("");
    const [newOpts,    setNewOpts]    = useState(["", ""]);

    if (!pollsOpen) return null;

    const castVote = (pollId: string, optId: string) => {
        setPolls(prev => prev.map(p => {
            if (p.id !== pollId) return p;
            if (p.myVote === optId) return p; // already voted
            if (p.hoursLeft === 0) return p;  // closed

            const prevVoteId = p.myVote;
            const updatedOptions = p.options.map(o => {
                if (o.id === optId)      return { ...o, votes: o.votes + 1 };
                if (o.id === prevVoteId) return { ...o, votes: Math.max(0, o.votes - 1) };
                return o;
            });
            return {
                ...p,
                options: updatedOptions,
                myVote: optId,
                totalVotes: prevVoteId ? p.totalVotes : p.totalVotes + 1,
            };
        }));
    };

    const castMultiVote = (pollId: string, optId: string) => {
        setMultiVotes(prev => {
            const cur = new Set(prev[pollId] ?? []);
            cur.has(optId) ? cur.delete(optId) : cur.add(optId);
            return { ...prev, [pollId]: cur };
        });
    };

    const createPoll = () => {
        if (!newQ.trim() || newOpts.filter(o => o.trim()).length < 2) return;
        const validOpts = newOpts.filter(o => o.trim());
        const newPoll: Poll = {
            id: `poll_${Date.now()}`,
            question: newQ,
            creator: "Siz", avatar: "SZ",
            totalVotes: 0, hoursLeft: 24,
            myVote: null, multi: false,
            options: validOpts.map((t, i) => ({ id: `no_${i}`, text: t, votes: 0 })),
        };
        setPolls(prev => [newPoll, ...prev]);
        setNewQ(""); setNewOpts(["", ""]); setCreateOpen(false);
    };

    return (
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={() => setPollsOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">So'rovnomalar</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                        {polls.filter(p => p.hoursLeft > 0).length} ta faol so'rovnoma
                    </p>
                </div>
                <button onClick={() => setCreateOpen(true)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <Plus className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Poll list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
                {polls.map(poll => {
                    const closed  = poll.hoursLeft === 0;
                    const voted   = poll.myVote !== null;
                    const mvotes  = multiVotes[poll.id] ?? new Set<string>();
                    const showResults = voted || closed;

                    return (
                        <div key={poll.id} className="p-4 rounded-2xl"
                            style={{
                                background: "rgba(8,12,32,0.95)",
                                border: `1px solid ${closed ? "rgba(100,120,170,0.20)" : "rgba(43,62,232,0.18)"}`,
                            }}>
                            {/* Creator + meta */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    {poll.avatar}
                                </div>
                                <span className="text-[10px] font-bold text-white">{poll.creator}</span>
                                {closed
                                    ? <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-black"
                                        style={{ background: "rgba(100,120,170,0.15)", color: "rgba(100,120,170,0.70)" }}>
                                        Tugadi
                                    </span>
                                    : <div className="ml-auto flex items-center gap-1">
                                        <Clock className="w-3 h-3" style={{ color: "rgba(100,120,170,0.50)" }} />
                                        <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>
                                            {poll.hoursLeft}s qoldi
                                        </span>
                                    </div>
                                }
                            </div>

                            <p className="text-[13px] font-black text-white mb-4 leading-snug">{poll.question}</p>
                            {poll.multi && (
                                <p className="text-[9px] mb-2" style={{ color: "rgba(100,120,170,0.60)" }}>
                                    Bir nechta tanlash mumkin
                                </p>
                            )}

                            {/* Options */}
                            <div className="flex flex-col gap-2">
                                {poll.options.map(opt => {
                                    const pct = poll.totalVotes > 0
                                        ? Math.round((opt.votes / poll.totalVotes) * 100)
                                        : 0;
                                    const isMyVote  = poll.myVote === opt.id || mvotes.has(opt.id);
                                    const isWinning = poll.options.reduce((mx, o) => o.votes > mx ? o.votes : mx, 0) === opt.votes;

                                    return (
                                        <button
                                            key={opt.id}
                                            disabled={closed}
                                            onClick={() => poll.multi ? castMultiVote(poll.id, opt.id) : castVote(poll.id, opt.id)}
                                            className="relative w-full text-left rounded-xl overflow-hidden transition-all duration-200"
                                            style={{
                                                background: isMyVote ? "rgba(43,62,232,0.20)" : "rgba(43,62,232,0.06)",
                                                border: `1px solid ${isMyVote ? "rgba(43,62,232,0.55)" : "rgba(43,62,232,0.14)"}`,
                                            }}
                                        >
                                            {/* Progress fill */}
                                            {showResults && (
                                                <div className="absolute inset-0 rounded-xl"
                                                    style={{
                                                        width: `${pct}%`,
                                                        background: isWinning && voted
                                                            ? "rgba(0,206,200,0.12)"
                                                            : "rgba(43,62,232,0.10)",
                                                        transition: "width 0.6s ease",
                                                    }} />
                                            )}
                                            <div className="relative flex items-center justify-between px-3 py-2.5">
                                                <span className="text-[12px] font-bold text-white">{opt.text}</span>
                                                {showResults && (
                                                    <span className="text-[11px] font-black ml-2 flex-shrink-0"
                                                        style={{ color: isWinning ? "#00CEC8" : "rgba(140,160,210,0.70)" }}>
                                                        {pct}%
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center gap-2 mt-3">
                                <BarChart2 className="w-3.5 h-3.5" style={{ color: "rgba(100,120,170,0.50)" }} />
                                <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.60)" }}>
                                    {poll.totalVotes.toLocaleString()} ovoz
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create poll sheet */}
            {createOpen && (
                <div className="absolute inset-0 z-10 flex flex-col" style={{ background: "#050818" }}>
                    <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                        style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                        <button onClick={() => setCreateOpen(false)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl"
                            style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                            <X className="w-5 h-5 text-white" />
                        </button>
                        <p className="flex-1 text-sm font-black text-white">Yangi so'rovnoma</p>
                        <button
                            onClick={createPoll}
                            disabled={!newQ.trim() || newOpts.filter(o => o.trim()).length < 2}
                            className="px-4 py-1.5 rounded-xl text-xs font-black text-white"
                            style={{
                                background: newQ.trim() ? "linear-gradient(135deg,#2B3EE8,#00CEC8)" : "rgba(43,62,232,0.15)",
                            }}>
                            Nashr
                        </button>
                    </div>
                    <div className="flex-1 px-4 py-5 flex flex-col gap-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                        <textarea
                            placeholder="Savol matni..."
                            rows={3}
                            value={newQ}
                            onChange={e => setNewQ(e.target.value)}
                            className="w-full bg-transparent text-sm font-bold text-white outline-none px-3 py-3 rounded-xl resize-none"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}
                        />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                                style={{ color: "rgba(100,120,170,0.60)" }}>
                                Variantlar
                            </p>
                            <div className="flex flex-col gap-2">
                                {newOpts.map((opt, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input
                                            value={opt}
                                            onChange={e => {
                                                const n = [...newOpts];
                                                n[i] = e.target.value;
                                                setNewOpts(n);
                                            }}
                                            placeholder={`Variant ${i + 1}`}
                                            className="flex-1 bg-transparent text-sm text-white outline-none px-3 py-2.5 rounded-xl"
                                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.18)" }}
                                        />
                                        {newOpts.length > 2 && (
                                            <button onClick={() => setNewOpts(newOpts.filter((_, j) => j !== i))}
                                                className="w-10 flex items-center justify-center rounded-xl"
                                                style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
                                                <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {newOpts.length < 4 && (
                                <button
                                    onClick={() => setNewOpts([...newOpts, ""])}
                                    className="mt-2 flex items-center gap-2 text-[11px] font-bold px-3 py-2 rounded-xl"
                                    style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)", color: "rgba(140,160,210,0.70)" }}>
                                    <Plus className="w-3.5 h-3.5" />
                                    Variant qo'shish
                                </button>
                            )}
                        </div>
                        {/* Duration hint */}
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                            style={{ background: "rgba(43,62,232,0.08)", border: "1px solid rgba(43,62,232,0.15)" }}>
                            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(100,120,170,0.50)" }} />
                            <span className="text-[11px]" style={{ color: "rgba(120,140,190,0.70)" }}>
                                Davomiylik: 24 soat (standart)
                            </span>
                            <ChevronRight className="w-4 h-4 ml-auto" style={{ color: "rgba(100,120,170,0.30)" }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
