"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { BnLink } from "./bn-nav";
import { Store, ShoppingBasket, Star, Eye, Truck, BadgeCheck, Heart, Package } from "lucide-react";
import { BN, fmtPrice, priceRankOf, PRICE_RANK_META, priceDiffLabel } from "@/lib/bn-theme";

export interface ProductCardData {
    id: string;                     // Sevimlilar toggle uchun kerak
    slug: string;
    title: string;
    price: number;
    oldPrice: number | null;
    marketAvgPrice: number | null;
    images: string[];
    shopName: string;
    shopSlug: string;
    shopVerified?: boolean;         // Tasdiqlangan do'kon belgisi
    marketName: string | null;      // Bozorda joylashgan bo'lsa — bozor nomi
    city: string;                   // "Toshkent", "Samarqand"
    district?: string | null;       // "Shayxontohur" — ko'chadagi do'kon uchun
    branchName?: string | null;     // "Shedevr" — filial nomi (bo'lsa "Nom | Shahar, Tuman")
    rating: number;
    ratingCount: number;
    isNegotiable: boolean;
    allowDelivery: boolean;
    allowInspect: boolean;
    stock: number;
    isMature?: boolean;             // 18+ — rasmi xiralashtiriladi
    isWholesale?: boolean;          // Ulgurji — B2B badge
    minWholesaleQty?: number | null;
    shopVerifiedTier?: "NONE" | "RETAIL" | "WHOLESALE";  // tasdiqlangan sotuvchi galochkasi
}

/** Foydalanuvchi qarori bo'yicha kontekst matni:
 *   Bozorda:    "Sergeli avto bozori · Toshkent"
 *   Ko'chada:   "Chilonzor Mebel · Toshkent, Shayxontohur"
 *   Filialli:   `"Shedevr" · Toshkent, Shayxontohur`
 *   Onlayn:     "Onlayn do'kon · Toshkent"
 */
export function productContextText(p: {
    marketName: string | null; city: string;
    district?: string | null; branchName?: string | null;
}): { text: string; kind: "market" | "shop" } {
    if (p.marketName) {
        return { text: `${p.marketName} · ${p.city}`, kind: "market" };
    }
    const loc = p.district ? `${p.city}, ${p.district}` : p.city;
    if (p.branchName) {
        return { text: `"${p.branchName}" · ${loc}`, kind: "shop" };
    }
    return { text: loc, kind: "shop" };
}

