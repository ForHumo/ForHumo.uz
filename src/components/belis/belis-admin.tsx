"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Loader2, Plus, Package, ShoppingBag, Edit3, Trash2, X, ImagePlus, Check } from "lucide-react";
import { BELIS, BELIS_GOLD_GRADIENT } from "@/lib/belis-theme";

type Tab = "orders" | "products" | "categories";

interface AdminProduct {
    id: string; slug: string; nameUz: string; images: string[]; price: number;
    stock: number; isActive: boolean; featured: boolean; currency: string;
}
interface AdminOrder {
    id: string; code: string; buyerName: string; buyerPhone: string;
    status: string; paymentStatus: string; total: number | string; currency: string;
    createdAt: string; items: Array<{ productName: string; quantity: number }>;
}
interface AdminCategory { id: string; slug: string; nameUz: string; sort: number }

export function BelisAdmin() {
    const [tab, setTab] = useState<Tab>("orders");
    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: BELIS_GOLD_GRADIENT }}>
                    <span style={{ fontFamily: "'Great Vibes', cursive", fontSize: 24, color: BELIS.onGold, lineHeight: 1 }}>B</span>
                </div>
                <div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", color: BELIS.gold, fontSize: 26, margin: 0 }}>Admin panel</h1>
                    <p className="text-xs" style={{ color: BELIS.text2 }}>Belis boshqaruvi</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-xl inline-flex"
                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                {([
                    ["orders", "Buyurtmalar", ShoppingBag],
                    ["products", "Mahsulotlar", Package],
                    ["categories", "Kategoriyalar", Plus],
                ] as Array<[Tab, string, React.ElementType]>).map(([k, label, Icon]) => {
                    const active = tab === k;
                    return (
                        <button key={k} onClick={() => setTab(k)}
                            className="px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                            style={active ? {
                                background: BELIS_GOLD_GRADIENT, color: BELIS.onGold,
                                fontFamily: "'Montserrat', sans-serif",
                            } : {
                                color: BELIS.text2, fontFamily: "'Montserrat', sans-serif",
                            }}>
                            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} /> {label}
                        </button>
                    );
                })}
            </div>

            {tab === "orders" && <AdminOrders />}
            {tab === "products" && <AdminProducts />}
            {tab === "categories" && <AdminCategories />}
        </div>
    );
}

