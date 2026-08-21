"use client";

// Nexus GIF / Sticker "Agent" boshqaruv sahifasi.
// Foydalanuvchi o'z pack'larini yaratadi, item yuklaydi, o'chirib boshqaradi;
// obuna bo'lgan pack'larini ham ko'radi.
// /nexus/agent/gif va /nexus/agent/sticker sahifalari — bir komponent, kind prop.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload as blobUpload } from "@vercel/blob/client";
import {
    Loader2, Plus, X, Trash2, Upload, Package, Sparkles, Search,
    UserPlus, UserCheck, ArrowLeft, Image as ImageIcon, Film,
} from "lucide-react";

type Kind = "GIF" | "STICKER";

interface Item {
    id: string;
    mediaUrl: string;
    thumbUrl: string | null;
    keywords: string[];
    width: number;
    height: number;
}
interface Pack {
    id: string;
    slug: string;
    name: string;
    coverUrl: string | null;
    kind: Kind;
    addedCount: number;
    usesCount: number;
    ownerId: string;
    isPublic: boolean;
    items?: Item[];
    _count?: { items: number };
    isOwner?: boolean;
    isSubscribed?: boolean;
    subscribed?: boolean;     // detail endpoint'da shu nom bilan qaytadi
    owner?: { username: string | null; humoId: string | null; name: string | null; image: string | null } | null;
}

const ACCEPT: Record<Kind, string> = {
    GIF: "video/mp4,video/webm,video/quicktime",
    STICKER: "image/png,image/webp",
};

const GIF_MAX_BYTES = 8 * 1024 * 1024;
const STICKER_MAX_BYTES = 1 * 1024 * 1024;

export function NxHumoMediaManager({ kind }: { kind: Kind }) {
    const router = useRouter();
    const [owned, setOwned] = useState<Pack[]>([]);
    const [subs, setSubs] = useState<Pack[]>([]);
    const [loading, setLoading] = useState(true);
    const [openPack, setOpenPack] = useState<Pack | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/humo/user/packs?kind=${kind}`);
            if (!r.ok) { setLoading(false); return; }
            const d = await r.json();
            setOwned(d.owned ?? []);
            setSubs(d.subscribed ?? []);
        } finally { setLoading(false); }
    }, [kind]);

    useEffect(() => { void load(); }, [load]);

    const kindLabel = kind === "GIF" ? "GIF" : "Sticker";
    const KindIcon = kind === "GIF" ? Film : Sparkles;

    return (
        <div className="absolute inset-0 overflow-y-auto bg-neutral-950 text-white">
            {/* Sarlavha */}
            <header className="sticky top-0 z-10 backdrop-blur-md bg-neutral-950/85 border-b border-white/10">
                <div className="max-w-[880px] mx-auto flex items-center gap-3 px-4 h-14">
                    <button onClick={() => router.back()}
                        aria-label="Orqaga"
                        className="w-8 h-8 grid place-items-center rounded-lg hover:bg-white/5">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-8 rounded-lg grid place-items-center bg-white/10">
                        <KindIcon className="w-4 h-4" />
                    </div>
                    <h1 className="text-[15px] font-black flex-1">@{kind.toLowerCase()} — {kindLabel} Agent</h1>
                    <button onClick={() => setCreateOpen(true)}
                        className="h-8 px-3 rounded-lg text-[12.5px] font-black flex items-center gap-1.5 bg-white text-neutral-950">
                        <Plus className="w-3.5 h-3.5" /> Pack
                    </button>
                </div>
            </header>

            <div className="max-w-[880px] mx-auto px-4 py-6">
                {/* Yordam */}
                <div className="mb-6 p-4 rounded-2xl border border-white/10 bg-white/5">
                    <p className="text-[13px] leading-relaxed text-white/70">
                        Pack yaratib, o'z {kindLabel.toLowerCase()}'laringizni yuklang.
                        {" "}Har {kindLabel.toLowerCase()} chatlarda qidiruv orqali topiladi
                        (nom, kalit so'zlar yoki muallif @username bo'yicha). 18+ kontent
                        avtomatik AI moderatsiya orqali bloklanadi.
                    </p>
                </div>

                {loading ? (
                    <div className="grid place-items-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                    </div>
                ) : (
                    <>
                        {/* O'z pack'larim */}
                        <SectionHeader icon={<Package className="w-4 h-4" />} label={`Mening ${kindLabel.toLowerCase()} pack'larim`} count={owned.length} />
                        {owned.length === 0 ? (
                            <EmptyState label="Hali pack yaratmagansiz" cta="Yangi pack" onCta={() => setCreateOpen(true)} />
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                                {owned.map(p => <PackCard key={p.id} pack={p} onOpen={() => setOpenPack(p)} />)}
                            </div>
                        )}

                        {/* Obuna bo'lganlarim */}
                        <SectionHeader icon={<UserCheck className="w-4 h-4" />} label="Qo'shilgan pack'lar" count={subs.length} />
                        {subs.length === 0 ? (
                            <EmptyState label="Hech qanday pack qo'shilmagan" hint="Chatda pack qidirib, 'Qo'shish' bosing" />
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {subs.map(p => <PackCard key={p.id} pack={p} onOpen={() => setOpenPack(p)} />)}
                            </div>
                        )}
                    </>
                )}
            </div>

            {createOpen && (
                <CreatePackModal
                    kind={kind}
                    onClose={() => setCreateOpen(false)}
                    onCreated={() => { setCreateOpen(false); void load(); }}
                />
            )}

            {openPack && (
                <PackDetailModal
                    slug={openPack.slug}
                    onClose={() => { setOpenPack(null); void load(); }}
                />
            )}
        </div>
    );
}

