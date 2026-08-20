"use client";

// BN sotuvchi kabineti — real. Server sahifadan initial ma'lumot:
//   shop (holat: PENDING/APPROVED/REJECTED)
//   stats (buyurtmalar soni, sotuv, ko'rish, mahsulot)
//   orders (oxirgi 20)
//   products (barchasi)
//   categories (dropdown uchun)
//
// Tab: Umumiy / Buyurtmalar / Mahsulotlar / Do'kon / Pul

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import {
    LayoutDashboard, Package, ShoppingBag, Store, Wallet, Plus, X,
    TrendingUp, Eye, LogIn, ArrowUpRight, Check, Loader2, Truck,
    Clock, ChevronRight, MapPin, Phone, Building2, Trash2, EyeOff,
    Sparkles, ShieldCheck, AlertTriangle, Upload, Wand2, Users,
    Send, MessageCircle,
} from "lucide-react";
import { BN, fmtPrice, ORDER_STATUS_META } from "@/lib/bn-theme";
import { BnLink } from "./bn-nav";
import { BnEmpty } from "./bn-cards";
import { BnPhoneInput } from "./bn-phone-input";
import { BnCategoryPicker } from "./bn-category-picker";
import { BnPushCard } from "./bn-push-card";
import { BnReferralLeaderboard } from "./bn-referral-leaderboard";
import { BnAchievementsCard } from "./bn-achievements-card";

type Tab = "home" | "products" | "orders" | "shop" | "money";

