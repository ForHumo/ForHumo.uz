"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNxPlayer } from "./nx-player-ctx";
import { MessageCircle, Loader2, BadgeCheck, Pencil, Bookmark, Pin, VolumeX } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NxChatList — Ijtimoiy > Chatlar tabidagi inline suhbatlar ro'yxati.
// Xabarlar (DM) paneli bilan AYNAN bir xil ma'lumot (NexusConversation).
// Suhbatga bosilsa DM paneli o'sha threadga ochiladi (openDM).
// Props: filterUnread=true → faqat o'qilmagan suhbatlar (O'qilmagan tab)
// ─────────────────────────────────────────────────────────────────────────────
interface Conv {
    conversationId: string;
    isSelf?: boolean;
    other: { name: string | null; username: string | null; image: string | null; verified: boolean } | null;
    lastMessageText: string | null;
    lastMessageAt: string | null;
    lastMine: boolean;
    unread: boolean;
    pinned?: boolean;
    muted?: boolean;
}

function avatarOf(o: Conv["other"]) {
    return o?.image || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(o?.username || o?.name || "u")}`;
}
function timeAgo(d: string | null) {
    if (!d) return "";
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "hozir"; if (m < 60) return `${m} daq`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} soat`;
    return new Date(d).toLocaleDateString("uz-UZ");
}

export function NxChatList({ filterUnread = false }: { filterUnread?: boolean } = {}) {
    const { openDM, setMessagesOpen, messagesOpen } = useNxPlayer();
    const [convs, setConvs] = useState<Conv[]>([]);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const load = useCallback((silent = false) => {
        if (!silent) setLoading(true);
        fetch("/api/nexus/messages").then(r => r.json())
            .then(d => setConvs(d.conversations ?? []))
            .catch(() => { })
            .finally(() => { if (!silent) setLoading(false); });
    }, []);

    useEffect(() => { load(); }, [load]);
    // DM paneli yopilganda ro'yxatni yangilash (o'qildi/yangi xabar)
    useEffect(() => { if (!messagesOpen) load(true); }, [messagesOpen, load]);

    // localStorage draftlarni yig'ish (nx-messages.tsx da `nx-draft:<convId>` kaliti bo'yicha saqlanadi)
    useEffect(() => {
        if (typeof window === "undefined") return;
        function readDrafts() {
            const out: Record<string, string> = {};
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (!k?.startsWith("nx-draft:")) continue;
                    const v = localStorage.getItem(k);
                    if (v && v.trim()) out[k.slice(9)] = v.trim();
                }
            } catch { /* ignore */ }
            setDrafts(out);
        }
        readDrafts();
        const onStorage = (e: StorageEvent) => { if (!e.key || e.key.startsWith("nx-draft:")) readDrafts(); };
        window.addEventListener("storage", onStorage);
        const t = setInterval(readDrafts, 4000);
        return () => { window.removeEventListener("storage", onStorage); clearInterval(t); };
    }, []);

    const displayed = useMemo(() => filterUnread ? convs.filter(c => c.unread) : convs, [convs, filterUnread]);

    return (
        <div className="px-4">
            <button onClick={() => setMessagesOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-bold text-[var(--nx-text)] mb-3 transition-all duration-150 active:scale-[0.99]"
                style={{ background: "var(--nx-accent)", boxShadow: "0 4px 20px rgb(var(--nx-accent-rgb) / 0.35)" }}>
                <Pencil className="w-4 h-4" /> Yangi suhbat
            </button>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--nx-accent)" }} /></div>
            ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgb(var(--nx-accent-rgb) / 0.08)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.15)" }}>
                        <MessageCircle className="w-5 h-5" style={{ color: "rgb(var(--nx-accent-rgb) / 0.45)" }} />
                    </div>
                    <p className="text-sm font-bold text-white/60 mb-1">
                        {filterUnread ? "O'qilmagan suhbat yo'q" : "Hali suhbat yo'q"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--nx-text-3)" }}>
                        {filterUnread ? "Barcha xabarlar o'qib bo'lingan" : "Profilga kirib \"Xabar\" orqali yozing"}
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-1">
                    {displayed.map(c => {
                        const draft = drafts[c.conversationId];
                        const isSelf = !!c.isSelf;
                        const name = isSelf ? "Saqlangan xabarlar" : (c.other?.name || c.other?.username || "Foydalanuvchi");
                        return (
                            <button key={c.conversationId}
                                onClick={() => {
                                    if (isSelf) { setMessagesOpen(true); return; }
                                    if (c.other?.username) openDM(c.other.username);
                                }}
                                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-150 active:scale-[0.99]"
                                style={{ background: c.unread ? "rgb(var(--nx-accent-rgb) / 0.10)" : "var(--nx-surface)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.14)" }}>
                                {isSelf ? (
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                                        style={{ background: "var(--nx-accent)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.25)" }}>
                                        <Bookmark className="w-5 h-5 text-[var(--nx-text)]" />
                                    </div>
                                ) : (
                                    <img src={avatarOf(c.other)} alt="" className="w-12 h-12 rounded-2xl object-cover bg-white flex-shrink-0" style={{ border: "1px solid rgb(var(--nx-accent-rgb) / 0.25)" }} />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-bold text-[var(--nx-text)] truncate">{name}</span>
                                        {c.other?.verified && !isSelf && <BadgeCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--nx-accent)" }} />}
                                        {c.pinned && <Pin className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(140,160,210,0.7)" }} />}
                                        {c.muted && <VolumeX className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(140,160,210,0.7)" }} />}
                                        <span className="ml-auto text-[10px] flex-shrink-0" style={{ color: "rgba(100,120,170,0.7)" }}>{timeAgo(c.lastMessageAt)}</span>
                                    </div>
                                    <p className="text-xs truncate mt-0.5" style={{ color: c.unread ? "rgba(200,215,245,0.95)" : "var(--nx-text-3)", fontWeight: c.unread ? 600 : 400 }}>
                                        {draft ? (
                                            <><span style={{ color: "#F97316", fontWeight: 700 }}>Qoralama: </span>{draft.slice(0, 60)}</>
                                        ) : (
                                            <>{c.lastMine && "Siz: "}{c.lastMessageText || "..."}</>
                                        )}
                                    </p>
                                </div>
                                {c.unread && (
                                    <div className="min-w-[10px] h-2.5 rounded-full flex-shrink-0" style={{ background: c.muted ? "rgba(140,160,210,0.6)" : "var(--nx-accent)" }} />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
