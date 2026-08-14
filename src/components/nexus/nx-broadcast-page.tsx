"use client";

import { useEffect, useState } from "react";
import { Radio, Plus, Users, Send, Trash2, ArrowLeft, Search, X, Loader2, Check, AlertCircle } from "lucide-react";

interface ListRow { id: string; name: string; memberCount: number; updatedAt: string }
interface Member { profileId: string; name: string | null; username: string | null; image: string | null; addedAt: string }
interface UserResult { id: string; name: string | null; username: string | null; image: string | null }

export function NxBroadcastPage() {
    const [lists, setLists] = useState<ListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<ListRow | null>(null);
    const [creating, setCreating] = useState(false);

    async function loadLists() {
        setLoading(true);
        try {
            const res = await fetch("/api/nexus/broadcast");
            const data = await res.json();
            setLists(data.lists || []);
        } finally { setLoading(false); }
    }
    useEffect(() => { loadLists(); }, []);

    if (selected) {
        return <BroadcastDetail
            list={selected}
            onBack={() => { setSelected(null); loadLists(); }}
            onDeleted={() => { setSelected(null); loadLists(); }}
        />;
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                    <Radio className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-black">Broadcast ro'yxatlari</h1>
                    <p className="text-xs opacity-70">Bir xabar — bir necha kontaktga alohida DM tarzida.</p>
                </div>
                <button onClick={() => setCreating(true)} className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Yangi
                </button>
            </div>

            {loading && <div className="text-center py-8 opacity-60"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}
            {!loading && lists.length === 0 && (
                <div className="text-center py-16 opacity-60">
                    <Radio className="w-10 h-10 mx-auto mb-3" />
                    <div className="font-bold mb-1">Hali ro'yxat yo'q</div>
                    <div className="text-xs">"Yangi" tugmasi bilan boshlang.</div>
                </div>
            )}
            {!loading && lists.length > 0 && (
                <div className="space-y-2">
                    {lists.map(l => (
                        <button key={l.id} onClick={() => setSelected(l)}
                            className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-white/5 flex items-center gap-3 text-left transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                                <Radio className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="font-bold">{l.name}</div>
                                <div className="text-xs opacity-70 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> {l.memberCount} qabul qiluvchi
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {creating && <CreateListModal
                onClose={() => setCreating(false)}
                onCreated={(id, name) => { setCreating(false); setSelected({ id, name, memberCount: 0, updatedAt: new Date().toISOString() }); }}
            />}
        </div>
    );
}

function CreateListModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string, name: string) => void }) {
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    async function submit() {
        if (!name.trim() || busy) return;
        setBusy(true); setErr(null);
        try {
            const res = await fetch("/api/nexus/broadcast", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { setErr(data?.error || "Xatolik"); setBusy(false); return; }
            onCreated(data.id, data.name);
        } catch { setErr("Tarmoq xatosi"); setBusy(false); }
    }
    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-sm p-6 rounded-2xl bg-white dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
                <div className="font-black text-lg mb-1">Yangi broadcast ro'yxati</div>
                <div className="text-xs opacity-70 mb-4">Faqat siz ko'rasiz. Qabul qiluvchilar oddiy shaxsiy xabar ko'radi.</div>
                <input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="Do'stlar, Xarid mijozlari..."
                    className="w-full h-12 px-4 rounded-xl bg-black/5 dark:bg-white/5 outline-none" autoFocus
                    onKeyDown={e => e.key === "Enter" && submit()} />
                {err && <div className="mt-2 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{err}</div>}
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <button onClick={onClose} className="h-11 rounded-xl bg-black/5 dark:bg-white/5 text-sm font-bold">Bekor</button>
                    <button onClick={submit} disabled={busy || !name.trim()} className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Yaratish
                    </button>
                </div>
            </div>
        </div>
    );
}

function BroadcastDetail({ list, onBack, onDeleted }: { list: ListRow; onBack: () => void; onDeleted: () => void }) {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [sendText, setSendText] = useState("");
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ sent: number; total: number; skipped: number } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`/api/nexus/broadcast/${list.id}`);
            const data = await res.json();
            setMembers(data.members || []);
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, [list.id]);

    async function removeMember(profileId: string) {
        await fetch(`/api/nexus/broadcast/${list.id}/members`, {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId }),
        });
        load();
    }

    async function send() {
        if (!sendText.trim() || sending) return;
        setSending(true); setSendResult(null);
        try {
            const res = await fetch(`/api/nexus/broadcast/${list.id}/send`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: sendText.trim() }),
            });
            const data = await res.json();
            if (res.ok) {
                setSendResult({ sent: data.sent, total: data.total, skipped: (data.skipped || []).length });
                setSendText("");
            } else {
                setSendResult({ sent: 0, total: 0, skipped: 0 });
            }
        } finally { setSending(false); }
    }

    async function deleteList() {
        await fetch(`/api/nexus/broadcast/${list.id}`, { method: "DELETE" });
        onDeleted();
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-4">
                <button onClick={onBack} className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 flex items-center justify-center">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1">
                    <div className="font-black text-lg">{list.name}</div>
                    <div className="text-xs opacity-70">{members.length} qabul qiluvchi</div>
                </div>
                <button onClick={() => setConfirmDelete(true)} className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Send composer */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 p-4 mb-4">
                <textarea value={sendText} onChange={e => setSendText(e.target.value)} placeholder="Xabar yozing..."
                    className="w-full min-h-[80px] p-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none resize-none" maxLength={2000} />
                <div className="flex items-center justify-between mt-2">
                    <div className="text-xs opacity-60">{sendText.length} / 2000</div>
                    <button onClick={send} disabled={sending || !sendText.trim() || members.length === 0}
                        className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Yuborish ({members.length})
                    </button>
                </div>
                {sendResult && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        {sendResult.sent} yuborildi{sendResult.skipped > 0 ? ` (${sendResult.skipped} o'tkazildi — blok yoki privacy)` : ""}
                    </div>
                )}
            </div>

            {/* Members */}
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold opacity-80">Qabul qiluvchilar</div>
                <button onClick={() => setAddOpen(true)} className="h-8 px-3 rounded-lg bg-black/5 dark:bg-white/5 text-xs font-bold flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Qo'shish
                </button>
            </div>

            {loading && <div className="text-center py-4 opacity-60"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>}
            {!loading && members.length === 0 && (
                <div className="text-center py-10 opacity-60 text-xs">
                    Ro'yxat bo'sh. "Qo'shish" bilan foydalanuvchilarni qo'shing.
                </div>
            )}
            <div className="space-y-1">
                {members.map(m => (
                    <div key={m.profileId} className="p-3 rounded-xl bg-white/50 dark:bg-black/20 flex items-center gap-3">
                        {m.image
                            ? <img src={m.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                            : <div className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs font-bold">{(m.name || m.username || "?").charAt(0).toUpperCase()}</div>}
                        <div className="flex-1 min-w-0">
                            <div className="font-bold truncate">{m.name || m.username || "?"}</div>
                            {m.username && <div className="text-xs opacity-60 truncate">@{m.username}</div>}
                        </div>
                        <button onClick={() => removeMember(m.profileId)} className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-red-500 flex items-center justify-center">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {addOpen && <AddMembersModal listId={list.id} existing={new Set(members.map(m => m.profileId))} onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); load(); }} />}
            {confirmDelete && (
                <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
                    <div className="w-full max-w-sm p-5 rounded-2xl bg-white dark:bg-neutral-900" onClick={e => e.stopPropagation()}>
                        <div className="font-black mb-2">Ro'yxatni o'chirishmi?</div>
                        <div className="text-xs opacity-70 mb-4">"{list.name}" — bu amal qaytarilmaydi. Yuborilgan xabarlar saqlanadi.</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setConfirmDelete(false)} className="h-11 rounded-xl bg-black/5 dark:bg-white/5 text-sm font-bold">Bekor</button>
                            <button onClick={deleteList} className="h-11 rounded-xl bg-red-600 text-white text-sm font-bold">O'chirish</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AddMembersModal({ listId, existing, onClose, onAdded }: { listId: string; existing: Set<string>; onClose: () => void; onAdded: () => void }) {
    const [q, setQ] = useState("");
    const [results, setResults] = useState<UserResult[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (q.trim().length < 2) { setResults([]); return; }
        const t = setTimeout(() => {
            fetch(`/api/nexus/search?q=${encodeURIComponent(q.trim())}`)
                .then(r => r.json())
                .then(d => setResults((d.people || []).slice(0, 20)))
                .catch(() => setResults([]));
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    function toggle(id: string) {
        const s = new Set(selected);
        if (s.has(id)) s.delete(id); else s.add(id);
        setSelected(s);
    }

    async function add() {
        if (selected.size === 0 || busy) return;
        setBusy(true); setErr(null);
        try {
            const res = await fetch(`/api/nexus/broadcast/${listId}/members`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profileIds: [...selected] }),
            });
            const data = await res.json();
            if (!res.ok) { setErr(data?.error || "Xatolik"); setBusy(false); return; }
            onAdded();
        } catch { setErr("Tarmoq xatosi"); setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-lg max-h-[80vh] rounded-2xl bg-white dark:bg-neutral-900 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-black/10 dark:border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="font-black text-lg flex-1">Qabul qiluvchi qo'shish</div>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" />
                        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ism yoki @username..."
                            className="w-full h-11 pl-10 pr-3 rounded-xl bg-black/5 dark:bg-white/5 outline-none" autoFocus />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {results.length === 0 && q.trim().length >= 2 && <div className="text-center py-6 opacity-60 text-xs">Hech kim topilmadi</div>}
                    {results.length === 0 && q.trim().length < 2 && <div className="text-center py-6 opacity-60 text-xs">Kamida 2 belgi kiriting</div>}
                    {results.map(u => {
                        const alreadyIn = existing.has(u.id);
                        const isSel = selected.has(u.id);
                        return (
                            <button key={u.id} disabled={alreadyIn} onClick={() => toggle(u.id)}
                                className={`w-full p-3 rounded-xl flex items-center gap-3 text-left transition-colors ${alreadyIn ? "opacity-50" : isSel ? "bg-blue-500/15" : "hover:bg-black/5 dark:hover:bg-white/5"}`}>
                                {u.image
                                    ? <img src={u.image} alt="" className="w-9 h-9 rounded-full object-cover" />
                                    : <div className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs font-bold">{(u.name || u.username || "?").charAt(0).toUpperCase()}</div>}
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold truncate">{u.name || u.username || "?"}</div>
                                    {u.username && <div className="text-xs opacity-60 truncate">@{u.username}</div>}
                                </div>
                                {alreadyIn && <div className="text-xs opacity-60">Qo'shilgan</div>}
                                {!alreadyIn && isSel && <Check className="w-4 h-4 text-blue-500" />}
                            </button>
                        );
                    })}
                </div>
                {err && <div className="px-4 py-2 text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{err}</div>}
                <div className="p-4 border-t border-black/10 dark:border-white/10">
                    <button onClick={add} disabled={busy || selected.size === 0}
                        className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Qo'shish{selected.size > 0 ? ` (${selected.size})` : ""}
                    </button>
                </div>
            </div>
        </div>
    );
}