// ── Sub-komponentlar ────────────────────────────────────────────────────────

function SectionHeader({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <span className="text-white/60">{icon}</span>
            <h2 className="text-[13px] font-black uppercase tracking-wider text-white/70">{label}</h2>
            <span className="text-[11px] tabular-nums text-white/40">{count}</span>
        </div>
    );
}

function EmptyState({ label, cta, onCta, hint }: { label: string; cta?: string; onCta?: () => void; hint?: string }) {
    return (
        <div className="mb-8 p-6 rounded-2xl border border-white/10 border-dashed text-center">
            <p className="text-[13px] text-white/60">{label}</p>
            {hint && <p className="text-[11.5px] text-white/40 mt-1">{hint}</p>}
            {cta && onCta && (
                <button onClick={onCta}
                    className="mt-3 h-9 px-4 rounded-lg text-[12.5px] font-black bg-white text-neutral-950 inline-flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> {cta}
                </button>
            )}
        </div>
    );
}

function PackCard({ pack, onOpen }: { pack: Pack; onOpen: () => void }) {
    const items = pack.items?.slice(0, 4) ?? [];
    const showCover = pack.coverUrl && items.length === 0;
    return (
        <button onClick={onOpen}
            className="text-left rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-colors active:scale-[0.99]">
            <div className="aspect-square grid grid-cols-2 gap-0.5 p-0.5 bg-neutral-900">
                {showCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pack.coverUrl!} alt="" className="col-span-2 row-span-2 w-full h-full object-cover" />
                ) : items.length === 0 ? (
                    <div className="col-span-2 row-span-2 grid place-items-center text-white/30">
                        <ImageIcon className="w-8 h-8" />
                    </div>
                ) : (
                    <>
                        {items.map(it => (
                            <div key={it.id} className="relative aspect-square bg-neutral-800 overflow-hidden">
                                {pack.kind === "GIF" ? (
                                    it.thumbUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={it.thumbUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                                    ) : (
                                        <video src={it.mediaUrl} muted playsInline
                                            className="w-full h-full object-cover" preload="metadata" />
                                    )
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={it.mediaUrl} alt="" loading="lazy" className="w-full h-full object-contain" />
                                )}
                            </div>
                        ))}
                    </>
                )}
            </div>
            <div className="p-3">
                <p className="text-[13px] font-black truncate">{pack.name}</p>
                <p className="text-[11px] text-white/50 mt-0.5 flex items-center gap-1.5">
                    <span>{pack._count?.items ?? 0} ta</span>
                    {pack.addedCount > 0 && <><span>·</span><span>{pack.addedCount} qo'shdi</span></>}
                </p>
            </div>
        </button>
    );
}

