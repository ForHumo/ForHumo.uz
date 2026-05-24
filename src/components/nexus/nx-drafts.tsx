"use client";

import { useState } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import {
    X, FileText, Film, Camera, Pencil, Trash2, Clock,
    ChevronRight, Plus, Send,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Turlar
// ─────────────────────────────────────────────────────────────────────────────
type DraftType = "post" | "video" | "story";

interface Draft {
    id: string;
    type: DraftType;
    title: string;
    preview: string; // short text excerpt
    savedAt: string;
    wordCount: number;
    thumbnail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_DRAFTS: Draft[] = [
    {
        id: "d1", type: "video", savedAt: "Bugun, 14:23",
        title: "O'zbek oshxonasi: 5 ta klassik retsept",
        preview: "Ushbu videoda biz an'anaviy o'zbek taomlarini pishirishni ko'rsatamiz...",
        wordCount: 0, thumbnail: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&q=80",
    },
    {
        id: "d2", type: "post", savedAt: "Kecha, 22:10",
        title: "Texnologiya va inson: 2026 yilda nima o'zgardi?",
        preview: "So'nggi ikki yilda sun'iy intellekt hayotimizning barcha jabhalariga kirib keldi...",
        wordCount: 847,
    },
    {
        id: "d3", type: "story", savedAt: "3 kun oldin",
        title: "Toshkent ko'chalari — kuz fotosessiyasi",
        preview: "Story uchun 6 ta rasm tanlangan",
        wordCount: 0,
    },
    {
        id: "d4", type: "post", savedAt: "5 kun oldin",
        title: "Humo Nexus tajribam — birinchi oy",
        preview: "Platformaga qo'shilganimga bir oy bo'ldi. Bu vaqt ichida nimalarni kuzatdim...",
        wordCount: 1230,
    },
    {
        id: "d5", type: "video", savedAt: "1 hafta oldin",
        title: "Lo-fi beats yaratish darslik #3",
        preview: "Ushbu qismda layering va mixing texnikalarini ko'rib chiqamiz...",
        wordCount: 0, thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=200&q=80",
    },
];

const TYPE_META: Record<DraftType, { icon: typeof FileText; label: string; color: string }> = {
    post:  { icon: FileText, label: "Post",   color: "#2B3EE8" },
    video: { icon: Film,     label: "Video",  color: "#8B5CF6" },
    story: { icon: Camera,   label: "Story",  color: "#F59E0B" },
};

// ─────────────────────────────────────────────────────────────────────────────
// NxDrafts
// ─────────────────────────────────────────────────────────────────────────────
export function NxDrafts() {
    const { draftsOpen, setDraftsOpen } = useNxPlayer();

    const [drafts,    setDrafts]    = useState<Draft[]>(INITIAL_DRAFTS);
    const [editing,   setEditing]   = useState<Draft | null>(null);
    const [editBody,  setEditBody]  = useState("");
    const [filter,    setFilter]    = useState<DraftType | "all">("all");
    const [deleting,  setDeleting]  = useState<string | null>(null);

    if (!draftsOpen) return null;

    // ── Editor view ────────────────────────────────────────────────────────
    if (editing) {
        return (
            <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
                <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                    <button
                        onClick={() => {
                            // Auto-save: update preview
                            if (editBody.trim()) {
                                setDrafts(prev => prev.map(d =>
                                    d.id === editing.id
                                        ? { ...d, preview: editBody.slice(0, 120), wordCount: editBody.split(" ").length, savedAt: "Hozir saqlandi" }
                                        : d
                                ));
                            }
                            setEditing(null);
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl"
                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                        <X className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white truncate">{editing.title}</p>
                        <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>Tahrirlash rejimi</p>
                    </div>
                    <button
                        onClick={() => {
                            setDrafts(prev => prev.filter(d => d.id !== editing.id));
                            setEditing(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white"
                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                        <Send className="w-3.5 h-3.5" />
                        Nashr
                    </button>
                </div>

                <div className="flex-1 px-4 py-4 flex flex-col gap-3">
                    <input
                        defaultValue={editing.title}
                        className="w-full bg-transparent text-base font-black text-white outline-none"
                        style={{ borderBottom: "1px solid rgba(43,62,232,0.25)" }}
                        placeholder="Sarlavha..."
                    />
                    <textarea
                        value={editBody || editing.preview}
                        onChange={e => setEditBody(e.target.value)}
                        placeholder="Matn yozing..."
                        className="flex-1 bg-transparent text-sm text-white outline-none resize-none leading-relaxed"
                        style={{ color: "rgba(180,195,240,0.90)" }}
                    />
                    <div className="flex items-center gap-3 pb-2">
                        <span className="text-[10px]" style={{ color: "rgba(100,120,170,0.50)" }}>
                            {editBody ? editBody.split(/\s+/).filter(Boolean).length : editing.wordCount} so'z
                        </span>
                        <span className="text-[10px] ml-auto" style={{ color: "rgba(100,120,170,0.40)" }}>
                            Avtomatik saqlash yoqilgan
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // ── Draft list ─────────────────────────────────────────────────────────
    const visible = filter === "all" ? drafts : drafts.filter(d => d.type === filter);

    return (
        <div className="fixed inset-0 z-[120] flex flex-col" style={{ background: "#050818" }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-[56px] flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(43,62,232,0.18)" }}>
                <button onClick={() => setDraftsOpen(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)" }}>
                    <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex-1">
                    <p className="text-sm font-black text-white">Qoralamalar</p>
                    <p className="text-[10px]" style={{ color: "rgba(100,120,170,0.70)" }}>
                        {drafts.length} ta saqlangan qoralama
                    </p>
                </div>
                <button
                    onClick={() => {
                        const d: Draft = { id: `draft_${Date.now()}`, type: "post", title: "Yangi qoralama", preview: "", savedAt: "Hozir", wordCount: 0 };
                        setDrafts(prev => [d, ...prev]);
                        setEditing(d);
                        setEditBody("");
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl"
                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                    <Plus className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 px-4 py-3 flex-shrink-0">
                {(["all", "post", "video", "story"] as const).map(f => {
                    const label = f === "all" ? "Barchasi" : TYPE_META[f].label;
                    const count = f === "all" ? drafts.length : drafts.filter(d => d.type === f).length;
                    return (
                        <button key={f} onClick={() => setFilter(f)}
                            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all"
                            style={{
                                background: filter === f ? "rgba(43,62,232,0.30)" : "rgba(43,62,232,0.08)",
                                border: `1px solid ${filter === f ? "rgba(43,62,232,0.55)" : "rgba(43,62,232,0.15)"}`,
                                color: filter === f ? "white" : "rgba(140,160,210,0.60)",
                            }}>
                            {label}
                            <span className="text-[9px] px-1 rounded-full"
                                style={{ background: filter === f ? "rgba(255,255,255,0.15)" : "rgba(43,62,232,0.15)" }}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Draft cards */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-3" style={{ scrollbarWidth: "none" }}>
                {visible.length === 0 && (
                    <p className="text-center py-16 text-sm" style={{ color: "rgba(100,120,170,0.40)" }}>
                        Bu turda qoralamalar yo'q
                    </p>
                )}

                {visible.map(d => {
                    const meta = TYPE_META[d.type];
                    const Icon = meta.icon;
                    const isDeleting = deleting === d.id;

                    return (
                        <div key={d.id}
                            className="p-4 rounded-2xl"
                            style={{
                                background: "rgba(8,12,32,0.95)",
                                border: `1px solid ${isDeleting ? "rgba(239,68,68,0.35)" : "rgba(43,62,232,0.16)"}`,
                            }}>
                            <div className="flex items-start gap-3">
                                {/* Thumbnail or icon */}
                                {d.thumbnail
                                    ? <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                                        <img src={d.thumbnail} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    : <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}33` }}>
                                        <Icon className="w-6 h-6" style={{ color: meta.color }} />
                                    </div>
                                }

                                <div className="flex-1 min-w-0">
                                    {/* Type + date */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                                            style={{ background: `${meta.color}20`, color: meta.color }}>
                                            {meta.label}
                                        </span>
                                        <div className="flex items-center gap-1 ml-auto">
                                            <Clock className="w-3 h-3" style={{ color: "rgba(100,120,170,0.40)" }} />
                                            <span className="text-[9px]" style={{ color: "rgba(100,120,170,0.50)" }}>
                                                {d.savedAt}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-[12px] font-bold text-white leading-snug mb-1 line-clamp-1">{d.title}</p>
                                    <p className="text-[10px] line-clamp-2 mb-2" style={{ color: "rgba(120,140,190,0.65)" }}>
                                        {d.preview || "Bo'sh qoralama"}
                                    </p>
                                    {d.wordCount > 0 && (
                                        <span className="text-[9px]" style={{ color: "rgba(100,120,170,0.50)" }}>
                                            {d.wordCount} so'z
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            {isDeleting
                                ? <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => { setDrafts(prev => prev.filter(x => x.id !== d.id)); setDeleting(null); }}
                                        className="flex-1 py-2 rounded-xl text-xs font-black"
                                        style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.30)", color: "#EF4444" }}>
                                        O'chirish
                                    </button>
                                    <button
                                        onClick={() => setDeleting(null)}
                                        className="flex-1 py-2 rounded-xl text-xs font-black text-white"
                                        style={{ background: "rgba(43,62,232,0.18)", border: "1px solid rgba(43,62,232,0.30)" }}>
                                        Bekor qilish
                                    </button>
                                </div>
                                : <div className="flex gap-2 mt-3">
                                    <button onClick={() => setDeleting(d.id)}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl"
                                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}>
                                        <Trash2 className="w-4 h-4" style={{ color: "rgba(239,68,68,0.60)" }} />
                                    </button>
                                    <button
                                        onClick={() => { setEditing(d); setEditBody(""); }}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black"
                                        style={{ background: "rgba(43,62,232,0.12)", border: "1px solid rgba(43,62,232,0.22)", color: "rgba(160,180,240,0.90)" }}>
                                        <Pencil className="w-3.5 h-3.5" />
                                        Davom ettirish
                                    </button>
                                    <button
                                        onClick={() => setDrafts(prev => prev.filter(x => x.id !== d.id))}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black text-white"
                                        style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                        <Send className="w-3.5 h-3.5" />
                                        Nashr etish
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            }
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
