"use client";

// Belis admin — katalog boshqaruvi (komplekt/quti CRUD).

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    Package, Plus, Loader2, Upload, X, Save, Trash2, Edit3, ImageIcon,
    ChevronLeft, AlertTriangle, Wand2,
} from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

type KomplektKind = "FOTIHA" | "BESHIK_TOY" | "CUSTOM";
type ItemKind =
    | "PATIR_KATTA" | "PATIR_KICHIK" | "TOGORA" | "QURUQ_MEVA" | "HOL_MEVA"
    | "HOLVA" | "TORT" | "MANIKEN" | "PARFYUM" | "KATTA_IDISH"
    | "SANDIQ" | "SOCHQI" | "DOMIK" | "BOSHQA";

const KOMPLEKT_KIND_LABEL: Record<KomplektKind, string> = {
    FOTIHA: "Fotiha", BESHIK_TOY: "Beshik to'y", CUSTOM: "Maxsus",
};

const ITEM_KIND_LABEL: Record<ItemKind, string> = {
    PATIR_KATTA: "Katta patir", PATIR_KICHIK: "Kichik patir", TOGORA: "Tog'ora",
    QURUQ_MEVA: "Quruq meva", HOL_MEVA: "Hol meva", HOLVA: "Holva",
    TORT: "To'rt", MANIKEN: "Maniken", PARFYUM: "Parfyum",
    KATTA_IDISH: "Katta idish", SANDIQ: "Sandiq", SOCHQI: "Sochqi",
    DOMIK: "Domik", BOSHQA: "Boshqa",
};

interface Item {
    id: string;
    slug: string;
    kind: ItemKind;
    nameUz: string;
    images: string[];
    dailyRentUzs: number;
    deposit: number;
    copyCount: number;
}

interface Komplekt {
    id: string;
    slug: string;
    kind: KomplektKind;
    nameUz: string;
    nameRu?: string | null;
    descriptionUz?: string | null;
    images: string[];
    dailyRentUzs: number;
    deposit: number;
    itemsCount: number;
    copyCount: number;
    items: Item[];
}

function fmtSom(n: number): string { return `${n.toLocaleString("uz-UZ")} so'm`; }