// ─── ORDERS ─────────────────────────────────────────────────────────────────
function AdminOrders() {
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const locale = useLocale();

    async function load() {
        setLoading(true);
        // Admin GET — hozircha /orders (buyer bo'lib qaytadi), keyin alohida /admin/orders yaratamiz
        // Vaqtincha: fetch all via prisma-direct (bu client — endpoint kerak)
        try {
            const r = await fetch("/api/belis/orders/admin-all", { cache: "no-store" });
            if (r.ok) setOrders((await r.json()).items ?? []);
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function setStatus(id: string, status: string) {
        setBusy(id);
        try {
            const r = await fetch(`/api/belis/orders/${id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (r.ok) setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
        } finally { setBusy(null); }
    }

    const fmt = (n: number | string, cur: string) =>
        `${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "uz-UZ").format(Number(n))} ${cur === "USD" ? "$" : "so'm"}`;

    if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: BELIS.gold }} /></div>;
    if (orders.length === 0) return <EmptyBox text="Buyurtmalar hali yo'q" />;

    return (
        <div className="space-y-3">
            {orders.map(o => (
                <div key={o.id} className="p-4 rounded-2xl"
                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                    <div className="flex justify-between items-start gap-3 mb-2">
                        <div>
                            <p className="text-sm font-black" style={{ color: BELIS.gold, fontFamily: "'Montserrat', sans-serif" }}>{o.code}</p>
                            <p className="text-xs mt-0.5" style={{ color: BELIS.text }}>{o.buyerName} · {o.buyerPhone}</p>
                            <p className="text-xs" style={{ color: BELIS.text3 }}>
                                {o.items.length} ta mahsulot · {fmt(o.total, o.currency)} · {new Date(o.createdAt).toLocaleString("uz-UZ")}
                            </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded"
                            style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}`, color: BELIS.text2 }}>
                            {o.status}
                        </span>
                    </div>
                    <div className="flex gap-1 flex-wrap mt-2">
                        {["ACCEPTED", "PREPARING", "SHIPPING", "DELIVERED", "CANCELLED"].map(s => (
                            <button key={s} onClick={() => setStatus(o.id, s)} disabled={busy === o.id || o.status === s}
                                className="px-2.5 py-1 rounded text-[10px] font-bold transition disabled:opacity-40"
                                style={{
                                    background: o.status === s ? BELIS.gold : BELIS.bg,
                                    color: o.status === s ? BELIS.onGold : BELIS.text2,
                                    border: `1px solid ${o.status === s ? BELIS.gold : BELIS.border}`,
                                }}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── PRODUCTS ───────────────────────────────────────────────────────────────
function AdminProducts() {
    const [items, setItems] = useState<AdminProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch("/api/belis/products?limit=60", { cache: "no-store" });
            if (r.ok) setItems((await r.json()).items ?? []);
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <p className="text-xs" style={{ color: BELIS.text2 }}>{items.length} ta mahsulot</p>
                <button onClick={() => setEditing("new")}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black transition hover:brightness-110"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, fontFamily: "'Montserrat', sans-serif" }}>
                    <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Yangi mahsulot
                </button>
            </div>
            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" style={{ color: BELIS.gold }} /></div>
            ) : items.length === 0 ? (
                <EmptyBox text="Mahsulot yo'q — birinchisini qo'shing" />
            ) : (
                <div className="grid md:grid-cols-2 gap-3">
                    {items.map(p => (
                        <div key={p.id} className="flex gap-3 p-3 rounded-2xl"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ background: BELIS.bg }}>
                                {p.images[0] && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold" style={{ color: BELIS.text, fontFamily: "'Playfair Display', serif" }}>{p.nameUz}</p>
                                <p className="text-xs" style={{ color: BELIS.text2 }}>{p.price.toLocaleString("uz-UZ")} · Stock: {p.stock}</p>
                                {p.featured && <span className="inline-block text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded" style={{ background: BELIS.gold, color: BELIS.onGold }}>FEATURED</span>}
                            </div>
                            <button onClick={() => setEditing(p)}
                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: BELIS.bg, border: `1px solid ${BELIS.border}` }}>
                                <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: BELIS.gold }} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {editing && (
                <ProductEditor product={editing === "new" ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); load(); }} />
            )}
        </div>
    );
}

function ProductEditor({ product, onClose, onSaved }: {
    product: AdminProduct | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [name, setName] = useState(product?.nameUz ?? "");
    const [price, setPrice] = useState(String(product?.price ?? ""));
    const [stock, setStock] = useState(String(product?.stock ?? "0"));
    const [images, setImages] = useState<string[]>(product?.images ?? []);
    const [featured, setFeatured] = useState(product?.featured ?? false);
    const [descriptionUz, setDescriptionUz] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    async function uploadImage(file: File) {
        setUploading(true);
        try {
            const { upload } = await import("@vercel/blob/client");
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const blob = await upload(`belis/${Date.now()}-${safeName}`, file, {
                access: "public",
                handleUploadUrl: "/api/belis/upload/client-token",
            });
            setImages(prev => [...prev, blob.url]);
        } catch (e) { setErr(e instanceof Error ? e.message : "Yuklab bo'lmadi"); }
        finally { setUploading(false); }
    }

    async function save() {
        setErr(null); setBusy(true);
        const body = {
            nameUz: name.trim(),
            price: Number(price),
            stock: Number(stock),
            images, featured,
            descriptionUz: descriptionUz.trim() || undefined,
        };
        try {
            const isNew = !product;
            const url = isNew ? "/api/belis/products" : `/api/belis/products/${product!.slug}`;
            const r = await fetch(url, {
                method: isNew ? "POST" : "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const d = await r.json();
            if (r.ok) onSaved(); else setErr(d?.error ?? "Xato");
        } catch { setErr("Tarmoq xatosi"); }
        finally { setBusy(false); }
    }
    async function remove() {
        if (!product) return;
        if (!confirm(`"${product.nameUz}" o'chirilsinmi?`)) return;
        setBusy(true);
        try {
            const r = await fetch(`/api/belis/products/${product.slug}`, { method: "DELETE" });
            if (r.ok) onSaved();
        } finally { setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-[220]" onClick={onClose}>
            <div className="absolute inset-0" style={{ background: "rgba(58,53,32,0.55)", backdropFilter: "blur(6px)" }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-[560px] max-h-[92vh] rounded-2xl overflow-hidden flex flex-col"
                style={{ background: BELIS.bg, border: `1px solid ${BELIS.gold}`, boxShadow: "0 24px 64px rgba(58,53,32,0.55)" }}
                onClick={e => e.stopPropagation()}>
                <div className="p-4 flex items-center gap-2 flex-shrink-0" style={{ borderBottom: `1px solid ${BELIS.border}` }}>
                    <h3 className="text-base font-black flex-1" style={{ color: BELIS.gold, fontFamily: "'Playfair Display', serif" }}>
                        {product ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: BELIS.surface }}>
                        <X className="w-4 h-4" style={{ color: BELIS.text2 }} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div>
                        <label className="text-[11px] block mb-1" style={{ color: BELIS.text2 }}>Nomi (uzbek)</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={200}
                            className="w-full px-3 py-2 rounded-lg bg-transparent focus:outline-none"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}`, color: BELIS.text }} />
                    </div>
                    <div>
                        <label className="text-[11px] block mb-1" style={{ color: BELIS.text2 }}>Tavsif (ixtiyoriy)</label>
                        <textarea value={descriptionUz} onChange={e => setDescriptionUz(e.target.value)} maxLength={2000} rows={3}
                            className="w-full px-3 py-2 rounded-lg bg-transparent focus:outline-none"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}`, color: BELIS.text }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] block mb-1" style={{ color: BELIS.text2 }}>Narx (so'm)</label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} min={0}
                                className="w-full px-3 py-2 rounded-lg bg-transparent focus:outline-none"
                                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}`, color: BELIS.text }} />
                        </div>
                        <div>
                            <label className="text-[11px] block mb-1" style={{ color: BELIS.text2 }}>Stock (-1 = cheksiz)</label>
                            <input type="number" value={stock} onChange={e => setStock(e.target.value)} min={-1}
                                className="w-full px-3 py-2 rounded-lg bg-transparent focus:outline-none"
                                style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}`, color: BELIS.text }} />
                        </div>
                    </div>
                    {/* Rasmlar */}
                    <div>
                        <label className="text-[11px] block mb-1" style={{ color: BELIS.text2 }}>Rasmlar</label>
                        <div className="grid grid-cols-4 gap-2">
                            {images.map((url, i) => (
                                <div key={i} className="aspect-square rounded-lg overflow-hidden relative group"
                                    style={{ background: BELIS.surface }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                        style={{ background: "rgba(178,58,72,0.90)" }}>
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            ))}
                            {images.length < 12 && (
                                <label className="aspect-square rounded-lg flex items-center justify-center cursor-pointer transition hover:brightness-95"
                                    style={{ background: BELIS.surface, border: `1px dashed ${BELIS.border}` }}>
                                    <input type="file" accept="image/*" className="hidden"
                                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
                                    {uploading
                                        ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: BELIS.gold }} />
                                        : <ImagePlus className="w-4 h-4" strokeWidth={1.5} style={{ color: BELIS.gold }} />}
                                </label>
                            )}
                        </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} />
                        <span className="text-sm" style={{ color: BELIS.text }}>Bosh sahifada ko&apos;rsatish (Featured)</span>
                    </label>
                    {err && <p className="text-xs p-2 rounded" style={{ background: BELIS.errSoft, color: BELIS.err }}>{err}</p>}
                </div>
                <div className="p-3 flex gap-2 border-t" style={{ borderColor: BELIS.border, background: BELIS.surface }}>
                    {product && (
                        <button onClick={remove} disabled={busy}
                            className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5"
                            style={{ background: BELIS.errSoft, color: BELIS.err, border: `1px solid ${BELIS.err}55` }}>
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> O&apos;chirish
                        </button>
                    )}
                    <div className="flex-1" />
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold"
                        style={{ background: BELIS.bg, color: BELIS.text2, border: `1px solid ${BELIS.border}` }}>
                        Bekor
                    </button>
                    <button onClick={save} disabled={busy || !name.trim() || !price}
                        className="px-5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
                        style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, fontFamily: "'Montserrat', sans-serif" }}>
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Saqlash</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── CATEGORIES ─────────────────────────────────────────────────────────────
function AdminCategories() {
    const [items, setItems] = useState<AdminCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch("/api/belis/categories");
            if (r.ok) setItems((await r.json()).items ?? []);
        } finally { setLoading(false); }
    }
    useEffect(() => { load(); }, []);

    async function add() {
        if (!name.trim()) return;
        setBusy(true);
        try {
            const r = await fetch("/api/belis/categories", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nameUz: name.trim(), sort: items.length }),
            });
            if (r.ok) { setName(""); load(); }
        } finally { setBusy(false); }
    }

    return (
        <div className="max-w-lg">
            <div className="flex gap-2 mb-4">
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Yangi kategoriya nomi..."
                    className="flex-1 px-3 py-2 rounded-lg bg-transparent focus:outline-none"
                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}`, color: BELIS.text }} />
                <button onClick={add} disabled={busy || !name.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-black flex items-center gap-1"
                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold }}>
                    <Plus className="w-3.5 h-3.5" /> Qo&apos;shish
                </button>
            </div>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: BELIS.gold }} />
             : items.length === 0 ? <EmptyBox text="Kategoriya yo'q" />
             : (
                <div className="space-y-2">
                    {items.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                            <div>
                                <p className="text-sm font-bold" style={{ color: BELIS.text }}>{c.nameUz}</p>
                                <p className="text-[10px]" style={{ color: BELIS.text3 }}>{c.slug}</p>
                            </div>
                        </div>
                    ))}
                </div>
             )}
        </div>
    );
}

function EmptyBox({ text }: { text: string }) {
    return (
        <div className="text-center py-10 rounded-2xl"
            style={{ background: BELIS.surface, border: `1px dashed ${BELIS.border}` }}>
            <p className="text-sm" style={{ color: BELIS.text2 }}>{text}</p>
        </div>
    );
}