const TAB_DEFS: { key: Tab; labelKey: string; icon: React.ReactNode }[] = [
    { key: "home",     labelKey: "tabHome",     icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { key: "orders",   labelKey: "tabOrders",   icon: <ShoppingBag className="w-[18px] h-[18px]" /> },
    { key: "products", labelKey: "tabProducts", icon: <Package className="w-[18px] h-[18px]" /> },
    { key: "shop",     labelKey: "tabShop",     icon: <Store className="w-[18px] h-[18px]" /> },
    { key: "money",    labelKey: "tabMoney",    icon: <Wallet className="w-[18px] h-[18px]" /> },
];

export interface CabinetShop {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "TERMINATED";
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
    verifiedTier?: "NONE" | "RETAIL" | "WHOLESALE";
    verifiedProgress?: VerifiedProgress | null;
}

// Tasdiqlanganlik progress — server hisoblaydi, UI ko'rsatadi
export interface VerifiedCriteria {
    orders: { current: number; target: number; ok: boolean };
    rating: { current: number; target: number; count: number; countTarget: number; ok: boolean };
    rejection: { current: number; target: number; ok: boolean };
    activeDays: { current: number; target: number; ok: boolean };
    banFree: { ok: boolean };
}
export interface VerifiedProgress {
    tier: "NONE" | "RETAIL" | "WHOLESALE";
    retail: VerifiedCriteria & { qualified: boolean };
    wholesale: VerifiedCriteria & { qualified: boolean };
    uniqueBuyers?: { current: number; target: number; ok: boolean };
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
    /** Ota kategoriya slug (agar isSub bo'lsa). Sub tanlaganda ota sxemasi ham qo'shiladi */
    parentSlug?: string | null;
    /** AttrDef[] — mahsulot yaratishda dinamik input generatsiya uchun */
    attributeSchema?: AttrDef[];
}

export interface AttrDef {
    key: string;
    label: string;
    labelRu?: string;
    type: "text" | "number" | "select" | "multiselect" | "boolean";
    options?: string[];
    required?: boolean;
    filterable?: boolean;
    unit?: string;
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
    const t = useTranslations("bn.cabinet");
    const tCommon = useTranslations("bn");
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
                    <h1 className="text-[20px] font-black mb-2">{t("title")}</h1>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BN.text2 }}>
                        {t("authText")}
                    </p>
                    <button
                        onClick={() => signIn("google")}
                        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        <LogIn className="w-5 h-5" />
                        {tCommon("auth.signIn")}
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
                    <h1 className="text-[22px] font-black mb-2">{t("becomeSellerTitle")}</h1>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BN.text2 }}>
                        {t("becomeSellerText")}
                    </p>
                    <BnLink
                        href="/sotuvchi"
                        className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[15px] font-black"
                        style={{ background: BN.gold, color: BN.onGold }}
                    >
                        {t("applyBtn")}
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
                    <h1 className="text-[22px] font-black mb-2">{t("pendingTitle")}</h1>
                    <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: BN.text2 }}>
                        {t("pendingText", { name: shop.name })}
                    </p>
                    <div
                        className="p-4 rounded-xl text-left"
                        style={{ background: BN.surfaceUp }}
                    >
                        <p className="text-[12px] font-bold mb-1" style={{ color: BN.text3 }}>{t("appInfo")}</p>
                        <p className="text-[13.5px] font-bold">{shop.name}</p>
                        <p className="text-[12px]" style={{ color: BN.text2 }}>
                            {shop.locationType === "IN_MARKET" && shop.marketName ? `${shop.marketName} · ${shop.marketSection ?? ""}` : shop.locationType === "STANDALONE" ? shop.address ?? shop.city : t("online")}
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
                    <h1 className="text-[22px] font-black mb-2">{t("rejectedTitle")}</h1>
                    {shop.rejectReason && (
                        <p className="text-[13.5px] leading-relaxed mb-4 p-3 rounded-lg text-left" style={{ color: BN.text, background: BN.errSoft }}>
                            <strong>{t("rejectReason")}:</strong> {shop.rejectReason}
                        </p>
                    )}
                    <p className="text-[13px] leading-relaxed" style={{ color: BN.text2 }}>
                        {t("rejectedText")}
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
                            {t("shopSummary", { p: shop.productCount, o: shop.orderCount })}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => { setTab("products"); setCreateOpen(true); }}
                    className="flex items-center gap-2 h-11 px-5 rounded-2xl text-[14px] font-black transition-transform active:scale-[0.98]"
                    style={{ background: BN.gold, color: BN.onGold }}
                >
                    <Plus className="w-[18px] h-[18px]" />
                    {t("addProduct")}
                </button>
            </div>

            <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1">
                {TAB_DEFS.map(td => {
                    const badge = td.key === "orders"   ? orders.filter(o => o.status === "PLACED").length
                                : td.key === "products" ? products.filter(p => p.isActive).length
                                : 0;
                    return (
                        <button
                            key={td.key}
                            onClick={() => setTab(td.key)}
                            className="flex items-center gap-2 h-10 px-3.5 rounded-xl text-[13.5px] font-bold flex-shrink-0 transition-colors"
                            style={{
                                background: tab === td.key ? BN.goldSoft : BN.surface,
                                border: `1px solid ${tab === td.key ? BN.goldEdge : BN.border}`,
                                color: tab === td.key ? BN.gold : BN.text2,
                            }}
                        >
                            {td.icon}
                            {t(td.labelKey)}
                            {badge > 0 && (
                                <span
                                    className="min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-black leading-none"
                                    style={{ background: tab === td.key ? BN.gold : BN.surfaceUp, color: tab === td.key ? BN.onGold : BN.text3 }}
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
    const t = useTranslations("bn.cabinet");
    const recent = orders.slice(0, 5);
    return (
        <>
            <BnPushCard />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <Stat icon={<ShoppingBag className="w-[18px] h-[18px]" />} label={t("statOrders")} value={stats.ordersThisMonth.toString()} hint={t("statThisMonth")} />
                <Stat icon={<TrendingUp className="w-[18px] h-[18px]" />} label={t("statSold")} value={fmtPrice(stats.revenueThisMonth)} hint={t("statThisMonth")} />
                <Stat icon={<Package className="w-[18px] h-[18px]" />} label={t("statProducts")} value={stats.productsActive.toString()} hint={t("statActive")} />
                <Stat icon={<Eye className="w-[18px] h-[18px]" />} label={t("statRating")} value={shop.rating > 0 ? shop.rating.toFixed(1) : "—"} hint={t("statNRatings", { n: shop.ratingCount })} />
            </div>

            {shop.verifiedProgress && <VerifiedProgressCard progress={shop.verifiedProgress} />}

            {recent.length > 0 ? (
                <div
                    className="p-5 rounded-2xl mb-6"
                    style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[15px] font-black">{t("recentOrders")}</h2>
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
                    <h2 className="text-[15px] font-black mb-4">{t("gettingStarted")}</h2>
                    <div className="space-y-2.5">
                        <Todo done title={t("todoApproved")} text={t("todoApprovedSub")} />
                        <Todo title={t("todoLogo")} text={t("todoLogoSub")} />
                        <Todo title={t("todoFirst")} text={t("todoFirstSub")} />
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
                    <p className="text-[14px] font-black mb-1">{t("aiPromoTitle")}</p>
                    <p className="text-[12.5px] leading-relaxed" style={{ color: BN.text2 }}>
                        {t("aiPromoText")}
                    </p>
                </div>
            </div>
        </>
    );
}

// ── TASDIQLANGANLIK PROGRESS ────────────────────────────────────────────────

function VerifiedProgressCard({ progress }: { progress: VerifiedProgress }) {
    const t = useTranslations("bn.cabinet");
    // Ustuvor darslik: agar RETAIL emas → RETAIL ni ko'rsatamiz; RETAIL bo'lsa WHOLESALE ni ko'rsatamiz
    const target = progress.tier === "NONE" ? "retail" as const : "wholesale" as const;
    const data = target === "retail" ? progress.retail : progress.wholesale;
    const uniqueBuyers = target === "wholesale" ? progress.uniqueBuyers : undefined;

    const rows: { label: string; ok: boolean; text: string }[] = [
        { label: t("vpOrdersOk"), ok: data.orders.ok, text: `${data.orders.current} / ${data.orders.target}` },
        { label: t("vpRating", { n: data.rating.count }), ok: data.rating.ok, text: `${data.rating.current.toFixed(2)} / ${data.rating.target}` },
        { label: t("vpRejection"), ok: data.rejection.ok, text: t("vpRejectionText", { cur: data.rejection.current, target: data.rejection.target }) },
        { label: t("vpActiveDays"), ok: data.activeDays.ok, text: t("vpActiveDaysText", { cur: data.activeDays.current, tgt: data.activeDays.target }) },
        { label: t("vpBanFree"), ok: data.banFree.ok, text: data.banFree.ok ? t("vpYes") : t("vpHas") },
    ];
    if (uniqueBuyers) {
        rows.push({ label: t("vpUniqueBuyers"), ok: uniqueBuyers.ok, text: `${uniqueBuyers.current} / ${uniqueBuyers.target}` });
    }

    const okCount = rows.filter(r => r.ok).length;
    const percent = Math.round((okCount / rows.length) * 100);

    const isAchieved = progress.tier !== "NONE";
    const targetLabel = target === "retail" ? t("vpRetailBadge") : t("vpWholesaleBadge");

    return (
        <div
            className="p-5 rounded-2xl mb-6"
            style={{ background: BN.surface, border: `1px solid ${isAchieved ? BN.borderGold : BN.border}` }}
        >
            <div className="flex items-start gap-3 mb-4">
                <span
                    className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}
                >
                    <ShieldCheck className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="text-[14px] font-black">{t("vpTitle")}</p>
                        {progress.tier === "RETAIL" && (
                            <span
                                className="px-2 py-0.5 rounded-md text-[10.5px] font-black leading-none"
                                style={{ background: `${BN.info}1F`, color: BN.info }}
                            >
                                {t("vpRetail")} ✓
                            </span>
                        )}
                        {progress.tier === "WHOLESALE" && (
                            <span
                                className="px-2 py-0.5 rounded-md text-[10.5px] font-black leading-none"
                                style={{ background: BN.goldSoft, color: BN.gold }}
                            >
                                {t("vpWholesale")} ✓
                            </span>
                        )}
                    </div>
                    <p className="text-[12px]" style={{ color: BN.text2 }}>
                        {t("vpProgress", { name: targetLabel, pct: percent })}
                    </p>
                </div>
            </div>

            <div className="mb-4 h-2 rounded-full overflow-hidden" style={{ background: BN.surfaceUp }}>
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${percent}%`, background: percent === 100 ? BN.ok : BN.gold }}
                />
            </div>

            <div className="space-y-2">
                {rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12.5px]">
                        <span
                            className="w-5 h-5 rounded-full grid place-items-center flex-shrink-0"
                            style={{ background: r.ok ? `${BN.ok}22` : `${BN.text3}22`, color: r.ok ? BN.ok : BN.text3 }}
                        >
                            {r.ok ? <Check className="w-3 h-3" strokeWidth={3} /> : <X className="w-3 h-3" strokeWidth={3} />}
                        </span>
                        <span className="flex-1" style={{ color: BN.text }}>{r.label}</span>
                        <span className="font-black tabular-nums" style={{ color: r.ok ? BN.ok : BN.text2 }}>
                            {r.text}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── BUYURTMALAR ─────────────────────────────────────────────────────────────

function OrdersTab({ initial }: { initial: CabinetOrder[] }) {
    const t = useTranslations("bn.cabinet");
    const locale = useLocale();
    const [items, setItems] = useState(initial);
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

    async function changeStatus(id: string, next: "CONFIRMED" | "READY" | "COMPLETED" | "CANCELLED") {
        const reason = next === "CANCELLED" ? prompt(t("cancelReasonPrompt")) ?? "" : undefined;
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
                alert(d?.error ?? t("statusErr"));
            }
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
        }
    }

    if (items.length === 0) {
        return (
            <BnEmpty
                icon={<ShoppingBag className="w-6 h-6" />}
                title={t("ordersEmptyTitle")}
                text={t("ordersEmptyText")}
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
                                    {t("productsN", { n: o.itemCount })} · {formatDate(o.placedAt, locale)}
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
                                    <Check className="w-3.5 h-3.5" /> {t("confirm")}
                                </BtnSmall>
                            )}
                            {canReady && (
                                <BtnSmall onClick={() => changeStatus(o.id, "READY")} disabled={busy}>
                                    <Package className="w-3.5 h-3.5" /> {t("ready")}
                                </BtnSmall>
                            )}
                            {canDone && (
                                <BtnSmall onClick={() => changeStatus(o.id, "COMPLETED")} disabled={busy} tone="ok">
                                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> {t("complete")}</>}
                                </BtnSmall>
                            )}
                            {canCancel && (
                                <BtnSmall onClick={() => changeStatus(o.id, "CANCELLED")} disabled={busy} tone="err">
                                    <X className="w-3.5 h-3.5" /> {t("cancel")}
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
    const t = useTranslations("bn.cabinet");
    const locale = useLocale();
    const [items, setItems] = useState(initial);
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

    async function remove(id: string) {
        if (!confirm(t("removeConfirm"))) return;
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
    async function quickEdit(p: CabinetProduct) {
        const priceStr = prompt(t("quickEditPrice", { price: p.price.toLocaleString(locale) }), String(p.price));
        if (priceStr === null) return;
        const stockStr = prompt(t("quickEditStock", { stock: p.stock }), String(p.stock));
        if (stockStr === null) return;
        const newPrice = Math.max(1000, Math.floor(Number(priceStr.replace(/\D/g, "")) || p.price));
        const newStock = Math.max(0, Math.floor(Number(stockStr.replace(/\D/g, "")) || 0));
        if (newPrice === p.price && newStock === p.stock) return;

        setBusyIds(s => new Set([...s, p.id]));
        setItems(prev => prev.map(x => x.id === p.id ? { ...x, price: newPrice, stock: newStock } : x));
        try {
            await fetch(`/api/bn/seller/products/${p.id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ price: newPrice, stock: newStock }),
            });
            router.refresh();
        } finally {
            setBusyIds(s => { const n = new Set(s); n.delete(p.id); return n; });
        }
    }

    return (
        <>
            {items.length === 0 ? (
                <BnEmpty
                    icon={<Package className="w-6 h-6" />}
                    title={t("productsEmptyTitle")}
                    text={t("productsEmptyText")}
                    action={
                        <button
                            onClick={() => setCreateOpen(true)}
                            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[14px] font-black"
                            style={{ background: BN.gold, color: BN.onGold }}
                        >
                            <Plus className="w-4 h-4" />
                            {t("addProduct")}
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
                                        {t("stockLine", { n: p.stock, s: p.sold })}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-auto pt-2">
                                        <button
                                            onClick={() => quickEdit(p)}
                                            disabled={busy}
                                            title={t("edit")}
                                            className="flex items-center gap-1 h-8 px-2 rounded-lg text-[11px] font-black"
                                            style={{ background: BN.goldSoft, color: BN.gold }}
                                        >
                                            {t("edit")}
                                        </button>
                                        <button
                                            onClick={() => toggleActive(p.id, !p.isActive)}
                                            disabled={busy}
                                            title={p.isActive ? t("hide") : t("show")}
                                            className="w-8 h-8 grid place-items-center rounded-lg"
                                            style={{ background: BN.surfaceUp, color: BN.text2 }}
                                        >
                                            <EyeOff className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => remove(p.id)}
                                            disabled={busy || !p.isActive}
                                            title={t("remove")}
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
    const t = useTranslations("bn.cabinet");
    const tNav = useTranslations("bn.nav");
    const fileRef = useRef<HTMLInputElement>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    const [oldPrice, setOldPrice] = useState("");
    const [marketAvgPrice, setMarketAvgPrice] = useState("");
    const [stock, setStock] = useState("1");
    const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
    const [images, setImages] = useState<string[]>([]);
    const [attrs, setAttrs] = useState<Record<string, string | number | boolean>>({});
    const [allowPickup, setAllowPickup] = useState(true);
    const [allowDelivery, setAllowDelivery] = useState(false);
    const [allowInspect, setAllowInspect] = useState(true);
    const [isNegotiable, setIsNegotiable] = useState(false);
    const [isMature, setIsMature] = useState(false);
    const [isWholesale, setIsWholesale] = useState(false);
    const [minWholesaleQty, setMinWholesaleQty] = useState("20");
    const [wholesaleTiers, setWholesaleTiers] = useState<{ minQty: string; price: string }[]>([]);
    const [busy, setBusy] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);
    const [uploadBusy, setUploadBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const canSubmit = title.trim().length >= 3 && Number(price) >= 1000 && !!categorySlug;
    const selectedCat = categories.find(c => c.slug === categorySlug);
    const schema = selectedCat?.attributeSchema ?? [];

    async function uploadImage(file: File) {
        setErr(null); setUploadBusy(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("kind", "product");
            const r = await fetch("/api/bn/upload", { method: "POST", body: fd });
            const d = await r.json();
            if (r.ok && d?.url) setImages(prev => [...prev, d.url]);
            else if (d?.error === "storage_not_configured") setErr(t("imgUploadNotConfigured"));
            else setErr(d?.error ?? t("imgUploadErr"));
        } catch { setErr(t("netErr")); }
        finally {
            setUploadBusy(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    async function autoFill() {
        if (images.length === 0) { setErr(t("aiFillFirst")); return; }
        setAiBusy(true); setErr(null);
        try {
            const r = await fetch("/api/bn/ai/listing", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ imageUrl: images[0], categorySlug: categorySlug || undefined }),
            });
            const d = await r.json();
            if (r.status === 503) { setErr(t("aiUnavailable")); return; }
            if (!r.ok || !d?.result) { setErr(d?.error ?? t("aiErr")); return; }
            const res = d.result;
            if (res.hasProblem) { setErr(t("aiWarn", { msg: res.hasProblem })); return; }
            if (res.title) setTitle(res.title);
            if (res.description) setDescription(res.description);
            if (res.categorySlug) setCategorySlug(res.categorySlug);
            if (res.marketAvgPrice) setMarketAvgPrice(String(res.marketAvgPrice));
            if (res.attributes && typeof res.attributes === "object") {
                setAttrs(prev => ({ ...prev, ...res.attributes }));
            }
        } catch { setErr("Ulanish xatoligi"); }
        finally { setAiBusy(false); }
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
                    attributes: attrs,
                    isNegotiable,
                    isMature,
                    isWholesale,
                    minWholesaleQty: isWholesale ? Number(minWholesaleQty) || 2 : null,
                    wholesaleTiers: isWholesale
                        ? wholesaleTiers
                            .map(t => ({ minQty: Number(t.minQty) || 0, price: Number(t.price) || 0 }))
                            .filter(t => t.minQty > 0 && t.price > 0)
                        : [],
                    allowPickup, allowDelivery, allowInspect,
                }),
            });
            const d = await r.json();
            if (r.ok && d?.ok) onCreated(d.product);
            else setErr(d?.error ?? t("createErr"));
        } catch { setErr(t("netErr")); }
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
                    <span className="text-[16px] font-black">{t("newProduct")}</span>
                    <button
                        onClick={onClose}
                        aria-label={tNav("close")}
                        className="w-9 h-9 grid place-items-center rounded-lg"
                        style={{ background: BN.surfaceUp }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <FieldLabel label={t("fldName")}>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder={t("fldNamePh")}
                            className="bn-form-input"
                        />
                    </FieldLabel>

                    <FieldLabel label={t("fldCategory")}>
                        <BnCategoryPicker categories={categories} value={categorySlug} onChange={setCategorySlug} />
                        <select
                            hidden
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

                    <FieldLabel label={t("fldDesc")}>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder={t("fldDescPh")}
                            className="bn-form-input resize-none"
                        />
                    </FieldLabel>

                    <div className="grid grid-cols-3 gap-2">
                        <FieldLabel label={t("fldPrice")}>
                            <input
                                value={price}
                                onChange={e => setPrice(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric"
                                placeholder="185000"
                                className="bn-form-input tabular-nums"
                            />
                        </FieldLabel>
                        <FieldLabel label={t("fldOldPrice")}>
                            <input
                                value={oldPrice}
                                onChange={e => setOldPrice(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric"
                                placeholder="220000"
                                className="bn-form-input tabular-nums"
                            />
                        </FieldLabel>
                        <FieldLabel label={t("fldMarketAvg")}>
                            <input
                                value={marketAvgPrice}
                                onChange={e => setMarketAvgPrice(e.target.value.replace(/\D/g, ""))}
                                inputMode="numeric"
                                placeholder="210000"
                                className="bn-form-input tabular-nums"
                            />
                        </FieldLabel>
                    </div>

                    <FieldLabel label={t("fldStock")}>
                        <input
                            value={stock}
                            onChange={e => setStock(e.target.value.replace(/\D/g, ""))}
                            inputMode="numeric"
                            placeholder="10"
                            className="bn-form-input tabular-nums"
                        />
                    </FieldLabel>

                    <FieldLabel label={t("fldImages")}>
                        <div className="flex gap-2 flex-wrap">
                            {images.map((u, i) => (
                                <div key={u} className="relative w-20 h-20 rounded-lg overflow-hidden" style={{ background: BN.surfaceUp }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={u} alt="" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setImages(images.filter((_, j) => j !== i))}
                                        aria-label={t("remove")}
                                        className="absolute top-0.5 right-0.5 w-5 h-5 grid place-items-center rounded-full"
                                        style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {images.length < 10 && (
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    disabled={uploadBusy}
                                    className="w-20 h-20 rounded-lg grid place-items-center border-2 border-dashed disabled:opacity-60"
                                    style={{ borderColor: BN.border, color: BN.text3 }}
                                >
                                    {uploadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) void uploadImage(f); }}
                        />
                        {images.length > 0 && (
                            <button
                                type="button"
                                onClick={autoFill}
                                disabled={aiBusy}
                                className="flex items-center justify-center gap-2 w-full h-10 mt-2 rounded-xl text-[13px] font-black disabled:opacity-60"
                                style={{ background: BN.goldSoft, border: `1px solid ${BN.goldEdge}`, color: BN.gold }}
                            >
                                {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4" /> {t("aiFillBtn")}</>}
                            </button>
                        )}
                    </FieldLabel>

                    {/* Kategoriya sxemasidagi atributlar (dinamik) */}
                    {schema.length > 0 && (
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-wider mb-2.5" style={{ color: BN.text3 }}>
                                {t("attrsTitle", { cat: selectedCat?.name ?? "" })}
                            </p>
                            <div className="space-y-3">
                                {schema.map(a => (
                                    <AttrInput
                                        key={a.key}
                                        def={a}
                                        value={attrs[a.key]}
                                        onChange={v => setAttrs(prev => ({ ...prev, [a.key]: v }))}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider mb-2.5" style={{ color: BN.text3 }}>
                            {t("fulfillTitle")}
                        </p>
                        <div className="space-y-2">
                            <ToggleRow checked={allowPickup} onChange={setAllowPickup} icon={<Package className="w-4 h-4" />} label={t("togglePickup")} />
                            <ToggleRow checked={allowDelivery} onChange={setAllowDelivery} icon={<Truck className="w-4 h-4" />} label={t("toggleDelivery")} />
                            <ToggleRow checked={allowInspect} onChange={setAllowInspect} icon={<Eye className="w-4 h-4" />} label={t("toggleInspect")} />
                            <ToggleRow checked={isNegotiable} onChange={setIsNegotiable} icon={<Building2 className="w-4 h-4" />} label={t("toggleNegotiable")} />
                            <ToggleRow checked={isMature} onChange={setIsMature} icon={<Eye className="w-4 h-4" />} label={t("toggleMature")} />
                            <ToggleRow checked={isWholesale} onChange={setIsWholesale} icon={<Package className="w-4 h-4" />} label={t("toggleWholesale")} />
                        </div>
                    </div>

                    {isWholesale && (
                        <div className="rounded-2xl p-3.5" style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}>
                            <div className="flex items-center gap-2 mb-2.5">
                                <ShieldCheck className="w-4 h-4" style={{ color: BN.gold }} />
                                <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: BN.text3 }}>
                                    {t("wholesaleTitle")}
                                </p>
                            </div>

                            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: BN.text2 }}>
                                {t("minQtyLabel")}
                            </label>
                            <input
                                type="number"
                                min={2}
                                value={minWholesaleQty}
                                onChange={e => setMinWholesaleQty(e.target.value)}
                                className="w-full h-11 rounded-xl px-3.5 text-[14px]"
                                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                                placeholder="20"
                            />
                            <p className="text-[11px] mt-1" style={{ color: BN.text3 }}>
                                {t("minQtyHint")}
                            </p>

                            <div className="mt-3.5">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[12px] font-semibold" style={{ color: BN.text2 }}>
                                        {t("tiersLabel")}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setWholesaleTiers(prev => [...prev, { minQty: "", price: "" }])}
                                        className="flex items-center gap-1 text-[11px] font-black"
                                        style={{ color: BN.gold }}
                                    >
                                        <Plus className="w-3.5 h-3.5" /> {t("addTier")}
                                    </button>
                                </div>
                                <p className="text-[11px] mb-2" style={{ color: BN.text3 }}>
                                    {t("tiersHint")}
                                </p>
                                {wholesaleTiers.map((tier, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input
                                            type="number"
                                            min={2}
                                            placeholder={t("tierQtyPh")}
                                            value={tier.minQty}
                                            onChange={e => setWholesaleTiers(prev => prev.map((t, i) => i === idx ? { ...t, minQty: e.target.value } : t))}
                                            className="flex-1 h-10 rounded-lg px-3 text-[13px]"
                                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                                        />
                                        <input
                                            type="number"
                                            min={1000}
                                            placeholder={t("tierPricePh")}
                                            value={tier.price}
                                            onChange={e => setWholesaleTiers(prev => prev.map((t, i) => i === idx ? { ...t, price: e.target.value } : t))}
                                            className="flex-1 h-10 rounded-lg px-3 text-[13px]"
                                            style={{ background: BN.surface, border: `1px solid ${BN.border}` }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setWholesaleTiers(prev => prev.filter((_, i) => i !== idx))}
                                            className="w-10 h-10 grid place-items-center rounded-lg"
                                            style={{ background: BN.errSoft, color: BN.err }}
                                            aria-label={t("remove")}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
                        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : t("createBtn")}
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
    const router = useRouter();
    const t = useTranslations("bn.cabinet");
    const [name, setName] = useState(shop.name);
    const [phone, setPhone] = useState(shop.phone);
    const [description, setDescription] = useState("");
    const [logoUrl, setLogoUrl] = useState(shop.logoUrl ?? "");
    const [workHours, setWorkHours] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    async function uploadLogo(file: File) {
        setBusy(true); setMsg(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("kind", "shop");
            const r = await fetch("/api/bn/upload", { method: "POST", body: fd });
            const d = await r.json();
            if (r.ok) setLogoUrl(d.url);
            else setMsg(d?.error ?? t("imgUploadErr"));
        } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
    }

    async function save() {
        setBusy(true); setMsg(null);
        try {
            const r = await fetch("/api/bn/seller/shop", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name, phone, description, logoUrl, workHours }),
            });
            const d = await r.json();
            if (r.ok) { setMsg(t("saved")); router.refresh(); }
            else setMsg(d?.error ?? t("saveErr"));
        } catch { setMsg(t("netErr")); }
        finally { setBusy(false); }
    }

    return (
        <div className="space-y-4">
            <FieldLabel label={t("shopLogo")}>
                <div className="flex items-center gap-3">
                    <span
                        className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 grid place-items-center"
                        style={{ background: BN.surfaceUp }}
                    >
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Store className="w-8 h-8" style={{ color: BN.text3 }} />
                        )}
                    </span>
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={busy}
                        className="h-11 px-4 rounded-xl text-[13px] font-bold"
                        style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}` }}
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <><Upload className="w-4 h-4 inline mr-1" /> {t("uploadNew")}</>}
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); }}
                    />
                </div>
            </FieldLabel>

            <FieldLabel label={t("shopName")}>
                <input value={name} onChange={e => setName(e.target.value)} className="bn-form-input" />
            </FieldLabel>

            <FieldLabel label={t("phone")}>
                <BnPhoneInput value={phone} onChange={setPhone} />
            </FieldLabel>

            <FieldLabel label={t("workHours")}>
                <input
                    value={workHours}
                    onChange={e => setWorkHours(e.target.value)}
                    placeholder={t("workHoursPh")}
                    className="bn-form-input"
                />
            </FieldLabel>

            <FieldLabel label={t("shopDesc")}>
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder={t("shopDescPh")}
                    className="bn-form-input resize-none"
                />
            </FieldLabel>

            {msg && (
                <p className="text-[12.5px] p-3 rounded-lg" style={{ background: BN.surfaceUp, color: BN.text2 }}>
                    {msg}
                </p>
            )}

            <button
                onClick={save}
                disabled={busy}
                className="w-full h-12 rounded-2xl text-[15px] font-black disabled:opacity-60"
                style={{ background: BN.gold, color: BN.onGold }}
            >
                {busy ? <Loader2 className="w-5 h-5 animate-spin inline" /> : t("save")}
            </button>

            <div className="pt-4 space-y-2 text-[12.5px]" style={{ borderTop: `1px solid ${BN.border}`, color: BN.text3 }}>
                <p>{t("shopUrl")}: <span className="font-bold" style={{ color: BN.text2 }}>/d/{shop.slug}</span></p>
                <p>{t("shopLoc")}: <span className="font-bold" style={{ color: BN.text2 }}>{locLabel(shop)}</span></p>
                <p>{t("shopRating")}: <span className="font-bold" style={{ color: BN.text2 }}>{shop.rating > 0 ? `${shop.rating.toFixed(1)} (${shop.ratingCount})` : t("noRating")}</span></p>
                <p>{t("shopTier")}: <span className="font-bold" style={{ color: BN.text2 }}>{shop.tier}</span></p>
            </div>
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
    const t = useTranslations("bn.cabinet");
    const locale = useLocale();
    return (
        <div>
            <div
                className="p-6 rounded-2xl mb-4"
                style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}
            >
                <p className="text-[11.5px] font-bold uppercase tracking-wider mb-1" style={{ color: BN.text3 }}>
                    {t("payBalance")}
                </p>
                <p className="text-[32px] font-black tabular-nums leading-none">{fmtPrice(balance)}</p>
                <p className="text-[12.5px] mt-2" style={{ color: BN.text3 }}>
                    {t("payFromOrders", { n: orderCount, pct: 5 })}
                </p>
            </div>
            <a
                href={`https://forhumo.uz/${locale}/pay`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-[14px] font-bold mb-6"
                style={{ background: BN.surface, border: `1px solid ${BN.border}`, color: BN.text }}
            >
                <Wallet className="w-4 h-4" />
                {t("payOpen")}
                <ArrowUpRight className="w-4 h-4" />
            </a>

            <BnReferralCard />

            <BnAchievementsCard />

            <BnReferralLeaderboard />
        </div>
    );
}

// ── REFERRAL KARTASI ─────────────────────────────────────────────────────────

interface ReferralData {
    code: string | null;
    url: string | null;
    pending: number;
    rewarded: number;
    totalEarned: number;
    inviterBonus: number;
    inviteeBonus: number;
}

function BnReferralCard() {
    const t = useTranslations("bn.referral");
    const [data, setData] = useState<ReferralData | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetch("/api/bn/referral")
            .then(r => r.json())
            .then((d: ReferralData) => setData(d))
            .catch(() => { /* ignore */ })
            .finally(() => setLoading(false));
    }, []);

    async function copyLink() {
        if (!data?.url) return;
        try {
            await navigator.clipboard.writeText(data.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* ignore */ }
    }

    if (loading) {
        return (
            <div className="p-6 rounded-2xl flex items-center justify-center"
                style={{ background: BN.surface, border: `1px solid ${BN.border}` }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: BN.text3 }} />
            </div>
        );
    }
    if (!data) return null;

    const shareText = data.url ? t("shareText", { url: data.url }) : "";
    const tgUrl = data.url
        ? `https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(shareText)}`
        : "#";
    const waUrl = data.url
        ? `https://wa.me/?text=${encodeURIComponent(shareText)}`
        : "#";

    return (
        <div className="p-5 sm:p-6 rounded-2xl"
            style={{ background: BN.surface, border: `1px solid ${BN.borderGold}` }}>
            <div className="flex items-start gap-3 mb-4">
                <span className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0"
                    style={{ background: BN.goldSoft, color: BN.gold }}>
                    <Users className="w-5 h-5" />
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black">{t("title")}</p>
                    <p className="text-[12.5px] leading-relaxed mt-0.5" style={{ color: BN.text2 }}>
                        {t("subtitle")}
                    </p>
                </div>
            </div>

            {/* Bonuslar */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-3 rounded-xl" style={{ background: BN.surfaceUp }}>
                    <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: BN.text3 }}>
                        {t("youGet")}
                    </p>
                    <p className="text-[18px] font-black tabular-nums leading-tight mt-1" style={{ color: BN.gold }}>
                        {fmtPrice(data.inviterBonus)}
                    </p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: BN.text3 }}>{t("perFriend")}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: BN.surfaceUp }}>
                    <p className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: BN.text3 }}>
                        {t("friendGets")}
                    </p>
                    <p className="text-[18px] font-black tabular-nums leading-tight mt-1" style={{ color: BN.info }}>
                        {fmtPrice(data.inviteeBonus)}
                    </p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: BN.text3 }}>{t("firstOrder")}</p>
                </div>
            </div>

            {/* Link */}
            {data.url ? (
                <>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: BN.text3 }}>
                        {t("yourLink")}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                        <input readOnly value={data.url}
                            className="flex-1 h-11 px-3 rounded-xl text-[13px] tabular-nums outline-none"
                            style={{ background: BN.surfaceUp, border: `1px solid ${BN.border}`, color: BN.text }}
                            onFocus={e => e.currentTarget.select()}
                        />
                        <button onClick={copyLink}
                            className="h-11 px-4 rounded-xl text-[12.5px] font-black flex-shrink-0 transition-colors"
                            style={{ background: copied ? BN.ok : BN.gold, color: BN.onGold }}>
                            {copied ? t("copied") : t("copy")}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <a href={tgUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 h-11 rounded-xl text-[13px] font-bold"
                            style={{ background: "#229ED9", color: "#fff" }}>
                            <Send className="w-4 h-4" />
                            {t("shareTelegram")}
                        </a>
                        <a href={waUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1.5 h-11 rounded-xl text-[13px] font-bold"
                            style={{ background: "#25D366", color: "#fff" }}>
                            <MessageCircle className="w-4 h-4" />
                            {t("shareWhatsApp")}
                        </a>
                    </div>

                    {/* Statistika */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <StatBox label={t("statPending")} value={String(data.pending)} />
                        <StatBox label={t("statRewarded")} value={String(data.rewarded)} />
                        <StatBox label={t("statTotalEarned")} value={fmtPrice(data.totalEarned)} accent />
                    </div>
                </>
            ) : (
                <div className="p-3 rounded-xl text-[12.5px] mb-4"
                    style={{ background: BN.surfaceUp, color: BN.text2 }}>
                    {t("noCode")}
                </div>
            )}

            {/* Qanday ishlaydi */}
            <div className="pt-4" style={{ borderTop: `1px solid ${BN.border}` }}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: BN.text3 }}>
                    {t("howItWorks")}
                </p>
                <p className="text-[12.5px] leading-relaxed mb-1" style={{ color: BN.text2 }}>{t("step1")}</p>
                <p className="text-[12.5px] leading-relaxed mb-1" style={{ color: BN.text2 }}>{t("step2")}</p>
                <p className="text-[12.5px] leading-relaxed" style={{ color: BN.text2 }}>{t("step3")}</p>
            </div>
        </div>
    );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="p-2.5 rounded-lg text-center" style={{ background: BN.surfaceUp }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BN.text3 }}>{label}</p>
            <p className="text-[14px] font-black tabular-nums mt-1" style={{ color: accent ? BN.gold : BN.text }}>
                {value}
            </p>
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

