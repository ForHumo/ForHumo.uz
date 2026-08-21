"use client";

// Nexus GIF / Sticker "Agent" boshqaruv sahifasi. Nexus palette
// (rgba(11,18,40,...) fon, rgba(43,62,232,...) accent + #00CEC8) —
// Nexus shell bilan bir xil vizual tili.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload as blobUpload } from "@vercel/blob/client";
import {
    Loader2, Plus, X, Trash2, Upload, Package, Sparkles,
    UserPlus, UserCheck, ArrowLeft, Image as ImageIcon, Film, Send,
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
    subscribed?: boolean;
    owner?: { username: string | null; humoId: string | null; name: string | null; image: string | null } | null;
}

const ACCEPT: Record<Kind, string> = {
    GIF: "video/mp4,video/webm,video/quicktime",
    STICKER: "image/png,image/webp",
};
const GIF_MAX_BYTES = 8 * 1024 * 1024;
const STICKER_MAX_BYTES = 1 * 1024 * 1024;

// Nexus tema (nx-sidebar/nx-messages bilan bir xil)
const NX = {
    bg: "#050818",
    panel: "rgba(11,18,40,0.85)",
    panelStrong: "rgba(11,18,40,0.98)",
    border: "rgba(43,62,232,0.28)",
    borderSoft: "rgba(43,62,232,0.16)",
    accent: "#00CEC8",
    accentBg: "rgba(0,206,200,0.14)",
    blueBg: "rgba(43,62,232,0.10)",
    text: "rgba(230,238,255,0.96)",
    text2: "rgba(200,215,245,0.75)",
    text3: "rgba(150,170,220,0.55)",
    gradient: "linear-gradient(135deg,#2B3EE8,#00CEC8)",
};

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
        <div className="absolute inset-0 overflow-y-auto" style={{ background: NX.bg, color: NX.text }}>
            {/* Fon nurlari — Nexus stili */}
            <div className="pointer-events-none fixed inset-0" style={{
                background: "radial-gradient(ellipse 60% 60% at 20% 10%, rgba(43,62,232,0.15) 0%, transparent 60%), "
                    + "radial-gradient(ellipse 60% 60% at 80% 90%, rgba(0,206,200,0.10) 0%, transparent 60%)"
            }} />

            <header className="sticky top-0 z-10 backdrop-blur-md" style={{
                background: "rgba(5,8,24,0.85)",
                borderBottom: `1px solid ${NX.border}`,
            }}>
                <div className="max-w-[880px] mx-auto flex items-center gap-3 px-4 h-14">
                    <button onClick={() => router.back()}
                        aria-label="Orqaga"
                        className="w-8 h-8 grid place-items-center rounded-lg transition-colors"
                        style={{ background: NX.blueBg }}>
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: NX.gradient }}>
                        <KindIcon className="w-4 h-4 text-white" />
                    </div>
                    <h1 className="text-[15px] font-black flex-1">@{kind.toLowerCase()} — {kindLabel} Agent</h1>
                    <button onClick={() => setCreateOpen(true)}
                        className="h-8 px-3 rounded-lg text-[12.5px] font-black flex items-center gap-1.5 text-white"
                        style={{ background: NX.gradient }}>
                        <Plus className="w-3.5 h-3.5" /> Pack
                    </button>
                </div>
            </header>

            <div className="relative max-w-[880px] mx-auto px-4 py-6">
                <div className="mb-6 p-4 rounded-2xl" style={{ background: NX.panel, border: `1px solid ${NX.border}` }}>
                    <p className="text-[13px] leading-relaxed" style={{ color: NX.text2 }}>
                        Pack yaratib, o'z {kindLabel.toLowerCase()}'laringizni yuklang.
                        Har {kindLabel.toLowerCase()} chatlarda qidiruv orqali topiladi
                        (nom, kalit so'zlar yoki @username bo'yicha). 18+ kontent AI moderatsiya bilan bloklanadi.
                    </p>
                </div>

                {loading ? (
                    <div className="grid place-items-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: NX.accent }} />
                    </div>
                ) : (
                    <>
                        <SectionHeader icon={<Package className="w-4 h-4" />} label={`Mening ${kindLabel.toLowerCase()} pack'larim`} count={owned.length} />
                        {owned.length === 0 ? (
                            <EmptyState label="Hali pack yaratmagansiz" cta="Yangi pack" onCta={() => setCreateOpen(true)} />
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                                {owned.map(p => <PackCard key={p.id} pack={p} onOpen={() => setOpenPack(p)} />)}
                            </div>
                        )}

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
            <span style={{ color: NX.accent }}>{icon}</span>
            <h2 className="text-[13px] font-black uppercase tracking-wider" style={{ color: NX.text2 }}>{label}</h2>
            <span className="text-[11px] tabular-nums" style={{ color: NX.text3 }}>{count}</span>
        </div>
    );
}

