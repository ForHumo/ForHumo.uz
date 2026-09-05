"use client";

// Universal search palette — Cmd/Ctrl+K bilan ochiladi.
// BN mahsulot + do'kon, Nexus user/video/track topadi.

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/routing";
import { Search, X, Loader2, Package, Store, MessageCircle, Film, Music, ChevronRight } from "lucide-react";

interface SearchItem {
    id: string;
    kind: "bn_product" | "bn_shop" | "nexus_user" | "nexus_video" | "nexus_track";
    title: string;
    subtitle?: string;
    image?: string;
    href: string;
}

const KIND_META: Record<string, { icon: typeof Package; color: string; label: string }> = {
    bn_product:  { icon: Package,        color: "#f5b301", label: "Mahsulot" },
    bn_shop:     { icon: Store,          color: "#f59e0b", label: "Do'kon" },
    nexus_user:  { icon: MessageCircle,  color: "#3b82f6", label: "Foydalanuvchi" },
    nexus_video: { icon: Film,           color: "#ec4899", label: "Video" },
    nexus_track: { icon: Music,          color: "#a855f7", label: "Trek" },
};

export function HumoSearchPalette({ trigger = "button" }: { trigger?: "button" | "hidden" }) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [q, setQ] = useState("");
    const [items, setItems] = useState<SearchItem[]>([]);
    const [busy, setBusy] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => { setMounted(true); }, []);

    // Cmd/Ctrl+K shortcut
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen(v => !v);
            }
            if (e.key === "Escape" && open) setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    const search = useCallback(async (query: string) => {
        if (query.length < 2) { setItems([]); return; }
        setBusy(true);
        try {
            const r = await fetch(`/api/user/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
            if (r.ok) {
                const j = await r.json();
                setItems(j.items || []);
            }
        } catch { /* skip */ }
        finally { setBusy(false); }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(q.trim()), 250);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [q, search]);

    if (!mounted) return null;

    const btn = trigger === "button" ? (
        <button onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-neutral-500">
            <Search className="w-4 h-4" />
            <span className="text-[12.5px] font-bold hidden sm:inline">Qidiruv</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 h-5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500">Ctrl K</kbd>
        </button>
    ) : null;

    return (
        <>
            {btn}
            {open && createPortal(
                <div className="fixed inset-0 z-[999] flex items-start justify-center pt-16 sm:pt-24 p-4"
                    style={{ background: "rgba(0,0,0,0.6)" }}
                    onClick={() => setOpen(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="w-full max-w-xl rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[70vh]">
                        {/* Input */}
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
                            {busy
                                ? <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                                : <Search className="w-4 h-4 text-neutral-500" />
                            }
                            <input ref={inputRef}
                                value={q} onChange={e => setQ(e.target.value)}
                                placeholder="Mahsulot, do'kon, video, foydalanuvchi..."
                                className="flex-1 h-9 bg-transparent focus:outline-none text-[14px] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400" />
                            <kbd className="hidden sm:inline-flex items-center px-1.5 h-5 rounded text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500">ESC</kbd>
                            <button onClick={() => setOpen(false)}
                                className="w-7 h-7 rounded-lg grid place-items-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <X className="w-3.5 h-3.5 text-neutral-500" />
                            </button>
                        </div>

                        {/* Results */}
                        <div className="flex-1 overflow-y-auto">
                            {q.length < 2 && (
                                <div className="p-6 text-center">
                                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-neutral-400" />
                                    <p className="text-[12.5px] text-neutral-500">Qidirish uchun 2+ harf yozing</p>
                                </div>
                            )}
                            {q.length >= 2 && !busy && items.length === 0 && (
                                <div className="p-6 text-center">
                                    <p className="text-[12.5px] text-neutral-500">Hech narsa topilmadi</p>
                                </div>
                            )}
                            {items.map(it => {
                                const meta = KIND_META[it.kind];
                                const Icon = meta.icon;
                                return (
                                    <Link key={it.id} href={it.href as never}
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-3 p-3 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition">
                                        {it.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={it.image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                                        ) : (
                                            <span className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0"
                                                style={{ background: meta.color + "22", color: meta.color }}>
                                                <Icon className="w-4 h-4" />
                                            </span>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-bold truncate">{it.title}</p>
                                            <p className="text-[11.5px] text-neutral-500 truncate">
                                                <span className="uppercase tracking-wider font-black" style={{ color: meta.color }}>{meta.label}</span>
                                                {it.subtitle && <> · {it.subtitle}</>}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-1.5 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2 text-[10.5px] text-neutral-500">
                            <kbd className="px-1 h-4 rounded bg-neutral-100 dark:bg-neutral-800 font-bold">Ctrl+K</kbd>
                            <span>ochish</span>
                            <span className="mx-2">·</span>
                            <kbd className="px-1 h-4 rounded bg-neutral-100 dark:bg-neutral-800 font-bold">ESC</kbd>
                            <span>yopish</span>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
