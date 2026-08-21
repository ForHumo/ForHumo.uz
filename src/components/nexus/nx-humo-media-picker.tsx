"use client";

// Universal Humo Media picker — chat/composer'da GIF/Sticker tanlash uchun.
// Reusable: Nexus DM, BN admin javob, boshqa modullar bir xil komponentdan
// foydalanadi. Modal ochiladi, foydalanuvchi qidiradi yoki o'z pack'idan
// tanlaydi, onSelect callback bilan URL qaytaradi.

import { useCallback, useEffect, useState } from "react";
import { X, Search, Loader2, UserPlus, ExternalLink, Package } from "lucide-react";

type Kind = "GIF" | "STICKER";

interface Item {
    id: string;
    mediaUrl: string;
    thumbUrl: string | null;
    width?: number;
    height?: number;
    keywords?: string[];
}
interface Pack {
    id: string;
    slug: string;
    name: string;
    kind: Kind;
    items?: Item[];
    _count?: { items: number };
    addedCount: number;
    ownerId: string;
    owner?: { username: string | null; humoId: string | null; name: string | null } | null;
    isOwner?: boolean;
    isSubscribed?: boolean;
    subscribed?: boolean;
}

interface SelectedMedia {
    kind: Kind;
    mediaUrl: string;
    thumbUrl: string | null;
    width: number;
    height: number;
}

interface Props {
    kind: Kind;
    onSelect: (m: SelectedMedia) => void;
    onClose: () => void;
}