function EmptyState({ label, cta, onCta, hint }: { label: string; cta?: string; onCta?: () => void; hint?: string }) {
    return (
        <div className="mb-8 p-6 rounded-2xl text-center"
            style={{ background: NX.panel, border: `1px dashed ${NX.border}` }}>
            <p className="text-[13px]" style={{ color: NX.text2 }}>{label}</p>
            {hint && <p className="text-[11.5px] mt-1" style={{ color: NX.text3 }}>{hint}</p>}
            {cta && onCta && (
                <button onClick={onCta}
                    className="mt-3 h-9 px-4 rounded-lg text-[12.5px] font-black inline-flex items-center gap-1.5 text-white"
                    style={{ background: NX.gradient }}>
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
            className="text-left rounded-2xl overflow-hidden transition-colors active:scale-[0.99]"
            style={{ background: NX.panel, border: `1px solid ${NX.border}` }}>
            <div className="aspect-square grid grid-cols-2 gap-0.5 p-0.5" style={{ background: "rgba(5,8,24,0.6)" }}>
                {showCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pack.coverUrl!} alt="" className="col-span-2 row-span-2 w-full h-full object-cover" />
                ) : items.length === 0 ? (
                    <div className="col-span-2 row-span-2 grid place-items-center" style={{ color: NX.text3 }}>
                        <ImageIcon className="w-8 h-8" />
                    </div>
                ) : (
                    <>
                        {items.map(it => (
                            <div key={it.id} className="relative aspect-square overflow-hidden" style={{ background: "rgba(11,18,40,0.6)" }}>
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
                <p className="text-[13px] font-black truncate" style={{ color: NX.text }}>{pack.name}</p>
                <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: NX.text3 }}>
                    <span>{pack._count?.items ?? 0} ta</span>
                    {pack.addedCount > 0 && <><span>·</span><span>{pack.addedCount} qo&apos;shdi</span></>}
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
            <h2 className="text-[16px] font-black mb-4" style={{ color: NX.text }}>
                Yangi {kind === "GIF" ? "GIF" : "Sticker"} pack
            </h2>
            <label className="block mb-4">
                <span className="text-[11.5px] font-bold" style={{ color: NX.text2 }}>Pack nomi</span>
                <input type="text" value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={60} autoFocus
                    onKeyDown={e => { if (e.key === "Enter" && name.trim().length >= 2 && !busy) void submit(); }}
                    placeholder="Masalan: Mushuklar"
                    className="w-full mt-1 h-10 px-3 rounded-lg text-[13px] font-bold outline-none"
                    style={{ background: NX.blueBg, border: `1px solid ${NX.borderSoft}`, color: NX.text, caretColor: NX.accent }} />
            </label>
            {err && <p className="text-[12px] mb-3" style={{ color: "#ff6b6b" }}>{err}</p>}
            <div className="flex items-center justify-end gap-2">
                <button onClick={onClose} disabled={busy}
                    className="h-9 px-3 rounded-lg text-[12.5px] font-bold" style={{ color: NX.text2 }}>Bekor</button>
                <button onClick={submit} disabled={busy || name.trim().length < 2}
                    className="h-9 px-4 rounded-lg text-[12.5px] font-black flex items-center gap-1.5 text-white disabled:opacity-40"
                    style={{ background: NX.gradient }}>
                    {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Yaratish
                </button>
            </div>
        </Modal>
    );
}

// ── Item upload — file tanlanadi, keyin keywords modal chiqadi ──────────────

interface StagedFile {
    file: File;
    previewUrl: string;
    width: number;
    height: number;
    thumbBlob: Blob | null;   // GIF uchun
    isVideo: boolean;
}

function PackDetailModal({ slug, onClose }: { slug: string; onClose: () => void }) {
    const [pack, setPack] = useState<Pack | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadErr, setUploadErr] = useState<string | null>(null);
    const [staged, setStaged] = useState<StagedFile | null>(null);
    const [keywords, setKeywords] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);
    // Transfer state
    const [transferUsername, setTransferUsername] = useState("");
    const [transferring, setTransferring] = useState(false);
    const [transferMsg, setTransferMsg] = useState<{ ok: boolean; text: string } | null>(null);

    async function transferPack() {
        if (!pack || !transferUsername.trim()) return;
        if (!confirm(`"${pack.name}" pack egaligini @${transferUsername.trim().replace(/^@+/, "")} ga o'tkazasizmi? Bu amalni bekor qilib bo'lmaydi.`)) return;
        setTransferring(true); setTransferMsg(null);
        try {
            const r = await fetch(`/api/humo/packs/${slug}/transfer`, {
                method: "POST", headers: { "content-type": "application/json" },
                body: JSON.stringify({ username: transferUsername.trim() }),
            });
            const d = await r.json();
            if (!r.ok) {
                const msg = d?.error === "user_not_found" ? "Foydalanuvchi topilmadi"
                    : d?.error === "self_transfer" ? "O'zingizga o'tkazib bo'lmaydi"
                    : d?.error === "invalid_username" ? "Username noto'g'ri"
                    : d?.error === "forbidden" ? "Faqat ega o'tkaza oladi"
                    : "Xatolik";
                setTransferMsg({ ok: false, text: msg });
                return;
            }
            setTransferMsg({ ok: true, text: `Pack @${d.newOwner.username} ga o'tkazildi` });
            setTransferUsername("");
            setTimeout(() => onClose(), 1500);
        } catch {
            setTransferMsg({ ok: false, text: "Tarmoq xatosi" });
        } finally { setTransferring(false); }
    }

    const load = useCallback(async () => {
        const r = await fetch(`/api/humo/packs/${slug}`);
        if (r.ok) {
            const d = await r.json();
            setPack(d.pack);
        }
    }, [slug]);
    useEffect(() => { void load(); }, [load]);

    async function pickedFile(file: File) {
        if (!pack) return;
        setUploadErr(null);
        const max = pack.kind === "GIF" ? GIF_MAX_BYTES : STICKER_MAX_BYTES;
        if (file.size > max) {
            setUploadErr(`Fayl juda katta (max ${(max / 1024 / 1024).toFixed(0)} MB)`);
            return;
        }
        try {
            const isVideo = pack.kind === "GIF";
            if (isVideo) {
                const meta = await videoMetadataAndThumb(file);
                setStaged({ file, previewUrl: URL.createObjectURL(file), width: meta.width, height: meta.height, thumbBlob: meta.thumbBlob, isVideo: true });
            } else {
                const dim = await imageDimensions(file);
                setStaged({ file, previewUrl: URL.createObjectURL(file), width: dim.w, height: dim.h, thumbBlob: null, isVideo: false });
            }
        } catch { setUploadErr("Fayl o'qib bo'lmadi"); }
    }

    async function submitStaged() {
        if (!pack || !staged) return;
        const kwList = keywords.split(/[,\n]/).map(s => s.trim()).filter(Boolean).slice(0, 20);
        if (pack.kind === "STICKER" && kwList.length === 0) {
            setUploadErr("Sticker uchun kamida 1 kalit so'z majburiy");
            return;
        }
        setUploading(true); setUploadErr(null); setProgress(0);
        try {
            // 1) Media upload
            const mediaBlob = await blobUpload(`humo-media/${slug}/${Date.now()}-${staged.file.name}`, staged.file, {
                access: "public",
                handleUploadUrl: "/api/market/upload/client-token",
                onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
            });

            // 2) Thumbnail (GIF uchun)
            let thumbUrl: string | null = null;
            if (staged.thumbBlob) {
                const thumbUp = await blobUpload(`humo-media/${slug}/thumb-${Date.now()}.webp`, staged.thumbBlob, {
                    access: "public",
                    handleUploadUrl: "/api/market/upload/client-token",
                });
                thumbUrl = thumbUp.url;
            }

            // 3) Metadata
            const r = await fetch(`/api/humo/packs/${slug}/items`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    mediaUrl: mediaBlob.url, thumbUrl,
                    width: staged.width, height: staged.height,
                    bytes: staged.file.size, keywords: kwList,
                }),
            });
            const d = await r.json();
            if (!r.ok) { setUploadErr(d?.error ?? "Xatolik"); return; }

            // Reset
            URL.revokeObjectURL(staged.previewUrl);
            setStaged(null); setKeywords("");
            void load();
        } catch (e) { setUploadErr(String(e)); }
        finally { setUploading(false); setProgress(0); }
    }

    function cancelStaged() {
        if (staged) URL.revokeObjectURL(staged.previewUrl);
        setStaged(null); setKeywords(""); setUploadErr(null);
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
                <div className="grid place-items-center py-8"><Loader2 className="w-5 h-5 animate-spin" style={{ color: NX.accent }} /></div>
            </Modal>
        );
    }

    return (
        <Modal onClose={onClose} wide>
            <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 min-w-0">
                    <h2 className="text-[16px] font-black truncate" style={{ color: NX.text }}>{pack.name}</h2>
                    <p className="text-[11.5px] mt-0.5" style={{ color: NX.text3 }}>
                        {pack.owner?.username ? `@${pack.owner.username}` : pack.owner?.name ?? ""}
                        {" · "}{pack.items?.length ?? 0} ta · {pack.addedCount} qo&apos;shdi
                    </p>
                </div>
                {pack.isOwner ? (
                    <button onClick={deletePack}
                        className="h-8 px-3 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5"
                        style={{ background: "rgba(255,90,90,0.14)", color: "#ff9c9c", border: "1px solid rgba(255,90,90,0.24)" }}>
                        <Trash2 className="w-3.5 h-3.5" /> Pack o&apos;chirish
                    </button>
                ) : pack.subscribed ? (
                    <button onClick={unsubscribe}
                        className="h-8 px-3 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5"
                        style={{ background: NX.blueBg, color: NX.text2 }}>
                        <UserCheck className="w-3.5 h-3.5" /> Qo&apos;shildi
                    </button>
                ) : (
                    <button onClick={subscribe}
                        className="h-8 px-3 rounded-lg text-[11.5px] font-black flex items-center gap-1.5 text-white"
                        style={{ background: NX.gradient }}>
                        <UserPlus className="w-3.5 h-3.5" /> Qo&apos;shish
                    </button>
                )}
            </div>

            {pack.isOwner && !staged && (
                <>
                    <input ref={fileRef} type="file"
                        accept={ACCEPT[pack.kind]}
                        onChange={e => { const f = e.target.files?.[0]; if (f) void pickedFile(f); e.target.value = ""; }}
                        className="hidden" />
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="w-full mb-4 h-11 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                        style={{ border: `1px dashed ${NX.border}`, color: NX.text2, background: NX.blueBg }}>
                        <Upload className="w-4 h-4" />
                        {pack.kind === "GIF" ? "Video yuklash (mp4, max 8 MB)" : "Rasm yuklash (png/webp, max 1 MB)"}
                    </button>
                    {uploadErr && <p className="text-[12px] mb-3" style={{ color: "#ff6b6b" }}>{uploadErr}</p>}
                </>
            )}

            {/* Keywords panel — fayl tanlangan bo'lsa */}
            {pack.isOwner && staged && (
                <div className="mb-4 p-3 rounded-xl" style={{ background: NX.blueBg, border: `1px solid ${NX.borderSoft}` }}>
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "rgba(5,8,24,0.5)" }}>
                            {staged.isVideo ? (
                                <video src={staged.previewUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={staged.previewUrl} alt="" className="w-full h-full object-contain" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-black truncate" style={{ color: NX.text }}>{staged.file.name}</p>
                            <p className="text-[11px]" style={{ color: NX.text3 }}>
                                {staged.width}×{staged.height} · {(staged.file.size / 1024).toFixed(0)} KB
                            </p>
                        </div>
                        <button onClick={cancelStaged} disabled={uploading}
                            aria-label="Bekor"
                            className="w-7 h-7 grid place-items-center rounded-lg" style={{ color: NX.text3 }}>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <label className="block">
                        <span className="text-[11.5px] font-bold" style={{ color: NX.text2 }}>
                            Kalit so&apos;zlar {pack.kind === "STICKER" && <span style={{ color: NX.accent }}>(majburiy)</span>}
                        </span>
                        <input type="text" value={keywords}
                            onChange={e => setKeywords(e.target.value)}
                            placeholder={pack.kind === "STICKER"
                                ? "kulish, 🎉, hurrah — vergul bilan ajrating"
                                : "qiziq, kulgi, meme — vergul bilan"}
                            autoFocus
                            onKeyDown={e => { if (e.key === "Enter" && !uploading) void submitStaged(); }}
                            className="w-full mt-1 h-10 px-3 rounded-lg text-[13px] outline-none"
                            style={{ background: "rgba(5,8,24,0.6)", border: `1px solid ${NX.borderSoft}`, color: NX.text, caretColor: NX.accent }} />
                    </label>
                    {uploadErr && <p className="text-[12px] mt-2" style={{ color: "#ff6b6b" }}>{uploadErr}</p>}
                    <div className="flex items-center justify-end gap-2 mt-3">
                        <button onClick={cancelStaged} disabled={uploading}
                            className="h-9 px-3 rounded-lg text-[12.5px] font-bold" style={{ color: NX.text2 }}>Bekor</button>
                        <button onClick={submitStaged} disabled={uploading || (pack.kind === "STICKER" && keywords.trim().length === 0)}
                            className="h-9 px-4 rounded-lg text-[12.5px] font-black flex items-center gap-1.5 text-white disabled:opacity-40"
                            style={{ background: NX.gradient }}>
                            {uploading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Yuklanmoqda {progress}%
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    Qo&apos;shish
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {(pack.items?.length ?? 0) === 0 ? (
                <div className="p-8 rounded-xl text-center text-[12.5px]"
                    style={{ background: NX.panel, border: `1px solid ${NX.border}`, color: NX.text3 }}>
                    Hali item yo&apos;q
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto">
                    {pack.items!.map(it => (
                        <div key={it.id} className="relative aspect-square rounded-lg overflow-hidden group"
                            style={{ background: "rgba(5,8,24,0.6)" }}>
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
                                    className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ background: "rgba(5,8,24,0.85)", color: "#fff" }}>
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Transfer bo'limi — faqat egaga ko'rinadi */}
            {pack.isOwner && (
                <div className="mt-5 pt-4 rounded-xl p-4"
                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
                    <p className="text-[11.5px] font-black uppercase tracking-wider mb-1" style={{ color: "#F59E0B" }}>
                        Egalikni o&apos;tkazish
                    </p>
                    <p className="text-[11px] mb-3" style={{ color: NX.text3 }}>
                        Boshqa foydalanuvchining <b>username</b>ini kiriting — pack va uning barcha
                        item&apos;lari usha hisobga o&apos;tadi. Nom saqlanib qoladi va boshqa hech kim
                        undan foydalana olmaydi. Bu amalni bekor qilib bo&apos;lmaydi.
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-1 rounded-lg h-9 px-2"
                            style={{ background: "rgba(5,8,24,0.60)", border: `1px solid ${NX.borderSoft}` }}>
                            <span className="text-[13px] font-black" style={{ color: NX.text3 }}>@</span>
                            <input type="text"
                                value={transferUsername}
                                onChange={e => setTransferUsername(e.target.value.replace(/^@+/, ""))}
                                placeholder="yangi_egasi"
                                disabled={transferring}
                                className="flex-1 bg-transparent text-[13px] outline-none"
                                style={{ color: NX.text, caretColor: "#F59E0B" }} />
                        </div>
                        <button onClick={transferPack}
                            disabled={transferring || !transferUsername.trim()}
                            className="h-9 px-3 rounded-lg text-[12px] font-black flex items-center gap-1.5 disabled:opacity-40"
                            style={{ background: "linear-gradient(135deg,#F59E0B,#EA580C)", color: "#fff" }}>
                            {transferring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            O&apos;tkazish
                        </button>
                    </div>
                    {transferMsg && (
                        <p className="text-[11.5px] font-bold mt-2"
                            style={{ color: transferMsg.ok ? NX.accent : "#ff6b6b" }}>
                            {transferMsg.text}
                        </p>
                    )}
                </div>
            )}
        </Modal>
    );
}

// ── Utilitalar ──────────────────────────────────────────────────────────────

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
    return (
        <div className="fixed inset-0 z-[200] grid place-items-center p-4">
            <div className="absolute inset-0" style={{ background: "rgba(5,8,24,0.75)", backdropFilter: "blur(8px)" }} onClick={onClose} />
            <div className={`relative w-full ${wide ? "max-w-[720px]" : "max-w-[420px]"} max-h-[90vh] overflow-y-auto p-5 rounded-2xl`}
                style={{ background: NX.panelStrong, border: `1px solid ${NX.border}`, boxShadow: "0 12px 48px rgba(0,0,0,0.6)" }}>
                <button onClick={onClose} aria-label="Yopish"
                    className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-lg"
                    style={{ color: NX.text2, background: NX.blueBg }}>
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
