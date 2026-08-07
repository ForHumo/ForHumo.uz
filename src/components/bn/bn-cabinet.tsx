"use client";

// BN sotuvchi kabineti — real. Server sahifadan initial ma'lumot:
//   shop (holat: PENDING/APPROVED/REJECTED)
//   stats (buyurtmalar soni, sotuv, ko'rish, mahsulot)
//   orders (oxirgi 20)
//   products (barchasi)
//   categories (dropdown uchun)
//
// Tab: Umumiy / Buyurtmalar / Mahsulotlar / Do'kon / Pul

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
    LayoutDashboard, Package, ShoppingBag, Store, Wallet, Plus, X,
    TrendingUp, Eye, LogIn, ArrowUpRight, Check, Loader2, Truck,
    Clock, ChevronRight, MapPin, Phone, Building2, Trash2, EyeOff,
    Sparkles, ShieldCheck, AlertTriangle,
} from "lucide-react";
import { BN, fmtPrice, ORDER_STATUS_META } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { BnEmpty } from "./bn-cards";

type Tab = "home" | "products" | "orders" | "shop" | "money";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "home",     label: "Umumiy",       icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { key: "orders",   label: "Buyurtmalar",  icon: <ShoppingBag className="w-[18px] h-[18px]" /> },
    { key: "products", label: "Mahsulotlar",  icon: <Package className="w-[18px] h-[18px]" /> },
    { key: "shop",     label: "Do'kon",       icon: <Store className="w-[18px] h-[18px]" /> },
    { key: "money",    label: "Pul",          icon: <Wallet className="w-[18px] h-[18px]" /> },
];

export interface CabinetShop {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
    tier: "NEW" | "TRUSTED" | "VERIFIED" | "PREMIUM";
    productCount: number;
    orderCount: number;
    rating: number;
    ratingCount: number;
    locationType: "IN_MARKET" | "STANDALONE" | "ONLINE";
    marketName: string | null;
    marketSection: string | null;
    marketShopNo: string | null;
    address: string | null;
    city: string;
    phone: string;
    rejectReason: string | null;
    verified: boolean;
}

export interface CabinetStats {
    ordersThisMonth: number;
    revenueThisMonth: number;
    productsActive: number;
}

export interface CabinetOrder {
    id: string;
    code: string;
    status: keyof typeof ORDER_STATUS_META;
    total: number;
    placedAt: string;
    fulfillType: "PICKUP" | "DELIVERY" | "INSPECT";
    itemCount: number;
    firstImage: string | null;
    firstTitle: string | null;
    phone: string;
    address: string | null;
}

export interface CabinetProduct {
    id: string;
    slug: string;
    title: string;
    price: number;
    stock: number;
    sold: number;
    images: string[];
    isActive: boolean;
    hidden: boolean;
    categoryName: string | null;
}

export interface CabinetCategory {
    slug: string;
    name: string;
    isSub: boolean;
}

interface Props {
    /** null bo'lsa: foydalanuvchi ariza bermagan yoki kirmagan */
    shop: CabinetShop | null;
    unauthenticated: boolean;
    stats: CabinetStats;
    orders: CabinetOrder[];
    products: CabinetProduct[];
    categories: CabinetCategory[];
    walletBalance: number;
    walletCurrency: string;
}