function AttrInput({
    def, value, onChange,
}: { def: AttrDef; value: string | number | boolean | undefined; onChange: (v: string | number | boolean) => void }) {
    const t = useTranslations("bn.cabinet");
    const unselected = t("attrUnselected");
    const label = <span className="block text-[12px] font-bold mb-1.5" style={{ color: BN.text2 }}>
        {def.label}{def.required && <span style={{ color: BN.err }}>*</span>}
        {def.unit && <span className="font-normal" style={{ color: BN.text3 }}> ({def.unit})</span>}
    </span>;

    if (def.type === "boolean") {
        return (
            <label className="flex items-center gap-2.5 h-11 px-3 rounded-xl text-[13px] font-medium cursor-pointer transition-colors"
                style={{ background: value ? BN.goldSoft : BN.surfaceUp }}
            >
                <input
                    type="checkbox"
                    checked={!!value}
                    onChange={e => onChange(e.target.checked)}
                    className="w-4 h-4"
                />
                <span style={{ color: value ? BN.gold : BN.text }}>{def.label}</span>
            </label>
        );
    }
    if (def.type === "select" && def.options) {
        return (
            <label className="block">
                {label}
                <select
                    value={String(value ?? "")}
                    onChange={e => onChange(e.target.value)}
                    className="bn-form-input"
                >
                    <option value="">{unselected}</option>
                    {def.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </label>
        );
    }
    if (def.type === "number") {
        return (
            <label className="block">
                {label}
                <input
                    type="number"
                    value={value == null ? "" : String(value)}
                    onChange={e => onChange(e.target.value ? Number(e.target.value) : "")}
                    className="bn-form-input tabular-nums"
                />
            </label>
        );
    }
    // text (default) va multiselect (hozircha text-comma)
    return (
        <label className="block">
            {label}
            <input
                type="text"
                value={String(value ?? "")}
                onChange={e => onChange(e.target.value)}
                className="bn-form-input"
            />
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
    const t = useTranslations("bn.cabinet");
    const icon = type === "PICKUP" ? <Package className="w-3 h-3" />
               : type === "DELIVERY" ? <Truck className="w-3 h-3" />
               : <Eye className="w-3 h-3" />;
    const label = type === "PICKUP" ? t("fbPickup")
               : type === "DELIVERY" ? t("fbDelivery")
               : t("fbInspect");
    return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: BN.surfaceUp, color: BN.text3 }}>
            {icon}{label}
        </span>
    );
}

/** Server-side locLabel (UZ fallback). Client'da useShopLocationText'ni afzal ko'ring. */
function locLabel(shop: CabinetShop): string {
    if (shop.locationType === "IN_MARKET") {
        return [shop.marketName, shop.marketSection, shop.marketShopNo && `${shop.marketShopNo}-do'kon`].filter(Boolean).join(" · ");
    }
    if (shop.locationType === "STANDALONE") return shop.address ?? shop.city;
    return "Onlayn do'kon";
}

function formatDate(iso: string, locale = "uz"): string {
    try {
        return new Date(iso).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
}