export function BnProductCard({
    p, compact = false, initialFavored,
}: { p: ProductCardData; compact?: boolean; initialFavored?: boolean }) {
    const rank = priceRankOf(p.price, p.marketAvgPrice);
    const rankMeta = rank ? PRICE_RANK_META[rank] : null;
    const diff = priceDiffLabel(p.price, p.marketAvgPrice);
    const showDiff = rank === "cheap" && diff;

    const { status } = useSession();
    const [fav, setFav] = useState<boolean>(!!initialFavored);
    const [favBusy, setFavBusy] = useState(false);
    const [favKnown, setFavKnown] = useState(initialFavored !== undefined);

    // Login bo'lgach status yuklash (initialFavored berilmagan bo'lsa)
    useEffect(() => {
        if (favKnown || status !== "authenticated") return;
        let cancelled = false;
        fetch(`/api/bn/favorites?ids=${p.id}`)
            .then(r => r.json())
            .then(d => { if (!cancelled) { setFav(!!d?.statuses?.[p.id]); setFavKnown(true); } })
            .catch(() => { /* ignore */ });
        return () => { cancelled = true; };
    }, [status, p.id, favKnown]);

    async function toggleFav(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (status === "unauthenticated") { signIn("google"); return; }
        if (favBusy) return;
        setFavBusy(true);
        const prev = fav;
        setFav(!prev);
        try {
            const r = await fetch("/api/bn/favorites", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ productId: p.id }),
            });
            if (!r.ok) setFav(prev);
        } catch { setFav(prev); }
        finally { setFavBusy(false); }
    }

    return (
        <BnLink
            href={`/p/${p.slug}`}
            newTab
            className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-150 active:scale-[0.985]"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
        >
            {/* Rasm */}
            <div className="relative aspect-square overflow-hidden" style={{ background: BN.surfaceUp }}>
                {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={p.images[0]}
                        alt={p.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                        style={p.isMature ? { filter: "blur(18px)" } : undefined}
                    />
                ) : (
                    <div className="w-full h-full grid place-items-center" style={{ color: BN.text3 }}>
                        <Store className="w-8 h-8" />
                    </div>
                )}

                {/* 18+ belgi */}
                {p.isMature && (
                    <span
                        className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[11px] font-black leading-none"
                        style={{ background: "#ef4444", color: "#fff" }}
                    >
                        18+
                    </span>
                )}

                {/* Ulgurji belgi */}
                {p.isWholesale && !p.isMature && (
                    <span
                        className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10.5px] font-black leading-none flex items-center gap-1"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        <Package className="w-3 h-3" /> Ulgurji
                        {p.minWholesaleQty ? <span className="opacity-80">· {p.minWholesaleQty}+</span> : null}
                    </span>
                )}

                {/* Arzon belgisi — BN ning asosiy va'dasi */}
                {showDiff && !p.isMature && !p.isWholesale && (
                    <span
                        className="absolute top-2 left-2 px-2 py-1 rounded-lg text-[10.5px] font-black leading-none"
                        style={{ background: BN.ok, color: BN.onGold }}
                    >
                        {diff}
                    </span>
                )}

                {/* Yurak — sevimlilarga qo'shish */}
                <button
                    onClick={toggleFav}
                    disabled={favBusy}
                    aria-label={fav ? "Sevimlilardan olib tashlash" : "Sevimlilarga qo'shish"}
                    className="absolute top-2 right-2 w-9 h-9 grid place-items-center rounded-full backdrop-blur-sm transition-transform active:scale-90 disabled:opacity-60"
                    style={{ background: BN.glass }}
                >
                    <Heart
                        className="w-4 h-4 transition-colors"
                        style={{
                            fill:   fav ? BN.err : "transparent",
                            color:  fav ? BN.err : "#fff",
                            stroke: fav ? BN.err : "#fff",
                            strokeWidth: 2.2,
                        }}
                    />
                </button>

                {/* Kam qoldi — endi yurak ostida */}
                {p.stock > 0 && p.stock <= 3 && (
                    <span
                        className="absolute top-[52px] right-2 px-2 py-1 rounded-lg text-[10.5px] font-black leading-none"
                        style={{ background: BN.glass, color: BN.warn }}
                    >
                        {p.stock} ta qoldi
                    </span>
                )}

                {/* Pastki belgilar */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                    {p.allowInspect && (
                        <Chip icon={<Eye className="w-3 h-3" />} text="Ko'rib olish" />
                    )}
                    {p.allowDelivery && !compact && (
                        <Chip icon={<Truck className="w-3 h-3" />} text="Yetkazish" />
                    )}
                </div>
            </div>

            {/* Matn */}
            <div className="flex flex-col flex-1 p-3">
                {/* TEPADA: qaysi do'kon sotayapti (ikonkasiz — foydalanuvchi qarori) */}
                <div className="flex items-center gap-1 mb-1.5 text-[11.5px] font-bold min-w-0">
                    <span className="truncate" style={{ color: BN.text2 }}>{p.shopName}</span>
                    {p.shopVerifiedTier && p.shopVerifiedTier !== "NONE" ? (
                        <BadgeCheck
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: p.shopVerifiedTier === "WHOLESALE" ? BN.gold : BN.info }}
                            strokeWidth={2.6}
                            aria-label={p.shopVerifiedTier === "WHOLESALE" ? "Tasdiqlangan ulgurji" : "Tasdiqlangan sotuvchi"}
                        />
                    ) : p.shopVerified && (
                        <BadgeCheck
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: BN.info }}
                            strokeWidth={2.6}
                        />
                    )}
                    {p.ratingCount > 0 && (
                        <span className="ml-auto flex items-center gap-0.5 flex-shrink-0" style={{ color: BN.gold }}>
                            <Star className="w-3 h-3 fill-current" />
                            {p.rating.toFixed(1)}
                        </span>
                    )}
                </div>

                {/* Narx — asosiy element */}
                <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[16px] font-black tabular-nums leading-none">
                        {fmtPrice(p.price)}
                    </span>
                    {p.oldPrice && p.oldPrice > p.price && (
                        <span className="text-[12px] line-through tabular-nums" style={{ color: BN.text3 }}>
                            {p.oldPrice.toLocaleString("uz-UZ")}
                        </span>
                    )}
                </div>

                {/* Bozor narxi bilan solishtirish */}
                {rankMeta && p.marketAvgPrice && (
                    <p className="text-[11px] mb-1.5 leading-none" style={{ color: rankMeta.color }}>
                        {rank === "fair"
                            ? "Bozor narxida"
                            : `Bozorda o'rtacha ${p.marketAvgPrice.toLocaleString("uz-UZ")}`}
                    </p>
                )}
                {p.isNegotiable && !rankMeta && (
                    <p className="text-[11px] mb-1.5 leading-none" style={{ color: BN.text3 }}>
                        Kelishilgan narxda
                    </p>
                )}

                {/* Nomi */}
                <p
                    className="text-[13px] leading-snug mb-2 line-clamp-2 transition-colors group-hover:text-[color:var(--bn-gold)]"
                    style={{ color: BN.text }}
                >
                    {p.title}
                </p>

                <div className="flex-1" />

                {/* PASTIDA: kontekst — bozor bo'lsa "Bozor · Shahar",
                    do'kon bo'lsa "Shahar, Tuman" yoki `"Filial" · Shahar, Tuman`.
                    Foydalanuvchi qarori: bozorda Store ikonkasi (zo'r naqsh) —
                    do'konda esa MapPin, tuman ko'rinadi. */}
                {(() => {
                    const ctx = productContextText(p);
                    const Icon = ctx.kind === "market" ? Store : ShoppingBasket;
                    return (
                        <div className="flex items-center gap-1.5 text-[11px] min-w-0" style={{ color: BN.text3 }}>
                            <Icon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{ctx.text}</span>
                        </div>
                    );
                })()}
            </div>
        </BnLink>
    );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <span
            className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-bold leading-none backdrop-blur-sm"
            style={{ background: BN.glass, color: BN.text2 }}
        >
            {icon}
            {text}
        </span>
    );
}

/** Yuklanish skeleti */
export function BnProductCardSkeleton() {
    return (
        <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            <div className="aspect-square" style={{ background: BN.surfaceUp }} />
            <div className="p-3 space-y-2">
                <div className="h-4 w-2/3 rounded" style={{ background: BN.surfaceUp }} />
                <div className="h-3 w-1/2 rounded" style={{ background: BN.surfaceUp }} />
                <div className="h-3 w-full rounded" style={{ background: BN.surfaceUp }} />
            </div>
        </div>
    );
}
