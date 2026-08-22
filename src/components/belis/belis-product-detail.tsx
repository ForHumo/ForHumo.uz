"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, ShoppingBag, Heart, Share2, ChevronLeft, Send } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { BELIS, BELIS_GOLD_GRADIENT, BELIS_SOCIAL } from "@/lib/belis-theme";
import { BelisLink } from "./belis-nav";

interface FullProduct {
    id: string; slug: string;
    nameUz: string; nameRu?: string | null; nameEn?: string | null;
    descriptionUz?: string | null; descriptionRu?: string | null; descriptionEn?: string | null;
    images: string[];
    price: number; oldPrice?: number | null; currency: string;
    stock: number; sold: number;
    category?: { slug: string; nameUz: string } | null;
}
interface Review { id: string; buyerName: string; rating: number; text: string | null; createdAt: string }

function pick(uz: string | null | undefined, ru: string | null | undefined, en: string | null | undefined, locale: string): string {
    if (locale === "ru" && ru) return ru;
    if (locale === "en" && en) return en;
    return uz ?? "";
}
function fmtPrice(n: number, cur: string, locale: string): string {
    const s = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "uz-UZ").format(n);
    return cur === "USD" ? `$${s}` : `${s} so'm`;
}

export function BelisProductDetail({ slug }: { slug: string }) {
    const t = useTranslations("belis");
    const locale = useLocale();
    const router = useRouter();
    const [data, setData] = useState<{ product: FullProduct; reviews: Review[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [imgIdx, setImgIdx] = useState(0);
    const [qty, setQty] = useState(1);
    const [adding, setAdding] = useState(false);
    const [addedMsg, setAddedMsg] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/belis/products/${slug}`).then(r => r.ok ? r.json() : null)
            .then(d => setData(d))
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) return <div className="max-w-6xl mx-auto px-4 py-20 text-center"><Loader2 className="w-6 h-6 animate-spin inline" style={{ color: BELIS.gold }} /></div>;
    if (!data) return <div className="max-w-6xl mx-auto px-4 py-20 text-center" style={{ color: BELIS.text2 }}>Mahsulot topilmadi</div>;

    const p = data.product;
    const name = pick(p.nameUz, p.nameRu, p.nameEn, locale);
    const desc = pick(p.descriptionUz, p.descriptionRu, p.descriptionEn, locale);
    const hasDiscount = p.oldPrice && p.oldPrice > p.price;
    const soldOut = p.stock === 0;
    const canBuy = !soldOut;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const waShareUrl = `https://wa.me/?text=${encodeURIComponent(name + " · " + shareUrl)}`;

    async function addToCart(buyNow = false) {
        setAdding(true);
        setAddedMsg(null);
        try {
            const r = await fetch("/api/belis/cart", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: p.id, quantity: qty }),
            });
            if (r.ok) {
                setAddedMsg("Savatga qo'shildi");
                if (buyNow) router.push("/belis/checkout" as never);
                else setTimeout(() => setAddedMsg(null), 2500);
            } else if (r.status === 401) {
                setAddedMsg("Avval Humo ID bilan kiring");
            } else {
                setAddedMsg("Xato yuz berdi");
            }
        } catch { setAddedMsg("Tarmoq xatosi"); }
        finally { setAdding(false); }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            {/* Orqaga */}
            <BelisLink href="/belis/katalog"
                className="inline-flex items-center gap-1 text-xs mb-4 hover:underline"
                style={{ color: BELIS.text2 }}>
                <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Katalog
            </BelisLink>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Rasm galereya */}
                <div>
                    <div className="aspect-square rounded-2xl overflow-hidden relative"
                        style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                        {p.images[imgIdx] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[imgIdx]} alt={name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center"
                                style={{ color: BELIS.text3, fontFamily: "'Great Vibes', cursive", fontSize: 80 }}>
                                Belis
                            </div>
                        )}
                        {hasDiscount && (
                            <span className="absolute top-3 left-3 text-xs font-black px-2.5 py-1 rounded-md"
                                style={{ background: BELIS.gold, color: BELIS.onGold }}>
                                -{Math.round(100 - (p.price / p.oldPrice!) * 100)}%
                            </span>
                        )}
                    </div>
                    {p.images.length > 1 && (
                        <div className="mt-3 grid grid-cols-5 gap-2">
                            {p.images.slice(0, 10).map((src, i) => (
                                <button key={i} onClick={() => setImgIdx(i)}
                                    className="aspect-square rounded-lg overflow-hidden transition"
                                    style={{ border: imgIdx === i ? `2px solid ${BELIS.gold}` : `1px solid ${BELIS.borderSoft}` }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={src} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div>
                    {p.category && (
                        <BelisLink href={`/belis/katalog?category=${p.category.slug}` as never}
                            className="text-[11px] uppercase tracking-widest hover:underline"
                            style={{ color: BELIS.text2 }}>
                            {p.category.nameUz}
                        </BelisLink>
                    )}
                    <h1 className="mt-2 mb-3"
                        style={{ fontFamily: "'Playfair Display', serif", color: BELIS.text, fontSize: 32, lineHeight: 1.2 }}>
                        {name}
                    </h1>

                    <div className="flex items-baseline gap-3 mb-4">
                        <span className="text-3xl font-black" style={{ color: BELIS.gold, fontFamily: "'Montserrat', sans-serif" }}>
                            {fmtPrice(p.price, p.currency, locale)}
                        </span>
                        {hasDiscount && (
                            <span className="text-lg line-through" style={{ color: BELIS.text3 }}>
                                {fmtPrice(p.oldPrice!, p.currency, locale)}
                            </span>
                        )}
                    </div>

                    {soldOut ? (
                        <div className="p-3 rounded-lg mb-4"
                            style={{ background: BELIS.errSoft, border: `1px solid ${BELIS.err}55`, color: BELIS.err }}>
                            Sotuvda yo&apos;q
                        </div>
                    ) : (
                        <>
                            {/* Miqdor */}
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-sm" style={{ color: BELIS.text2 }}>Miqdor:</span>
                                <div className="flex items-center rounded-lg overflow-hidden"
                                    style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                                    <button onClick={() => setQty(q => Math.max(1, q - 1))}
                                        className="w-9 h-9 text-lg font-bold hover:brightness-95"
                                        style={{ color: BELIS.gold }}>-</button>
                                    <span className="w-10 text-center text-sm font-bold" style={{ color: BELIS.text }}>{qty}</span>
                                    <button onClick={() => setQty(q => Math.min(99, q + 1))}
                                        className="w-9 h-9 text-lg font-bold hover:brightness-95"
                                        style={{ color: BELIS.gold }}>+</button>
                                </div>
                                {p.stock > 0 && p.stock < 10 && (
                                    <span className="text-xs" style={{ color: BELIS.warn }}>Faqat {p.stock} ta qoldi</span>
                                )}
                            </div>

                            {/* Tugmalar */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <button onClick={() => addToCart(false)} disabled={adding || !canBuy}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition hover:brightness-95 disabled:opacity-50"
                                    style={{ background: BELIS.surface, color: BELIS.gold, border: `1px solid ${BELIS.gold}`, fontFamily: "'Montserrat', sans-serif" }}>
                                    <ShoppingBag className="w-4 h-4" strokeWidth={1.5} /> {t("product.addToCart")}
                                </button>
                                <button onClick={() => addToCart(true)} disabled={adding || !canBuy}
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition hover:brightness-110 disabled:opacity-50"
                                    style={{ background: BELIS_GOLD_GRADIENT, color: BELIS.onGold, boxShadow: "0 6px 16px rgba(212,175,55,0.35)", fontFamily: "'Montserrat', sans-serif" }}>
                                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" strokeWidth={1.5} /> {t("product.buyNow")}</>}
                                </button>
                            </div>
                            {addedMsg && (
                                <p className="text-center text-xs mb-4 py-2 rounded-lg"
                                    style={{ background: BELIS.okSoft, color: BELIS.ok }}>{addedMsg}</p>
                            )}
                        </>
                    )}

                    {/* Ulashish */}
                    <div className="flex items-center gap-2 mb-6">
                        <a href={waShareUrl} target="_blank" rel="noopener"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                            style={{ background: "#25D366", color: "white", fontFamily: "'Montserrat', sans-serif" }}>
                            <Share2 className="w-3 h-3" strokeWidth={1.5} /> WhatsApp
                        </a>
                        <a href={BELIS_SOCIAL.telegramBot} target="_blank" rel="noopener"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                            style={{ background: BELIS.surface, color: BELIS.text2, border: `1px solid ${BELIS.border}`, fontFamily: "'Montserrat', sans-serif" }}>
                            <Send className="w-3 h-3" strokeWidth={1.5} /> Telegram bot
                        </a>
                        <button className="w-8 h-8 rounded-full flex items-center justify-center hover:brightness-95"
                            style={{ background: BELIS.surface, border: `1px solid ${BELIS.border}` }}>
                            <Heart className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: BELIS.text2 }} />
                        </button>
                    </div>

                    {/* Tavsif */}
                    {desc && (
                        <div className="pt-5 border-t" style={{ borderColor: BELIS.borderSoft }}>
                            <h2 className="text-sm uppercase tracking-widest mb-3" style={{ color: BELIS.text2, fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>
                                {t("product.description")}
                            </h2>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: BELIS.text }}>
                                {desc}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sharhlar */}
            {data.reviews.length > 0 && (
                <div className="mt-12 pt-8 border-t" style={{ borderColor: BELIS.borderSoft }}>
                    <h2 className="text-2xl mb-4" style={{ color: BELIS.gold, fontFamily: "'Playfair Display', serif" }}>
                        {t("product.reviews")} ({data.reviews.length})
                    </h2>
                    <div className="grid md:grid-cols-2 gap-3">
                        {data.reviews.map(r => (
                            <div key={r.id} className="p-4 rounded-2xl"
                                style={{ background: BELIS.surface, border: `1px solid ${BELIS.borderSoft}` }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold" style={{ color: BELIS.text }}>{r.buyerName}</span>
                                    <span className="text-xs" style={{ color: BELIS.gold }}>{"★".repeat(r.rating)}</span>
                                </div>
                                {r.text && <p className="text-xs" style={{ color: BELIS.text2 }}>{r.text}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