function CreatePackModal({ kind, onClose, onCreated }: { kind: Kind; onClose: () => void; onCreated: () => void }) {
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit() {
        if (name.trim().length < 2) { setErr("Nom kamida 2 belgi"); return; }
        setBusy(true); setErr(null);
        try {
            const r = await fetch("/api/humo/packs", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ kind, name: name.trim() }),
            });
            const d = await r.json();
            if (!r.ok) { setErr(d?.error ?? "Xatolik"); return; }
            onCreated();
        } catch (e) { setErr(String(e)); }
        finally { setBusy(false); }
    }

    return (
        <Modal onClose={onClose}>
            <h2 className="text-[16px] font-black mb-4">Yangi {kind === "GIF" ? "GIF" : "Sticker"} pack</h2>
            <label className="block mb-4">
                <span className="text-[11.5px] font-bold text-white/60">Pack nomi</span>
                <input type="text" value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={60}
                    autoFocus
                    placeholder="Masalan: Mushuklar"
                    className="w-full mt-1 h-10 px-3 rounded-lg text-[13px] font-bold bg-white/5 border border-white/10 outline-none focus:border-white/30" />
            </label>
            {err && <p className="text-[12px] text-red-400 mb-3">{err}</p>}
            <div className="flex items-center justify-end gap-2">
                <button onClick={onClose} disabled={busy}
                    className="h-9 px-3 rounded-lg text-[12.5px] font-bold text-white/60">Bekor</button>
                <button onClick={submit} disabled={busy || name.trim().length < 2}
                    className="h-9 px-4 rounded-lg text-[12.5px] font-black flex items-center gap-1.5 bg-white text-neutral-950 disabled:opacity-40">
                    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Yaratish
                </button>
            </div>
        </Modal>
    );
}

