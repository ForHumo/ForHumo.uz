"use client";

// Owner: worker'lar boshqaruvi. @username orqali qo'shadi, ID orqali saqlanadi.

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Loader2, UserPlus, Trash2, ArrowLeft, Users } from "lucide-react";

type Worker = {
    id: string; profileId: string;
    username: string | null; name: string | null;
    image: string | null; humoId: string | null;
    addedBy?: string | null; createdAt: string;
};

export function MarketWorkersAdmin() {
    const [items, setItems] = useState<Worker[]>([]);
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch("/api/market/admin/workers", { cache: "no-store" });
            if (r.ok) { const j = await r.json(); setItems(j.items ?? []); }
        } finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    async function add(e: React.FormEvent) {
        e.preventDefault();
        const u = username.trim().replace(/^@/, "");
        if (!u) return;
        setBusy(true); setError(null);
        try {
            const r = await fetch("/api/market/admin/workers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: u }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) { setError(d.error || "Qo'shib bo'lmadi"); return; }
            setUsername("");
            load();
        } finally { setBusy(false); }
    }

    async function remove(id: string) {
        if (!confirm("Worker huquqidan mahrum qilinsinmi?")) return;
        const r = await fetch(`/api/market/admin/workers/${id}`, { method: "DELETE" });
        if (r.ok) load();
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center gap-2 mb-6">
                <Link href="/market/admin" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.05]">
                    <ArrowLeft size={18} className="text-gray-500 dark:text-white/50" />
                </Link>
                <div>
                    <h1 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Users size={20} /> Worker'lar
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-white/50">
                        Qo'shilgan foydalanuvchilar Market admin panelidan foydalana oladi
                    </p>
                </div>
            </div>

            <form onSubmit={add} className="mb-6 flex gap-2 p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.05]">
                    <span className="text-gray-400 text-sm">@</span>
                    <input
                        value={username}
                        onChange={e => setUsername(e.target.value.replace(/^@/, ""))}
                        placeholder="username"
                        className="flex-1 bg-transparent text-sm focus:outline-none text-gray-900 dark:text-white"
                    />
                </div>
                <button
                    type="submit"
                    disabled={busy || username.trim().length < 2}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-40 flex items-center gap-2"
                >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    Qo'shish
                </button>
            </form>
            {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] overflow-hidden">
                {loading && items.length === 0 ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
                ) : items.length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-500 dark:text-white/50">
                        Hali worker'lar yo'q
                    </div>
                ) : items.map(w => (
                    <div key={w.id} className="flex items-center gap-3 p-4 border-b last:border-b-0 border-gray-100 dark:border-white/[0.04]">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-white/[0.05] flex items-center justify-center shrink-0">
                            {w.image ? (
                                <Image src={w.image} alt="" width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm font-bold text-gray-500">{(w.name ?? w.username ?? "?")[0]?.toUpperCase()}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {w.name ?? (w.username ? `@${w.username}` : "Ismsiz")}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-white/50">
                                {w.username ? `@${w.username}` : ""} {w.humoId ? `• ${w.humoId}` : ""}
                            </div>
                        </div>
                        <button
                            onClick={() => remove(w.id)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                            title="Olib tashlash"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
