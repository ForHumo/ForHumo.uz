"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/routing";
import { Bell, Check, ArrowLeftRight, UserPlus, LogOut, Trophy, Info } from "lucide-react";

interface Item { id: string; type: string; title: string; body: string | null; href: string | null; read: boolean; createdAt: string }

const ICON: Record<string, typeof Bell> = {
    TRANSFER_OFFER: ArrowLeftRight, TRANSFER_FEE: ArrowLeftRight, TRANSFER_DONE: ArrowLeftRight,
    JOIN_REQUEST: UserPlus, JOIN_RESULT: UserPlus, LEAVE_REQ: LogOut, KICK_REQ: LogOut,
    TEAM_DELETE_REQ: Trophy, REQ_RESULT: Info,
};

function ago(iso: string) {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (d < 60) return "hozir";
    if (d < 3600) return `${Math.floor(d / 60)} daq`;
    if (d < 86400) return `${Math.floor(d / 3600)} soat`;
    return `${Math.floor(d / 86400)} kun`;
}

export default function EsportNotifications() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<Item[]>([]);
    const [unread, setUnread] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const load = useCallback(() => {
        fetch("/api/esport/notifications").then(r => r.json()).then(d => { setItems(d.items || []); setUnread(d.unread || 0); }).catch(() => { });
    }, []);

    useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    async function markAll() {
        await fetch("/api/esport/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => { });
        setUnread(0); setItems(prev => prev.map(i => ({ ...i, read: true })));
    }
    async function markOne(id: string) {
        await fetch("/api/esport/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => { });
        setUnread(u => Math.max(0, u - 1)); setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));
    }

    return (
        <div ref={ref} className="relative">
            <button onClick={() => { setOpen(o => !o); if (!open) load(); }} className="relative flex h-8 w-8 items-center justify-center rounded-full es-soft" title="Bildirishnomalar">
                <Bell className="h-4 w-4 es-fg" />
                {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{unread > 9 ? "9+" : unread}</span>}
            </button>

            {open && (
                <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-2xl border es-bd shadow-2xl" style={{ background: "var(--es-card)", backdropFilter: "blur(20px)" }}>
                    <div className="flex items-center justify-between border-b es-bd px-4 py-2.5">
                        <p className="text-sm font-black es-fg">Bildirishnomalar</p>
                        {unread > 0 && <button onClick={markAll} className="flex items-center gap-1 text-[11px] font-bold es-accent-text"><Check className="h-3.5 w-3.5" /> Hammasi o'qildi</button>}
                    </div>
                    <div className="max-h-96 overflow-y-auto nx-hide-scrollbar">
                        {items.length === 0 ? (
                            <p className="py-10 text-center text-xs es-faint">Bildirishnoma yo'q</p>
                        ) : items.map(n => {
                            const Icon = ICON[n.type] || Bell;
                            const inner = (
                                <div className={`flex gap-3 px-4 py-3 ${n.read ? "" : "es-soft"}`}>
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg es-accent-bg"><Icon className="h-4 w-4 text-white" /></div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold es-fg">{n.title}</p>
                                        {n.body && <p className="text-[11px] es-mut">{n.body}</p>}
                                        <p className="mt-0.5 text-[10px] es-faint">{ago(n.createdAt)}</p>
                                    </div>
                                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                                </div>
                            );
                            return n.href
                                ? <Link key={n.id} href={n.href} onClick={() => { markOne(n.id); setOpen(false); }} className="block border-b es-bd last:border-0">{inner}</Link>
                                : <button key={n.id} onClick={() => markOne(n.id)} className="block w-full border-b es-bd text-left last:border-0">{inner}</button>;
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
