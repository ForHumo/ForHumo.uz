"use client";

import { useState, useEffect, useCallback } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { upload } from "@vercel/blob/client";
import { BnHeader } from "./bn-header";
import { Plus, Loader2, ImagePlus, X, Package, Eye, TrendingUp, LayoutDashboard, ArrowRight } from "lucide-react";

interface Seller { id: string; status: string; shopName: string; shopSlug: string }
interface Product {
    id: string; slug: string; title: string; price: number; images: string[];
    stock: number; sold: number; views: number; isActive: boolean; createdAt: string;
}

function fmtSom(n: number): string {
    return `${n.toLocaleString("uz-UZ")} so'm`;
}

export function BnSellerDashboard() {
    const router = useRouter();
    const [seller, setSeller] = useState<Seller | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const s = await fetch("/api/bn/sellers").then(r => r.json());
            if (!s.seller) { router.push("/bn/seller/register"); return; }
            setSeller(s.seller);
            const p = await fetch(`/api/bn/products?sellerId=${s.seller.id}&limit=50`).then(r => r.json());
            setProducts(p.products ?? []);
        } finally { setLoading(false); }
    }, [router]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EAB308" }} />
            </div>
        );
    }

    if (!seller || seller.status !== "APPROVED") {
        return (
            <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#fafafa" }}>
                <BnHeader active="dashboard" />
                <div className="max-w-lg mx-auto px-4 py-16 text-center">
                    <p className="text-lg font-black mb-2">
                        {seller?.status === "PENDING" ? "Ariza ko'rib chiqilmoqda" :
                         seller?.status === "REJECTED" ? "Ariza rad etilgan" :
                         seller?.status === "SUSPENDED" ? "Hisobingiz to'xtatilgan" :
                         "Avval sotuvchi bo'ling"}
                    </p>
                    <p className="text-sm mb-6" style={{ color: "rgba(200,200,200,0.75)" }}>
                        Mahsulot qo&apos;shish uchun admin tasdig&apos;i kerak
                    </p>
                    <Link href="/bn/seller/register" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-black"
                        style={{ background: "#EAB308" }}>
                        Registratsiyaga o&apos;tish <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        );
    }

    const totalRevenue = products.reduce((s, p) => s + (p.sold * p.price), 0);
    const totalStock = products.reduce((s, p) => s + p.stock, 0);
    const totalViews = products.reduce((s, p) => s + p.views, 0);

    return (
        <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#fafafa" }}>
            <BnHeader active="dashboard" />

            <div className="max-w-5xl mx-auto px-4 py-6 pb-16">
                {/* Shop header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "#0a0a0a", border: "2px solid #EAB308" }}>
                        <LayoutDashboard className="w-5 h-5" style={{ color: "#EAB308" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-black truncate">{seller.shopName}</h1>
                        <p className="text-xs" style={{ color: "rgba(200,200,200,0.65)" }}>bozornarxida.uz/shop/{seller.shopSlug}</p>
                    </div>
                    <button onClick={() => setCreateOpen(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black"
                        style={{ background: "#EAB308" }}>
                        <Plus className="w-3.5 h-3.5" /> Mahsulot
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <Stat icon={Package} label="Mahsulotlar" value={String(products.length)} sub={`${totalStock} omborda`} />
                    <Stat icon={Eye} label="Ko'rishlar" value={totalViews.toLocaleString("uz-UZ")} sub="jami" />
                    <Stat icon={TrendingUp} label="Sotuv" value={fmtSom(totalRevenue)} sub="jami" />
                </div>

                {/* Products list */}
                {products.length === 0 ? (
                    <div className="rounded-2xl p-10 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(234,179,8,0.30)" }}>
                        <Package className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(234,179,8,0.65)" }} />
                        <p className="text-sm font-bold mb-1">Hali mahsulot yo&apos;q</p>
                        <p className="text-xs mb-4" style={{ color: "rgba(200,200,200,0.65)" }}>Birinchi mahsulotingizni qo&apos;shing</p>
                        <button onClick={() => setCreateOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-black"
                            style={{ background: "#EAB308" }}>
                            <Plus className="w-3.5 h-3.5" /> Yangi mahsulot
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {products.map(p => (
                            <div key={p.id} className="rounded-xl overflow-hidden"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
                                <div className="aspect-square" style={{ background: "#000" }}>
                                    {p.images[0] ? (
                                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Package className="w-8 h-8" style={{ color: "rgba(255,255,255,0.20)" }} />
                                        </div>
                                    )}
                                </div>
                                <div className="p-2">
                                    <p className="text-xs font-bold text-white line-clamp-2 min-h-[2.5em]">{p.title}</p>
                                    <p className="text-sm font-black mt-1" style={{ color: "#EAB308" }}>{fmtSom(p.price)}</p>
                                    <div className="flex items-center justify-between mt-1.5 text-[10px]" style={{ color: "rgba(200,200,200,0.60)" }}>
                                        <span>{p.stock} dona</span>
                                        <span>{p.views} ko'rish</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {createOpen && <BnProductCreate onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} />}
        </div>
    );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) {
    return (
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color: "#EAB308" }} />
                <span className="text-[10px] font-black uppercase" style={{ color: "rgba(200,200,200,0.75)" }}>{label}</span>
            </div>
            <p className="text-lg font-black text-white truncate">{value}</p>
            <p className="text-[10px]" style={{ color: "rgba(200,200,200,0.55)" }}>{sub}</p>
        </div>
    );
}

// ── Product Create modal ────────────────────────────────────────────────
function BnProductCreate({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState<string>("");
    const [oldPrice, setOldPrice] = useState<string>("");
    const [stock, setStock] = useState("1");
    const [carBrand, setCarBrand] = useState("");
    const [carModel, setCarModel] = useState("");
    const [partCondition, setPartCondition] = useState<"new" | "used" | "restored">("new");
    const [hasDelivery, setHasDelivery] = useState(false);
    const [pickupOnly, setPickupOnly] = useState(true);
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [posting, setPosting] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function pickImages(files: FileList | null) {
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            for (const file of Array.from(files).slice(0, 8 - images.length)) {
                const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                const blob = await upload(`bn/product/${Date.now()}-${safe}`, file, {
                    access: "public", handleUploadUrl: "/api/market/upload/client-token",
                });
                setImages(prev => [...prev, blob.url]);
            }
        } catch (e) { setErr(e instanceof Error ? e.message : "Yuklashda xato"); }
        finally { setUploading(false); }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (posting) return;
        setErr(null); setPosting(true);
        try {
            const priceN = Number(price.replace(/\s/g, ""));
            if (!priceN || priceN <= 0) { setErr("Narx to'g'ri kiriting"); return; }
            const res = await fetch("/api/bn/products", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title, description, price: priceN,
                    oldPrice: oldPrice ? Number(oldPrice.replace(/\s/g, "")) : undefined,
                    stock: Number(stock) || 1, images,
                    carBrand: carBrand || undefined, carModel: carModel || undefined,
                    partCondition, hasDelivery, pickupOnly,
                }),
            });
            const d = await res.json();
            if (!res.ok) { setErr(d.error || "Xato"); return; }
            onCreated();
        } finally { setPosting(false); }
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()}
                className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
                style={{ background: "#141414", border: "1px solid rgba(234,179,8,0.20)", maxHeight: "92vh" }}>
                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                    <p className="text-base font-black text-white flex-1">Yangi mahsulot</p>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <form onSubmit={submit} className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: "calc(92vh - 130px)", scrollbarWidth: "none" }}>
                    {/* Rasmlar */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(200,200,200,0.75)" }}>Rasmlar (maks 8)</label>
                        <div className="grid grid-cols-4 gap-2">
                            {images.map((u, i) => (
                                <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                                    <img src={u} alt="" className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                                        style={{ background: "rgba(0,0,0,0.75)" }}>
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            ))}
                            {images.length < 8 && (
                                <label className="aspect-square rounded-lg flex items-center justify-center cursor-pointer"
                                    style={{ background: "rgba(234,179,8,0.06)", border: "1px dashed rgba(234,179,8,0.30)" }}>
                                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#EAB308" }} /> : <ImagePlus className="w-5 h-5" style={{ color: "rgba(234,179,8,0.75)" }} />}
                                    <input type="file" accept="image/*" multiple className="hidden"
                                        onChange={e => pickImages(e.target.files)} />
                                </label>
                            )}
                        </div>
                    </div>

                    <SmallField label="Sarlavha *" value={title} onChange={setTitle} placeholder="Nexia 3 dvigatel filtri" />

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(200,200,200,0.75)" }}>Tavsif</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 5000))} rows={3}
                            placeholder="Yangi, original, kafolat 6 oy..."
                            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <SmallField label="Narx (so'm) *" value={price} onChange={setPrice} placeholder="150000" />
                        <SmallField label="Eski narx" value={oldPrice} onChange={setOldPrice} placeholder="200000" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <SmallField label="Ombor" value={stock} onChange={setStock} placeholder="1" />
                        <SmallField label="Marka" value={carBrand} onChange={setCarBrand} placeholder="Chevrolet" />
                        <SmallField label="Model" value={carModel} onChange={setCarModel} placeholder="Nexia" />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(200,200,200,0.75)" }}>Holati</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {[
                                { key: "new", label: "Yangi" },
                                { key: "used", label: "Ishlatilgan" },
                                { key: "restored", label: "Tiklangan" },
                            ].map(o => (
                                <button key={o.key} type="button" onClick={() => setPartCondition(o.key as "new" | "used" | "restored")}
                                    className="px-3 py-2 rounded-lg text-xs font-bold"
                                    style={partCondition === o.key ? { background: "#EAB308", color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(200,200,200,0.85)" }}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={pickupOnly} onChange={e => setPickupOnly(e.target.checked)} />
                            <span className="text-xs">Faqat do&apos;kondan olib ketish</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={hasDelivery} onChange={e => setHasDelivery(e.target.checked)} />
                            <span className="text-xs">Yandex/BTS orqali yetkazish (kelajakda)</span>
                        </label>
                    </div>

                    {err && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.10)", color: "#ff8a96" }}>{err}</p>}

                    <button type="submit" disabled={posting || !title.trim() || !price}
                        className="w-full py-3 rounded-xl text-sm font-black text-black disabled:opacity-50 flex items-center justify-center gap-2"
                        style={{ background: "#EAB308" }}>
                        {posting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Qo&apos;shish
                    </button>
                </form>
            </div>
        </div>
    );
}

function SmallField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <div>
            <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "rgba(200,200,200,0.75)" }}>{label}</label>
            <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full h-10 rounded-lg px-3 text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }} />
        </div>
    );
}