export function NxHumoMediaPicker({ kind, onSelect, onClose }: Props) {
    const [tab, setTab] = useState<"mine" | "search">("mine");
    const [minePacks, setMinePacks] = useState<{ owned: Pack[]; subscribed: Pack[] }>({ owned: [], subscribed: [] });
    const [searchPacks, setSearchPacks] = useState<Pack[]>([]);
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);

    const loadMine = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/humo/user/packs?kind=${kind}`);
            if (r.ok) {
                const d = await r.json();
                setMinePacks({ owned: d.owned ?? [], subscribed: d.subscribed ?? [] });
            }
        } finally { setLoading(false); }
    }, [kind]);

    useEffect(() => { if (tab === "mine") void loadMine(); }, [tab, loadMine]);

    // Search — debounce 250ms
    useEffect(() => {
        if (tab !== "search") return;
        const query = q.trim();
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const url = query
                    ? `/api/humo/packs/search?kind=${kind}&q=${encodeURIComponent(query)}&limit=30`
                    : `/api/humo/packs/search?kind=${kind}&limit=30`;
                const r = await fetch(url);
                if (r.ok) {
                    const d = await r.json();
                    setSearchPacks(d.packs ?? []);
                }
            } finally { setLoading(false); }
        }, 250);
        return () => clearTimeout(t);
    }, [tab, q, kind]);

    async function subscribe(slug: string) {
        await fetch(`/api/humo/packs/${slug}/subscribe`, { method: "POST" });
        // Search'ni ham yangilaymiz — badge o'zgaradi
        if (tab === "search") {
            setSearchPacks(prev => prev.map(p => p.slug === slug ? { ...p, isSubscribed: true } : p));
        }
    }

    function pick(item: Item) {
        onSelect({
            kind,
            mediaUrl: item.mediaUrl,
            thumbUrl: item.thumbUrl,
            width: item.width ?? 0,
            height: item.height ?? 0,
        });
    }

    const kindLabel = kind === "GIF" ? "GIF" : "Sticker";
    const allMine = [...minePacks.owned, ...minePacks.subscribed];

    return (
        <div className="fixed inset-0 z-[200]">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="absolute inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:bottom-16 sm:w-[420px] max-h-[80vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden bg-neutral-900 border border-white/10">
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
                    <button onClick={() => setTab("mine")}
                        className="h-8 px-3 rounded-lg text-[12px] font-black transition-colors"
                        style={{ background: tab === "mine" ? "#fff" : "transparent", color: tab === "mine" ? "#111" : "#aaa" }}>
                        Meniki
                    </button>
                    <button onClick={() => setTab("search")}
                        className="h-8 px-3 rounded-lg text-[12px] font-black transition-colors"
                        style={{ background: tab === "search" ? "#fff" : "transparent", color: tab === "search" ? "#111" : "#aaa" }}>
                        Qidiruv
                    </button>
                    <a href={`/nexus/agent/${kind.toLowerCase()}`} target="_blank" rel="noopener"
                        className="ml-auto h-8 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-white/60 hover:bg-white/5">
                        <ExternalLink className="w-3 h-3" /> Boshqarish
                    </a>
                    <button onClick={onClose} aria-label="Yopish"
                        className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Search input — faqat qidiruv tabida */}
                {tab === "search" && (
                    <div className="px-3 py-2 border-b border-white/10 relative">
                        <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        <input type="search" value={q} onChange={e => setQ(e.target.value)}
                            placeholder={`${kindLabel} qidirish (nom, @username, kalit)...`}
                            autoFocus
                            className="w-full h-9 pl-9 pr-3 rounded-lg text-[12.5px] bg-white/5 border border-white/10 outline-none focus:border-white/30 text-white" />
                    </div>
                )}

                {/* Kontent */}
                <div className="flex-1 overflow-y-auto p-3">
                    {loading ? (
                        <div className="grid place-items-center py-10">
                            <Loader2 className="w-5 h-5 animate-spin text-white/40" />
                        </div>
                    ) : tab === "mine" ? (
                        allMine.length === 0 ? (
                            <EmptyMine kind={kind} />
                        ) : (
                            <div className="space-y-4">
                                {allMine.map(pack => (
                                    <PackRow key={pack.id} pack={pack} onPick={pick} />
                                ))}
                            </div>
                        )
                    ) : (
                        searchPacks.length === 0 ? (
                            <p className="text-center text-[12.5px] text-white/50 py-8">
                                {q ? `"${q}" bo'yicha topilmadi` : "Trending pack'lar hozircha yo'q"}
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {searchPacks.map(pack => (
                                    <PackRow key={pack.id} pack={pack} onPick={pick} onSubscribe={pack.isSubscribed ? undefined : () => subscribe(pack.slug)} />
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

function PackRow({ pack, onPick, onSubscribe }: {
    pack: Pack; onPick: (i: Item) => void; onSubscribe?: () => void;
}) {
    const items = pack.items ?? [];
    return (
        <div>
            <div className="flex items-center gap-2 mb-2">
                <Package className="w-3 h-3 text-white/40 flex-shrink-0" />
                <p className="text-[11.5px] font-black text-white/80 truncate">{pack.name}</p>
                {pack.owner?.username && (
                    <span className="text-[10px] text-white/40 truncate">@{pack.owner.username}</span>
                )}
                <span className="ml-auto text-[10px] text-white/40 tabular-nums">{items.length}</span>
                {onSubscribe && (
                    <button onClick={onSubscribe}
                        className="h-6 px-2 rounded-md text-[10px] font-black flex items-center gap-1 bg-white text-neutral-950">
                        <UserPlus className="w-2.5 h-2.5" /> Qo&apos;sh
                    </button>
                )}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
                {items.slice(0, 20).map(it => (
                    <button key={it.id} onClick={() => onPick(it)}
                        aria-label={it.keywords?.join(", ") ?? "item"}
                        className="aspect-square rounded-md overflow-hidden bg-neutral-800 hover:bg-neutral-700 transition-colors active:scale-95">
                        {pack.kind === "GIF" ? (
                            it.thumbUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={it.thumbUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                                <video src={it.mediaUrl} muted playsInline preload="metadata"
                                    className="w-full h-full object-cover" />
                            )
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.mediaUrl} alt="" loading="lazy" className="w-full h-full object-contain" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

function EmptyMine({ kind }: { kind: Kind }) {
    const label = kind === "GIF" ? "GIF" : "Sticker";
    return (
        <div className="py-8 text-center">
            <p className="text-[12.5px] text-white/60">
                Hali {label.toLowerCase()} pack yaratmagansiz.
            </p>
            <a href={`/nexus/agent/${kind.toLowerCase()}`} target="_blank" rel="noopener"
                className="inline-flex items-center gap-1.5 mt-3 h-9 px-4 rounded-lg text-[12px] font-black bg-white text-neutral-950">
                <ExternalLink className="w-3.5 h-3.5" />
                Agent'ga o&apos;tish
            </a>
        </div>
    );
}