export function BelisAdminCatalog() {
    const [rows, setRows] = useState<Komplekt[] | null>(null);
    const [forbidden, setForbidden] = useState(false);
    const [komplektModal, setKomplektModal] = useState<Komplekt | "new" | null>(null);
    const [itemModal, setItemModal] = useState<{ item: Item | "new"; komplektSlug?: string } | null>(null);

    const load = useCallback(async () => {
        setRows(null);
        try {
            const r = await fetch("/api/belis/komplektlar", { cache: "no-store" });
            const d = await r.json();
            const list = Array.isArray(d?.komplektlar) ? d.komplektlar : [];
            // Har komplektning items ro'yxatini alohida yuklaymiz
            const withItems = await Promise.all(list.map(async (k: Omit<Komplekt, "items">) => {
                const r2 = await fetch(`/api/belis/komplektlar/${k.slug}`, { cache: "no-store" });
                const d2 = await r2.json();
                return { ...k, items: (d2?.items ?? []) as Item[] };
            }));
            setRows(withItems);
        } catch { setRows([]); }
    }, []);

    useEffect(() => {
        // Admin tekshirish — birinchi API'da 403 kelsa gate qo'yamiz
        fetch("/api/belis/admin/bookings?limit=1")
            .then(r => {
                if (r.status === 403) { setForbidden(true); return; }
                load();
            });
    }, [load]);

    if (forbidden) {
        return (
            <div className="max-w-md mx-auto px-4 py-16 text-center">
                <p className="text-[16px] font-black" style={{ color: BELIS.text }}>Ruxsat yo&apos;q</p>
                <p className="text-[13px] mt-1" style={{ color: BELIS.text2 }}>Faqat @sevinch va founderlar.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center gap-2 mb-5">
                <BelisLink href="/admin"
                    className="w-9 h-9 rounded-lg grid place-items-center"
                    style={{ background: BELIS.surface, color: BELIS.text2 }}>
                    <ChevronLeft className="w-4 h-4" />
                </BelisLink>
                <h1 className="text-[22px] font-black flex-1" style={{ color: BELIS.text }}>Katalog boshqaruvi</h1>
                <button onClick={() => setKomplektModal("new")}
                    className="h-10 px-4 rounded-xl text-[13px] font-black flex items-center gap-1.5"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <Plus className="w-4 h-4" /> Yangi komplekt
                </button>
            </div>

            {rows === null && (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: BELIS.gold }} /></div>
            )}
            {rows && rows.length === 0 && (
                <div className="text-center py-16 rounded-2xl" style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-60" style={{ color: BELIS.gold }} />
                    <p className="text-[14px]" style={{ color: BELIS.text2 }}>Hozircha komplekt yo&apos;q</p>
                    <button onClick={() => setKomplektModal("new")}
                        className="mt-4 h-10 px-4 rounded-xl text-[13px] font-black inline-flex items-center gap-1.5"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        <Plus className="w-4 h-4" /> Birinchi komplektni qo&apos;shish
                    </button>
                </div>
            )}
            {rows && rows.length > 0 && (
                <div className="space-y-4">
                    {rows.map(k => (
                        <div key={k.id} className="rounded-2xl overflow-hidden"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                            {/* Komplekt header */}
                            <div className="p-4 flex items-start gap-3">
                                <span className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: BELIS.surfaceUp }}>
                                    {k.images[0] && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={k.images[0]} alt="" className="w-full h-full object-cover" />
                                    )}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
                                            style={{ background: BELIS.goldSoft, color: BELIS.onGold }}>
                                            {KOMPLEKT_KIND_LABEL[k.kind]}
                                        </span>
                                        <span className="text-[10.5px]" style={{ color: BELIS.text3 }}>slug: {k.slug}</span>
                                    </div>
                                    <p className="text-[15px] font-black" style={{ color: BELIS.text }}>{k.nameUz}</p>
                                    <p className="text-[11.5px]" style={{ color: BELIS.text3 }}>
                                        {k.itemsCount} quti · {k.copyCount} nusxa · {fmtSom(k.dailyRentUzs)}/kun · zaklat {fmtSom(k.deposit)}
                                    </p>
                                </div>
                                <button onClick={() => setKomplektModal(k)}
                                    className="w-9 h-9 rounded-lg grid place-items-center"
                                    style={{ background: BELIS.bg, color: BELIS.text2 }}>
                                    <Edit3 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Qutilar */}
                            <div className="px-4 pb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11.5px] font-black uppercase tracking-widest" style={{ color: BELIS.text3 }}>Qutilar ({k.items.length})</p>
                                    <button onClick={() => setItemModal({ item: "new", komplektSlug: k.slug })}
                                        className="text-[11.5px] font-black flex items-center gap-1"
                                        style={{ color: BELIS.goldDeep }}>
                                        <Plus className="w-3 h-3" /> Yangi quti
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {k.items.map(it => (
                                        <button key={it.id} onClick={() => setItemModal({ item: it })}
                                            className="text-left rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
                                            style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}` }}>
                                            <div className="aspect-square" style={{ background: BELIS.surfaceUp }}>
                                                {it.images[0] && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={it.images[0]} alt="" className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="p-1.5">
                                                <p className="text-[11px] font-black line-clamp-1" style={{ color: BELIS.text }}>{it.nameUz}</p>
                                                <p className="text-[9px] tabular-nums" style={{ color: BELIS.text3 }}>×{it.copyCount} · {fmtSom(it.dailyRentUzs)}/kun</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {komplektModal && (
                <KomplektModal
                    komplekt={komplektModal === "new" ? null : komplektModal}
                    onClose={() => setKomplektModal(null)}
                    onSaved={() => { setKomplektModal(null); load(); }}
                />
            )}
            {itemModal && (
                <ItemModal
                    item={itemModal.item === "new" ? null : itemModal.item}
                    defaultKomplektSlug={itemModal.komplektSlug}
                    komplektOptions={rows?.map(k => ({ slug: k.slug, nameUz: k.nameUz })) ?? []}
                    onClose={() => setItemModal(null)}
                    onSaved={() => { setItemModal(null); load(); }}
                />
            )}
        </div>
    );
}

// ─── Komplekt yaratish/tahrir modali ───

function KomplektModal({ komplekt, onClose, onSaved }: {
    komplekt: Komplekt | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!komplekt;
    const [slug, setSlug] = useState(komplekt?.slug ?? "");
    const [kind, setKind] = useState<KomplektKind>(komplekt?.kind ?? "FOTIHA");
    const [nameUz, setNameUz] = useState(komplekt?.nameUz ?? "");
    const [nameRu, setNameRu] = useState(komplekt?.nameRu ?? "");
    const [descriptionUz, setDescriptionUz] = useState(komplekt?.descriptionUz ?? "");
    const [images, setImages] = useState<string[]>(komplekt?.images ?? []);
    const [dailyRent, setDailyRent] = useState(String(komplekt?.dailyRentUzs ?? ""));
    const [deposit, setDeposit] = useState(String(komplekt?.deposit ?? ""));
    const [itemsCount, setItemsCount] = useState(String(komplekt?.itemsCount ?? 14));
    const [copyCount, setCopyCount] = useState(String(komplekt?.copyCount ?? 1));
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    async function upload(f: File) {
        setUploading(true); setErr(null);
        try {
            const fd = new FormData();
            fd.append("file", f);
            fd.append("kind", "komplekt");
            const r = await fetch("/api/belis/upload/image", { method: "POST", body: fd });
            const d = await r.json();
            if (!r.ok) throw new Error(d?.error || "upload");
            setImages(prev => [...prev, d.url]);
        } catch (e) { setErr(e instanceof Error ? e.message : "upload"); }
        finally { setUploading(false); }
    }

    async function save() {
        setSaving(true); setErr(null);
        try {
            const body = {
                slug: isEdit ? undefined : slug.trim(),
                kind,
                nameUz: nameUz.trim(),
                nameRu: nameRu.trim() || undefined,
                descriptionUz: descriptionUz.trim() || undefined,
                images,
                dailyRentUzs: Number(dailyRent) || 0,
                deposit: Number(deposit) || 0,
                itemsCount: Number(itemsCount) || 1,
                copyCount: Number(copyCount) || 1,
            };
            const url = isEdit ? `/api/belis/admin/komplektlar/${komplekt.slug}` : "/api/belis/admin/komplektlar";
            const r = await fetch(url, {
                method: isEdit ? "PATCH" : "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
            const d = await r.json();
            if (!r.ok) { setErr(d?.error ?? "xato"); return; }
            onSaved();
        } finally { setSaving(false); }
    }

    async function remove() {
        if (!komplekt) return;
        if (!confirm(`"${komplekt.nameUz}" komplektini o'chirishga rozimisiz?`)) return;
        setDeleting(true);
        try {
            const r = await fetch(`/api/belis/admin/komplektlar/${komplekt.slug}`, { method: "DELETE" });
            const d = await r.json();
            if (r.ok) onSaved();
            else setErr(d?.error === "has_bookings" ? "Bookinglari bor — hidden=true qiling" : d?.error ?? "xato");
        } finally { setDeleting(false); }
    }

    if (!mounted) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
            <div className="w-full sm:max-w-lg max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${BELIS.border}` }}>
                    <Package className="w-5 h-5" style={{ color: BELIS.goldDeep }} />
                    <p className="text-[15px] font-black flex-1" style={{ color: BELIS.text }}>
                        {isEdit ? "Komplektni tahrirlash" : "Yangi komplekt"}
                    </p>
                    <button onClick={onClose} className="p-1" style={{ color: BELIS.text3 }}><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {!isEdit && (
                        <Field label="Slug (URL) — hurufi bilan yozing">
                            <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60))}
                                placeholder="fotiha-oltin" className="belis-input" />
                        </Field>
                    )}
                    <Field label="Turi">
                        <div className="grid grid-cols-3 gap-2">
                            {(["FOTIHA", "BESHIK_TOY", "CUSTOM"] as KomplektKind[]).map(k => {
                                const active = kind === k;
                                return (
                                    <button key={k} onClick={() => setKind(k)}
                                        className="h-10 rounded-xl text-[12px] font-black"
                                        style={{
                                            background: active ? BELIS_GOLD_GRADIENT : BELIS.bg,
                                            color: active ? BELIS.onGold : BELIS.text,
                                            border: `1px solid ${active ? "transparent" : BELIS.border}`,
                                        }}>
                                        {KOMPLEKT_KIND_LABEL[k]}
                                    </button>
                                );
                            })}
                        </div>
                    </Field>
                    <Field label="Nomi (uz) *">
                        <input value={nameUz} onChange={e => setNameUz(e.target.value.slice(0, 200))}
                            placeholder="Fotiha to'plami — standart" className="belis-input" />
                    </Field>
                    <Field label="Nomi (ru)">
                        <input value={nameRu} onChange={e => setNameRu(e.target.value.slice(0, 200))}
                            placeholder="Комплект Фотиха — стандартный" className="belis-input" />
                    </Field>
                    <Field label="Tavsif (uz)">
                        <textarea value={descriptionUz} onChange={e => setDescriptionUz(e.target.value.slice(0, 5000))}
                            rows={3} placeholder="Nima uchun bu komplekt yaxshi, qanday marosimga mos"
                            className="belis-input" style={{ height: "auto" }} />
                        <BelisAiDescribeBtn
                            type="komplekt"
                            name={nameUz}
                            kind={kind}
                            itemsCount={Number(itemsCount) || 14}
                            onFilled={(uz) => setDescriptionUz(uz)}
                            disabled={!nameUz.trim()}
                        />
                    </Field>

                    <Field label="Rasmlar">
                        <input ref={fileRef} type="file" accept="image/*" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
                        <div className="grid grid-cols-3 gap-2">
                            {images.map((url, i) => (
                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden" style={{ background: BELIS.surfaceUp }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full grid place-items-center"
                                        style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {images.length < 10 && (
                                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                                    className="aspect-square rounded-lg border-2 border-dashed grid place-items-center disabled:opacity-60"
                                    style={{ borderColor: BELIS.border, color: BELIS.text3, background: BELIS.bg }}>
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                </button>
                            )}
                        </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Kunlik ijara (so'm) *">
                            <input value={dailyRent} onChange={e => setDailyRent(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric" placeholder="800000" className="belis-input" />
                        </Field>
                        <Field label="Zaklat (so'm) *">
                            <input value={deposit} onChange={e => setDeposit(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric" placeholder="8000000" className="belis-input" />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Ichida qutilar soni">
                            <input value={itemsCount} onChange={e => setItemsCount(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric" className="belis-input" />
                        </Field>
                        <Field label="Do'kondagi nusxa">
                            <input value={copyCount} onChange={e => setCopyCount(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric" className="belis-input" />
                        </Field>
                    </div>

                    {err && (
                        <div className="p-3 rounded-xl text-[12.5px] flex items-start gap-2"
                            style={{ background: BELIS.errSoft, color: BELIS.err }}>
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{err}
                        </div>
                    )}
                </div>

                <div className="p-4 flex gap-2" style={{ borderTop: `1px solid ${BELIS.border}` }}>
                    {isEdit && (
                        <button onClick={remove} disabled={deleting}
                            className="h-11 px-3 rounded-xl text-[12.5px] font-black flex items-center gap-1.5 disabled:opacity-60"
                            style={{ background: BELIS.errSoft, color: BELIS.err }}>
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5" /> O&apos;chirish</>}
                        </button>
                    )}
                    <button onClick={onClose} className="ml-auto h-11 px-4 rounded-xl text-[13px] font-black"
                        style={{ background: BELIS.bg, color: BELIS.text }}>Bekor</button>
                    <button onClick={save} disabled={saving || !nameUz.trim() || (!isEdit && !slug)}
                        className="h-11 px-5 rounded-xl text-[13px] font-black flex items-center gap-2 disabled:opacity-60"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Saqlash</>}
                    </button>
                </div>
                <style jsx global>{`
                    .belis-input { width: 100%; height: 46px; border-radius: 12px; padding: 0 14px; font-size: 14px; outline: none;
                        background: ${BELIS.bg}; border: 1px solid ${BELIS.border}; color: ${BELIS.text}; caret-color: ${BELIS.gold}; }
                    .belis-input:focus { border-color: ${BELIS.gold}; }
                    textarea.belis-input { padding: 12px 14px; resize: none; }
                `}</style>
            </div>
        </div>,
        document.body,
    );
}

// ─── Quti yaratish/tahrir modali ───

function ItemModal({ item, defaultKomplektSlug, komplektOptions, onClose, onSaved }: {
    item: Item | null;
    defaultKomplektSlug?: string;
    komplektOptions: Array<{ slug: string; nameUz: string }>;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEdit = !!item;
    const [slug, setSlug] = useState(item?.slug ?? "");
    const [kind, setKind] = useState<ItemKind>((item?.kind as ItemKind) ?? "TOGORA");
    const [nameUz, setNameUz] = useState(item?.nameUz ?? "");
    const [images, setImages] = useState<string[]>(item?.images ?? []);
    const [dailyRent, setDailyRent] = useState(String(item?.dailyRentUzs ?? ""));
    const [deposit, setDeposit] = useState(String(item?.deposit ?? ""));
    const [copyCount, setCopyCount] = useState(String(item?.copyCount ?? 1));
    const [komplektSlug, setKomplektSlug] = useState(defaultKomplektSlug ?? "");
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    async function upload(f: File) {
        setUploading(true); setErr(null);
        try {
            const fd = new FormData();
            fd.append("file", f);
            fd.append("kind", "item");
            const r = await fetch("/api/belis/upload/image", { method: "POST", body: fd });
            const d = await r.json();
            if (!r.ok) throw new Error(d?.error || "upload");
            setImages(prev => [...prev, d.url]);
        } catch (e) { setErr(e instanceof Error ? e.message : "upload"); }
        finally { setUploading(false); }
    }

    async function save() {
        setSaving(true); setErr(null);
        try {
            const body = {
                slug: isEdit ? undefined : slug.trim(),
                komplektSlug: komplektSlug || undefined,
                kind,
                nameUz: nameUz.trim(),
                images,
                dailyRentUzs: Number(dailyRent) || 0,
                deposit: Number(deposit) || 0,
                copyCount: Number(copyCount) || 1,
            };
            const url = isEdit ? `/api/belis/admin/items/${item.slug}` : "/api/belis/admin/items";
            const r = await fetch(url, {
                method: isEdit ? "PATCH" : "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
            const d = await r.json();
            if (!r.ok) { setErr(d?.error ?? "xato"); return; }
            onSaved();
        } finally { setSaving(false); }
    }

    async function remove() {
        if (!item) return;
        if (!confirm(`"${item.nameUz}" qutini o'chirishga rozimisiz?`)) return;
        setDeleting(true);
        try {
            const r = await fetch(`/api/belis/admin/items/${item.slug}`, { method: "DELETE" });
            const d = await r.json();
            if (r.ok) onSaved();
            else setErr(d?.error === "has_bookings" ? "Bookinglari bor" : d?.error ?? "xato");
        } finally { setDeleting(false); }
    }

    if (!mounted) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.65)" }} onClick={onClose}>
            <div className="w-full sm:max-w-lg max-h-[95vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}
                onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${BELIS.border}` }}>
                    <ImageIcon className="w-5 h-5" style={{ color: BELIS.goldDeep }} />
                    <p className="text-[15px] font-black flex-1" style={{ color: BELIS.text }}>
                        {isEdit ? "Qutini tahrirlash" : "Yangi quti"}
                    </p>
                    <button onClick={onClose} className="p-1" style={{ color: BELIS.text3 }}><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {!isEdit && (
                        <Field label="Slug (URL)">
                            <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 60))}
                                placeholder="fotiha-togora-2" className="belis-input" />
                        </Field>
                    )}
                    <Field label="Nomi (uz) *">
                        <input value={nameUz} onChange={e => setNameUz(e.target.value.slice(0, 200))}
                            placeholder="Katta tog'ora" className="belis-input" />
                    </Field>
                    <Field label="Turi">
                        <select value={kind} onChange={e => setKind(e.target.value as ItemKind)}
                            className="belis-input" style={{ appearance: "none" }}>
                            {Object.entries(ITEM_KIND_LABEL).map(([k, l]) => (
                                <option key={k} value={k}>{l}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Komplekt (ixtiyoriy)">
                        <select value={komplektSlug} onChange={e => setKomplektSlug(e.target.value)}
                            className="belis-input" style={{ appearance: "none" }}>
                            <option value="">— alohida quti —</option>
                            {komplektOptions.map(k => (
                                <option key={k.slug} value={k.slug}>{k.nameUz}</option>
                            ))}
                        </select>
                    </Field>

                    <Field label="Rasmlar">
                        <input ref={fileRef} type="file" accept="image/*" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
                        <div className="grid grid-cols-3 gap-2">
                            {images.map((url, i) => (
                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden" style={{ background: BELIS.surfaceUp }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full grid place-items-center"
                                        style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}>
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {images.length < 10 && (
                                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                                    className="aspect-square rounded-lg border-2 border-dashed grid place-items-center disabled:opacity-60"
                                    style={{ borderColor: BELIS.border, color: BELIS.text3, background: BELIS.bg }}>
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                </button>
                            )}
                        </div>
                    </Field>

                    <div className="grid grid-cols-3 gap-2">
                        <Field label="Kunlik ijara">
                            <input value={dailyRent} onChange={e => setDailyRent(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric" placeholder="50000" className="belis-input" />
                        </Field>
                        <Field label="Zaklat">
                            <input value={deposit} onChange={e => setDeposit(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric" placeholder="400000" className="belis-input" />
                        </Field>
                        <Field label="Nusxa">
                            <input value={copyCount} onChange={e => setCopyCount(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric" placeholder="3" className="belis-input" />
                        </Field>
                    </div>

                    {err && (
                        <div className="p-3 rounded-xl text-[12.5px] flex items-start gap-2"
                            style={{ background: BELIS.errSoft, color: BELIS.err }}>
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{err}
                        </div>
                    )}
                </div>

                <div className="p-4 flex gap-2" style={{ borderTop: `1px solid ${BELIS.border}` }}>
                    {isEdit && (
                        <button onClick={remove} disabled={deleting}
                            className="h-11 px-3 rounded-xl text-[12.5px] font-black flex items-center gap-1.5 disabled:opacity-60"
                            style={{ background: BELIS.errSoft, color: BELIS.err }}>
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5" /> O&apos;chirish</>}
                        </button>
                    )}
                    <button onClick={onClose} className="ml-auto h-11 px-4 rounded-xl text-[13px] font-black"
                        style={{ background: BELIS.bg, color: BELIS.text }}>Bekor</button>
                    <button onClick={save} disabled={saving || !nameUz.trim() || (!isEdit && !slug)}
                        className="h-11 px-5 rounded-xl text-[13px] font-black flex items-center gap-2 disabled:opacity-60"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Saqlash</>}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="text-[12px] font-black mb-1.5 block" style={{ color: BELIS.text }}>{label}</label>
            {children}
        </div>
    );
}

// AI tavsif generatsiya tugmasi — komplekt/item modal ichida
function BelisAiDescribeBtn({ type, name, kind, itemsCount, onFilled, disabled }: {
    type: "komplekt" | "item";
    name: string;
    kind?: string;
    itemsCount?: number;
    onFilled: (uz: string) => void;
    disabled?: boolean;
}) {
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    async function run() {
        if (!name.trim()) return;
        setBusy(true); setErr(null);
        try {
            const r = await fetch("/api/belis/ai/describe", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ type, name, kind, itemsCount }),
            });
            const d = await r.json();
            if (!r.ok) {
                setErr(d?.error === "ai_unavailable" ? "AI hozircha ishlamayapti" : "Xatolik");
                return;
            }
            if (d?.uz) onFilled(d.uz);
        } finally { setBusy(false); }
    }
    return (
        <>
            <button type="button" onClick={run} disabled={busy || disabled}
                className="mt-1.5 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11.5px] font-black disabled:opacity-60"
                style={{ background: BELIS.goldSoft, color: BELIS.goldDeep }}>
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                AI bilan yozish
            </button>
            {err && <p className="text-[11px] mt-1" style={{ color: BELIS.err }}>{err}</p>}
        </>
    );
}