export function BnCabinet(props: Props) {
    const { shop, unauthenticated, stats, orders, products, categories, walletBalance } = props;
    const notAuth = unauthenticated;
    const [tab, setTab] = useState<Tab>("home");
    const [createOpen, setCreateOpen] = useState(false);

    if (notAuth) {
        return (
            <div className="mx-auto max-w-[1280px] px-4 py-8 pb-16">
                <div
                    className="max-w-[440px] mx-auto p-7 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <span
                        className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <LayoutDashboard className="w-7 h-7" />
                    </span>
                    <h1 className="text-[20px] font-black mb-2">Kabinet</h1>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BN.text2 }}>
                        Kabinetga kirish uchun Humo ID bilan tizimga kiring.
                    </p>
                    <button
                        onClick={() => signIn("google")}
                        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        <LogIn className="w-5 h-5" />
                        Kirish
                    </button>
                </div>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="mx-auto max-w-[1280px] px-4 py-8 pb-16">
                <div
                    className="max-w-[480px] mx-auto p-8 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
                >
                    <span
                        className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <Store className="w-7 h-7" />
                    </span>
                    <h1 className="text-[22px] font-black mb-2">Sotuvchi bo&apos;ling</h1>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BN.text2 }}>
                        Do&apos;koningizni onlaynga chiqarish uchun avval ariza bering.
                        YaTT yoki MChJ bilan, 4 qadam — 3 daqiqa.
                    </p>
                    <BnLink
                        href="/sotuvchi"
                        className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        Ariza berish
                        <ArrowUpRight className="w-4 h-4" />
                    </BnLink>
                </div>
            </div>
        );
    }

    // PENDING — kutish holati
    if (shop.status === "PENDING") {
        return (
            <div className="mx-auto max-w-[1280px] px-4 py-8 pb-16">
                <div
                    className="max-w-[520px] mx-auto p-8 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <span
                        className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: BN.goldSoft, color: BN.gold }}
                    >
                        <Clock className="w-7 h-7" />
                    </span>
                    <h1 className="text-[22px] font-black mb-2">Ariza tekshirilmoqda</h1>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BN.text2 }}>
                        Do&apos;kon: <strong style={{ color: BN.text }}>{shop.name}</strong>. Odatda 1 ish
                        kuni ichida javob beramiz. Tasdiqlangach shu sahifada mahsulot qo&apos;shishingiz
                        mumkin bo&apos;ladi.
                    </p>
                    <div
                        className="p-4 rounded-xl text-left"
                        style={{ background: BN.surfaceUp }}
                    >
                        <p className="text-[12px] font-bold mb-1" style={{ color: BN.text3 }}>ARIZA MA&apos;LUMOTI</p>
                        <p className="text-[13.5px] font-bold">{shop.name}</p>
                        <p className="text-[12px]" style={{ color: BN.text2 }}>
                            {shop.locationType === "IN_MARKET" && shop.marketName ? `${shop.marketName} · ${shop.marketSection ?? ""}` : shop.locationType === "STANDALONE" ? shop.address ?? shop.city : "Onlayn"}
                        </p>
                        <p className="text-[12px] mt-1" style={{ color: BN.text3 }}><Phone className="w-3 h-3 inline mr-1" />{shop.phone}</p>
                    </div>
                </div>
            </div>
        );
    }

    // REJECTED
    if (shop.status === "REJECTED") {
        return (
            <div className="mx-auto max-w-[1280px] px-4 py-8 pb-16">
                <div
                    className="max-w-[520px] mx-auto p-8 rounded-3xl text-center"
                    style={{ background: BN.surface, border: `1px solid ${BN.err}44` }}
                >
                    <span
                        className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
                        style={{ background: BN.errSoft, color: BN.err }}
                    >
                        <AlertTriangle className="w-7 h-7" />
                    </span>
                    <h1 className="text-[22px] font-black mb-2">Ariza rad etildi</h1>
                    {shop.rejectReason && (
                        <p className="text-[13.5px] leading-relaxed mb-4 p-3 rounded-lg text-left" style={{ color: BN.text, background: BN.errSoft }}>
                            <strong>Sabab:</strong> {shop.rejectReason}
                        </p>
                    )}
                    <p className="text-[13px] leading-relaxed" style={{ color: BN.text2 }}>
                        Hujjatlarni to&apos;g&apos;rilab, admin bilan bog&apos;laning.
                    </p>
                </div>
            </div>
        );
    }

    // APPROVED — to'liq kabinet
    return (
        <div className="mx-auto max-w-[1280px] px-4 py-6 pb-16">
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
                <div className="flex items-center gap-3">
                    <span
                        className="w-14 h-14 rounded-2xl overflow-hidden grid place-items-center flex-shrink-0"
                        style={{ background: BN.surfaceUp }}
                    >
                        {shop.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={shop.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Store className="w-6 h-6" style={{ color: BN.text3 }} />
                        )}
                    </span>
                    <div>
                        <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight flex items-center gap-2">
                            {shop.name}
                            {shop.verified && <ShieldCheck className="w-5 h-5" style={{ color: BN.info }} />}
                        </h1>
                        <p className="text-[13px] mt-0.5" style={{ color: BN.text3 }}>
                            {shop.productCount} mahsulot · {shop.orderCount} buyurtma
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { setTab("products"); setCreateOpen(true); }}
                    className="flex items-center gap-2 h-11 px-5 rounded-2xl text-[14px] font-black transition-transform active:scale-[0.98]"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    <Plus className="w-[18px] h-[18px]" />
                    Mahsulot qo&apos;shish
                </button>
            </div>

            <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
                {TABS.map(t => {
                    const badge = t.key === "orders"   ? orders.filter(o => o.status === "PLACED").length
                                : t.key === "products" ? products.filter(p => p.isActive).length
                                : 0;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className="flex items-center gap-2 h-10 px-3.5 rounded-xl text-[13.5px] font-bold flex-shrink-0 transition-colors"
                            style={{
                                background: tab === t.key ? BN.goldSoft : BN.surface,
                                border: `1px solid ${tab === t.key ? BN.goldEdge : BN.border}`,
                                color: tab === t.key ? BN.gold : BN.text2,
                            }}
                        >
                            {t.icon}
                            {t.label}
                            {badge > 0 && (
                                <span
                                    className="min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-black leading-none"
                                    style={{ background: tab === t.key ? BN.gold : BN.surfaceUp, color: tab === t.key ? BN.onGold : BN.text3 }}
                                >
                                    {badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {tab === "home" && <HomeTab shop={shop} stats={stats} orders={orders} />}
            {tab === "orders" && <OrdersTab initial={orders} />}
            {tab === "products" && (
                <ProductsTab
                    initial={products}
                    categories={categories}
                    createOpen={createOpen}
                    setCreateOpen={setCreateOpen}
                />
            )}
            {tab === "shop" && <ShopTab shop={shop} />}
            {tab === "money" && <MoneyTab balance={walletBalance} orderCount={orders.filter(o => o.status === "COMPLETED").length} />}
        </div>
    );
}

// ── UMUMIY ──────────────────────────────────────────────────────────────────

function HomeTab({ shop, stats, orders }: { shop: CabinetShop; stats: CabinetStats; orders: CabinetOrder[] }) {
    const recent = orders.slice(0, 5);
    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <Stat icon={<ShoppingBag className="w-[18px] h-[18px]" />} label="Buyurtmalar" value={stats.ordersThisMonth.toString()} hint="Bu oyda" />
                <Stat icon={<TrendingUp className="w-[18px] h-[18px]" />} label="Sotildi" value={fmtPrice(stats.revenueThisMonth)} hint="Bu oyda" />
                <Stat icon={<Package className="w-[18px] h-[18px]" />} label="Mahsulotlar" value={stats.productsActive.toString()} hint="Faol" />
                <Stat icon={<Eye className="w-[18px] h-[18px]" />} label="Reyting" value={shop.rating > 0 ? shop.rating.toFixed(1) : "—"} hint={`${shop.ratingCount} baho`} />
            </div>

            {recent.length > 0 ? (
                <div
                    className="p-5 rounded-2xl mb-6"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[15px] font-black">So&apos;nggi buyurtmalar</h2>
                    </div>
                    <div className="space-y-2">
                        {recent.map(o => <RecentOrderRow key={o.id} o={o} />)}
                    </div>
                </div>
            ) : (
                <div
                    className="p-5 rounded-2xl mb-6"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <h2 className="text-[15px] font-black mb-4">Boshlash</h2>
                    <div className="space-y-2.5">
                        <Todo done title="Ariza tasdiqlandi" text="Endi mahsulot qo'shishingiz mumkin" />
                        <Todo title="Do'kon logosini yuklang" text="Xaridorlar sizni tanib olishadi" />
                        <Todo title="Birinchi mahsulotni qo'shing" text="Do'konga hayot bering" />
                    </div>
                </div>
            )}

            <div
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
            >
                <span
                    className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}
                >
                    <Sparkles className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-black mb-1">Humo AI mahsulot kartasini o&apos;zi yozadi</p>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: BN.text2 }}>
                        FAZA 6 da: rasm yuklaysiz, AI nomi/tavsifi/narx tavsiyasini beradi.
                    </p>
                </div>
            </div>
        </>
    );
}

// ── BUYURTMALAR ─────────────────────────────────────────────────────────────

function OrdersTab({ initial }: { initial: CabinetOrder[] }) {
    const [items, setItems] = useState(initial);
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

    async function changeStatus(id: string, next: "CONFIRMED" | "READY" | "COMPLETED" | "CANCELLED") {
        const reason = next === "CANCELLED" ? prompt("Bekor qilish sababi:") ?? "" : undefined;
        setBusyIds(s => new Set([...s, id]));
        try {
            const r = await fetch(`/api/bn/orders/${id}/status`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ status: next, reason }),
            });
            const d = await r.json();
            if (r.ok && d?.ok) {
                setItems(prev => prev.map(o => o.id === id ? { ...o, status: next as keyof typeof ORDER_STATUS_META } : o));
            } else {
                alert(d?.error ?? "Xatolik");
            }
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }

    if (items.length === 0) {
        return (
            <BnEmpty
                icon={<ShoppingBag className="w-6 h-6" />}
                title="Hali buyurtma yo'q"
                text="Xaridor buyurtma berganda shu yerda ko'rinadi va tasdiqlaysiz."
            />
        );
    }

    return (
        <div className="space-y-2.5">
            {items.map(o => {
                const meta = ORDER_STATUS_META[o.status];
                const busy = busyIds.has(o.id);
                const canConfirm = o.status === "PLACED";
                const canReady   = o.status === "CONFIRMED";
                const canDone    = o.status === "READY";
                const canCancel  = ["PLACED", "CONFIRMED", "READY"].includes(o.status);

                return (
                    <div
                        key={o.id}
                        className="p-4 rounded-2xl"
                        style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                    >
                        <div className="flex items-start gap-3 mb-3">
                            <span
                                className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                                style={{ background: BN.surfaceUp }}
                            >
                                {o.firstImage && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={o.firstImage} alt="" className="w-full h-full object-cover" />
                                )}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span
                                        className="px-2 py-0.5 rounded-md text-[10px] font-black leading-none"
                                        style={{ background: `${meta.color}1F`, color: meta.color }}
                                    >
                                        {meta.label}
                                    </span>
                                    <span className="text-[11px] tabular-nums" style={{ color: BN.text3 }}>#{o.code}</span>
                                    <FulfillBadge type={o.fulfillType} />
                                </div>
                                <p className="text-[13px] font-bold line-clamp-1">{o.firstTitle}</p>
                                <p className="text-[11.5px] mt-0.5" style={{ color: BN.text3 }}>
                                    {o.itemCount} mahsulot · {formatDate(o.placedAt)}
                                </p>
                                <p className="text-[11.5px] mt-0.5 flex items-center gap-1" style={{ color: BN.text2 }}>
                                    <Phone className="w-3 h-3" />{o.phone}
                                    {o.address && <> · <MapPin className="w-3 h-3 inline" /> {o.address}</>}
                                </p>
                            </div>
                            <span className="text-right flex-shrink-0">
                                <span className="text-[15px] font-black tabular-nums">{fmtPrice(o.total)}</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {canConfirm && (
                                <BtnSmall onClick={() => changeStatus(o.id, "CONFIRMED")} disabled={busy}>
                                    <Check className="w-3.5 h-3.5" /> Tasdiqlash
                                </BtnSmall>
                            )}
                            {canReady && (
                                <BtnSmall onClick={() => changeStatus(o.id, "READY")} disabled={busy}>
                                    <Package className="w-3.5 h-3.5" /> Tayyor
                                </BtnSmall>
                            )}
                            {canDone && (
                                <BtnSmall onClick={() => changeStatus(o.id, "COMPLETED")} disabled={busy} tone="ok">
                                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Yakunlash</>}
                                </BtnSmall>
                            )}
                            {canCancel && (
                                <BtnSmall onClick={() => changeStatus(o.id, "CANCELLED")} disabled={busy} tone="err">
                                    <X className="w-3.5 h-3.5" /> Bekor qilish
                                </BtnSmall>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function BtnSmall({
    children, onClick, disabled, tone,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "ok" | "err" }) {
    const bg = tone === "ok" ? BN.ok : tone === "err" ? BN.errSoft : BN.goldSoft;
    const color = tone === "ok" ? "#fff" : tone === "err" ? BN.err : BN.gold;
    const border = tone === "err" ? `1px solid ${BN.err}33` : "none";
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-black disabled:opacity-60"
            style={{ background: bg, color, border }}
        >
            {children}
        </button>
    );
}

// ── MAHSULOTLAR ────────────────────────────────────────────────────────────

function ProductsTab({
    initial, categories, createOpen, setCreateOpen,
}: { initial: CabinetProduct[]; categories: CabinetCategory[]; createOpen: boolean; setCreateOpen: (v: boolean) => void }) {
    const router = useRouter();
    const [items, setItems] = useState(initial);
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

    async function remove(id: string) {
        if (!confirm("Mahsulotni o'chirishga rozimisiz? Sotuvdan olinadi.")) return;
        setBusyIds(s => new Set([...s, id]));
        setItems(prev => prev.map(p => p.id === id ? { ...p, isActive: false } : p));
        try {
            await fetch(`/api/bn/seller/products/${id}`, { method: "DELETE" });
            router.refresh();
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }
    async function toggleActive(id: string, next: boolean) {
        setBusyIds(s => new Set([...s, id]));
        setItems(prev => prev.map(p => p.id === id ? { ...p, isActive: next } : p));
        try {
            await fetch(`/api/bn/seller/products/${id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ isActive: next }),
            });
            router.refresh();
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }

    return (
        <>
            {items.length === 0 ? (
                <BnEmpty
                    icon={<Package className="w-6 h-6" />}
                    title="Hali mahsulot yo'q"
                    text="Birinchi mahsulotni qo'shing — do'koningizga hayot beradi."
                    action={
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[14px] font-black"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            <Plus className="w-4 h-4" />
                            Mahsulot qo&apos;shish
                        </button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(p => {
                        const busy = busyIds.has(p.id);
                        return (
                            <div
                                key={p.id}
                                className="flex gap-3 p-3 rounded-2xl"
                                style={{
                                    background: BN.surface,
                                    border: `1px solid ${BN.border}`,
                                    opacity: p.isActive ? 1 : 0.5,
                                }}
                            >
                                <span
                                    className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                                    style={{ background: BN.surfaceUp }}
                                >
                                    {p.images[0] && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                    )}
                                </span>
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <BnLink
                                        href={`/p/${p.slug}`}
                                        className="text-[13.5px] font-bold line-clamp-2 hover:text-[color:var(--bn-gold)]"
                                    >
                                        {p.title}
                                    </BnLink>
                                    <p className="text-[14px] font-black tabular-nums mt-1">{fmtPrice(p.price)}</p>
                                    <p className="text-[11.5px]" style={{ color: BN.text3 }}>
                                        Omborda {p.stock} · {p.sold} sotildi
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-auto pt-2">
                                        <button
                                            onClick={() => toggleActive(p.id, !p.isActive)}
                                            disabled={busy}
                                            title={p.isActive ? "Yashirish" : "Ko'rsatish"}
                                            className="w-8 h-8 grid place-items-center rounded-lg"
                                            style={{ background: BN.surfaceUp, color: BN.text2 }}
                                        >
                                            <EyeOff className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => remove(p.id)}
                                            disabled={busy || !p.isActive}
                                            title="O'chirish"
                                            className="w-8 h-8 grid place-items-center rounded-lg"
                                            style={{ background: BN.errSoft, color: BN.err }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {createOpen && (
                <CreateProductModal
                    categories={categories}
                    onClose={() => setCreateOpen(false)}
                    onCreated={(p) => {
                        setItems(prev => [{
                            id: p.id, slug: p.slug, title: p.title, price: p.price,
                            stock: p.stock, sold: 0, images: p.images ?? [],
                            isActive: true, hidden: false, categoryName: null,
                        }, ...prev]);
                        setCreateOpen(false);
                        router.refresh();
                    }}
                />
            )}
        </>
    );
}

// ── MAHSULOT YARATISH MODAL ─────────────────────────────────────────────────

interface CreatedProduct { id: string; slug: string; title: string; price: number; stock: number; images?: string[]; }

function CreateProductModal({
    categories, onClose, onCreated,
}: { categories: CabinetCategory[]; onClose: () => void; onCreated: (p: CreatedProduct) => void }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [oldPrice, setOldPrice] = useState("");
    const [marketAvgPrice, setMarketAvgPrice] = useState("");
    const [stock, setStock] = useState("1");
    const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
    const [images, setImages] = useState<string[]>([]);
    const [imageUrl, setImageUrl] = useState("");
    const [allowPickup, setAllowPickup] = useState(true);
    const [allowDelivery, setAllowDelivery] = useState(false);
    const [allowInspect, setAllowInspect] = useState(true);
    const [isNegotiable, setIsNegotiable] = useState(false);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const canSubmit = title.trim().length >= 3 && Number(price) >= 1000 && !!categorySlug;

    function addImage() {
        const u = imageUrl.trim();
        if (!u || images.includes(u)) return;
        setImages([...images, u]);
        setImageUrl("");
    }

    async function submit() {
        setBusy(true); setErr(null);
        try {
            const r = await fetch("/api/bn/seller/products", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    title, description,
                    price: Number(price),
                    oldPrice: oldPrice ? Number(oldPrice) : null,
                    marketAvgPrice: marketAvgPrice ? Number(marketAvgPrice) : null,
                    stock: Number(stock),
                    categorySlug,
                    images,
                    isNegotiable,
                    allowPickup, allowDelivery, allowInspect,
                }),
            });
            const d = await r.json();
            if (r.ok && d?.ok) onCreated(d.product);
            else setErr(d?.error ?? "Xatolik");
        } catch { setErr("Ulanish xatoligi"); }
        finally { setBusy(false); }
    }

    return (
        <div className="fixed inset-0 z-[130]">
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose} />
            <div
                className="absolute inset-y-0 right-0 w-full sm:w-[520px] overflow-y-auto"
                style={{ background: BN.surface, borderLeft: `1px solid ${BN.border}` }}
            >
                <div
                    className="sticky top-0 flex items-center justify-between h-16 px-4 z-10"
                    style={{ background: BN.surface, borderBottom: `1px solid ${BN.border}` }}
                >
                    <span className="text-[16px] font-black">Yangi mahsulot</span>
                    <button
                        onClick={onClose}
                        aria-label="Yopish"
                        className="w-9 h-9 grid place-items-center rounded-lg"
                        style={{ background: BN.surfaceUp }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <FieldLabel label="Nomi *">
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Chevrolet Nexia 3 old tormoz kolodkasi"
                            className="bn-form-input"
                        />
                    </FieldLabel>

                    <FieldLabel label="Kategoriya *">
                        <select
                            value={categorySlug}
                            onChange={e => setCategorySlug(e.target.value)}
                            className="bn-form-input"
                        >
                            {categories.map(c => (
                                <option key={c.slug} value={c.slug}>
                                    {c.isSub ? "  └ " : ""}{c.name}
                                </option>
                            ))}
                        </select>
                    </FieldLabel>

                    <FieldLabel label="Tavsif">
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="Original ehtiyot qism, kafolat 3 oy..."
                            className="bn-form-input resize-none"
                        />
                    </FieldLabel>

                    <div className="grid grid-cols-3 gap-2">
                        <FieldLabel label="Narx (so'm) *">
                            <input
                                value={price}
                                onChange={e => setPrice(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric"
                                placeholder="185000"
                                className="bn-form-input tabular-nums"
                            />
                        </FieldLabel>
                        <FieldLabel label="Eski narx">
                            <input
                                value={oldPrice}
                                onChange={e => setOldPrice(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric"
                                placeholder="220000"
                                className="bn-form-input tabular-nums"
                            />
                        </FieldLabel>
                        <FieldLabel label="Bozorda o'rt.">
                            <input
                                value={marketAvgPrice}
                                onChange={e => setMarketAvgPrice(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric"
                                placeholder="210000"
                                className="bn-form-input tabular-nums"
                            />
                        </FieldLabel>
                    </div>

                    <FieldLabel label="Miqdor (ombor)">
                        <input
                            value={stock}
                            onChange={e => setStock(e.target.value.replace(/\D/g, ""))}
                            inputMode="numeric"
                            placeholder="10"
                            className="bn-form-input tabular-nums"
                        />
                    </FieldLabel>

                    <FieldLabel label="Rasmlar (URL)">
                        <div className="flex gap-2">
                            <input
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                                placeholder="https://picsum.photos/seed/xxx/600/600"
                                className="bn-form-input flex-1"
                            />
                            <button
                                onClick={addImage}
                                type="button"
                                className="h-11 px-4 rounded-xl text-[13px] font-bold"
                                style={{ background: BN.surfaceUp }}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        {images.length > 0 && (
                            <div className="flex gap-2 flex-wrap mt-2">
                                {images.map((u, i) => (
                                    <div key={u} className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ background: BN.surfaceUp }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={u} alt="" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setImages(images.filter((_, j) => j !== i))}
                                            className="absolute top-0.5 right-0.5 w-5 h-5 grid place-items-center rounded-full"
                                            style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </FieldLabel>

                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider mb-2.5" style={{ color: BN.text3 }}>
                            Olish usullari
                        </p>
                        <div className="space-y-2">
                            <ToggleRow checked={allowPickup} onChange={setAllowPickup} icon={<Package className="w-4 h-4" />} label="Do'kondan olib ketish" />
                            <ToggleRow checked={allowDelivery} onChange={setAllowDelivery} icon={<Truck className="w-4 h-4" />} label="Yetkazib berish" />
                            <ToggleRow checked={allowInspect} onChange={setAllowInspect} icon={<Eye className="w-4 h-4" />} label="Ko'rib sotib olish (24 soat band)" />
                            <ToggleRow checked={isNegotiable} onChange={setIsNegotiable} icon={<Building2 className="w-4 h-4" />} label="Narx kelishilishi mumkin" />
                        </div>
                    </div>

                    {err && (
                        <div className="p-3 rounded-xl text-[12.5px]" style={{ background: BN.errSoft, color: BN.err }}>
                            {err}
                        </div>
                    )}
                </div>

                <div
                    className="sticky bottom-0 p-4"
                    style={{ background: BN.surface, borderTop: `1px solid ${BN.border}` }}
                >
                    <button
                        onClick={submit}
                        disabled={!canSubmit || busy}
                        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black disabled:opacity-60"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Qo'shish"}
                    </button>
                </div>
            </div>

            {/* Ichki uslub — kirilltirilgan form input */}
            <style jsx global>{`
                .bn-form-input {
                    width: 100%;
                    height: 44px;
                    padding: 0 12px;
                    border-radius: 12px;
                    background: var(--bn-surface-up);
                    border: 1px solid var(--bn-border);
                    color: var(--bn-text);
                    font-size: 14px;
                    font-weight: 500;
                    outline: none;
                }
                textarea.bn-form-input { height: auto; padding: 10px 12px; }
                select.bn-form-input { appearance: none; }
                .bn-form-input:focus { border-color: var(--bn-gold-edge); }
            `}</style>
        </div>
    );
}

// ── DO'KON SOZLAMALARI ─────────────────────────────────────────────────────

function ShopTab({ shop }: { shop: CabinetShop }) {
    return (
        <div className="space-y-3">
            <InfoRow label="Do'kon nomi" value={shop.name} />
            <InfoRow label="URL" value={`/d/${shop.slug}`} />
            <InfoRow label="Joylashuv" value={locLabel(shop)} />
            <InfoRow label="Telefon" value={shop.phone} />
            <InfoRow label="Reyting" value={shop.rating > 0 ? `${shop.rating.toFixed(1)} (${shop.ratingCount} baho)` : "Hali baho yo'q"} />
            <InfoRow label="Daraja" value={shop.tier} />
            <p className="text-[12.5px] p-3 rounded-xl" style={{ color: BN.text3, background: BN.surfaceUp }}>
                Sozlamalarni tahrir qilish tez orada qo&apos;shiladi. Hozircha admin bilan bog&apos;laning.
            </p>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div
            className="flex items-baseline justify-between gap-3 p-4 rounded-2xl"
            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
        >
            <span className="text-[12.5px] font-bold" style={{ color: BN.text3 }}>{label}</span>
            <span className="text-[13.5px] font-bold text-right truncate" style={{ color: BN.text }}>{value}</span>
        </div>
    );
}

// ── PUL ─────────────────────────────────────────────────────────────────────

function MoneyTab({ balance, orderCount }: { balance: number; orderCount: number }) {
    return (
        <div>
            <div
                className="p-6 rounded-2xl mb-4"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
            >
                <p className="text-[11.5px] font-bold uppercase tracking-wider mb-1" style={{ color: BN.text3 }}>
                    ALKH Pay balansingiz
                </p>
                <p className="text-[32px] font-black tabular-nums leading-none">{fmtPrice(balance)}</p>
                <p className="text-[12.5px] mt-2" style={{ color: BN.text3 }}>
                    {orderCount} ta yakunlangan buyurtmadan tushdi (komissiya 5% ayirilgan)
                </p>
            </div>
            <a
                href="https://forhumo.uz/uz/pay"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[14px] font-bold"
                style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text }}
            >
                <Wallet className="w-4 h-4" />
                ALKH Pay ochish (yechish)
                <ArrowUpRight className="w-4 h-4" />
            </a>
        </div>
    );
}

// ── YORDAMCHILAR ────────────────────────────────────────────────────────────

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-[12px] font-bold mb-1.5" style={{ color: BN.text2 }}>{label}</span>
            {children}
        </label>
    );
}

function ToggleRow({ checked, onChange, icon, label }: { checked: boolean; onChange: (v: boolean) => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className="flex items-center gap-2.5 w-full h-11 px-3 rounded-xl text-[13px] font-medium text-left transition-colors"
            style={{ background: checked ? BN.goldSoft : BN.surfaceUp }}
        >
            <span style={{ color: checked ? BN.gold : BN.text3 }}>{icon}</span>
            <span className="flex-1" style={{ color: checked ? BN.gold : BN.text }}>{label}</span>
            <span
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ background: checked ? BN.gold : "rgba(255,255,255,0.14)" }}
            />
        </button>
    );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
    return (
        <div className="p-4 rounded-2xl" style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
            <div className="flex items-center gap-2 mb-2.5" style={{ color: BN.text3 }}>
                {icon}
                <span className="text-[11.5px] font-bold uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-[20px] font-black tabular-nums leading-none mb-1">{value}</p>
            <p className="text-[11px]" style={{ color: BN.text3 }}>{hint}</p>
        </div>
    );
}

function Todo({ done, title, text }: { done?: boolean; title: string; text: string }) {
    return (
        <div className="flex items-start gap-3">
            <span
                className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 grid place-items-center"
                style={{
                    background: done ? BN.ok : "transparent",
                    border: `2px solid ${done ? BN.ok : "rgba(255,255,255,0.18)"}`,
                }}
            >
                {done && <Check className="w-3 h-3" style={{ color: "#fff" }} strokeWidth={3} />}
            </span>
            <span className="min-w-0">
                <span
                    className="block text-[13.5px] font-bold"
                    style={{ color: done ? BN.text3 : BN.text, textDecoration: done ? "line-through" : undefined }}
                >
                    {title}
                </span>
                <span className="block text-[12px] mt-0.5" style={{ color: BN.text3 }}>{text}</span>
            </span>
        </div>
    );
}

function RecentOrderRow({ o }: { o: CabinetOrder }) {
    const meta = ORDER_STATUS_META[o.status];
    return (
        <BnLink
            href={`/buyurtmalarim/${o.code}`}
            className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-[color:var(--bn-surface-up)]"
        >
            <span className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: BN.surfaceUp }}>
                {o.firstImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.firstImage} alt="" className="w-full h-full object-cover" />
                )}
            </span>
            <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: `${meta.color}1F`, color: meta.color }}>
                        {meta.label}
                    </span>
                    <span className="text-[11px] tabular-nums" style={{ color: BN.text3 }}>#{o.code}</span>
                </span>
                <span className="block text-[12.5px] font-bold truncate mt-0.5">{o.firstTitle}</span>
            </span>
            <span className="text-[13px] font-black tabular-nums flex-shrink-0">{fmtPrice(o.total)}</span>
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: BN.text3 }} />
        </BnLink>
    );
}

function FulfillBadge({ type }: { type: "PICKUP" | "DELIVERY" | "INSPECT" }) {
    const icon = type === "PICKUP" ? <Package className="w-3 h-3" />
               : type === "DELIVERY" ? <Truck className="w-3 h-3" />
               : <Eye className="w-3 h-3" />;
    const label = type === "PICKUP" ? "Olib ketish"
               : type === "DELIVERY" ? "Yetkazish"
               : "Ko'rib olish";
    return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: BN.surfaceUp, color: BN.text3 }}>
            {icon}{label}
        </span>
    );
}

function locLabel(shop: CabinetShop): string {
    if (shop.locationType === "IN_MARKET") {
        return [shop.marketName, shop.marketSection, shop.marketShopNo && `${shop.marketShopNo}-do'kon`].filter(Boolean).join(" · ");
    }
    if (shop.locationType === "STANDALONE") return shop.address ?? shop.city;
    return "Onlayn do'kon";
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
}