function PackDetailModal({ slug, onClose }: { slug: string; onClose: () => void }) {
    const [pack, setPack] = useState<Pack | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadErr, setUploadErr] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        const r = await fetch(`/api/humo/packs/${slug}`);
        if (r.ok) {
            const d = await r.json();
            setPack(d.pack);
        }
    }, [slug]);
    useEffect(() => { void load(); }, [load]);

    async function uploadFile(file: File) {
        if (!pack) return;
        setUploadErr(null);
        setUploading(true);
        setProgress(0);
        try {
            const max = pack.kind === "GIF" ? GIF_MAX_BYTES : STICKER_MAX_BYTES;
            if (file.size > max) {
                setUploadErr(`Fayl juda katta (max ${(max / 1024 / 1024).toFixed(0)} MB)`);
                return;
            }

            // 1) Media faylni Vercel Blob'ga to'g'ridan yuklaymiz
            const mediaBlob = await blobUpload(`humo-media/${slug}/${Date.now()}-${file.name}`, file, {
                access: "public",
                handleUploadUrl: "/api/market/upload/client-token",
                onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
            });

            // 2) Metadata + thumbnail
            let width = 0, height = 0, thumbUrl: string | null = null;
            if (pack.kind === "STICKER") {
                const dim = await imageDimensions(file);
                width = dim.w; height = dim.h;
            } else {
                const meta = await videoMetadataAndThumb(file);
                width = meta.width; height = meta.height;
                if (meta.thumbBlob) {
                    const thumbUp = await blobUpload(`humo-media/${slug}/thumb-${Date.now()}.webp`,
                        meta.thumbBlob, {
                            access: "public",
                            handleUploadUrl: "/api/market/upload/client-token",
                        });
                    thumbUrl = thumbUp.url;
                }
            }

            // 3) Keywords — foydalanuvchidan so'raymiz
            const kwRaw = window.prompt(
                pack.kind === "STICKER"
                    ? "Kalit so'zlar (majburiy) — emoji va so'zlar, vergul bilan ajrating.\nMasalan: kulish, 🎉, hurrah"
                    : "Kalit so'zlar (topilishi uchun) — vergul bilan ajrating.\nMasalan: qiziq, kulgi, meme",
                ""
            );
            const keywords = (kwRaw ?? "")
                .split(",")
                .map(s => s.trim())
                .filter(Boolean)
                .slice(0, 20);

            if (pack.kind === "STICKER" && keywords.length === 0) {
                setUploadErr("Sticker uchun kamida 1 kalit so'z majburiy");
                return;
            }

            // 4) Item metadata endpoint'ga
            const r = await fetch(`/api/humo/packs/${slug}/items`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    mediaUrl: mediaBlob.url,
                    thumbUrl,
                    width, height, bytes: file.size, keywords,
                }),
            });
            const d = await r.json();
            if (!r.ok) { setUploadErr(d?.error ?? "Xatolik"); return; }

            void load();
        } catch (e) { setUploadErr(String(e)); }
        finally { setUploading(false); setProgress(0); }
    }

    async function deleteItem(id: string) {
        if (!confirm("Item o'chirilsinmi?")) return;
        await fetch(`/api/humo/packs/${slug}/items/${id}`, { method: "DELETE" });
        void load();
    }

    async function deletePack() {
        if (!pack) return;
        if (!confirm(`"${pack.name}" pack va uning barcha ${pack.items?.length ?? 0} item'i o'chirilsinmi?`)) return;
        await fetch(`/api/humo/packs/${slug}`, { method: "DELETE" });
        onClose();
    }

    async function subscribe() {
        await fetch(`/api/humo/packs/${slug}/subscribe`, { method: "POST" });
        void load();
    }
    async function unsubscribe() {
        await fetch(`/api/humo/packs/${slug}/subscribe`, { method: "DELETE" });
        void load();
    }

    if (!pack) {
        return (
            <Modal onClose={onClose}>
                <div className="grid place-items-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
            </Modal>
        );
    }

    return (
        <Modal onClose={onClose} wide>
            <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 min-w-0">
                    <h2 className="text-[16px] font-black truncate">{pack.name}</h2>
                    <p className="text-[11.5px] text-white/50 mt-0.5">
                        {pack.owner?.username ? `@${pack.owner.username}` : pack.owner?.name ?? ""}
                        {" · "}{pack.items?.length ?? 0} ta · {pack.addedCount} qo'shdi
                    </p>
                </div>
                {pack.isOwner ? (
                    <button onClick={deletePack}
                        className="h-8 px-3 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5 bg-red-500/20 text-red-300">
                        <Trash2 className="w-3.5 h-3.5" /> Pack o'chirish
                    </button>
                ) : pack.subscribed ? (
                    <button onClick={unsubscribe}
                        className="h-8 px-3 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5 bg-white/10 text-white/70">
                        <UserCheck className="w-3.5 h-3.5" /> Qo'shildi
                    </button>
                ) : (
                    <button onClick={subscribe}
                        className="h-8 px-3 rounded-lg text-[11.5px] font-black flex items-center gap-1.5 bg-white text-neutral-950">
                        <UserPlus className="w-3.5 h-3.5" /> Qo'shish
                    </button>
                )}
            </div>

            {pack.isOwner && (
                <>
                    <input ref={fileRef} type="file"
                        accept={ACCEPT[pack.kind]}
                        onChange={e => { const f = e.target.files?.[0]; if (f) void uploadFile(f); e.target.value = ""; }}
                        className="hidden" />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="w-full mb-4 h-11 rounded-xl border border-white/20 border-dashed text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-white/5 disabled:opacity-50">
                        {uploading ? <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Yuklanmoqda {progress > 0 && `${progress}%`}
                        </> : <>
                            <Upload className="w-4 h-4" />
                            {pack.kind === "GIF" ? "Video yuklash (mp4, max 8 MB)" : "Rasm yuklash (png/webp 512×512, max 1 MB)"}
                        </>}
                    </button>
                    {uploadErr && <p className="text-[12px] text-red-400 mb-3">{uploadErr}</p>}
                </>
            )}

            {(pack.items?.length ?? 0) === 0 ? (
                <div className="p-8 rounded-xl border border-white/10 text-center text-[12.5px] text-white/50">
                    Hali item yo'q
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
                    {pack.items!.map(it => (
                        <div key={it.id} className="relative aspect-square rounded-lg overflow-hidden bg-neutral-900 group">
                            {pack.kind === "GIF" ? (
                                <video src={it.mediaUrl} autoPlay muted loop playsInline
                                    className="w-full h-full object-cover" />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={it.mediaUrl} alt={it.keywords.join(", ")} loading="lazy"
                                    className="w-full h-full object-contain" />
                            )}
                            {pack.isOwner && (
                                <button onClick={() => deleteItem(it.id)}
                                    aria-label="O'chirish"
                                    className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-md bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}

// ── Utilitalar ──────────────────────────────────────────────────────────────

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return (
        <div className="fixed inset-0 z-[200] grid place-items-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />
            <div className={`relative w-full ${wide ? "max-w-[720px]" : "max-w-[420px]"} max-h-[90vh] overflow-y-auto p-5 rounded-2xl bg-neutral-900 border border-white/10`}>
                <button onClick={onClose} aria-label="Yopish"
                    className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-lg hover:bg-white/10">
                    <X className="w-4 h-4" />
                </button>
                {children}
            </div>
        </div>
    );
}

async function imageDimensions(file: File): Promise<{ w: number; h: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

async function videoMetadataAndThumb(file: File): Promise<{ width: number; height: number; thumbBlob: Blob | null }> {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>(res => video.addEventListener("loadeddata", () => res(), { once: true }));
    // First frame'ga skip
    try { video.currentTime = 0.1; await new Promise<void>(res => video.addEventListener("seeked", () => res(), { once: true })); } catch { /* ignore */ }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    let thumbBlob: Blob | null = null;
    if (ctx) {
        ctx.drawImage(video, 0, 0);
        thumbBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/webp", 0.85));
    }
    URL.revokeObjectURL(url);
    return { width: video.videoWidth, height: video.videoHeight, thumbBlob };
}
