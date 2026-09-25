"use client";

// Yangi shaxsiy guruh (Guruh chat) yaratish modali.
// Mavjud NexusChannel infratuzilmasiga ulanadi: POST /api/nexus/channels
// { type: "GROUP", isPrivate: true, name, memberIds } — a'zolar darhol qo'shiladi.
// Barcha kanal xususiyatlari (reaksiya, edit, poll, moderatsiya) darhol mavjud.

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Users, Loader2, Check, UserCheck, Bot as BotIcon, FolderPlus } from "lucide-react";

interface Contact {
    profileId: string;
    name: string | null;
    username: string | null;
    image: string | null;
}

interface Folder {
    id: string;
    name: string;
    emoji: string | null;
    color: string | null;
}

interface Props {
    onClose: () => void;
    onCreated: (id: string) => void;
}

export function NxGroupCreateModal({ onClose, onCreated }: Props) {
    const [title, setTitle] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [folderId, setFolderId] = useState<string | null>(null);

    useEffect(() => {
        let stop = false;
        (async () => {
            try {
                const [conRes, foldRes] = await Promise.all([
                    fetch("/api/nexus/messages"),
                    fetch("/api/nexus/folders"),
                ]);
                if (conRes.ok && !stop) {
                    const d = await conRes.json();
                    const list: Contact[] = [];
                    const seen = new Set<string>();
                    for (const c of d?.conversations ?? []) {
                        if (c.other?.id && !seen.has(c.other.id)) {
                            seen.add(c.other.id);
                            list.push({
                                profileId: c.other.id,
                                name: c.other.name ?? null,
                                username: c.other.username ?? null,
                                image: c.other.image ?? null,
                            });
                        }
                    }
                    setContacts(list);
                }
                if (foldRes.ok && !stop) {
                    const d = await foldRes.json();
                    setFolders(d?.items ?? []);
                }
            } catch {
                // Ignore load error
            } finally {
                if (!stop) setLoadingContacts(false);
            }
        })();
        return () => { stop = true; };
    }, []);

    function toggleSelect(id: string) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else {
                if (next.size >= 499) return prev; // max 499 peers + creator = 500
                next.add(id);
            }
            return next;
        });
    }

    async function submit() {
        const cleanTitle = title.trim();
        if (cleanTitle.length < 2 || cleanTitle.length > 64) {
            setErr("Guruh nomi 2 dan 64 belgiegacha bo'lishi kerak");
            return;
        }
        if (selectedIds.size < 1) {
            setErr("Kamida 1 ta a'zo tanlang (jami 2-500 kishi)");
            return;
        }

        setBusy(true);
        setErr(null);
        try {
            const r = await fetch("/api/nexus/channels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "GROUP",
                    isPrivate: true,
                    name: cleanTitle,
                    memberIds: Array.from(selectedIds),
                }),
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok && d?.channel?.id) {
                // Papka tanlangan bo'lsa — yangi guruhni papkaga qo'shamiz
                if (folderId) {
                    fetch(`/api/nexus/folders/${folderId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ addChatId: d.channel.id }),
                    }).catch(() => { /* muvaffaqiyatsiz bo'lsa jim */ });
                }
                onCreated(d.channel.id);
                onClose();
            } else {
                setErr(d?.error ?? "Guruh yaratib bo'lmadi");
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(3,7,25,0.75)", backdropFilter: "blur(6px)" }}
            onClick={() => !busy && onClose()}>
            <div onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "var(--nx-bg)", border: "1px solid rgb(var(--nx-accent-rgb) / 0.30)", maxHeight: "85vh" }}>
                {/* Header */}
                <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: "rgb(var(--nx-accent-rgb) / 0.20)" }}>
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" style={{ color: "var(--nx-accent)" }} />
                        <p className="text-sm font-black" style={{ color: "rgb(var(--nx-text-rgb)/0.95)" }}>
                            Yangi guruh suhbati
                        </p>
                    </div>
                    <button onClick={onClose} disabled={busy}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/[0.06]">
                        <X className="w-4 h-4" style={{ color: "rgb(var(--nx-text-2-rgb)/0.85)" }} />
                    </button>
                </div>

                {/* Sarlavha input */}
                <div className="p-4 space-y-3 border-b" style={{ borderColor: "rgb(var(--nx-accent-rgb) / 0.15)" }}>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgb(var(--nx-text-2-rgb)/0.65)" }}>
                            Guruh nomi
                        </label>
                        <input value={title} onChange={e => setTitle(e.target.value)}
                            maxLength={64} autoFocus placeholder="Do'stlar guruhi..."
                            className="w-full h-10 px-3 mt-1 rounded-lg bg-transparent text-[var(--nx-text)] text-sm focus:outline-none"
                            style={{ border: "1px solid rgb(var(--nx-accent-rgb) / 0.30)" }} />
                    </div>
                    {folders.length > 0 && (
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                                style={{ color: "rgb(var(--nx-text-2-rgb)/0.65)" }}>
                                <FolderPlus className="w-3 h-3" /> Papka (ixtiyoriy)
                            </label>
                            <div className="mt-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
                                <button type="button" onClick={() => setFolderId(null)}
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 transition"
                                    style={folderId === null ? {
                                        background: "rgb(var(--nx-accent-rgb) / 0.14)",
                                        color: "var(--nx-accent)",
                                        border: "1px solid rgb(var(--nx-accent-rgb) / 0.35)",
                                    } : {
                                        background: "rgb(var(--nx-accent-rgb) / 0.06)",
                                        color: "rgb(var(--nx-text-2-rgb)/0.75)",
                                        border: "1px solid rgb(var(--nx-accent-rgb) / 0.20)",
                                    }}>
                                    Yo&apos;q
                                </button>
                                {folders.map(f => {
                                    const sel = folderId === f.id;
                                    return (
                                        <button key={f.id} type="button" onClick={() => setFolderId(f.id)}
                                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 transition flex items-center gap-1"
                                            style={sel ? {
                                                background: "rgb(var(--nx-accent-rgb) / 0.14)",
                                                color: "var(--nx-accent)",
                                                border: "1px solid rgb(var(--nx-accent-rgb) / 0.35)",
                                            } : {
                                                background: "rgb(var(--nx-accent-rgb) / 0.06)",
                                                color: "rgb(var(--nx-text-2-rgb)/0.85)",
                                                border: "1px solid rgb(var(--nx-accent-rgb) / 0.20)",
                                            }}>
                                            {f.emoji && <span>{f.emoji}</span>}
                                            {f.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* A'zolar tanlash ro'yxati */}
                <div className="p-4 flex-1 overflow-y-auto space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgb(var(--nx-text-2-rgb)/0.65)" }}>
                            A&apos;zolarni tanlang
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: "var(--nx-accent)" }}>
                            {selectedIds.size} / 499 tanlandi
                        </span>
                    </div>

                    {loadingContacts ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--nx-accent)" }} />
                        </div>
                    ) : contacts.length === 0 ? (
                        <p className="text-xs text-center py-6" style={{ color: "rgb(var(--nx-text-2-rgb)/0.60)" }}>
                            Yozishgan kontaktlar topilmadi
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {contacts.map(c => {
                                const isSelected = selectedIds.has(c.profileId);
                                return (
                                    <button
                                        key={c.profileId}
                                        type="button"
                                        onClick={() => toggleSelect(c.profileId)}
                                        className="w-full flex items-center gap-3 p-2 rounded-xl transition text-left"
                                        style={{
                                            background: isSelected ? "rgb(var(--nx-accent-rgb) / 0.12)" : "rgb(var(--nx-accent-rgb) / 0.06)",
                                            border: `1px solid ${isSelected ? "rgb(var(--nx-accent-rgb) / 0.40)" : "transparent"}`,
                                        }}
                                    >
                                        {c.image ? (
                                            <Image src={c.image} alt="" width={36} height={36} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ background: "rgb(var(--nx-accent-rgb) / 0.20)" }}>
                                                <BotIcon className="w-4 h-4" style={{ color: "rgb(var(--nx-text-2-rgb)/0.85)" }} />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold truncate text-[var(--nx-text)]">
                                                {c.name || c.username || "Foydalanuvchi"}
                                            </p>
                                            {c.username && (
                                                <p className="text-[10px] truncate" style={{ color: "rgb(var(--nx-text-2-rgb)/0.65)" }}>
                                                    @{c.username}
                                                </p>
                                            )}
                                        </div>
                                        <div
                                            className="w-5 h-5 rounded-md flex items-center justify-center transition"
                                            style={{
                                                background: isSelected ? "var(--nx-accent)" : "rgb(var(--nx-accent-rgb) / 0.20)",
                                                border: `1px solid ${isSelected ? "var(--nx-accent)" : "rgb(var(--nx-accent-rgb) / 0.40)"}`,
                                            }}
                                        >
                                            {isSelected && <Check className="w-3 h-3 text-black font-black" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {err && (
                    <div className="px-4 pb-2">
                        <p className="text-xs" style={{ color: "#EF4444" }}>{err}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t flex items-center gap-2" style={{ borderColor: "rgb(var(--nx-accent-rgb) / 0.15)" }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-[var(--nx-text)] transition disabled:opacity-40"
                        style={{ background: "rgb(var(--nx-accent-rgb) / 0.10)" }}
                    >
                        Bekor
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy || !title.trim() || selectedIds.size < 1}
                        className="flex-1 py-2.5 rounded-xl text-xs font-black text-[var(--nx-text)] transition disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: "var(--nx-accent)" }}
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                        Guruh yaratish
                    </button>
                </div>
            </div>
        </div>
    );
}
