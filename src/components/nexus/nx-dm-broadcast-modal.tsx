"use client";

// Broadcast list modal — WhatsApp uslub. Ro'yxatlar + yangi yaratish + xabar yuborish.

import { useEffect, useState } from "react";
import {
    X, Users, Loader2, Plus, Send, Trash2, Search,
} from "lucide-react";

type BroadcastItem = {
    id: string;
    name: string;
    memberCount: number;
    members: Array<{ id: string; name: string | null; username: string | null; image: string | null }>;
};

type Contact = {
    id: string; name: string | null; username: string | null; image: string | null;
};

export function NxDmBroadcastModal({
    open, onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<"list" | "create" | "send">("list");
    const [items, setItems] = useState<BroadcastItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeList, setActiveList] = useState<BroadcastItem | null>(null);

    // Create form
    const [name, setName] = useState("");
    const [contactSearch, setContactSearch] = useState("");
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Send form
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!open) return;
        setTab("list"); setActiveList(null); setName(""); setSelectedIds(new Set()); setText("");
        loadLists();
    }, [open]);

    async function loadLists() {
        setLoading(true);
        try {
            const r = await fetch("/api/nexus/broadcast-lists");
            if (r.ok) {
                const d = await r.json();
                setItems(d.items ?? []);
            }
        } finally { setLoading(false); }
    }

    useEffect(() => {
        if (tab !== "create") return;
        // Contacts — mavjud DM suhbatlar peer'lari
        fetch(`/api/nexus/messages`).then(r => r.ok ? r.json() : null).then(d => {
            if (d?.conversations) {
                const cs: Contact[] = d.conversations
                    .filter((c: { other?: Contact }) => c.other?.id)
                    .map((c: { other: Contact }) => c.other);
                setContacts(cs);
            }
        }).catch(() => {});
    }, [tab]);

    async function createList() {
        if (!name.trim() || selectedIds.size === 0) return;
        const r = await fetch("/api/nexus/broadcast-lists", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim(), memberIds: Array.from(selectedIds) }),
        });
        if (r.ok) {
            await loadLists();
            setTab("list");
            setName(""); setSelectedIds(new Set());
        }
    }

    async function delList(id: string) {
        if (!confirm("Ro'yxatni o'chirasizmi?")) return;
        await fetch(`/api/nexus/broadcast-lists/${id}`, { method: "DELETE" });
        await loadLists();
    }

    async function send() {
        if (!activeList || !text.trim() || sending) return;
        setSending(true);
        try {
            const r = await fetch(`/api/nexus/broadcast-lists/${activeList.id}/send`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text.trim() }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok) {
                alert(`${d.sent} ta a'zoga yuborildi`);
                setText("");
                setTab("list");
                setActiveList(null);
            } else {
                alert(d?.error ?? "Xato");
            }
        } finally { setSending(false); }
    }

    const filtered = contacts.filter(c => {
        if (!contactSearch.trim()) return true;
        const q = contactSearch.toLowerCase();
        return (c.name ?? "").toLowerCase().includes(q) || (c.username ?? "").toLowerCase().includes(q);
    });

    if (!open) return null;

    return (
        <>
            <div className="fixed inset-0 z-[320] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-x-0 bottom-0 z-[321] flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl md:inset-y-0 md:right-0 md:inset-x-auto md:max-h-full md:w-[440px] md:rounded-none md:rounded-l-3xl"
                style={{ background: "rgba(8,12,32,0.99)", border: "1px solid rgba(43,62,232,0.30)" }}>
                <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
                    style={{ borderBottom: "1px solid rgba(43,62,232,0.14)" }}>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                        <Users className="w-4 h-4" style={{ color: "#00CEC8" }} />
                        {tab === "list" ? "Broadcast ro'yxatlar" : tab === "create" ? "Yangi ro'yxat" : activeList?.name}
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(43,62,232,0.12)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "none" }}>
                    {tab === "list" && (
                        loading ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2B3EE8" }} /></div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "#00CEC8" }} />
                                <p className="text-sm" style={{ color: "rgba(160,176,224,0.7)" }}>Ro&apos;yxat yo&apos;q</p>
                                <button onClick={() => setTab("create")}
                                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-white"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    <Plus className="w-3.5 h-3.5" /> Birinchi ro&apos;yxat
                                </button>
                            </div>
                        ) : (
                            <>
                                <button onClick={() => setTab("create")}
                                    className="w-full mb-2 h-10 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2"
                                    style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)" }}>
                                    <Plus className="w-4 h-4" /> Yangi ro&apos;yxat
                                </button>
                                <div className="space-y-1.5">
                                    {items.map(l => (
                                        <div key={l.id} className="p-3 rounded-xl flex items-center gap-3"
                                            style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                            <button onClick={() => { setActiveList(l); setTab("send"); }}
                                                className="flex-1 min-w-0 text-left">
                                                <p className="text-sm font-black text-white truncate">{l.name}</p>
                                                <p className="text-[11px]" style={{ color: "rgba(160,176,224,0.7)" }}>
                                                    {l.memberCount} a&apos;zo
                                                </p>
                                            </button>
                                            <div className="flex -space-x-2">
                                                {l.members.slice(0, 3).map(m => (
                                                    <img key={m.id} src={m.image ?? "/logos/forhumo.png"} alt=""
                                                        className="w-6 h-6 rounded-full object-cover"
                                                        style={{ border: "2px solid #050818" }} />
                                                ))}
                                            </div>
                                            <button onClick={() => delList(l.id)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                                style={{ background: "rgba(239,68,68,0.10)" }}>
                                                <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )
                    )}

                    {tab === "create" && (
                        <>
                            <input value={name} onChange={e => setName(e.target.value.slice(0, 80))}
                                placeholder="Ro'yxat nomi (masalan: Do'stlar)"
                                className="w-full h-11 rounded-xl px-3 text-sm focus:outline-none mb-3"
                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white" }} />
                            <div className="relative mb-2">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(140,160,210,0.6)" }} />
                                <input value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                                    placeholder="Kontakt qidirish..."
                                    className="w-full h-10 rounded-xl pl-9 pr-3 text-sm focus:outline-none"
                                    style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.20)", color: "white" }} />
                            </div>
                            <p className="text-[11px] mb-2" style={{ color: "rgba(160,176,224,0.7)" }}>
                                Tanlangan: {selectedIds.size}
                            </p>
                            <div className="space-y-1">
                                {filtered.map(c => {
                                    const on = selectedIds.has(c.id);
                                    return (
                                        <button key={c.id}
                                            onClick={() => {
                                                const s = new Set(selectedIds);
                                                if (s.has(c.id)) s.delete(c.id); else s.add(c.id);
                                                setSelectedIds(s);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left"
                                            style={{
                                                background: on ? "rgba(0,206,200,0.14)" : "rgba(11,18,40,0.55)",
                                                border: `1px solid ${on ? "#00CEC8" : "rgba(43,62,232,0.14)"}`,
                                            }}>
                                            <img src={c.image ?? "/logos/forhumo.png"} alt=""
                                                className="w-8 h-8 rounded-full object-cover" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{c.name ?? c.username ?? "?"}</p>
                                                {c.username && <p className="text-[10px]" style={{ color: "rgba(140,160,210,0.7)" }}>@{c.username}</p>}
                                            </div>
                                            {on && <div className="w-5 h-5 rounded-full flex items-center justify-center"
                                                style={{ background: "#00CEC8" }}>
                                                <span className="text-[10px] font-black text-white">✓</span>
                                            </div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {tab === "send" && activeList && (
                        <>
                            <div className="p-3 rounded-xl mb-3"
                                style={{ background: "rgba(11,18,40,0.55)", border: "1px solid rgba(43,62,232,0.14)" }}>
                                <p className="text-sm font-black text-white">{activeList.name}</p>
                                <p className="text-[11px]" style={{ color: "rgba(160,176,224,0.7)" }}>
                                    {activeList.memberCount} a&apos;zoga alohida DM yuboriladi
                                </p>
                            </div>
                            <textarea value={text} onChange={e => setText(e.target.value.slice(0, 4000))}
                                placeholder="Xabar matni..."
                                rows={5}
                                className="w-full rounded-xl p-3 text-sm resize-none focus:outline-none"
                                style={{ background: "rgba(11,18,40,0.60)", border: "1px solid rgba(43,62,232,0.30)", color: "white" }} />
                        </>
                    )}
                </div>

                {tab === "create" && (
                    <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                        <div className="flex gap-2">
                            <button onClick={() => setTab("list")}
                                className="flex-1 h-11 rounded-xl font-bold text-sm"
                                style={{ background: "rgba(43,62,232,0.20)", color: "white" }}>
                                Bekor
                            </button>
                            <button onClick={createList} disabled={!name.trim() || selectedIds.size === 0}
                                className="flex-1 h-11 rounded-xl font-black text-sm disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg,#2B3EE8,#00CEC8)", color: "white" }}>
                                Yaratish
                            </button>
                        </div>
                    </div>
                )}

                {tab === "send" && (
                    <div className="p-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(43,62,232,0.14)" }}>
                        <button onClick={send} disabled={!text.trim() || sending}
                            className="w-full h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg,#F5B301,#F97316)", color: "#050818" }}>
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {activeList?.memberCount} kishiga yuborish
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
